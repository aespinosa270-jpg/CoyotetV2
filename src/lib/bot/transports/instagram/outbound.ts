/**
 * Adapter outbound del transport INSTAGRAM.
 *
 * Envía mensajes usando la Graph API de Meta:
 *   POST https://graph.facebook.com/v19.0/me/messages
 *        ?access_token={PAGE_ACCESS_TOKEN}
 *
 * Body:
 *   {
 *     recipient: { id: "IG_USER_ID" },
 *     message: { text: "..." } | { attachment: {...} }
 *   }
 *
 * El PAGE_ACCESS_TOKEN se obtiene en Meta Business cuando vinculas la
 * cuenta de Instagram Business a una Facebook Page. Es DIFERENTE al
 * WHATSAPP_TOKEN.
 *
 * Para enviar imágenes, Instagram acepta una URL pública directamente.
 *
 * Docs: https://developers.facebook.com/docs/messenger-platform/instagram/features/send-message
 */
import { getEnv } from "../../config/env";
import { getLogger } from "../../observability/logger";
import type {
  OutgoingMessage,
  DeliveryResult,
} from "../../types/messages";

const log = getLogger({ module: "instagram/outbound" });
const GRAPH_API_BASE = "https://graph.facebook.com";

/**
 * Envía un OutgoingMessage a Instagram.
 * El `to.id` debe ser el clientId universal con prefix `ig:` (ej. "ig:17841...").
 */
export async function sendToInstagram(
  outgoing: OutgoingMessage,
  fetchImpl: typeof fetch = fetch
): Promise<DeliveryResult> {
  const start = Date.now();
  const env = getEnv();
  const token = env.INSTAGRAM_TOKEN;

  if (!token) {
    return {
      status: "failed",
      error: "INSTAGRAM_TOKEN no configurado",
      attempts: 0,
    };
  }

  const recipientId = extractRecipientId(outgoing.to.id);
  if (!recipientId) {
    return {
      status: "failed",
      error: `to.id inválido para Instagram: ${outgoing.to.id}`,
      attempts: 0,
    };
  }

  try {
    if (outgoing.type === "text") {
      return await sendText(
        token,
        recipientId,
        outgoing.text ?? "",
        start,
        fetchImpl
      );
    }

    if (outgoing.type === "image") {
      return await sendImage(
        token,
        recipientId,
        outgoing.media?.url ?? "",
        start,
        fetchImpl
      );
    }

    if (outgoing.type === "interactive") {
      return await sendQuickReplies(
        token,
        recipientId,
        outgoing.interactive?.body ?? "",
        outgoing.interactive?.buttons ?? [],
        start,
        fetchImpl
      );
    }

    return {
      status: "failed",
      error: `tipo de mensaje no soportado: ${outgoing.type}`,
      attempts: 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg, recipientId }, "sendToInstagram error inesperado");
    return {
      status: "failed",
      error: msg,
      attempts: 1,
      latencyMs: Date.now() - start,
    };
  }
}

// ── Implementaciones ─────────────────────────────────────────────

async function sendText(
  token: string,
  recipientId: string,
  text: string,
  start: number,
  fetchImpl: typeof fetch
): Promise<DeliveryResult> {
  // Instagram tiene límite de 1000 chars por mensaje, partir si es necesario
  const trimmed = text.slice(0, 1000);

  const url = `${GRAPH_API_BASE}/v19.0/me/messages?access_token=${encodeURIComponent(token)}`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: trimmed },
    }),
  });

  return handleResponse(res, start);
}

async function sendImage(
  token: string,
  recipientId: string,
  imageUrl: string,
  start: number,
  fetchImpl: typeof fetch
): Promise<DeliveryResult> {
  if (!imageUrl) {
    return {
      status: "failed",
      error: "URL de imagen requerida",
      attempts: 0,
    };
  }

  const url = `${GRAPH_API_BASE}/v19.0/me/messages?access_token=${encodeURIComponent(token)}`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: imageUrl,
            is_reusable: false,
          },
        },
      },
    }),
  });

  return handleResponse(res, start);
}

async function sendQuickReplies(
  token: string,
  recipientId: string,
  body: string,
  buttons: Array<{ payload: string; label: string }>,
  start: number,
  fetchImpl: typeof fetch
): Promise<DeliveryResult> {
  // IG soporta hasta 13 quick replies. Cada uno hasta 20 chars de title.
  const quickReplies = buttons.slice(0, 13).map((b) => ({
    content_type: "text",
    title: b.label.slice(0, 20),
    payload: b.payload,
  }));

  const url = `${GRAPH_API_BASE}/v19.0/me/messages?access_token=${encodeURIComponent(token)}`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: {
        text: body.slice(0, 1000),
        quick_replies: quickReplies,
      },
    }),
  });

  return handleResponse(res, start);
}

async function handleResponse(
  res: Response,
  start: number
): Promise<DeliveryResult> {
  const latencyMs = Date.now() - start;

  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {}
    log.warn(
      { status: res.status, body: body.slice(0, 300) },
      "Instagram Graph API respondió con error"
    );
    return {
      status: "failed",
      error: `HTTP ${res.status}: ${body.slice(0, 200)}`,
      attempts: 1,
      latencyMs,
    };
  }

  const data = (await res.json()) as {
    message_id?: string;
    recipient_id?: string;
    error?: { message?: string };
  };

  if (data.error) {
    return {
      status: "failed",
      error: data.error.message ?? "Graph API error",
      attempts: 1,
      latencyMs,
    };
  }

  return {
    status: "sent",
    channelMessageId: data.message_id,
    attempts: 1,
    latencyMs,
  };
}

// ── Helpers ───────────────────────────────────────────────────────

function extractRecipientId(toId: string): string | null {
  if (!toId) return null;
  if (toId.startsWith("ig:")) return toId.slice(3);
  // ig_page:XXX no es un recipient válido — solo identifica la cuenta
  if (toId.startsWith("ig_page:")) return null;
  return toId;
}

