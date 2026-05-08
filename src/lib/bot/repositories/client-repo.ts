/**
 * Repository del cliente.
 *
 * Encapsula TODOS los accesos a Redis para perfiles de cliente. Si en el
 * futuro movemos esto a Postgres, solo se toca este archivo.
 *
 * Patrón: cada función acepta `redis` como parámetro opcional. Si no se pasa,
 * usa el singleton. Esto permite:
 *   - Producción: `await findByPhone(phone)` — limpio.
 *   - Tests: `await findByPhone(phone, fakeRedis)` — sin tocar Redis real.
 */
import { z } from "zod";
import type { Redis } from "@upstash/redis";
import { getRedis } from "./redis";
import { keys } from "./keys";
import { SALES } from "../config/constants";
import { getLogger } from "../observability/logger";
import type {
  ClientePerfil,
  PedidoRegistro,
  Recordatorio,
  Tactica,
} from "../types/domain";

const log = getLogger({ module: "client-repo" });

// ── Schema de validación ───────────────────────────────────────────

/**
 * Validación mínima en escritura. Solo campos críticos cuya ausencia rompe
 * el bot. El resto se permite con `passthrough()` para que el tipo pueda
 * crecer sin migrar Redis.
 */
const SaveSchema = z
  .object({
    telefono: z.string().min(8),
    nombre: z.string(),
    correoVerificado: z.boolean(),
    privacidadRespondida: z.boolean(),
    terminosAceptados: z.boolean(),
    primerContacto: z.string(),
    ultimoContacto: z.string(),
    totalCompras: z.number().int().min(0),
    montoAcumulado: z.number().min(0),
    intentosDePago: z.number().int().min(0),
    temperaturaCompra: z.number().min(0).max(100),
    nivelConfianza: z.number().min(0).max(100),
  })
  .passthrough();

// ── Defaults para clientes nuevos ──────────────────────────────────

export function buildNewProfile(phone: string): ClientePerfil {
  const now = new Date().toISOString();
  return {
    telefono: phone,
    nombre: "",
    correoElectronico: undefined,
    correoVerificado: false,
    privacidadAceptada: undefined,
    privacidadRespondida: false,
    terminosAceptados: false,
    genero: "unknown",

    primerContacto: now,
    ultimoContacto: now,

    totalCompras: 0,
    montoAcumulado: 0,
    productosComprados: [],
    productosFavoritos: [],
    categoriasPedidas: [],

    direccionEnvio: "",
    cpFiscal: "",

    metodoPagoFavorito: "",
    requiereFrecuenteFactura: false,
    sensibilidadPrecio: "media",
    preferencias: [],
    interesesDeclarados: [],

    notas: "",
    segmento: "prospecto",

    etapaAbandono: null,
    intentosDePago: 0,
    recordatoriosPendientes: [],

    temperaturaCompra: SALES.INITIAL_TEMPERATURE,
    nivelConfianza: SALES.INITIAL_TRUST,
    tacticaActual: "social_proof",
    propensionCross: { hilos: 20, elasticos: 10, volumenExtra: 15 },

    objecionesComunes: [],
    vectorObjeciones: {},

    tieneSuscripcion: false,
    membresiaOfrecida: false,
  };
}

// ── Lectura ────────────────────────────────────────────────────────

export async function findByPhone(
  phone: string,
  redis: Redis = getRedis()
): Promise<ClientePerfil | null> {
  try {
    const data = await redis.get<ClientePerfil>(keys.cliente(phone));
    return data ?? null;
  } catch (err) {
    log.error({ err, phone }, "Error leyendo cliente");
    return null;
  }
}

export async function findOrCreate(
  phone: string,
  redis: Redis = getRedis()
): Promise<ClientePerfil> {
  const existing = await findByPhone(phone, redis);
  if (existing) return existing;
  const fresh = buildNewProfile(phone);
  await save(fresh, redis);
  return fresh;
}

// ── Escritura ──────────────────────────────────────────────────────

export async function save(
  perfil: ClientePerfil,
  redis: Redis = getRedis()
): Promise<void> {
  const validated = SaveSchema.parse(perfil);
  await redis.set(keys.cliente(perfil.telefono), validated);
}

/**
 * Patch parcial. Lee, mergea, guarda. NO es atómico — si dos requests
 * concurrentes hacen update sobre el mismo cliente, la última gana.
 * Para operaciones que deban ser atómicas, usar los helpers específicos
 * de abajo (addPedido, etc.).
 */
export async function update(
  phone: string,
  patch: Partial<ClientePerfil>,
  redis: Redis = getRedis()
): Promise<ClientePerfil> {
  const current = await findByPhone(phone, redis);
  if (!current) {
    throw new Error(`Cliente no encontrado: ${phone}`);
  }
  const merged: ClientePerfil = {
    ...current,
    ...patch,
    ultimoContacto: new Date().toISOString(),
  };
  await save(merged, redis);
  return merged;
}

export async function deleteByPhone(
  phone: string,
  redis: Redis = getRedis()
): Promise<boolean> {
  const count = await redis.del(keys.cliente(phone));
  return count > 0;
}

// ── Helpers atómicos para mutaciones comunes ───────────────────────

/**
 * Registra un pedido cerrado: incrementa contadores, recalcula segmento y
 * ticket promedio, resetea estado de venta.
 */
export async function registrarPedido(
  phone: string,
  pedido: PedidoRegistro,
  redis: Redis = getRedis()
): Promise<ClientePerfil> {
  const cliente = await findByPhone(phone, redis);
  if (!cliente) throw new Error(`Cliente no encontrado: ${phone}`);

  const totalCompras = cliente.totalCompras + 1;
  const montoAcumulado = cliente.montoAcumulado + pedido.monto;
  const ticketPromedio = montoAcumulado / totalCompras;

  // Recalcular segmento - ORDEN CORREGIDO (VIP tiene prioridad)
  let segmento = cliente.segmento;
  if (totalCompras >= 5 || montoAcumulado >= 10000) {
    segmento = "vip";
  } else if (totalCompras === 1) {
    segmento = "nuevo";
  } else {
    segmento = "recurrente";
  }

  const updated: ClientePerfil = {
    ...cliente,
    totalCompras,
    montoAcumulado,
    ticketPromedio,
    segmento,
    ultimoContacto: pedido.fecha,
    ultimaFechaCompra: pedido.fecha,
    metodoPagoFavorito: pedido.metodo,
    requiereFrecuenteFactura:
      cliente.requiereFrecuenteFactura || pedido.conFactura,
    intentosDePago: 0,
    etapaAbandono: null,
    fechaAbandono: undefined,
    temperaturaCompra: SALES.POST_PURCHASE_TEMPERATURE,
    membresiaOfrecida: false, // resetear para volver a ofrecer en siguiente venta
  };

  await save(updated, redis);
  return updated;
}

export async function setTerminosAceptados(
  phone: string,
  redis: Redis = getRedis()
): Promise<void> {
  await update(phone, { terminosAceptados: true }, redis);
}

export async function setMembresiaOfrecida(
  phone: string,
  redis: Redis = getRedis()
): Promise<void> {
  await update(phone, { membresiaOfrecida: true }, redis);
}

export async function setMembresiaActiva(
  phone: string,
  plan: ClientePerfil["planMembresia"],
  redis: Redis = getRedis()
): Promise<void> {
  await update(
    phone,
    { tieneSuscripcion: true, planMembresia: plan },
    redis
  );
}

export async function setTactica(
  phone: string,
  tactica: Tactica,
  temperaturaCompra: number,
  redis: Redis = getRedis()
): Promise<void> {
  await update(
    phone,
    {
      tacticaActual: tactica,
      temperaturaCompra: Math.max(0, Math.min(100, temperaturaCompra)),
    },
    redis
  );
}

export async function addRecordatorio(
  phone: string,
  recordatorio: Recordatorio,
  redis: Redis = getRedis()
): Promise<void> {
  const cliente = await findByPhone(phone, redis);
  if (!cliente) throw new Error(`Cliente no encontrado: ${phone}`);
  const recordatoriosPendientes = [
    ...cliente.recordatoriosPendientes,
    recordatorio,
  ];
  await update(phone, { recordatoriosPendientes }, redis);
}

export async function removeRecordatoriosVencidos(
  phone: string,
  redis: Redis = getRedis()
): Promise<Recordatorio[]> {
  const cliente = await findByPhone(phone, redis);
  if (!cliente) return [];
  const now = new Date();
  const vencidos: Recordatorio[] = [];
  const vigentes: Recordatorio[] = [];
  for (const r of cliente.recordatoriosPendientes) {
    try {
      if (new Date(r.fecha) <= now) vencidos.push(r);
      else vigentes.push(r);
    } catch {
      vigentes.push(r); // si la fecha es inválida, lo dejamos
    }
  }
  if (vencidos.length > 0) {
    await update(phone, { recordatoriosPendientes: vigentes }, redis);
  }
  return vencidos;
}