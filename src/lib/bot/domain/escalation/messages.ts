/**
 * Mensajes que el bot envía al cliente cuando escala una conversación.
 */
import type { RazonEscalacion } from "./types";

/**
 * Mensaje genérico al cliente cuando se escala. Mismo mensaje para todas las
 * razones — la diferencia está en la notificación interna al admin.
 */
export function buildEscalationClientMessage(_razon: RazonEscalacion): string {
  return "Su consulta requiere atención especializada. Un asesor del equipo le contactará a la brevedad.";
}

/**
 * Formato de notificación WhatsApp al admin.
 */
export function buildAdminNotification(input: {
  phone: string;
  nombre?: string;
  razon: RazonEscalacion;
  razonLabel: string;
  contexto: string;
  ultimoMsg: string;
  baseUrl: string;
}): string {
  const nombreDisplay = input.nombre ? ` (${input.nombre})` : "";
  const ultimoMsgTrunc =
    input.ultimoMsg.length > 200
      ? input.ultimoMsg.slice(0, 200) + "..."
      : input.ultimoMsg;

  return `🚨 ESCALACIÓN COYOTE BOT

Cliente: +${input.phone}${nombreDisplay}
Razón: ${input.razonLabel}
Contexto: ${input.contexto}

Último mensaje del cliente:
"${ultimoMsgTrunc}"

Ver: ${input.baseUrl}/crm/admin/bot/escalaciones`;
}
