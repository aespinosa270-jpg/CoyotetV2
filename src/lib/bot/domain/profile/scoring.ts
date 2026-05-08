/**
 * Scoring del cliente: temperatura de compra, nivel de confianza, propensión
 * cross-sell, días entre compras, patrón de compra, predicción de siguiente
 * pedido.
 *
 * Todas las funciones son puras: reciben datos, devuelven números/strings.
 * No mutan ni hacen I/O.
 */

import type {
  ClientePerfil,
  MensajeHistorial,
  PropensionCross,
} from "../../types/domain";
import {
  contarSenalesCalientes,
  contarSenalesFrias,
  esTonoNegativo,
  esTonoPositivo,
  pideTela,
  pideUniforme,
} from "../sales/signals";

// ── Temperatura de compra ──────────────────────────────────────────

/**
 * Calcula el delta de temperatura para un mensaje específico.
 * No muta nada; devuelve un número (positivo = subir, negativo = bajar).
 *
 * Pesos:
 *  - Cada señal caliente: +15
 *  - Cada señal fría: -20
 *  - Cliente con cotización previa: +10 (más cerca del cierre)
 *  - Cliente con dirección registrada: +8
 *  - Cliente abandonó en etapa de pago: -10 (fricción reciente)
 */
export function calcularDeltaTemperatura(
  perfil: ClientePerfil,
  message: string
): number {
  let delta = 0;
  delta += contarSenalesCalientes(message) * 15;
  delta -= contarSenalesFrias(message) * 20;
  if (perfil.ultimaCotizacion) delta += 10;
  if (perfil.direccionEnvio) delta += 8;
  if (perfil.etapaAbandono === "pago") delta -= 10;
  return delta;
}

/**
 * Aplica el delta a la temperatura actual con suavizado.
 * Fórmula: nueva = actual + (delta × 0.3)
 *
 * Esto evita que UN solo mensaje brinque la temperatura 30 puntos. Hay que
 * mantener el comportamiento. Una racha de 3-4 mensajes calientes sí mueve
 * la aguja, pero un comentario aislado no.
 *
 * Resultado clamped a [0, 100].
 */
export function actualizarTemperatura(
  temperaturaActual: number,
  delta: number
): number {
  const next = temperaturaActual + delta * 0.3;
  return Math.max(0, Math.min(100, Math.round(next)));
}

// ── Nivel de confianza ─────────────────────────────────────────────

/**
 * Escanea TODO el historial del cliente y calcula confianza basada en tono.
 *
 * Pesos:
 *  - Mensaje positivo: +5
 *  - Mensaje negativo: -8 (los negativos pesan más; cuesta recuperar)
 *
 * Solo se cuentan mensajes del usuario (no respuestas del bot).
 * Resultado clamped a [0, 100].
 */
export function actualizarConfianza(
  confianzaActual: number,
  historial: MensajeHistorial[]
): number {
  let positivos = 0;
  let negativos = 0;
  for (const msg of historial) {
    if (msg.role !== "user") continue;
    if (esTonoPositivo(msg.content)) positivos++;
    if (esTonoNegativo(msg.content)) negativos++;
  }
  const next = confianzaActual + positivos * 5 - negativos * 8;
  return Math.max(0, Math.min(100, next));
}

// ── Propensión cross-sell ──────────────────────────────────────────

/**
 * Actualiza la propensión a comprar productos complementarios según lo
 * que el cliente pidió en el mensaje actual.
 *
 *  - Si pide tela → sube probabilidad de hilo (+25, max 90)
 *  - Si pide uniforme → sube probabilidad de elástico (+30, max 90)
 *
 * Devuelve un nuevo objeto; no muta el de entrada.
 */
export function actualizarPropensionCross(
  actual: PropensionCross,
  message: string
): PropensionCross {
  const next: PropensionCross = { ...actual };
  if (pideTela(message)) {
    next.hilos = Math.min(90, next.hilos + 25);
  }
  if (pideUniforme(message)) {
    next.elasticos = Math.min(90, next.elasticos + 30);
  }
  return next;
}

// ── Días entre compras ─────────────────────────────────────────────

/**
 * Estima el ciclo de compra del cliente.
 * Solo se calcula si tiene 2+ compras y tiene fechas válidas.
 *
 * Fórmula: (ultima_compra - primer_contacto) / (total_compras - 1)
 */
export function calcularDiasEntreCompras(
  perfil: ClientePerfil
): number | undefined {
  if (perfil.totalCompras < 2) return undefined;
  if (!perfil.ultimaFechaCompra || !perfil.primerContacto) return undefined;

  try {
    const inicio = new Date(perfil.primerContacto).getTime();
    const fin = new Date(perfil.ultimaFechaCompra).getTime();
    if (!Number.isFinite(inicio) || !Number.isFinite(fin)) return undefined;
    if (fin <= inicio) return undefined;

    const diasTotal = (fin - inicio) / 86_400_000;
    return Math.round(diasTotal / (perfil.totalCompras - 1));
  } catch {
    return undefined;
  }
}

// ── Patrón de compra ───────────────────────────────────────────────

/**
 * Genera la descripción humana del patrón de compra.
 * Ejemplo: "Compra cada ~14 días. Favorito: Sportok + Micropique. Ticket promedio: $1500"
 *
 * Devuelve undefined si no hay datos suficientes.
 */
export function calcularPatronCompra(
  perfil: ClientePerfil
): string | undefined {
  const dias = calcularDiasEntreCompras(perfil);
  if (!dias) return undefined;

  const favs =
    perfil.productosFavoritos.slice(0, 2).join(" + ") || "varios";
  const ticket = perfil.ticketPromedio
    ? `$${perfil.ticketPromedio.toFixed(0)}`
    : "N/A";
  return `Compra cada ~${dias} días. Favorito: ${favs}. Ticket promedio: ${ticket}`;
}

// ── Predicción de siguiente pedido ─────────────────────────────────

/**
 * Predice si el cliente está en su ventana de re-compra (≥ 80% del ciclo).
 * Devuelve un mensaje predictivo o undefined.
 *
 * Útil para alertas de reactivación: "este cliente debería ya estar
 * pidiendo, mándale un nudge".
 */
export function predecirSiguientePedido(
  perfil: ClientePerfil
): string | undefined {
  if (perfil.productosFavoritos.length === 0) return undefined;
  if (!perfil.ultimaFechaCompra) return undefined;

  const ultimaMs = new Date(perfil.ultimaFechaCompra).getTime();
  if (!Number.isFinite(ultimaMs)) return undefined;

  const diasDesde = Math.floor((Date.now() - ultimaMs) / 86_400_000);
  const ciclo = perfil.diasEntreCompras ?? 30;

  if (diasDesde >= ciclo * 0.8) {
    const favorito = perfil.productosFavoritos[0];
    return `Pronto pedirá ${favorito} (ciclo ${ciclo} días, van ${diasDesde} días)`;
  }
  return undefined;
}
