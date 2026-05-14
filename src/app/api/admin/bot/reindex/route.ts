/**
 * Endpoint: dispara reindexación del catálogo en pgvector.
 *
 * Se llama desde el dashboard cuando Jack agrega un producto custom o cambia
 * algo del source-of-truth. NO se llama por cambio de precio (los precios
 * son overlay post-búsqueda, no afectan el embedding).
 *
 * Es síncrono: la operación toma ~3-5s para ~60 productos. Si crece a 500+,
 * deberíamos hacerlo async con un cron.
 */
import { NextResponse } from "next/server";
import { indexCatalog } from "@/lib/bot/intelligence/rag/indexer";
import { requireAdmin } from "../_lib/guard";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/admin/bot/reindex" });

export async function POST() {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    log.info({}, "Reindex disparado desde el dashboard admin");
    const result = await indexCatalog();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err }, "Reindex falló");
    return NextResponse.json(
      { error: "reindex failed", details: msg },
      { status: 500 }
    );
  }
}
