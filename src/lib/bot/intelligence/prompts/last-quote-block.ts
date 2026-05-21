/**
 * Formatea el bloque LEAD CALIENTE para inyectarlo al system prompt
 * cuando el cliente vuelve después de cotizar sin cerrar.
 */
import type { LastQuoteDetection } from "../profile/last-quote-detector";

export function buildLastQuoteBlock(
  detection: LastQuoteDetection,
  nombre?: string
): string {
  if (!detection.hayLeadPendiente || !detection.diasDesdeUltimoContacto) {
    return "";
  }

  const nombreCorto = nombre?.split(" ")[0] || "el cliente";
  const dias = detection.diasDesdeUltimoContacto;
  const tiempoTxt = dias === 1 ? "1 día" : `${dias} días`;

  const productosTxt = detection.productosCotizados
    .map((p) => `   • ${p}`)
    .join("\n");

  const cantidadesTxt = detection.cantidadesMencionadas.length > 0
    ? `\n📏 Cantidades que se mencionaron: ${detection.cantidadesMencionadas.join(", ")}`
    : "";

  const precioTxt = detection.ultimaCotizacionTotal
    ? `\n💰 Última cotización vista: $${detection.ultimaCotizacionTotal.toLocaleString("es-MX")} MXN`
    : "";

  return `
=== ⚠️ LEAD CALIENTE QUE VOLVIÓ ⚠️ ===
⏰ ${nombreCorto} regresó después de ${tiempoTxt} sin cerrar venta.
🛒 En la conversación anterior se cotizaron estos productos:
${productosTxt}${cantidadesTxt}${precioTxt}
❌ NO completó la compra (sin orden PAID registrada en este rango)

REGLA PARA ESTE CLIENTE — APROVECHA EL CONTEXTO Y NO ARRANQUES DE CERO:
1. RECONOCE NATURALMENTE: "¡Qué onda ${nombreCorto}, gusto verlo otra vez! Veo que la última vez vimos ${detection.productosCotizados.slice(0, 2).join(" y ")}. ¿Le quedó alguna duda o ya nos vamos por el pedido?"
2. NO repitas precios genéricos ni explicaciones que YA le diste antes — checa el historial.
3. PREGUNTA DIRECTO si va a cerrar o si tiene una objeción específica.
4. Si dice "sí, va el pedido" → ACTIVA MODO CIERRE INMEDIATO (Regla AK): resumen + 1 pregunta crítica + link Stripe.
5. Si dice "es para después" → ofrece programar (tool 'programar_volumen_temporada') o agendar recordatorio.
6. Si dice "no, ya compré en otro lado" → no insistas. Agradece, pide feedback breve de por qué no, y deja la puerta abierta.
7. Si dice "tengo una duda sobre X" → resuélvela DIRECTO sin recotizar todo desde cero.

REGLAS ABSOLUTAS:
- NO le pidas "denos un momento" para revisar — TÚ TIENES el historial.
- NO repreguntes "¿qué tela buscaba?" — YA SABES (está arriba).
- NO empieces como si fuera cliente nuevo. Es un lead caliente que regresa.
=== FIN LEAD CALIENTE ===
`;
}