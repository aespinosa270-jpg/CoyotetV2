/**
 * Detector de respuestas de consentimiento.
 *
 * El bot pregunta: "¿Me autoriza recibir ofertas? Aplican privacidad/términos. SÍ o NO"
 * Este módulo clasifica la respuesta del cliente.
 *
 * NO usa LLM porque:
 *  - Es determinístico (mismo input → mismo output siempre)
 *  - Cero latencia
 *  - Cero costo
 *  - Audita-ble: el cliente puede ver exactamente por qué se aceptó/rechazó
 */

export type ConsentRespuesta = "acepta" | "rechaza" | "ambiguo";

// ── Palabras y frases ─────────────────────────────────────────────

const FRASES_ACEPTA = [
  // afirmaciones directas
  "si",
  "sí",
  "claro",
  "ok",
  "okay",
  "okey",
  "dale",
  "perfecto",
  "esta bien",
  "está bien",
  "de acuerdo",
  "acepto",
  "autorizo",
  "adelante",
  "porfa",
  "por favor",
  "por supuesto",
  "obvio",
  "afirmativo",
  "claro que si",
  "claro que sí",
  "siempre",
  // con emoji o variantes
  "👍",
  "✅",
  "🆗",
  "yes",
  "sip",
  "simon",
  "simón",
];

const FRASES_RECHAZA = [
  // negaciones directas
  "no",
  "nop",
  "nope",
  "no gracias",
  "no quiero",
  "no acepto",
  "no autorizo",
  "paso",
  "ahorita no",
  "ahora no",
  "no me interesa",
  "negativo",
  "prefiero que no",
  "mejor no",
  "no por favor",
  // con emoji
  "👎",
  "❌",
  // expresiones de molestia
  "deja de",
  "ya no",
  "no me mandes",
  "no me envies",
  "no me envíes",
  "déjame en paz",
  "dejame en paz",
];

// ── Detector principal ────────────────────────────────────────────

/**
 * Clasifica la respuesta del cliente a la pregunta de consentimiento.
 *
 * Estrategia:
 *  1. Normalizar (minúsculas, sin acentos extras, trim)
 *  2. Si el mensaje es muy largo (>40 chars), es "ambiguo" — no es una respuesta directa
 *  3. Buscar frase de aceptación exacta o prefijo
 *  4. Buscar frase de rechazo exacta o prefijo
 *  5. Si encontró ambas, gana RECHAZA (más conservador)
 *  6. Si no encontró ninguna, "ambiguo"
 */
export function detectarRespuestaConsentimiento(
  texto: string
): ConsentRespuesta {
  if (!texto || typeof texto !== "string") return "ambiguo";

  const normalizado = normalizar(texto);
  if (normalizado.length === 0) return "ambiguo";

  // Mensajes largos: el cliente está hablando de otra cosa
  if (normalizado.length > 60) return "ambiguo";

  let acepta = false;
  let rechaza = false;

  // Buscar match exacto primero (palabras sueltas como "si", "no")
  if (FRASES_ACEPTA.includes(normalizado)) {
    return "acepta";
  }
  if (FRASES_RECHAZA.includes(normalizado)) {
    return "rechaza";
  }

  // Buscar como inicio o palabra contenida
  for (const frase of FRASES_RECHAZA) {
    if (matchFrase(normalizado, frase)) {
      rechaza = true;
      break;
    }
  }
  for (const frase of FRASES_ACEPTA) {
    if (matchFrase(normalizado, frase)) {
      acepta = true;
      break;
    }
  }

  // Si encontró ambas, gana rechazo (más conservador y respetuoso)
  if (rechaza) return "rechaza";
  if (acepta) return "acepta";
  return "ambiguo";
}

// ── Helpers ────────────────────────────────────────────────────────

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .trim()
    .replace(/[.,;!?¡¿]/g, "")
    .replace(/\s+/g, " ");
}

function matchFrase(texto: string, frase: string): boolean {
  // Match exacto o como palabra/inicio
  if (texto === frase) return true;
  // Si la frase tiene espacios, buscar como substring
  if (frase.includes(" ")) {
    return texto.includes(frase);
  }
  // Si es una palabra única, buscar con boundary
  const palabras = texto.split(" ");
  return palabras.includes(frase);
}

// ── Mensaje que el bot manda para pedir consentimiento ─────────────

export const CONSENT_VERSION = "2026-05";

/**
 * Mensaje exacto que el bot debe enviar para pedir consentimiento.
 *
 * IMPORTANTE: cualquier cambio en este texto requiere INCREMENTAR
 * CONSENT_VERSION, porque los términos cambiaron.
 */
export function buildConsentMessage(): string {
  return [
    "Antes de continuar — para mandarle ofertas y novedades de membresías necesito su autorización.",
    "Aplican nuestro aviso de privacidad (https://www.coyotetextil.com/privacy) y términos (https://www.coyotetextil.com/terms).",
    "¿Me autoriza? Responda *SÍ* o *NO*.",
  ].join("\n\n");
}

/** Mensaje de confirmación cuando el cliente acepta. */
export function buildConsentAcceptedMessage(): string {
  return "¡Excelente! Quedó autorizado. Si en algún momento quiere darse de baja, dígame y dejo de mandarle promociones de inmediato.";
}

/** Mensaje cuando el cliente rechaza. */
export function buildConsentRejectedMessage(): string {
  return "Entendido, no le mandaré ofertas. Sigamos con su consulta sin problema.";
}

/** Mensaje cuando la respuesta es ambigua y hay que re-preguntar. */
export function buildConsentAmbiguousMessage(): string {
  return "Disculpe, no estoy seguro de su respuesta. ¿Me autoriza a enviarle ofertas y novedades? Responda *SÍ* o *NO*.";
}

