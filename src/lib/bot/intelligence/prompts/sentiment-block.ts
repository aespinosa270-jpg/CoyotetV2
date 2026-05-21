/**
 * Formatea el bloque SENTIMIENTO DEL CLIENTE para inyectarlo al system prompt.
 * Dice al bot CÓMO ajustar el tono según el nivel detectado.
 */
import type { SentimentDetection, SentimentLevel } from "../sentiment/detector";

const SENTIMENT_TONE: Record<SentimentLevel, { icon: string; label: string; recomendacion: string }> = {
  entusiasta: {
    icon: "🔥",
    label: "ENTUSIASTA — cliente caliente",
    recomendacion: `MANTÉN LA ENERGÍA ALTA. Cliente listo para cerrar.
- Tono: alto energía, casual, directo
- USA emojis con moderación (🔥 ✅ 💯)
- VE DIRECTO al cierre — no perfiles más
- Si está pidiendo info → respóndele y agrega "¿le mando el link de pago?"
- Activa MODO CIERRE (Regla AK) si hay productos discutidos`,
  },
  positivo: {
    icon: "😊",
    label: "POSITIVO — cliente receptivo",
    recomendacion: `Cliente está bien dispuesto.
- Tono: cordial, profesional, ligeramente cálido
- Puedes usar 1-2 emojis si encaja naturalmente
- Avanza el flujo de venta con normalidad
- Si terminó una etapa → ofrece la siguiente directo`,
  },
  neutral: {
    icon: "😐",
    label: "NEUTRAL — sin señales fuertes",
    recomendacion: `Tono profesional estándar.
- Sigue tu flujo normal de venta
- Mantén tono Coyote: directo + cercano sin excesos
- NO inventes emoción donde no la hay`,
  },
  dudoso: {
    icon: "🤔",
    label: "DUDOSO — cliente con reservas",
    recomendacion: `Cliente tiene dudas o está comparando.
- Tono: paciente, empático, sin presión
- NO uses emojis de fiesta (🔥 💯)
- RECONOCE la duda: "Entiendo lo que dice, vamos por partes"
- Aborda objeción específica con DATOS (gramaje real, rendimiento, comparación)
- NO insistas con cierre prematuro — primero resuelve
- Si menciona precio → enfócate en VALOR (rendimiento, durabilidad, garantía)`,
  },
  frustrado: {
    icon: "😤",
    label: "FRUSTRADO — cliente molesto",
    recomendacion: `Cliente está harto o cansado. PRIORIDAD: bajar tensión.
- Tono: empático, formal, breve, claro
- NADA de emojis de celebración
- NO hagas cross-sell. NO hagas humor. NO sigas vendiendo agresivo.
- RECONOCE: "Entiendo su frustración / lamento la demora"
- ENFÓCATE en resolver UNA cosa a la vez
- Si la frustración es por tiempos/precio → da respuestas concretas
- Si después de tu respuesta sigue frustrado → ESCALA con tool 'escalar_a_humano'`,
  },
  enojado: {
    icon: "🚨",
    label: "ENOJADO — riesgo queja formal",
    recomendacion: `🚨 ALERTA: cliente MUY molesto, posible queja formal.
- Tono: 100% empático, formal, sereno, sin defensas
- CERO emojis. CERO humor. CERO ventas.
- DISCULPA explícita: "Lamento mucho lo que está viviendo"
- VALIDA su molestia: "Tiene toda la razón en sentirse así"
- ESCALA INMEDIATO con tool 'escalar_a_humano' con razon="queja"
- NO intentes resolver tú esta situación — necesita humano YA
- Tu único trabajo: bajar tensión + escalar`,
  },
};

export function buildSentimentBlock(detection: SentimentDetection): string {
  // Para neutral → no agregar bloque (no aporta)
  if (detection.level === "neutral") return "";

  const config = SENTIMENT_TONE[detection.level];
  const signalsTxt = detection.signals.length > 0
    ? `\n📍 Señales detectadas: ${detection.signals.slice(0, 3).map((s) => `"${s}"`).join(", ")}`
    : "";

  return `
=== SENTIMIENTO DEL CLIENTE (último mensaje) ===
${config.icon} ${config.label}${signalsTxt}

🎯 AJUSTA TU TONO:
${config.recomendacion}
=== FIN SENTIMIENTO ===
`;
}