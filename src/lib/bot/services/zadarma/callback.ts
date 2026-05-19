/**
 * Cliente Zadarma para click-to-call.
 *
 * Usa la API `request/callback` que conecta primero el SIP del agente
 * y luego marca al cliente. El agente recibe la llamada en su teléfono
 * SIP/softphone — no necesita micrófono del navegador.
 *
 * Docs: https://zadarma.com/en/support/api/
 */
import crypto from "crypto";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "zadarma/callback" });

const ZADARMA_API = "https://api.zadarma.com";
const METHOD = "/v1/request/callback/";

interface CallbackResult {
  ok: boolean;
  callId?: string;
  error?: string;
}

/**
 * Inicia una llamada click-to-call.
 *
 * @param to Número del cliente en formato E.164 SIN +. Ej: "5215551234567"
 * @param from SIP del agente (opcional, usa SIP del .env si no se da)
 */
export async function iniciarLlamadaZadarma(
  to: string,
  from?: string
): Promise<CallbackResult> {
  const KEY = process.env.ZADARMA_KEY || "";
  const SECRET = process.env.ZADARMA_SECRET || "";
  const sip = from || process.env.SIP || "";

  if (!KEY || !SECRET || !sip) {
    return { ok: false, error: "Faltan ZADARMA_KEY, ZADARMA_SECRET o SIP en env" };
  }

  // Normalizar `to`: solo dígitos, agregar 52 si no tiene
  let toNorm = to.replace(/[^\d]/g, "");
  if (toNorm.length === 10) toNorm = "52" + toNorm; // celular mx sin lada país
  if (!/^\d{10,15}$/.test(toNorm)) {
    return { ok: false, error: `Teléfono inválido: ${to}` };
  }

  // Zadarma firma con: method + params (orden alfabético) + md5(params)
  const params = `from=${sip}&to=${toNorm}`;
  const md5 = crypto.createHash("md5").update(params).digest("hex");
  const dataToSign = METHOD + params + md5;
  const hmac = crypto.createHmac("sha1", SECRET).update(dataToSign).digest("hex");
  const signature = Buffer.from(hmac).toString("base64");

  try {
    const resp = await fetch(`${ZADARMA_API}${METHOD}?${params}`, {
      method: "GET", // Zadarma callback usa GET
      headers: { Authorization: `${KEY}:${signature}` },
      cache: "no-store",
    });

    const data = await resp.json();

    if (data.status === "success") {
      log.info({ to: toNorm, from: sip, callId: data.call_id }, "Llamada iniciada");
      return { ok: true, callId: data.call_id?.toString() };
    } else {
      log.warn({ data }, "Zadarma rechazó la llamada");
      return { ok: false, error: data.message || "Zadarma rechazó la llamada" };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg }, "Error iniciando llamada Zadarma");
    return { ok: false, error: msg };
  }
}