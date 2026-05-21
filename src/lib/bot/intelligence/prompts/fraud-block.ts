/**
 * Bloque RED FLAGS para inyectar al system prompt cuando se detectan
 * patrones de scam o cliente potencialmente fraudulento.
 */
import type { FraudDetection, RedFlag } from "../fraud/detector";

const FLAG_DESCRIPCION: Record<RedFlag, { titulo: string; accion: string }> = {
  cod_alto_valor: {
    titulo: "💸 Pide pago al recibir (COD) en monto alto",
    accion: "NO ofrezcas COD para órdenes >$5,000. Insiste en SPEI o tarjeta antes del envío. Si insiste mucho en COD → escala con razon=alto_valor.",
  },
  metodo_pago_raro: {
    titulo: "💳 Pide método de pago inusual (Bizum, crypto, Western Union, Zelle, etc.)",
    accion: "NO aceptes esos métodos. Coyote solo procesa SPEI y Stripe (tarjeta/OXXO). Explica: 'Manejo SPEI o tarjeta vía link Stripe, son los métodos seguros'. Si insiste → escala con razon=alto_valor.",
  },
  urgencia_sospechosa: {
    titulo: "⏰ Urgencia extrema + descuento o monto alto",
    accion: "Patrón típico de scam: 'URGENTE pídeme descuento HOY'. No cedas en precios bajo presión. Mantén condiciones normales. Si presiona descuento agresivo → escala.",
  },
  direccion_extranjera: {
    titulo: "🌎 Pide envío fuera de México sin contexto",
    accion: "Coyote NO maneja envíos internacionales por default. Pregunta: '¿Es para entrega en México? Solo manejamos rutas nacionales.' NO confirmes precios de envío internacional. Si insiste → escala.",
  },
  cambio_datos_ultima_hora: {
    titulo: "🔄 Cambia destinatario/dirección a última hora",
    accion: "PATRÓN ALTO RIESGO de fraude (envío a tercero). NO modifiques sin verificación. Responde: 'Para cambios de destinatario necesito que un asesor humano verifique con usted. Le contacto en breve.' ESCALA con razon=alto_valor.",
  },
  negociacion_agresiva: {
    titulo: "🥷 Negocia agresivo o ultimátum",
    accion: "Mantén precios. NO ofrezcas descuentos forzados. Si el ultimátum es agresivo o vulgar → escala con razon=queja.",
  },
  phishing_dato: {
    titulo: "🚨 Pide datos sensibles (tarjeta del vendedor, CLABE personal, CVV)",
    accion: "ALERTA MÁXIMA: el cliente está intentando phishing. JAMÁS compartas datos bancarios. Responde: 'Por seguridad, todos los pagos son por link Stripe oficial. No comparto datos de cuentas personales.' ESCALA INMEDIATO con razon=queja.",
  },
};

export function buildFraudBlock(detection: FraudDetection): string {
  if (!detection.hayRiesgo) return "";

  const flagsTxt = detection.signals
    .map((s) => {
      const desc = FLAG_DESCRIPCION[s.flag];
      return `${desc.titulo}\n   📍 Señal detectada: "${s.texto}"\n   ➡️ ${desc.accion}`;
    })
    .join("\n\n");

  const urgenciaIcon = detection.nivel === "alto"
    ? "🚨🚨🚨"
    : detection.nivel === "medio"
      ? "⚠️⚠️"
      : "⚠️";

  return `
=== ${urgenciaIcon} RED FLAGS DETECTADOS — Nivel: ${detection.nivel.toUpperCase()} ${urgenciaIcon} ===

${flagsTxt}

REGLAS ABSOLUTAS DE SEGURIDAD:
1. JAMÁS aceptes condiciones inusuales bajo presión
2. JAMÁS compartas datos bancarios o personales del vendedor
3. JAMÁS modifiques destinatarios sin verificación humana
4. Mantén la conversación profesional pero ESCALADA si nivel es ALTO
5. Si el cliente insiste después de tu negativa razonable → llama 'escalar_a_humano' con razon="alto_valor"
6. NO hagas cross-sell ni upgrade — primero verificar legitimidad

=== FIN RED FLAGS ===
`;
}