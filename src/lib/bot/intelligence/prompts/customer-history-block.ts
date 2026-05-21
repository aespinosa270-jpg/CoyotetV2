/**
 * Formatea el historial del cliente para inyectarlo al system prompt.
 *
 * Si NO es recurrente → string vacío (no agregar bloque).
 * Si es recurrente → bloque rico con últimos productos, ticket, frecuencia.
 */
import type { CustomerHistory } from "../profile/customer-history";

export function buildCustomerHistoryBlock(
  history: CustomerHistory,
  nombre?: string
): string {
  if (!history.esRecurrente || !history.ultimaOrden) {
    return "";
  }

  const nombreCorto = nombre?.split(" ")[0] || "cliente";

  const itemsTxt = history.ultimaOrden.items
    .map((it) => {
      const color = it.color ? ` ${it.color}` : "";
      const qty = it.cantidad ? `${it.cantidad} ` : "";
      return `${qty}${it.titulo}${color}`;
    })
    .join(", ");

  const productosTxt = history.productosFavoritos.length > 0
    ? history.productosFavoritos.join(", ")
    : "varios productos";

  const ticketAcum = history.ticketAcumulado.toLocaleString("es-MX", {
    maximumFractionDigits: 0,
  });
  const ticketProm = history.ticketPromedio.toLocaleString("es-MX", {
    maximumFractionDigits: 0,
  });
  const ultimoTotal = history.ultimaOrden.total.toLocaleString("es-MX", {
    maximumFractionDigits: 0,
  });

  const recurrenciaTag =
    history.totalOrdenes >= 5
      ? "🏆 CLIENTE VIP (5+ órdenes)"
      : history.totalOrdenes >= 2
        ? "⭐ CLIENTE RECURRENTE"
        : "🔄 SEGUNDA COMPRA";

  return `
=== HISTORIAL DEL CLIENTE (CRÍTICO — úsalo) ===
${recurrenciaTag}
📦 Total de órdenes anteriores: ${history.totalOrdenes}
💰 Ticket acumulado: $${ticketAcum} MXN (promedio $${ticketProm}/orden)
🕒 Última compra: hace ${history.ultimaOrden.diasDesde} ${history.ultimaOrden.diasDesde === 1 ? "día" : "días"} — ${itemsTxt} — Total $${ultimoTotal}
🏅 Productos favoritos: ${productosTxt}

REGLAS PARA ESTE CLIENTE RECURRENTE:
1. SALÚDALO PERSONALMENTE: usa "${nombreCorto}" — algo como "¡Qué onda ${nombreCorto}, bienvenido de vuelta!" o "${nombreCorto}, gusto verlo otra vez".
2. RECONOCE su historia: "La última vez se llevó ${itemsTxt}. ¿Va por algo similar o probamos otra cosa?"
3. NO REPITAS info básica que ya conoce: ubicación de bodega/tienda, tiempos de envío, precios genéricos.
4. SUGIERE primero sus PRODUCTOS FAVORITOS antes de mostrar otras opciones.
5. CONFIANZA EXTRA: trátalo como amigo de la casa. Menos formal, más directo al grano.
6. Si lleva >30 días sin comprar, ofrece: "¿Le mando catálogo de lo nuevo o vamos sobre lo de siempre?"
7. Después de cerrar, puedes proponer: "¿Repetimos cantidades parecidas a la última vez?"
=== FIN HISTORIAL ===
`;
}