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

// ── Configuración visual por razón ──
const RAZON_HEADER: Record<RazonEscalacion, string> = {
  queja: "🚨🚨 QUEJA CRÍTICA 🚨🚨",
  humano: "👤 CLIENTE PIDE HUMANO",
  alto_valor: "🔥💰 LEAD VIP — ALTO VALOR 💰🔥",
  retries: "🤖 BOT ATASCADO (hallucinations)",
  frustracion: "😤 CLIENTE FRUSTRADO",
  facturacion: "📄 FACTURACIÓN COMPLEJA",
};

const RAZON_URGENCIA: Record<RazonEscalacion, string> = {
  queja: "⚠️ URGENTE — Cliente molesto, atender YA",
  humano: "⚠️ Cliente quiere humano — responder pronto",
  alto_valor: "🔥 LEAD VIP — no perder esta venta",
  retries: "🤖 Bot no pudo, te toca tomar control",
  frustracion: "😤 Cliente frustrado, atender pronto",
  facturacion: "📄 Tema fiscal — revisar con calma",
};

/**
 * Formato de notificación WhatsApp al admin.
 * Mejorado: header con urgencia visual, link DIRECTO a la conversación del
 * cliente (no la lista genérica), info rica.
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
  const header = RAZON_HEADER[input.razon] || "🚨 ESCALACIÓN COYOTE BOT";
  const urgencia = RAZON_URGENCIA[input.razon] || "";
  const nombreDisplay = input.nombre ? input.nombre : "(sin nombre registrado)";

  const ultimoMsgTrunc =
    input.ultimoMsg.length > 250
      ? input.ultimoMsg.slice(0, 250) + "..."
      : input.ultimoMsg;

  // Link DIRECTO a la conversación específica (no a la lista)
  const linkConv = `${input.baseUrl}/crm/admin/bot/conversaciones/${encodeURIComponent(input.phone)}`;
  const linkLista = `${input.baseUrl}/crm/admin/bot/escalaciones`;

  // Hora local México
  const hora = new Date().toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
  });

  return `${header}

${urgencia}

👤 ${nombreDisplay}
📱 +${input.phone}
🕒 ${hora}

📝 ${input.contexto}

💬 "${ultimoMsgTrunc}"

✋ ATENDER AHORA:
${linkConv}

📋 Ver todas:
${linkLista}`;
}