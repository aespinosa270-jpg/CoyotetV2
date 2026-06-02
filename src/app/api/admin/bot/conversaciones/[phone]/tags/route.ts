/**
 * POST /api/admin/bot/conversaciones/[phone]/tags
 *
 * Agrega o quita una etiqueta manual del cliente.
 * Body: { tag: string, action: "add" | "remove" }
 * Guarda un array JSON en Redis key v2:tags:{phone}. No toca el perfil.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../_lib/guard";
import { getRedis } from "@/lib/bot/repositories/redis";
import { keys } from "@/lib/bot/repositories/keys";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/conversaciones/tags" });

const MAX_TAGS = 12;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { phone: phoneEncoded } = await params;
  const phone = decodeURIComponent(phoneEncoded);

  if (!phone || (!/^\d{10,15}$/.test(phone.replace(/\D/g, "")) && !phone.startsWith("web:"))) {
    return NextResponse.json({ error: "phone invalido" }, { status: 400 });
  }

  let body: { tag?: string; action?: "add" | "remove" };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "body invalido" }, { status: 400 }); }

  const tag = (body.tag || "").trim().slice(0, 24);
  const action = body.action === "remove" ? "remove" : "add";
  if (!tag) return NextResponse.json({ error: "tag requerido" }, { status: 400 });

  try {
    const redis = getRedis();
    const key = keys.tags(phone);

    const raw = await redis.get<string[] | string>(key);
    let tags: string[] = [];
    if (Array.isArray(raw)) tags = raw;
    else if (typeof raw === "string") { try { tags = JSON.parse(raw); } catch { tags = []; } }

    if (action === "add") {
      if (!tags.includes(tag)) tags.push(tag);
      tags = tags.slice(0, MAX_TAGS);
    } else {
      tags = tags.filter((t) => t !== tag);
    }

    if (tags.length > 0) await redis.set(key, JSON.stringify(tags));
    else await redis.del(key);

    return NextResponse.json({ ok: true, tags });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err, phone }, "Error en tags");
    return NextResponse.json({ error: "tags failed", details: msg }, { status: 500 });
  }
}
