/**
 * Cron DIARIO: tareas pesadas que solo necesitan correr 1 vez al día.
 *
 * Llamado por cron-job.org una vez al día con:
 *   POST /api/cron/daily
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Jobs incluidos:
 *  - reactivation: marcar clientes inactivos >30d
 *  - cleanup: asegurar TTLs en caches y dedupes
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "../_lib/guard";
import { runReactivationJob } from "@/lib/bot/jobs/reactivation";
import { runCleanupJob } from "@/lib/bot/jobs/cleanup";
import { runRecompraPredictivaJob } from "@/lib/bot/services/followup/recompra-predictiva";
import { getLogger } from "@/lib/bot/observability/logger";
import { recordEvent } from "@/lib/bot/observability/events";

const log = getLogger({ module: "api/cron/daily" });

export async function POST(req: NextRequest) {
  const auth = requireCronAuth(req);
  if (auth) return auth;

  const start = Date.now();
  const results: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  // ── Job: reactivation ──
  try {
    const r = await runReactivationJob({ dryRun });
    results.reactivation = r;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg }, "Job reactivation falló");
    errors.reactivation = msg;
    await recordEvent({
      type: "error",
      data: { source: "cron_daily_reactivation", message: msg },
    });
  }

  // ── Job: cleanup ──
  try {
    const r = await runCleanupJob({ dryRun });
    results.cleanup = r;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg }, "Job cleanup falló");
    errors.cleanup = msg;
    await recordEvent({
      type: "error",
      data: { source: "cron_daily_cleanup", message: msg },
    });
  }

  const tookMs = Date.now() - start;
  log.info({ tookMs, results, errors }, "Cron diario completado");

  return NextResponse.json({
    ok: Object.keys(errors).length === 0,
    tookMs,
    results,
    errors,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "cron/daily",
    jobs: ["reactivation", "recompra_predictiva", "cleanup"],
  });
}
