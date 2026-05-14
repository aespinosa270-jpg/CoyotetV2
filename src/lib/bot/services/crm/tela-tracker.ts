/**
 * Servicio que registra "telas no manejadas" — cuando un cliente pide
 * o manda foto de una tela que no está en nuestro catálogo.
 *
 * Crea registro en modelo TelaNoManejada y lo agrupa por tipo de tela
 * para que el equipo pueda ver: "5 clientes pidieron popelina este mes,
 * quizás deberíamos agregarla al catálogo".
 */
import { prisma } from "@/lib/prisma";
import { getLogger } from "../../observability/logger";
import { recordEvent } from "../../observability/events";

const log = getLogger({ module: "crm/tela-tracker" });

export interface TrackTelaNoManejadaInput {
  clientePhone: string;
  clienteNombre?: string;
  telaIdentificada: string;     // ej. "popelina", "lino"
  descripcionExtra?: string;     // descripción del bot o vision
  imagenUrl?: string;            // si vino de foto
  cantidadKg?: number;
  frecuencia?: string;
  usoFinal?: string;
}

export async function trackTelaNoManejada(
  input: TrackTelaNoManejadaInput
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    // Buscar userId si existe
    const user = await prisma.user.findFirst({
      where: { phone: input.clientePhone },
      select: { id: true, name: true },
    });

    const registro = await prisma.telaNoManejada.create({
      data: {
        clientePhone: input.clientePhone,
        clienteNombre: input.clienteNombre ?? user?.name ?? undefined,
        clienteUserId: user?.id,
        telaIdentificada: input.telaIdentificada.toLowerCase().trim(),
        descripcionExtra: input.descripcionExtra,
        imagenUrl: input.imagenUrl,
        cantidadKg: input.cantidadKg,
        frecuencia: input.frecuencia,
        usoFinal: input.usoFinal,
        status: "NUEVA",
      },
      select: { id: true },
    });

    log.info(
      {
        telaIdentificada: input.telaIdentificada,
        phone: input.clientePhone,
        cantidadKg: input.cantidadKg,
      },
      "Tela no manejada registrada"
    );

    // Observability
    await recordEvent({
      type: "objection",
      clientId: input.clientePhone,
      data: {
        evento_real: "tela_no_manejada",
        tela: input.telaIdentificada,
        cantidad: input.cantidadKg,
      },
    });

    // Interaction en CRM si tiene userId
    if (user) {
      try {
        await prisma.interaction.create({
          data: {
            userId: user.id,
            type: "WHATSAPP",
            summary: `Cliente solicitó tela no manejada: ${input.telaIdentificada}${input.cantidadKg ? ` (${input.cantidadKg}kg)` : ""}`,
            content: {
              telaIdentificada: input.telaIdentificada,
              descripcionExtra: input.descripcionExtra,
              cantidadKg: input.cantidadKg,
              frecuencia: input.frecuencia,
              usoFinal: input.usoFinal,
              registroId: registro.id,
            } as any,
            status: "open",
          },
        });
      } catch (err) {
        log.warn({ err }, "No se pudo crear Interaction (no crítico)");
      }
    }

    return { ok: true, id: registro.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg, input }, "Error registrando tela no manejada");
    return { ok: false, error: msg };
  }
}

/**
 * Registra una programación de telas en volumen para temporada.
 */
export interface TrackProgramacionInput {
  clientePhone: string;
  clienteNombre?: string;
  telaSku?: string;
  telaTitulo: string;
  kgPorPeriodo: number;
  periodo: "mensual" | "quincenal" | "semanal" | "unico";
  fechaInicio: Date;
  duracionMeses: number;
  notas?: string;
}

export async function trackProgramacionVolumen(
  input: TrackProgramacionInput
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const user = await prisma.user.findFirst({
      where: { phone: input.clientePhone },
      select: { id: true, name: true },
    });

    const registro = await prisma.programacionVolumen.create({
      data: {
        clientePhone: input.clientePhone,
        clienteNombre: input.clienteNombre ?? user?.name ?? undefined,
        clienteUserId: user?.id,
        telaSku: input.telaSku,
        telaTitulo: input.telaTitulo,
        kgPorPeriodo: input.kgPorPeriodo,
        periodo: input.periodo,
        fechaInicio: input.fechaInicio,
        duracionMeses: input.duracionMeses,
        notas: input.notas,
        estado: "propuesta",
      },
      select: { id: true },
    });

    log.info(
      {
        telaTitulo: input.telaTitulo,
        phone: input.clientePhone,
        kgPorPeriodo: input.kgPorPeriodo,
        periodo: input.periodo,
      },
      "Programación de volumen registrada"
    );

    await recordEvent({
      type: "conversion",
      clientId: input.clientePhone,
      data: {
        evento_real: "programacion_volumen",
        tela: input.telaTitulo,
        kgPorPeriodo: input.kgPorPeriodo,
        periodo: input.periodo,
      },
    });

    if (user) {
      try {
        await prisma.interaction.create({
          data: {
            userId: user.id,
            type: "WHATSAPP",
            summary: `Programación volumen: ${input.telaTitulo} ${input.kgPorPeriodo}kg ${input.periodo} x ${input.duracionMeses}mes`,
            content: {
              telaTitulo: input.telaTitulo,
              kgPorPeriodo: input.kgPorPeriodo,
              periodo: input.periodo,
              duracionMeses: input.duracionMeses,
              fechaInicio: input.fechaInicio.toISOString(),
              registroId: registro.id,
            } as any,
            status: "open",
            pipelineStatus: "NEGOCIACION",
          },
        });
      } catch (err) {
        log.warn({ err }, "No se pudo crear Interaction (no crítico)");
      }
    }

    return { ok: true, id: registro.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg, input }, "Error registrando programación");
    return { ok: false, error: msg };
  }
}
