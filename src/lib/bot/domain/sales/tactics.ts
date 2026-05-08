/**
 * Selector de táctica de venta.
 *
 * Recibe el perfil del cliente y decide qué táctica activar para el siguiente
 * mensaje. El motor de prompts en intelligence/ usa esta táctica para inyectar
 * las instrucciones correctas a GPT.
 *
 * Reglas en orden de prioridad (la primera que matchea, gana):
 *
 *   1. cierre_directo     — temperatura ≥ 70 (cliente caliente, pregúntale por método de pago)
 *   2. urgencia_escasez   — temperatura ≥ 50 (tibio, empuja con urgencia real)
 *   3. manejo_objecion    — 2+ objeciones registradas (resolver antes de vender)
 *   4. fidelizacion_vip   — 3+ compras (cliente recurrente, hablarle como VIP)
 *   5. social_proof       — sin compras (cliente nuevo, dar confianza)
 *   6. valor_rendimiento  — default (vender por costo-por-prenda)
 *
 * NOTA: el orden importa. `manejo_objecion` viene DESPUÉS de las reglas de
 * temperatura porque si el cliente está caliente, queremos cerrar aunque
 * haya tenido objeciones antes.
 */

import { SALES } from "../../config/constants";
import type { ClientePerfil, Tactica } from "../../types/domain";

export function seleccionarTactica(perfil: ClientePerfil): Tactica {
  if (perfil.temperaturaCompra >= SALES.THRESHOLDS.HOT) {
    return "cierre_directo";
  }
  if (perfil.temperaturaCompra >= SALES.THRESHOLDS.WARM) {
    return "urgencia_escasez";
  }
  if (perfil.objecionesComunes.length > 1) {
    return "manejo_objecion";
  }
  if (perfil.totalCompras >= 3) {
    return "fidelizacion_vip";
  }
  if (perfil.totalCompras === 0) {
    return "social_proof";
  }
  return "valor_rendimiento";
}

/**
 * Etiqueta humana para mostrar en logs y dashboard.
 */
export function tacticaToLabel(t: Tactica): string {
  const map: Record<Tactica, string> = {
    cierre_directo: "Cierre directo",
    urgencia_escasez: "Urgencia / escasez",
    manejo_objecion: "Manejo de objeción",
    fidelizacion_vip: "Fidelización VIP",
    social_proof: "Prueba social",
    valor_rendimiento: "Valor / rendimiento",
  };
  return map[t] ?? "Desconocida";
}
