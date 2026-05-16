/**
 * POST /api/admin/bot/conversaciones/[phone]/release
 *
 * Libera el control humano. El bot reanuda inmediatamente.
 * Manda mensaje al cliente avisando que el bot regresa.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../_lib/guard";
import { unpauseBot } from "@/lib/bot/repositories/pause-repo";
import { sendText } from "@/lib/bot/services/meta/send";
import { appendMensaje } from "@/lib/bot/repositories/conversation-repo";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/conversaciones/release" });

const MENSAJE_CLIENTE =
  "Continúo yo en la conversación. ¿En qué más puedo ayudarle?";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { phone: phoneEncoded } = await params;
  const phone = decodeURIComponent(phoneEncoded);

  if (!phone || !/^\d{10,15}$/.test(phone.replace(/\D/g, ""))) {
    return NextResponse.json({ error: "phone inválido" }, { status: 400 });
  }

  try {
    const wasPaused = await unpauseBot(phone);

    if (!wasPaused) {
      return NextResponse.json({
        ok: true,
        released: false,
        message: "El bot no estaba pausado",
      });
    }

    // Mandar mensaje al cliente
    const sent = await sendText(phone, MENSAJE_CLIENTE);

    // Registrar en historial
    try {
      await appendMensaje(phone, {
        role: "assistant",
        content: MENSAJE_CLIENTE,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      log.warn({ err, phone }, "No se pudo registrar mensaje de release en historial");
    }

    return NextResponse.json({
      ok: true,
      released: true,
      messageDelivered: sent,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err, phone }, "Error en release");
    return NextResponse.json(
      { error: "release failed", details: msg },
      { status: 500 }
    );
  }
}
