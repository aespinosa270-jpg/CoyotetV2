/**
 * Calculador de envío.
 *
 * Función pura: recibe productos + CP + subtotal + factura, devuelve un
 * objeto `ResultadoEnvio` con todos los componentes desglosados.
 *
 * No toca Redis, no llama a OpenAI, no hace I/O. Esto la hace 100% testeable
 * y predecible.
 *
 * Lógica heredada del monolito v1, refactorizada en componentes:
 *
 *   total = subtotal + flete + traslado + tarifa + iva
 *
 *   donde:
 *     flete    → costo de manejar los bultos (escalonado por # rollos)
 *     traslado → costo de mover el camión (diésel × markup × vehículos)
 *                o paquetería Skydropx si está fuera de zona
 *     tarifa   → fee fijo por servicio
 *     iva      → 16% si el cliente pide factura
 */

import { SHIPPING, TAX } from "../../config/constants";
import { resolverZona, type TipoEnvio } from "./zones";

// ── Tipos públicos ─────────────────────────────────────────────────

export interface ProductoEnvio {
  /** Nombre o ID del producto. Solo para reporte; no afecta el cálculo. */
  nombre: string;
  /** Peso del bulto en kilos. */
  kg: number;
  /** Si el producto se vende por rollo de tamaño no estándar (Flanel = 27 kg). */
  kgPorRollo?: number;
  /** True si es un rollo cerrado (no fracción). Default: true. */
  esRollo?: boolean;
}

export interface ResultadoEnvio {
  totalKilos: number;
  totalRollos: number;
  /** Tarifa por manejo de bultos (escalonada). */
  flete: number;
  /** Costo de transporte. Diésel para COYOTE, base+sobrepeso para SKYDROPX. */
  traslado: number;
  /** Vehículos requeridos (siempre ≥ 1). */
  vehiculos: number;
  /** Tarifa de colocacion: $200 fijos si el pedido incluye rollo completo; 0 si no. */
  tarifaColocacion: number;
  /** Tarifa fija de servicio. */
  tarifaServicio: number;
  tipoEnvio: TipoEnvio;
  zonaEtiqueta: string;
  distanciaKm: number;
  /** Subtotal de productos + flete + traslado + tarifa (antes de IVA). */
  base: number;
  /** IVA. 0 si no se pidió factura. */
  iva: number;
  /** Total final (base + IVA). */
  total: number;
  /** CP usado para el cálculo (después de limpieza). */
  cpUsado: string;
  /** True si el CP de entrada era inválido y se usó fallback. */
  cpEraInvalido: boolean;
  /** Texto humano listo para enviar al cliente. */
  desglose: string;
}

// ── Cálculo de rollos ──────────────────────────────────────────────

function calcularRollos(productos: ProductoEnvio[]): number {
  let total = 0;
  for (const p of productos) {
    const kgPorRollo = p.kgPorRollo ?? SHIPPING.KG_PER_ROLL;
    total += Math.ceil(p.kg / kgPorRollo);
  }
  return Math.max(1, total);
}

// ── Tarifa por manejo de bultos (FLETE) ────────────────────────────

function calcularFlete(totalKilos: number, totalRollos: number): number {
  if (totalKilos < 10 && totalRollos === 1) return 150;
  if (totalRollos === 1) return 200;
  if (totalRollos <= 4) return 250;
  if (totalRollos <= 10) return 300;
  if (totalRollos <= 15) return 400;
  if (totalRollos <= 20) return 500;
  return 1000;
}

// ── Costo de traslado ──────────────────────────────────────────────

function calcularTrasladoCoyote(
  distanciaKm: number,
  totalRollos: number
): { traslado: number; vehiculos: number } {
  const vehiculos = Math.max(
    1,
    Math.ceil(totalRollos / SHIPPING.MAX_ROLLS_PER_VEHICLE)
  );
  const kmIdaVuelta = distanciaKm * 2;
  const litros = (kmIdaVuelta / 100) * SHIPPING.LITERS_PER_100KM;
  const traslado =
    litros *
    SHIPPING.DIESEL_PRICE_PER_LITER *
    SHIPPING.OPERATIONAL_MARKUP *
    vehiculos;
  return { traslado, vehiculos };
}

function calcularTrasladoSkydropx(totalKilos: number): number {
  let traslado = 180;
  if (totalKilos > 5) {
    traslado += (totalKilos - 5) * 12;
  }
  return traslado;
}

// ── Calculador principal ───────────────────────────────────────────

export interface CalcularEnvioInput {
  productos: ProductoEnvio[];
  cp: string;
  /** Precio total de los productos antes del envío (MXN). */
  subtotal: number;
  /** Si true, se aplica IVA 16% al total. */
  requiereFactura: boolean;
}

export function calcularEnvio(input: CalcularEnvioInput): ResultadoEnvio {
  const { productos, cp, subtotal, requiereFactura } = input;

  // Validar y limpiar CP
  const cpLimpio = cp.replace(/\D/g, "").padStart(5, "0").slice(0, 5);
  const cpEraInvalido =
    !/^\d{5}$/.test(cpLimpio) || parseInt(cpLimpio, 10) === 0;
  const cpUsado = cpEraInvalido ? "99999" : cpLimpio;

  // Resolver zona
  const zona = resolverZona(cpUsado);

  // Pesos y rollos
  const totalKilos = productos.reduce((acc, p) => acc + p.kg, 0);
  const totalRollos = calcularRollos(productos);

  // Componentes
  const flete = calcularFlete(totalKilos, totalRollos);

  let traslado: number;
  let vehiculos: number;
  if (zona.tipo === "COYOTE") {
    const r = calcularTrasladoCoyote(zona.distanciaKm, totalRollos);
    traslado = r.traslado;
    vehiculos = r.vehiculos;
  } else {
    traslado = calcularTrasladoSkydropx(totalKilos);
    vehiculos = 1;
  }

  const tarifaServicio = SHIPPING.FIXED_SERVICE_FEE;
  // Colocacion: $200 fijos por pedido si incluye al menos un rollo completo.
  // Criterio: producto marcado esRollo o con kg >= al rollo completo.
  const hayRollo = productos.some(
    (p) => p.esRollo === true || p.kg >= (p.kgPorRollo ?? SHIPPING.KG_PER_ROLL)
  );
  const tarifaColocacion = hayRollo ? SHIPPING.PLACEMENT_FEE : 0;
  const base = subtotal + flete + traslado + tarifaServicio + tarifaColocacion;
  // IVA: SOLO sobre el subtotal de productos (no flete, no traslado, no tarifas).
  const iva = requiereFactura ? subtotal * TAX.IVA_RATE : 0;
  const total = base + iva;

  // Desglose para el cliente
  const desglose = construirDesglose({
    tarifaColocacion,
    subtotal,
    flete,
    traslado,
    tarifaServicio,
    base,
    iva,
    total,
    requiereFactura,
    zona,
  });

  return {
    totalKilos,
    totalRollos,
    flete,
    traslado: Math.round(traslado * 100) / 100,
    vehiculos,
    tarifaServicio,
    tarifaColocacion,
    tipoEnvio: zona.tipo,
    zonaEtiqueta: zona.etiqueta,
    distanciaKm: zona.distanciaKm,
    base: Math.round(base * 100) / 100,
    iva: Math.round(iva * 100) / 100,
    total: Math.round(total * 100) / 100,
    cpUsado,
    cpEraInvalido,
    desglose,
  };
}

// ── Construcción del texto de desglose ─────────────────────────────

function construirDesglose(args: {
  tarifaColocacion: number;
  subtotal: number;
  flete: number;
  traslado: number;
  tarifaServicio: number;
  base: number;
  iva: number;
  total: number;
  requiereFactura: boolean;
  zona: ReturnType<typeof resolverZona>;
}): string {
  const {
    subtotal,
    flete,
    traslado,
    tarifaServicio,
    base,
    iva,
    total,
    requiereFactura,
    zona,
    tarifaColocacion,
  } = args;

  const lineaTraslado =
    zona.tipo === "COYOTE"
      ? `Traslado (flotilla Coyote, ${zona.distanciaKm} km — ${zona.etiqueta})`
      : `Traslado (paquetería Skydropx — ${zona.etiqueta})`;

  const lineas = [
    `📦 *Desglose de su cotización*`,
    `• Subtotal productos: $${subtotal.toFixed(2)} MXN`,
    `• Flete (manejo de bultos): $${flete.toFixed(2)}`,
    `• ${lineaTraslado}: $${traslado.toFixed(2)}`,
    `• Tarifa de servicio: $${tarifaServicio.toFixed(2)}`,
    ...(tarifaColocacion > 0
      ? [`• Tarifa de colocacion (rollo): $${tarifaColocacion.toFixed(2)}`]
      : []),
    `• Base: $${base.toFixed(2)}`,
  ];
  if (requiereFactura) {
    lineas.push(`• IVA 16%: $${iva.toFixed(2)}`);
  }
  lineas.push(`• *TOTAL: $${total.toFixed(2)} MXN*`);
  return lineas.join("\n");
}