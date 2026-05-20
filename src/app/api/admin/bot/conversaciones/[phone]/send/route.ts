/**
 * POST /api/admin/bot/conversaciones/[phone]/send
 *
 * El admin envía mensaje (texto O media) al cliente desde el CRM.
 * Solo permitido si la conversación está pausada (control humano activo).
 *
 * Body:
 *   { text: string }                                    → texto plano
 *   { mediaUrl, mediaType, filename?, caption? }        → imagen/doc/video/audio
 *   Puede combinar text + media en una sola llamada (manda media con caption).
 *
 * Side effects:
 *  - Envía vía Meta API al cliente.
 *  - Registra en historial.
 *  - Renueva el TTL del pause (23h).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../_lib/guard";
import { isBotPaused, renewPause } from "@/lib/bot/repositories/pause-repo";
import { sendText, sendMedia, type MediaType } from "@/lib/bot/services/meta/send";
import { appendMensaje } from "@/lib/bot/repositories/conversation-repo";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/conversaciones/send" });

interface SendBody {
  text?: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  filename?: string;
  caption?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { phone: phoneEncoded } = await params;
  const phone = decodeURIComponent(phoneEncoded);

  if (!phone || (!/^\d{10,15}$/.test(phone.replace(/\D/g, "")) && !phone.startsWith("web:"))) {
    return NextResponse.json({ error: "phone inválido" }, { status: 400 });
  }

  let body: SendBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  const mediaUrl = body.mediaUrl?.trim();
  const mediaType = body.mediaType;
  const filename = body.filename?.trim();
  const caption = body.caption?.trim();

  // Validar que venga al menos algo
  if (!text && !mediaUrl) {
    return NextResponse.json({ error: "Debe enviar 'text' o 'mediaUrl'" }, { status: 400 });
  }

  if (text && text.length > 4000) {
    return NextResponse.json(
      { error: "text muy largo (máx 4000 caracteres)" },
      { status: 400 }
    );
  }

  if (mediaUrl && !mediaType) {
    return NextResponse.json(
      { error: "mediaType requerido cuando se manda mediaUrl" },
      { status: 400 }
    );
  }

  // Solo permitir envío si el bot está pausado
  const paused = await isBotPaused(phone);
  if (!paused) {
    return NextResponse.json(
      {
        error: 'El bot NO está pausado para esta conversación. Primero llama a "Tomar control".',
      },
      { status: 409 }
    );
  }

  try {
    // ── CANAL WEB (chat de la página, no WhatsApp) ──
    if (phone.startsWith("web:")) {
      const content = mediaUrl
        ? `[${mediaType?.toUpperCase()}: ${filename || mediaUrl}]${caption ? `\n${caption}` : ""}`
        : text;
      await appendMensaje(phone, {
        role: "assistant",
        content,
        timestamp: new Date().toISOString(),
      });
      await renewPause(phone);
      log.info({ phone, hasMedia: !!mediaUrl }, "Mensaje web guardado en BD desde CRM");
      return NextResponse.json({ success: true, channel: "web" });
    }

    // ── CANAL WHATSAPP ──
    let sent = false;
    let historyContent = "";

    if (mediaUrl && mediaType) {
      // Envío de media
      sent = await sendMedia({
        to: phone,
        mediaUrl,
        mediaType,
        caption: caption || text || undefined,
        filename: filename || undefined,
      });
      const icon =
        mediaType === "image" ? "📸" :
        mediaType === "video" ? "🎥" :
        mediaType === "audio" ? "🎙️" : "📎";
      historyContent = `${icon} ${mediaType.toUpperCase()}: ${filename || "archivo"}${caption ? `\n${caption}` : text ? `\n${text}` : ""}`;
    } else {
      // Envío de texto plano
      sent = await sendText(phone, text);
      historyContent = text;
    }

    if (!sent) {
      return NextResponse.json(
        { error: "Meta API rechazó el envío" },
        { status: 502 }
      );
    }

    // Renovar TTL del pause (cada mensaje del agente extiende 23h)
    await renewPause(phone);

    // Registrar en historial
    try {
      await appendMensaje(phone, {
        role: "assistant",
        content: historyContent,
        timestamp: new Date().toISOString(),
        ...(mediaUrl && { mediaUrl, mediaType }),
      } as any);
    } catch (err) {
      log.warn({ err, phone }, "No se pudo registrar mensaje en historial");
    }

    return NextResponse.json({ ok: true, delivered: true, mediaUrl: mediaUrl || null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err, phone }, "Error enviando mensaje del agente");
    return NextResponse.json(
      { error: "send failed", details: msg },
      { status: 500 }
    );
  }
}