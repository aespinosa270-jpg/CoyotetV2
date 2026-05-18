/**
 * POST /api/admin/bot/conversaciones/[phone]/take-over
 *
 * Pausa el bot para esta conversación. Manda mensaje al cliente avisando
 * que un asesor humano le atenderá personalmente.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../_lib/guard";
import { auth } from "@/auth";
import { pauseBot } from "@/lib/bot/repositories/pause-repo";
import { sendText } from "@/lib/bot/services/meta/send";
import { appendMensaje } from "@/lib/bot/repositories/conversation-repo";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/conversaciones/take-over" });

const MENSAJE_CLIENTE =
  "Un asesor humano le atenderá personalmente.";

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

    if (!phone) {
      return NextResponse.json({ error: "phone inválido" }, { status: 400 });
    }


  try {
    // 1. Pausar el bot en Redis (TTL 23h)
    const state = await pauseBot(phone, adminEmail);

    // 2. Enviar mensaje al cliente vía Meta API
    const sent = await sendText(phone, MENSAJE_CLIENTE);

    if (!sent) {
      log.warn({ phone }, "Pause aplicado pero falló envío de mensaje al cliente");
    }

    // 3. Registrar en historial como mensaje del agente (para que quede registrado)
    try {
      await appendMensaje(phone, {
        role: "assistant", // Mismo role para que aparezca del lado del bot/asesor
        content: MENSAJE_CLIENTE,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      log.warn({ err, phone }, "No se pudo registrar mensaje en historial");
    }

    return NextResponse.json({
      ok: true,
      paused: true,
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
