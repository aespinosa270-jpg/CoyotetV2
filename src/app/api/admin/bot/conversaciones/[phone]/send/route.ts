/**
 * POST /api/admin/bot/conversaciones/[phone]/send
 *
 * El admin envía un mensaje al cliente desde el CRM. Solo permitido si la
 * conversación está pausada (control humano activo).
 *
 * Side effects:
 *  - Envía vía Meta API al cliente.
 *  - Registra en historial como `role: "assistant"`.
 *  - Renueva el TTL del pause (23h desde ahora).
 *
 * Body: { text: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../_lib/guard";
import { isBotPaused, renewPause } from "@/lib/bot/repositories/pause-repo";
import { sendText } from "@/lib/bot/services/meta/send";
import { appendMensaje } from "@/lib/bot/repositories/conversation-repo";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/conversaciones/send" });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { phone: phoneEncoded } = await params;
  const phone = decodeURIComponent(phoneEncoded);

  if (!phone || !/^\d{10,15}$/.test(phone.replace(/\D/g, ""))) {
    return NextResponse.json({ error: "phone inválido" }, { status: 400 });
  }

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "text vacío" }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json(
      { error: "text muy largo (máx 4000 caracteres)" },
      { status: 400 }
    );
  }

  // Solo permitir envío si el bot está pausado
  const paused = await isBotPaused(phone);
  if (!paused) {
    return NextResponse.json(
      {
        error:
          'El bot NO está pausado para esta conversación. Primero llama a "Tomar control".',
      },
      { status: 409 }
    );
  }

  try {
    const sent = await sendText(phone, text);

    if (!sent) {
      return NextResponse.json(
        { error: "Meta API rechazó el envío" },
        { status: 502 }
      );
    }

    // Renovar TTL del pause (cada mensaje del agente extiende 23h más)
    await renewPause(phone);

    // Registrar en historial como mensaje del bot (visible en CRM)
    try {
      await appendMensaje(phone, {
        role: "assistant",
        content: text,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      log.warn({ err, phone }, "No se pudo registrar mensaje en historial");
    }

    return NextResponse.json({ ok: true, delivered: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err, phone }, "Error enviando mensaje del agente");
    return NextResponse.json(
      { error: "send failed", details: msg },
      { status: 500 }
    );
  }
}
