/**
 * Endpoint: leer/guardar configuración del bot v2.
 *
 * La config vive en v2:config en Redis. El feature flag de runtime usa
 * estos valores como overlay sobre las env vars (env como default, Redis
 * como override sin redeploy).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRedis } from "@/lib/bot/repositories/redis";
import { requireAdmin } from "../_lib/guard";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/admin/bot/config" });

const CONFIG_KEY = "v2:config";

interface BotConfig {
  enabled?: boolean;
  percentage?: number;
  phones?: string[];
  extraInstructions?: string;
  tone?: string;
  updatedAt?: string;
  updatedBy?: string;
}

const bodySchema = z.object({
  enabled: z.boolean().optional(),
  percentage: z.number().int().min(0).max(100).optional(),
  phones: z.array(z.string()).optional(),
  extraInstructions: z.string().max(2000).optional(),
  tone: z.string().max(500).optional(),
});

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  const redis = getRedis();
  const config = (await redis.get<BotConfig>(CONFIG_KEY)) ?? {};
  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid body", details: err },
      { status: 400 }
    );
  }

  const redis = getRedis();

  try {
    const current = (await redis.get<BotConfig>(CONFIG_KEY)) ?? {};
    const next: BotConfig = {
      ...current,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    await redis.set(CONFIG_KEY, next);

    log.info({ changes: body }, "Bot config actualizada");
    return NextResponse.json({ ok: true, config: next });
  } catch (err) {
    log.error({ err }, "Error guardando config");
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
