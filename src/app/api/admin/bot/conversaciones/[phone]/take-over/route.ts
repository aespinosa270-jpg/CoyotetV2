/**
 * POST /api/admin/bot/conversaciones/[phone]/take-over
 *
 * Pausa el bot para esta conversación. Manda mensaje al cliente avisando
 * que un asesor humano le atenderá personalmente.
 *
 * G-WebFix: soporta clientes web (phone con prefijo "web:"). Para clientes
 * web NO se llama sendText (que es WhatsApp API), solo se guarda en historial.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../_lib/guard";
import { auth } from "@/auth";
import { pauseBot } from "@/lib/bot/repositories/pause-repo";
import { sendText } from "@/lib/bot/services/meta/send";
import { appendMensaje } from "@/lib/bot/repositories/conversation-repo";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/conversaciones/take-over" });

const MENSAJE_CLIENTE = "Un asesor humano le atenderá personalmente.";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const session = await auth();
  const adminEmail = session?.user?.email ?? "admin";

  const { phone: phoneEncoded } = await params;
  const phone = decodeURIComponent(phoneEncoded);

  // Validar formato: WhatsApp (10-15 dígitos) O web:UUID
  if (!phone || (!/^\d{10,15}$/.test(phone.replace(/\D/g, "")) && !phone.startsWith("web:"))) {
    return NextResponse.json({ error: "phone inválido" }, { status: 400 });
  }

  const isWebClient = phone.startsWith("web:");

  try {
    // 1. Pausar el bot en Redis (TTL 23h)
    const state = await pauseBot(phone, adminEmail);

    let sent = true;

    // 2. CANAL WHATSAPP: Enviar mensaje al cliente vía Meta API
    if (!isWebClient) {
      sent = await sendText(phone, MENSAJE_CLIENTE);
      if (!sent) {
        log.warn({ phone }, "Pause aplicado pero falló envío de mensaje al cliente WhatsApp");
      }
    } else {
      log.info({ phone }, "Cliente web — pause aplicado, mensaje solo en historial (polling lo recogerá)");
    }

    // 3. Registrar en historial — para WhatsApp queda registrado;
    //    para WEB es el ÚNICO modo de que el cliente lo vea (via polling sync)
    try {
      await appendMensaje(phone, {
        role: "assistant",
        content: MENSAJE_CLIENTE,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      log.warn({ err, phone }, "No se pudo registrar mensaje en historial");
    }

    return NextResponse.json({
      ok: true,
      paused: true,
      channel: isWebClient ? "web" : "whatsapp",
      state,
      messageDelivered: sent,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err, phone }, "Error en take-over");
    return NextResponse.json(
      { error: "take-over failed", details: msg },
      { status: 500 }
    );
  }
}