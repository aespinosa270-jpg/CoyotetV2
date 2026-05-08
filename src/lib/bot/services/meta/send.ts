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
