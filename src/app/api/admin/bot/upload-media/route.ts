/**
 * POST /api/admin/bot/upload-media
 *
 * Recibe archivo del CRM (multipart form), lo sube a Supabase Storage
 * (bucket whatsapp_media) y retorna la URL pública.
 *
 * Body (FormData):
 *   - file: File
 *
 * Response: { mediaUrl, mediaType, filename, mimeType, size }
 *
 * Validaciones de tamaño (límites WhatsApp Cloud API):
 *   - imagen: 5 MB
 *   - video:  16 MB
 *   - audio:  16 MB
 *   - documento: 100 MB
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/guard";
import { supabase } from "@/lib/supabase";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/upload-media" });

export const runtime = "nodejs";
export const maxDuration = 60;

const LIMITS_BYTES = {
  image: 5 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  audio: 16 * 1024 * 1024,
  document: 100 * 1024 * 1024,
};

type MediaType = keyof typeof LIMITS_BYTES;

function detectMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Falta el archivo (campo 'file')" }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";
    const mediaType = detectMediaType(mimeType);
    const sizeLimit = LIMITS_BYTES[mediaType];

    if (file.size > sizeLimit) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      const limitMB = (sizeLimit / 1024 / 1024).toFixed(0);
      return NextResponse.json(
        {
          error: `Archivo demasiado grande (${sizeMB} MB). Límite para ${mediaType}: ${limitMB} MB`,
          mediaType,
          sizeMB,
          limitMB,
        },
        { status: 413 }
      );
    }

    // Subir a Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const fileName = `crm-${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("whatsapp_media")
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      log.error({ err: uploadError }, "Error subiendo a Supabase Storage");
      return NextResponse.json(
        { error: `Error subiendo archivo: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("whatsapp_media")
      .getPublicUrl(fileName);

    const mediaUrl = publicUrlData.publicUrl;

    log.info(
      { fileName, mediaType, sizeKB: Math.round(file.size / 1024), mediaUrl },
      "✅ Archivo subido a Supabase Storage"
    );

    return NextResponse.json({
      mediaUrl,
      mediaType,
      filename: file.name,
      mimeType,
      size: file.size,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err }, "Excepción en upload-media");
    return NextResponse.json(
      { error: `Error interno: ${msg}` },
      { status: 500 }
    );
  }
}