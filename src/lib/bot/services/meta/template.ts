/**
 * Servicio de envío de plantillas (templates) de WhatsApp.
 *
 * Las plantillas son la ÚNICA forma de iniciar conversación con un cliente
 * fuera de la ventana de 24h. Deben estar pre-aprobadas en Meta Business.
 *
 * Diferencia con `sendText`:
 *  - sendText: respuesta dentro de 24h (texto libre, sin restricciones)
 *  - sendTemplate: iniciar conversación (template aprobada con variables)
 *
 * Si la plantilla NO está aprobada o cae fuera del catálogo de Meta, falla
 * con error 132xxx. Si está pendiente de calidad, Meta puede silenciosamente
 * NO entregar el mensaje aunque devuelva 200.
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
 */
import { getEnv } from "../../config/env";
import { getLogger } from "../../observability/logger";

const log = getLogger({ module: "meta-template" });

export interface TemplateParameter {
  /** Tipo de variable. Lo más común para nosotros: "text". */
  type: "text" | "currency" | "date_time";
  /** El valor del parámetro. */
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
}

export interface SendTemplateInput {
  /** Teléfono destino en formato E.164 sin +. */
  to: string;
  /** Nombre exacto de la plantilla aprobada en Meta. */
  templateName: string;
  /** Código de lenguaje. Para tus plantillas en español: "es". */
  language?: string;
  /** Parámetros del body, en orden. Si la plantilla no tiene variables, vacío. */
  bodyParameters?: TemplateParameter[];
  /** URL pública de imagen para el HEADER (si la plantilla tiene header tipo IMAGE). */
  headerImageUrl?: string;
}

export interface SendTemplateResult {
  ok: boolean;
  /** ID del mensaje asignado por Meta. */
  messageId?: string;
  /** Error si falló. */
  error?: string;
  /** Código de error específico de Meta (ej. 132001 = template not approved). */
  errorCode?: number;
}

/**
 * Envía una plantilla pre-aprobada.
 *
 * IMPORTANTE: si el bot está dentro de la ventana de 24h (cliente escribió
 * recientemente), prefiere `sendText`. La plantilla cuenta como "iniciar
 * conversación" en términos de cobro de Meta.
 */
export async function sendTemplate(
  input: SendTemplateInput,
  fetchImpl: typeof fetch = fetch
): Promise<SendTemplateResult> {
  const env = getEnv();
  const token = env.WHATSAPP_TOKEN;
  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
  const version = env.META_GRAPH_API_VERSION ?? "v22.0";

  // Normalizar número
  let cleanTo = input.to.replace(/\D/g, "");
  if (cleanTo.startsWith("521") && cleanTo.length === 13) {
    cleanTo = cleanTo.replace(/^521/, "52");
  }

  const language = input.language ?? "es";

  // Body de la API
  const body: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanTo,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: language },
    },
  };

  // Construir components dinámicamente (header image y/o body params)
  const components: any[] = [];
  if (input.headerImageUrl) {
    components.push({
      type: "header",
      parameters: [
        { type: "image", image: { link: input.headerImageUrl } },
      ],
    });
  }
  if (input.bodyParameters && input.bodyParameters.length > 0) {
    components.push({
      type: "body",
      parameters: input.bodyParameters,
    });
  }
  if (components.length > 0) {
    body.template.components = components;
  }

  const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as any;

    if (response.ok && data.messages?.[0]?.id) {
      log.info(
        {
          to: cleanTo,
          template: input.templateName,
          messageId: data.messages[0].id,
        },
        "Plantilla enviada exitosamente"
      );
      return {
        ok: true,
        messageId: data.messages[0].id,
      };
    }

    // Extraer info de error de Meta
    const metaError = data.error;
    const errorMsg =
      metaError?.message ??
      `HTTP ${response.status}: ${JSON.stringify(data).slice(0, 200)}`;
    const errorCode = metaError?.code;

    log.error(
      {
        to: cleanTo,
        template: input.templateName,
        status: response.status,
        errorCode,
        errorMsg,
      },
      "Error enviando plantilla"
    );

    return {
      ok: false,
      error: errorMsg,
      errorCode,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(
      { err: msg, to: cleanTo, template: input.templateName },
      "Excepción enviando plantilla"
    );
    return { ok: false, error: msg };
  }
}

/**
 * Constantes con los nombres EXACTOS de tus plantillas aprobadas en Meta.
 * Si en el futuro creas más, agrégalas aquí.
 *
 * CRÍTICO: estos nombres DEBEN coincidir exactamente con lo que tienes
 * configurado en Meta Business Manager. Cualquier typo → error 132001.
 */
export const TEMPLATES = {
  /** "el_coyote" — registrada en Meta como English. Bienvenida/prospeccion. Sin variables. */
  EL_COYOTE: {
    name: "el_coyote",
    language: "en",
    requiresParams: false,
  },
  /** "bienvenida" — Spanish. Activa: calidad pendiente. Sin variables. */
  BIENVENIDA: {
    name: "bienvenida",
    language: "es",
    /** Esta plantilla no tiene variables — no requiere bodyParameters. */
    requiresParams: false,
  },
  /** "oferta_de_reactivacion" — Spanish. Marketing. Re-engagement clientes frios. Sin variables. */
  OFERTA_REACTIVACION: {
    name: "oferta_de_reactivacion",
    language: "es",
    requiresParams: true,
    /** Header tipo IMAGE — requiere URL pública accesible por Meta. */
    headerImageUrl: "https://www.coyotetextil.com/assets/oferta-reactivacion.jpg",
  },
} as const;
