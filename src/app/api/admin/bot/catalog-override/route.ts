/**
 * Endpoint: guardar overrides del catálogo.
 *
 * Recibe:
 *   { productId, precioMenudeo?, precioMayoreo?, hidden? }
 *
 * Actualiza el overlay v2:catalog:overlay en Redis.
 * El catálogo de runtime (catalog-repo.getCatalog) aplica este overlay al
 * source-of-truth de lib/products.ts automáticamente.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRedis } from "@/lib/bot/repositories/redis";
import { requireAdmin } from "../_lib/guard";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/admin/bot/catalog-override" });

const bodySchema = z.object({
  productId: z.string().min(1),
  precioMenudeo: z.number().positive().optional(),
  precioMayoreo: z.number().positive().optional(),
  hidden: z.boolean().optional(),
});

const OVERLAY_KEY = "v2:catalog:overlay";

interface CatalogOverlay {
  priceOverrides: Record<string, { menudeo?: number; mayoreo?: number }>;
  hiddenProductIds: string[];
  customProducts: any[];
}

const EMPTY_OVERLAY: CatalogOverlay = {
  priceOverrides: {},
  hiddenProductIds: [],
  customProducts: [],
};

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "invalid body", details: err }, { status: 400 });
  }

  const redis = getRedis();

  try {
    const overlay =
      (await redis.get<CatalogOverlay>(OVERLAY_KEY)) ?? { ...EMPTY_OVERLAY };
    if (!overlay.priceOverrides) overlay.priceOverrides = {};
    if (!Array.isArray(overlay.hiddenProductIds))
      overlay.hiddenProductIds = [];
    if (!Array.isArray(overlay.customProducts)) overlay.customProducts = [];

    // Aplicar cambios de precio
    if (body.precioMenudeo !== undefined || body.precioMayoreo !== undefined) {
      const prev = overlay.priceOverrides[body.productId] ?? {};
      overlay.priceOverrides[body.productId] = {
        menudeo: body.precioMenudeo ?? prev.menudeo,
        mayoreo: body.precioMayoreo ?? prev.mayoreo,
      };
    }

    // Aplicar cambio de visibilidad
    if (body.hidden !== undefined) {
      const set = new Set(overlay.hiddenProductIds);
      if (body.hidden) set.add(body.productId);
      else set.delete(body.productId);
      overlay.hiddenProductIds = Array.from(set);
    }

    await redis.set(OVERLAY_KEY, overlay);

    log.info(
      { productId: body.productId, changes: body },
      "Catalog overlay actualizado"
    );

    return NextResponse.json({ ok: true, overlay });
  } catch (err) {
    log.error({ err }, "Error guardando catalog override");
    return NextResponse.json(
      { error: "internal error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/bot/catalog-override — lee el overlay actual
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  const redis = getRedis();
  const overlay = (await redis.get<CatalogOverlay>(OVERLAY_KEY)) ?? EMPTY_OVERLAY;
  return NextResponse.json({ overlay });
}
