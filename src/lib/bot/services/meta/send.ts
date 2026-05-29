import { getEnv } from "../../config/env";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "meta-send" });

export async function sendText(to: string, text: string, retries = 2): Promise<boolean> {
  const env = getEnv();
  const token = env.WHATSAPP_TOKEN;
  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
  
  // Normalizar número por si las dudas
  let cleanTo = to.replace(/\D/g, "");
  if (cleanTo.startsWith("521") && cleanTo.length === 13) {
    cleanTo = cleanTo.replace(/^521/, "52");
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Usamos la versión de la API de Meta que tengas (ej. v19.0 o v22.0)
      const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanTo,
          type: "text",
          text: { body: text },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        log.info({ to: cleanTo, attempt: attempt + 1 }, "✅ Mensaje enviado exitosamente por Meta API");
        return true;
      }

      log.error({ data, attempt: attempt + 1 }, "❌ Error de Meta API al enviar mensaje");
    } catch (error) {
      log.error({ err: error, attempt: attempt + 1 }, "⚠️ Excepción de red al enviar WhatsApp");
    }

    // Backoff exponencial simple si falla
    if (attempt < retries) {
      const waitMs = 1000 * (attempt + 1);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
  
  return false;
}


// ─────────────────────────────────────────────────────────────────────
// sendMedia: envío de imagen / documento / video / audio
// ─────────────────────────────────────────────────────────────────────

export type MediaType = "image" | "document" | "video" | "audio";

export interface SendMediaInput {
  to: string;
  mediaUrl: string;          // URL pública (Supabase Storage)
  mediaType: MediaType;
  caption?: string;          // Texto que acompaña imagen/video
  filename?: string;         // Solo para documentos (PDF, DOCX...)
}

/**
 * Envía media (imagen, doc, video, audio) por WhatsApp Cloud API.
 * Retorna true si Meta aceptó, false si falló.
 */
export async function sendMedia(input: SendMediaInput, retries = 2): Promise<boolean> {
  const env = getEnv();
  const token = env.WHATSAPP_TOKEN;
  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;

  // Normalizar número (misma lógica que sendText)
  let cleanTo = input.to.replace(/\D/g, "");
  if (cleanTo.startsWith("521") && cleanTo.length === 13) {
    cleanTo = cleanTo.replace(/^521/, "52");
  }

  // Construir payload según tipo
  const mediaPayload: any = { link: input.mediaUrl };
  if (input.caption && (input.mediaType === "image" || input.mediaType === "video" || input.mediaType === "document")) {
    mediaPayload.caption = input.caption;
  }
  if (input.filename && input.mediaType === "document") {
    mediaPayload.filename = input.filename;
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanTo,
    type: input.mediaType,
    [input.mediaType]: mediaPayload,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        log.info(
          { to: cleanTo, mediaType: input.mediaType, attempt: attempt + 1 },
          "✅ Media enviado exitosamente por Meta API"
        );
        return true;
      }

      log.error(
        { data, mediaType: input.mediaType, attempt: attempt + 1 },
        "❌ Error de Meta API al enviar media"
      );
    } catch (error) {
      log.error(
        { err: error, attempt: attempt + 1 },
        "⚠️ Excepción de red al enviar media"
      );
    }

    if (attempt < retries) {
      const waitMs = 1000 * (attempt + 1);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────
// VARIANTES "WithId": devuelven el wamid (ID de Meta) para tracking de
// estado (enviado/entregado/leido). Usadas por el CRM para palomitas.
// Las funciones sendText/sendMedia originales quedan intactas.
// ─────────────────────────────────────────────────────────────────────

/**
 * Igual que sendText pero devuelve el wamid (data.messages[0].id) o null.
 */
export async function sendTextWithId(
  to: string,
  text: string,
  retries = 2
): Promise<string | null> {
  const env = getEnv();
  const token = env.WHATSAPP_TOKEN;
  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;

  let cleanTo = to.replace(/\D/g, "");
  if (cleanTo.startsWith("521") && cleanTo.length === 13) {
    cleanTo = cleanTo.replace(/^521/, "52");
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanTo,
          type: "text",
          text: { body: text },
        }),
      });
      const data = await response.json();
      if (response.ok) {
        const wamid = data?.messages?.[0]?.id ?? null;
        log.info({ to: cleanTo, wamid }, "✅ Texto enviado (WithId)");
        return wamid;
      }
      log.error({ data, attempt: attempt + 1 }, "❌ Error Meta API (WithId texto)");
    } catch (error) {
      log.error({ err: error, attempt: attempt + 1 }, "⚠️ Excepción red (WithId texto)");
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return null;
}

/**
 * Igual que sendMedia pero devuelve el wamid o null.
 */
export async function sendMediaWithId(
  input: SendMediaInput,
  retries = 2
): Promise<string | null> {
  const env = getEnv();
  const token = env.WHATSAPP_TOKEN;
  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;

  let cleanTo = input.to.replace(/\D/g, "");
  if (cleanTo.startsWith("521") && cleanTo.length === 13) {
    cleanTo = cleanTo.replace(/^521/, "52");
  }

  const mediaPayload: any = { link: input.mediaUrl };
  if (
    input.caption &&
    (input.mediaType === "image" ||
      input.mediaType === "video" ||
      input.mediaType === "document")
  ) {
    mediaPayload.caption = input.caption;
  }
  if (input.filename && input.mediaType === "document") {
    mediaPayload.filename = input.filename;
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanTo,
    type: input.mediaType,
    [input.mediaType]: mediaPayload,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok) {
        const wamid = data?.messages?.[0]?.id ?? null;
        log.info({ to: cleanTo, wamid, mediaType: input.mediaType }, "✅ Media enviado (WithId)");
        return wamid;
      }
      log.error({ data, attempt: attempt + 1 }, "❌ Error Meta API (WithId media)");
    } catch (error) {
      log.error({ err: error, attempt: attempt + 1 }, "⚠️ Excepción red (WithId media)");
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return null;
}
