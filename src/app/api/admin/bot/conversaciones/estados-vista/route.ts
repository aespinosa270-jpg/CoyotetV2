/**
 * GET /api/admin/bot/conversaciones/estados-vista
 *
 * Devuelve que telefonos estan archivados o eliminados, para que el inbox
 * filtre la vista sin tocar la query principal de la lista.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "../../_lib/guard";
import { getRedis } from "@/lib/bot/repositories/redis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;
  try {
    const redis = getRedis();
    const archKeys: string[] = [];
    const elimKeys: string[] = [];
    let cursor = "0";
    // Escanear archivadas
    do {
      const [next, batch] = await redis.scan(cursor, { match: "v2:archivada:*", count: 500 });
      archKeys.push(...(batch as string[]));
      cursor = String(next);
    } while (cursor !== "0");
    cursor = "0";
    do {
      const [next, batch] = await redis.scan(cursor, { match: "v2:eliminada:*", count: 500 });
      elimKeys.push(...(batch as string[]));
      cursor = String(next);
    } while (cursor !== "0");

    const archivadas = archKeys.map((k) => k.replace("v2:archivada:", ""));
    const eliminadas = elimKeys.map((k) => k.replace("v2:eliminada:", ""));
    return NextResponse.json({ archivadas, eliminadas }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "estados failed", details: msg, archivadas: [], eliminadas: [] }, { status: 500 });
  }
}
