/**
 * services/meta/send.ts
 *
 * Envío de mensajes vía WhatsApp Cloud API.
 * Reemplaza enviarWhatsapp() del v1 con manejo separado por tipo,
 * distinción entre errores 4xx (no reintentar) vs 5xx (reintentar),
 * y backoff exponencial configurable.
 */

import { authHeaders, messagesUrl, normalizeMxPhone } from "./client";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "meta/send" });

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  attempts: number;
}

export interface RetryOptions {
  /** Número máximo de reintentos (default 2, total 3 intentos) */
  maxRetries?: number;
  /** Tiempo base de espera en ms entre reintentos (default 1000) */
  baseDelayMs?: number;
}

// ─── Errores de Meta ───────────────────────────────────────────────────────────

/** Códigos de error de Meta que NO deben reintentarse (son errores del caller) */
const NON_RETRYABLE_META_CODES = new Set([
  100,  // Parameter is invalid
  131030, // Rate limit hit — no tiene caso reintentar inmediatamente
  131047, // Re-engagement message — ventana de 24h cerrada
  131051, // Message type unsupported
  131052, // Media download error (URL inválida del cliente)
  368,  // Temporarily blocked
]);

function isRetryable(httpStatus: number, metaCode?: number): boolean {
  // 4xx del cliente → nunca reintentar
  if (httpStatus >= 400 && httpStatus < 500) return false;
  // Algunos códigos Meta específicos → no reintentar aunque sea 200
  if (metaCode && NON_RETRYABLE_META_CODES.has(metaCode)) return false;
  // 5xx servidor → reintentar
  return httpStatus >= 500;
}

// ─── Helper de sleep ───────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Función base de envío ─────────────────────────────────────────────────────

async function sendRaw(
  to: string,
  payload: Record<string, unknown>,
  opts: RetryOptions = {}
): Promise<SendResult> {
  const maxRetries = opts.maxRetries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 1000;
  const phone = normalizeMxPhone(to);
  const url = messagesUrl();
  const headers = authHeaders();

  const body = JSON.stringify({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
    ...payload,
  });

  let lastError = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers, body });

      // Intentar parsear la respuesta siempre
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // Body vacío o no-JSON
      }

      if (res.ok) {
        const messageId = data?.messages?.[0]?.id;
        log.info(
          { to: phone, messageId, attempt: attempt + 1 },
          "Mensaje WA enviado"
        );
        return { ok: true, messageId, attempts: attempt + 1 };
      }

      // Error de la API
      const metaCode: number | undefined = data?.error?.code;
      const metaMsg: string = data?.error?.message ?? `HTTP ${res.status}`;
      lastError = metaMsg;

      log.warn(
        { to: phone, httpStatus: res.status, metaCode, metaMsg, attempt: attempt + 1 },
        "Error enviando mensaje WA"
      );

      if (!isRetryable(res.status, metaCode)) {
        log.error(
          { to: phone, httpStatus: res.status, metaCode },
          "Error no reintentable — abortando"
        );
        return { ok: false, error: metaMsg, attempts: attempt + 1 };
      }
    } catch (err: any) {
      lastError = err?.message ?? "Network error";
      log.warn(
        { to: phone, err: lastError, attempt: attempt + 1 },
        "Error de red enviando WA"
      );
    }

    // Backoff exponencial antes del siguiente intento
    if (attempt < maxRetries) {
      const delay = baseDelayMs * Math.pow(2, attempt);
      log.debug({ delay, attempt: attempt + 1 }, "Reintentando en...");
      await sleep(delay);
    }
  }

  log.error(
    { to: phone, maxRetries, lastError },
    "Mensaje WA falló definitivamente"
  );
  return { ok: false, error: lastError, attempts: maxRetries + 1 };
}

// ─── API pública ───────────────────────────────────────────────────────────────

/**
 * Envía un mensaje de texto plano (o con formato WhatsApp *negrita*, _cursiva_).
 * Es el reemplazo directo de enviarWhatsapp() del v1.
 */
export async function sendText(
  to: string,
  text: string,
  opts?: RetryOptions
): Promise<SendResult> {
  return sendRaw(to, { type: "text", text: { body: text, preview_url: false } }, opts);
}

/**
 * Envía una imagen desde una URL pública.
 */
export async function sendImage(
  to: string,
  imageUrl: string,
  caption?: string,
  opts?: RetryOptions
): Promise<SendResult> {
  return sendRaw(
    to,
    {
      type: "image",
      image: {
        link: imageUrl,
        ...(caption ? { caption } : {}),
      },
    },
    opts
  );
}

/**
 * Envía un documento desde una URL pública.
 */
export async function sendDocument(
  to: string,
  documentUrl: string,
  filename: string,
  caption?: string,
  opts?: RetryOptions
): Promise<SendResult> {
  return sendRaw(
    to,
    {
      type: "document",
      document: {
        link: documentUrl,
        filename,
        ...(caption ? { caption } : {}),
      },
    },
    opts
  );
}

/**
 * Marca un mensaje recibido como leído.
 * Útil para mostrar los ✓✓ azules al cliente.
 */
export async function markAsRead(
  messageId: string
): Promise<{ ok: boolean }> {
  const url = messagesUrl();
  const headers = authHeaders();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
