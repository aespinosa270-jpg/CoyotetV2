/**
 * Segmentación del cliente.
 *
 * Función pura que decide en qué segmento cae el cliente según su historial.
 * Reglas en orden de prioridad:
 *
 *   1. vip:       totalCompras ≥ 5  OR  montoAcumulado ≥ $10,000
 *   2. recurrente: totalCompras 2-4
 *   3. nuevo:     totalCompras = 1
 *   4. inactivo:  sin compras Y sin contacto en 90+ días
 *   5. prospecto: default (sin compras pero contacto reciente)
 */

import type { ClientePerfil, Segmento } from "../../types/domain";

const VIP_THRESHOLD_COMPRAS = 5;
const VIP_THRESHOLD_MONTO = 10_000;
const INACTIVO_DIAS = 90;

export function calcularSegmento(perfil: ClientePerfil): Segmento {
  // VIP por compras o por monto acumulado
  if (perfil.totalCompras >= VIP_THRESHOLD_COMPRAS) return "vip";
  if (perfil.montoAcumulado >= VIP_THRESHOLD_MONTO) return "vip";

  // Recurrente: 2-4 compras
  if (perfil.totalCompras >= 2) return "recurrente";

  // Nuevo: 1 compra
  if (perfil.totalCompras === 1) return "nuevo";

  // Sin compras: prospecto o inactivo
  if (perfil.ultimoContacto) {
    try {
      const ms = new Date(perfil.ultimoContacto).getTime();
      if (Number.isFinite(ms)) {
        const diasInactivo = Math.floor((Date.now() - ms) / 86_400_000);
        if (diasInactivo > INACTIVO_DIAS) return "inactivo";
      }
    } catch {
      // ignore date parse errors, treat as prospecto
    }
  }

  return "prospecto";
}

/**
 * Para mostrar en mensajes/UI: emoji que representa el segmento.
 */
export function segmentoToEmoji(segmento: Segmento): string {
  const map: Record<Segmento, string> = {
    prospecto: "👋",
    nuevo: "🆕",
    recurrente: "🔁",
    vip: "👑",
    inactivo: "💤",
  };
  return map[segmento] ?? "❓";
}

/**
 * Para reportes en el admin dashboard.
 */
export function segmentoToLabel(segmento: Segmento): string {
  const map: Record<Segmento, string> = {
    prospecto: "Prospecto",
    nuevo: "Cliente nuevo",
    recurrente: "Cliente recurrente",
    vip: "Cliente VIP",
    inactivo: "Cliente inactivo",
  };
  return map[segmento] ?? "Desconocido";
}
