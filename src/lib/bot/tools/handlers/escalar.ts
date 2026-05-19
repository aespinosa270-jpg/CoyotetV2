/**
 * Tool handler: escalar_a_humano (mejorado G3).
 *
 * Antes: solo marcaba shouldAbort. NO creaba escalación real.
 * Ahora: llama a triggerEscalation() que crea el registro, pausa bot
 *        23h, y notifica al admin.
 *
 * El LLM DEBE llamar este tool con: nombre, motivo, telefono.
 */
import type { BotContext } from "../../core/types";
import { getLogger } from "../../observability/logger";
import { triggerEscalation } from "../../services/escalation-notifier";
import type { RazonEscalacion } from "../../domain/escalation/types";

const log = getLogger({ module: "tool-escalar" });

interface EscalarArgs {
  nombre?: string;
  motivo: string;
  telefono?: string;
  prioridad?: "alta" | "media" | "baja";
}

export async function escalarAHumanoHandler(args: EscalarArgs, context: BotContext) {
  log.info({ args, phone: context.message.from.id }, "Tool escalar_a_humano invocado");

  const phone = context.message.from.id;
  const nombreFinal = args.nombre || context.profile.nombre || "Sin nombre";
  const motivo = args.motivo || "Cliente pide humano (sin motivo especificado)";
  const telefonoContacto = args.telefono || phone;

  // Construir contexto rico para que el admin vea TODO de un vistazo
  const contextoEscalacion = [
    `Motivo: ${motivo}`,
    `Teléfono contacto: ${telefonoContacto}`,
    args.prioridad ? `Prioridad: ${args.prioridad}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  // Determinar razón: si motivo menciona queja/problema → "queja", si menciona compra/cotización → "alto_valor", default "humano"
  const motivoLower = motivo.toLowerCase();
  let razon: RazonEscalacion = "humano";
  if (/(queja|problema|reclamo|mal\s+servicio|enojad|molest|grosero|p[eé]simo|estafa)/i.test(motivoLower)) {
    razon = "queja";
  } else if (/(contenedor|tonelada|lote|maquila|empresa|volumen|cotizaci[oó]n.*grande)/i.test(motivoLower)) {
    razon = "alto_valor";
  } else if (/(factur|rfc|cfdi|r[eé]gimen)/i.test(motivoLower)) {
    razon = "facturacion";
  }

  // Disparar escalación real
  try {
    const result = await triggerEscalation({
      phone,
      nombre: nombreFinal,
      razon,
      contexto: contextoEscalacion,
      ultimoMsg: context.message.text || "(mensaje sin texto)",
    });

    if (!result.ok) {
      log.error({ result }, "triggerEscalation falló");
      return {
        success: false,
        instruccion_para_ia:
          "Hubo un problema técnico al transferir. Discúlpate con el cliente y pídele que escriba 'AYUDA' para que el equipo le contacte manualmente.",
      };
    }

    if (result.alreadyEscalated) {
      log.info({ phone }, "Ya hay escalación reciente — no duplico");
      return {
        success: true,
        already_escalated: true,
        instruccion_para_ia:
          "Ya hay una solicitud activa de atención humana. Confirma al cliente que el equipo le contactará pronto y despídete. NO pidas datos otra vez.",
      };
    }

    // Marcar abort para que el bot no siga procesando
    context.state.shouldAbort = true;
    context.state.abortReason = "escalated_to_human";

    log.info(
      { phone, escalationId: result.escalationId, razon },
      "✅ Escalación creada exitosamente desde tool"
    );

    return {
      success: true,
      escalation_id: result.escalationId,
      razon,
      instruccion_para_ia: `✅ Escalación creada (ID: ${result.escalationId}). Confirma al cliente: "Listo ${nombreFinal}, registramos su solicitud. Un ejecutivo de la Jauría le contactará al ${telefonoContacto} en menos de 30 minutos. ¡Que tenga excelente día!" Despídete cordial y NO hagas más preguntas.`,
    };
  } catch (err) {
    log.error({ err, phone }, "Excepción en escalar_a_humano");
    return {
      success: false,
      instruccion_para_ia:
        "Hubo un error técnico. Pide disculpas al cliente y dile que escriba 'AYUDA' para contacto directo.",
    };
  }
}