/**
 * Evaluador de sourcing operativo.
 *
 * Reglas reales de Coyote Textil:
 *   - ≤ 1 tonelada → "1 a 2 días hábiles" (entrega normal, sin cola)
 *   - > 1 tonelada → "te confirmo timing al cierre" + REQUIRES SOURCING (cola)
 *
 * Por qué tan rápido: Coyote tiene bodega Guatemala 97 + Plomo 203 con
 * stock alto rotación + red de proveedores predecibles. Pedidos <=1tn
 * salen en 1-2 días siempre, sin importar la cantidad.
 *
 * El cliente NUNCA ve nada de sourcing/proveedores.
 * Jack/Stephany resuelven la cola en /crm/admin/sourcing-queue.
 */

export interface SourcingEvaluation {
  requiresSourcing: boolean;       // si entra a cola operativa
  sourcingDays: number | null;     // dias prometidos al cliente
  sourcingStatus: string | null;   // "PENDING" si requiere sourcing
  reasonLabel: string;             // descripcion legible (interno)
  customerMessage: string;         // texto que el bot puede usar al cotizar
}

const TONNE_KG = 1000;

export function evaluateSourcing(totalKg: number): SourcingEvaluation {
  if (totalKg <= 0 || !isFinite(totalKg)) {
    return {
      requiresSourcing: false,
      sourcingDays: 2,
      sourcingStatus: null,
      reasonLabel: "cantidad invalida o cero",
      customerMessage: "1 a 2 dias habiles",
    };
  }

  if (totalKg <= TONNE_KG) {
    return {
      requiresSourcing: false,
      sourcingDays: 2,
      sourcingStatus: null,
      reasonLabel: "entrega normal (<=1tn)",
      customerMessage: "1 a 2 dias habiles",
    };
  }

  // > 1 tonelada → cola operativa
  return {
    requiresSourcing: true,
    sourcingDays: 5,                 // promesa interna default conservadora
    sourcingStatus: "PENDING",
    reasonLabel: "sourcing operativo (>1tn)",
    customerMessage: "te confirmo el timing exacto al cierre",
  };
}

/**
 * Suma los kilos de los items de una orden.
 * SOLO cuenta items con unit = "Kilo" o "KILO".
 * Items en PIEZA o METRO NO entran al cálculo de toneladas.
 */
export function calcularKilosTotales(
  items: Array<{ quantity: number; unit?: string | null }>
): number {
  return items
    .filter((i) => {
      if (!i.unit) return true; // sin unit declarado, asumir kg (default del bot)
      const u = String(i.unit).toLowerCase();
      return u.startsWith("kil");
    })
    .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
}