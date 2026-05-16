/**
 * GET /api/admin/bot/media/[mediaId]
 *
 * Proxy autenticado para descargar binarios de WhatsApp Cloud API.
 *
 * Flujo:
 *  1. Verificar admin (guard).
 *  2. GET https://graph.facebook.com/v20.0/{mediaId} → obtiene URL temporal.
 *  3. GET esa URL con el mismo Bearer token → obtiene binario.
 *  4. Stream del binario al cliente con headers correctos.
 *
 * El media de WhatsApp expira ~30 días desde Meta, después devuelve 404.
 * Sin guard, cualquiera con el mediaId podría descargar. Con guard, solo admin.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../_lib/guard";

const META_API_VERSION = "v20.0";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { mediaId } = await params;
  if (!mediaId || !/^\d+$/.test(mediaId)) {
    return NextResponse.json(
      { error: "mediaId inválido" },
      { status: 400 }
    );
  }

  const token = process.env.WHATSAPP_TOKEN || process.env.META_WHATSAPP_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "WHATSAPP_TOKEN no configurado" },
      { status: 500 }
    );
  }

  try {
    // Paso 1: obtener URL temporal del media
    const metaResp = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${mediaId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (!metaResp.ok) {
      const text = await metaResp.text().catch(() => "");
      return NextResponse.json(
        { error: "Media no encontrada", details: text },
        { status: metaResp.status }
      );
    }

    const metaJson = (await metaResp.json()) as {
      url?: string;
      mime_type?: string;
      file_size?: number;
    };

    if (!metaJson.url) {
      return NextResponse.json(
        { error: "Meta no devolvió URL" },
        { status: 502 }
      );
    }

    // Paso 2: descargar el binario real (necesita el mismo Bearer)
    const binResp = await fetch(metaJson.url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!binResp.ok) {
      return NextResponse.json(
        { error: "No se pudo descargar binario" },
        { status: binResp.status }
      );
    }

    const buffer = await binResp.arrayBuffer();
    const mimeType =
      binResp.headers.get("content-type") ||
      metaJson.mime_type ||
      "application/octet-stream";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        // Cache 5 min en el navegador para no tronar a Meta
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Error al descargar media", details: msg },
      { status: 500 }
    );
  }
}
