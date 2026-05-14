/**
 * Handlers de tools Fase 12:
 *  - registrar_tela_no_manejada
 *  - programar_volumen_temporada
 */
import type { BotContext } from "../core/types";
import {
  trackTelaNoManejada,
  trackProgramacionVolumen,
} from "../services/crm/tela-tracker";
import { getLogger } from "../observability/logger";

const log = getLogger({ module: "tools/fase12" });

// ── registrar_tela_no_manejada ──────────────────────────────────────

export interface RegistrarTelaArgs {
  tela_identificada: string;
  descripcion?: string;
  cantidad_kg?: number;
  frecuencia?: "mensual" | "quincenal" | "unica" | "estacional" | "desconocida";
  uso_final?: string;
}

export async function ejecutarRegistrarTelaNoManejada(
  args: RegistrarTelaArgs,
  ctx: BotContext
): Promise<unknown> {
  const phone = ctx.message.from.id;

  const result = await trackTelaNoManejada({
    clientePhone: phone,
    clienteNombre: ctx.profile.nombre,
    telaIdentificada: args.tela_identificada,
    descripcionExtra: args.descripcion,
    cantidadKg: args.cantidad_kg,
    frecuencia: args.frecuencia,
    usoFinal: args.uso_final,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: "no se pudo registrar la solicitud, pero el cliente sí fue informado",
    };
  }

  return {
    ok: true,
    id: result.id,
    instruccion_para_bot:
      "Asegúrate de informarle al cliente que registramos su solicitud y que el equipo evaluará agregarla al catálogo. Pregúntale cuántos kg/metros necesitaría y cada cuánto, si no te lo dijo todavía.",
  };
}

// ── programar_volumen_temporada ─────────────────────────────────────

export interface ProgramarVolumenArgs {
  tela_titulo: string;
  tela_sku?: string;
  kg_por_periodo: number;
  periodo: "mensual" | "quincenal" | "semanal" | "unico";
  fecha_inicio: string; // ISO date
  duracion_meses: number;
  notas?: string;
}

export async function ejecutarProgramarVolumen(
  args: ProgramarVolumenArgs,
  ctx: BotContext
): Promise<unknown> {
  const phone = ctx.message.from.id;

  let fechaInicio: Date;
  try {
    fechaInicio = new Date(args.fecha_inicio);
    if (isNaN(fechaInicio.getTime())) {
      throw new Error("fecha inválida");
    }
  } catch {
    return {
      ok: false,
      error: "fecha_inicio inválida — debe ser ISO YYYY-MM-DD",
    };
  }

  const result = await trackProgramacionVolumen({
    clientePhone: phone,
    clienteNombre: ctx.profile.nombre,
    telaTitulo: args.tela_titulo,
    telaSku: args.tela_sku,
    kgPorPeriodo: args.kg_por_periodo,
    periodo: args.periodo,
    fechaInicio,
    duracionMeses: args.duracion_meses,
    notas: args.notas,
  });

  if (!result.ok) {
    log.warn({ result, args }, "Falló registro de programación");
    return { ok: false, error: "no se pudo registrar la programación" };
  }

  return {
    ok: true,
    id: result.id,
    instruccion_para_bot: `Confirma al cliente que registramos su programación de ${args.kg_por_periodo}kg ${args.periodo} de ${args.tela_titulo} a partir del ${fechaInicio.toLocaleDateString("es-MX")}. Dile que un asesor del equipo confirmará disponibilidad y le contactará para cerrar el acuerdo. NO le digas que es definitivo todavía, está sujeto a aprobación.`,
  };
}
