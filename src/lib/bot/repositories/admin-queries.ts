/**
 * Queries agregadas para el dashboard admin del bot v2.
 *
 * Todas las funciones leen de Redis (Upstash) directamente. No hay cache
 * intermedio Ã¢â‚¬â€ el dashboard es para uso interno, no se renderiza con
 * mucho trÃƒÂ¡fico.
 *
 * ConvenciÃƒÂ³n de keys de Redis para v2:
 *   v2:cliente:{phone}          - perfil del cliente
 *   v2:historial:{phone}        - lista de mensajes
 *   v2:resumen:{phone}          - resumen semÃƒÂ¡ntico
 *   v2:memoria:{phone}          - hechos episÃƒÂ³dicos
 *   v2:pedidos:{phone}          - pedidos del cliente
 *   v2:metrics:day:{YYYY-MM-DD} - contadores agregados del dÃƒÂ­a (futuro)
 *
 * Para listar TODOS los clientes en Redis usamos SCAN con pattern v2:cliente:*.
 */
import type { Redis } from "@upstash/redis";
import { getRedis } from "./redis";
import { keys } from "./keys";
import type { ClientePerfil, MensajeHistorial } from "../types/domain";
import type { MemoriaEpisodica } from "../intelligence/memory/types";
import { OBJECION_LABELS, type VectorObjeciones } from "../intelligence/objections/types";
import { getLogger } from "../observability/logger";

const log = getLogger({ module: "admin-queries" });

// Ã¢â€â‚¬Ã¢â€â‚¬ Tipos pÃƒÂºblicos del dashboard Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export interface ConversacionResumen {
  phone: string;
  nombre: string;
  segmento: string;
  totalCompras: number;
  temperaturaCompra: number;
  nivelConfianza: number;
  tacticaActual: string;
  ultimoContacto: string;
  topObjeciones: Array<{ label: string; score: number }>;
  // FASE B: lead scoring
  leadScore?: string;
  tipoNegocio?: string;
  volumenTipicoKg?: number;
  // INBOX: estado de respuesta para el agente humano
  /** true si el ULTIMO mensaje es del cliente (espera respuesta). */
  sinResponder?: boolean;
  /** Preview del ultimo mensaje (primeros ~60 chars). */
  ultimoMensajeTexto?: string;
  /** Quien mando el ultimo mensaje: "user" | "assistant" | "tool". */
  ultimoMensajeRole?: string;
  /** Timestamp del ultimo mensaje (para ordenar). */
  ultimoMensajeAt?: string;
}

export interface ConversacionDetallada {
  perfil: ClientePerfil;
  historial: MensajeHistorial[];
  resumen: string | null;
  memoria: MemoriaEpisodica | null;
  pedidos: any[];
  topObjeciones: Array<{ label: string; score: number }>;
}

export interface DashboardMetrics {
  totalClientes: number;
  clientesNuevosUltimos7Dias: number;
  clientesPorSegmento: Record<string, number>;
  topObjecionesGlobales: Array<{ label: string; total: number; clientesAfectados: number }>;
  temperaturaPromedio: number;
  confianzaPromedio: number;
  totalPedidos: number;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Listado de conversaciones Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const SCAN_BATCH = 100;
const PHONE_KEY_PREFIX = "v2:cliente:";

/**
 * Lista todos los telÃƒÂ©fonos con perfil registrado en v2.
 * Usa SCAN, no KEYS Ã¢â‚¬â€ es safe en producciÃƒÂ³n incluso con muchos clientes.
 */
async function scanAllPhones(redis: Redis): Promise<string[]> {
  const phones: string[] = [];
  let cursor: string | number = 0;

  do {
    const result: [string | number, string[]] = await redis.scan(cursor as any, {
      match: `${PHONE_KEY_PREFIX}*`,
      count: SCAN_BATCH,
    });
    const nextCursor: string | number = result[0];
    const keys: string[] = result[1];
    cursor = nextCursor;
    for (const k of keys) {
      const phone = k.replace(PHONE_KEY_PREFIX, "");
      if (phone) phones.push(phone);
    }
  } while (cursor !== "0" && cursor !== 0);

  return phones;
}

function topObjsFromVector(vec: VectorObjeciones | undefined): Array<{ label: string; score: number }> {
  if (!vec) return [];
  return Object.entries(vec)
    .filter(([_, score]) => score > 0.5)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([tipo, score]) => ({
      label: OBJECION_LABELS[tipo as keyof typeof OBJECION_LABELS] ?? tipo,
      score: Number(score),
    }));
}

/**
 * Lista resumida de conversaciones, ordenada por ultimoContacto desc.
 * Paginada con offset/limit.
 */
export async function listConversaciones(
  options: {
    offset?: number;
    limit?: number;
    segmentoFilter?: string;
    redis?: Redis;
  } = {}
): Promise<{ items: ConversacionResumen[]; total: number }> {
  const redis = options.redis ?? getRedis();
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 50;

  try {
    const phones = await scanAllPhones(redis);

    // Cargar perfiles en batch (Redis pipeline-style con Promise.all)
    const perfiles = await Promise.all(
      phones.map(async (phone) => {
        try {
          return await redis.get<ClientePerfil>(`${PHONE_KEY_PREFIX}${phone}`);
        } catch {
          return null;
        }
      })
    );

    const perfilesValidos = perfiles.filter(
      (p): p is ClientePerfil => !!p
    );

    // INBOX: ultimo mensaje del historial de cada cliente (paralelo)
    const ultimos = await Promise.all(
      perfilesValidos.map(async (p) => {
        try {
          const histRaw = await redis.get(keys.historial(p.telefono));
          const hist = histRaw as
            | { mensajes: MensajeHistorial[] }
            | MensajeHistorial[]
            | null;
          const arr = Array.isArray(hist)
            ? hist
            : (hist as any)?.mensajes ?? [];
          if (!arr || arr.length === 0) return null;
          const ult = arr[arr.length - 1];
          // Buscar el timestamp mas reciente disponible recorriendo
          // hacia atras (algunos mensajes viejos no tienen timestamp).
          let ultimoTs: string | undefined;
          for (let k = arr.length - 1; k >= 0; k--) {
            if (arr[k]?.timestamp) {
              ultimoTs = arr[k].timestamp as string;
              break;
            }
          }
          return {
            role: ult?.role as string | undefined,
            texto: typeof ult?.content === "string" ? ult.content : "",
            ts: ultimoTs,
          };
        } catch {
          return null;
        }
      })
    );

    let resumenes: ConversacionResumen[] = perfilesValidos
      .map((p, i) => {
        const u = ultimos[i];
        return {
          phone: p.telefono,
          nombre: p.nombre || "(sin nombre)",
          segmento: p.segmento || "prospecto",
          totalCompras: p.totalCompras || 0,
          temperaturaCompra: p.temperaturaCompra ?? 30,
          nivelConfianza: p.nivelConfianza ?? 40,
          tacticaActual: p.tacticaActual || "valor_rendimiento",
          ultimoContacto: p.ultimoContacto || new Date(0).toISOString(),
          topObjeciones: topObjsFromVector(
            p.vectorObjeciones as VectorObjeciones
          ),
          leadScore: (p as any).leadScore,
          tipoNegocio: (p as any).tipoNegocio,
          volumenTipicoKg: (p as any).volumenTipicoKg,
          sinResponder: u?.role === "user",
          ultimoMensajeTexto: u?.texto ? Array.from(u.texto).slice(0, 60).join("") : undefined,
          ultimoMensajeRole: u?.role,
          ultimoMensajeAt: u?.ts || p.ultimoContacto,
        };
      })
      .sort((a, b) => {
        // Orden estilo WhatsApp/Telegram: la conversacion con
        // actividad MAS RECIENTE arriba, sin importar quien hablo.
        const ta = new Date(a.ultimoMensajeAt || a.ultimoContacto).getTime();
        const tb = new Date(b.ultimoMensajeAt || b.ultimoContacto).getTime();
        return tb - ta;
      });

    // Filtros opcionales
    if (options.segmentoFilter) {
      resumenes = resumenes.filter((r) => r.segmento === options.segmentoFilter);
    }

    const total = resumenes.length;
    const items = resumenes.slice(offset, offset + limit);
    return { items, total };
  } catch (err) {
    log.error({ err }, "Error listando conversaciones");
    return { items: [], total: 0 };
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Detalle de una conversaciÃƒÂ³n Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export async function getConversacionDetallada(
  phone: string,
  redis: Redis = getRedis()
): Promise<ConversacionDetallada | null> {
  try {
    const [perfil, historial, resumen, memoria, pedidos] = await Promise.all([
      redis.get<ClientePerfil>(keys.cliente(phone)).catch(() => null),
      redis.get<{ mensajes: MensajeHistorial[] } | MensajeHistorial[]>(keys.historial(phone)).catch(() => null),
      redis.get<string>(keys.resumenSemantico(phone)).catch(() => null),
      redis.get<MemoriaEpisodica>(keys.memoria(phone)).catch(() => null),
      redis.get<any[]>(keys.pedidos(phone)).catch(() => null),
    ]);

    if (!perfil) return null;

    // El historial puede venir como array directo o como { mensajes: [...] } segÃƒÂºn se haya guardado
    let mensajesArr: MensajeHistorial[] = [];
    if (Array.isArray(historial)) mensajesArr = historial;
    else if (historial && Array.isArray((historial as any).mensajes))
      mensajesArr = (historial as any).mensajes;

    return {
      perfil,
      historial: mensajesArr,
      resumen: resumen ?? null,
      memoria: memoria ?? null,
      pedidos: pedidos ?? [],
      topObjeciones: topObjsFromVector(perfil.vectorObjeciones as VectorObjeciones),
    };
  } catch (err) {
    log.error({ err, phone }, "Error obteniendo conversaciÃƒÂ³n detallada");
    return null;
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ MÃƒÂ©tricas agregadas para el dashboard Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export async function getDashboardMetrics(
  redis: Redis = getRedis()
): Promise<DashboardMetrics> {
  try {
    const phones = await scanAllPhones(redis);
    const perfiles = (
      await Promise.all(
        phones.map(async (phone) => {
          try {
            return await redis.get<ClientePerfil>(`${PHONE_KEY_PREFIX}${phone}`);
          } catch {
            return null;
          }
        })
      )
    ).filter((p): p is ClientePerfil => !!p);

    const sieteDiasAtras = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const clientesNuevos7d = perfiles.filter((p) => {
      const t = new Date(p.primerContacto ?? 0).getTime();
      return t >= sieteDiasAtras;
    }).length;

    const segmentosCount: Record<string, number> = {};
    for (const p of perfiles) {
      const s = p.segmento || "prospecto";
      segmentosCount[s] = (segmentosCount[s] ?? 0) + 1;
    }

    const objAcum: Record<string, { total: number; clientes: number }> = {};
    for (const p of perfiles) {
      const v = (p.vectorObjeciones as VectorObjeciones) ?? {};
      for (const [tipo, score] of Object.entries(v)) {
        if (score > 0.5) {
          if (!objAcum[tipo]) objAcum[tipo] = { total: 0, clientes: 0 };
          objAcum[tipo].total += Number(score);
          objAcum[tipo].clientes += 1;
        }
      }
    }
    const topObjecionesGlobales = Object.entries(objAcum)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 5)
      .map(([tipo, data]) => ({
        label: OBJECION_LABELS[tipo as keyof typeof OBJECION_LABELS] ?? tipo,
        total: Math.round(data.total * 10) / 10,
        clientesAfectados: data.clientes,
      }));

    const temperaturaPromedio = perfiles.length
      ? Math.round(
          perfiles.reduce((acc, p) => acc + (p.temperaturaCompra ?? 30), 0) /
            perfiles.length
        )
      : 0;
    const confianzaPromedio = perfiles.length
      ? Math.round(
          perfiles.reduce((acc, p) => acc + (p.nivelConfianza ?? 40), 0) /
            perfiles.length
        )
      : 0;

    const totalPedidos = perfiles.reduce(
      (acc, p) => acc + (p.totalCompras || 0),
      0
    );

    return {
      totalClientes: perfiles.length,
      clientesNuevosUltimos7Dias: clientesNuevos7d,
      clientesPorSegmento: segmentosCount,
      topObjecionesGlobales,
      temperaturaPromedio,
      confianzaPromedio,
      totalPedidos,
    };
  } catch (err) {
    log.error({ err }, "Error calculando mÃƒÂ©tricas");
    return {
      totalClientes: 0,
      clientesNuevosUltimos7Dias: 0,
      clientesPorSegmento: {},
      topObjecionesGlobales: [],
      temperaturaPromedio: 0,
      confianzaPromedio: 0,
      totalPedidos: 0,
    };
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Top objeciones globales (drill-down) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export interface ObjecionDrillDown {
  tipo: string;
  label: string;
  clientes: Array<{ phone: string; nombre: string; score: number; ultimoContacto: string }>;
}

export async function getObjeccionDrilldown(
  tipo: string,
  limit: number = 20,
  redis: Redis = getRedis()
): Promise<ObjecionDrillDown> {
  try {
    const phones = await scanAllPhones(redis);
    const perfiles = (
      await Promise.all(
        phones.map((phone) => redis.get<ClientePerfil>(`${PHONE_KEY_PREFIX}${phone}`).catch(() => null))
      )
    ).filter((p): p is ClientePerfil => !!p);

    const clientes = perfiles
      .map((p) => {
        const score = ((p.vectorObjeciones as VectorObjeciones) ?? {})[tipo as keyof VectorObjeciones];
        if (!score || score < 0.5) return null;
        return {
          phone: p.telefono,
          nombre: p.nombre || "(sin nombre)",
          score: Number(score),
          ultimoContacto: p.ultimoContacto || "",
        };
      })
      .filter((c): c is NonNullable<typeof c> => !!c)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      tipo,
      label: OBJECION_LABELS[tipo as keyof typeof OBJECION_LABELS] ?? tipo,
      clientes,
    };
  } catch (err) {
    log.error({ err, tipo }, "Error en drilldown objeciÃƒÂ³n");
    return { tipo, label: tipo, clientes: [] };
  }
}


