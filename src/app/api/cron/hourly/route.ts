/**
 * Cron HORARIO: tareas que se benefician de correr seguido.
 *
 * Llamado por cron-job.org cada hora con:
 *   POST /api/cron/hourly
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Jobs incluidos:
 *  - reminders: recordatorios a pedidos pendientes >24h
 */
import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "../_lib/guard";
import { runRemindersJob } from "@/lib/bot/jobs/reminders";
import { getLogger } from "@/lib/bot/observability/logger";
import { recordEvent } from "@/lib/bot/observability/events";

const log = getLogger({ module: "api/cron/hourly" });

export async function POST(req: NextRequest) {
  const auth = requireCronAuth(req);
  if (auth) return auth;

  const start = Date.now();
  const results: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  // ── Job: reminders ──
  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "1";

    const reminders = await runRemindersJob({ dryRun });
    results.reminders = reminders;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg }, "Job reminders falló");
    errors.reminders = msg;
    await recordEvent({
      type: "error",
      data: { source: "cron_hourly_reminders", message: msg },
    });
  }

  const tookMs = Date.now() - start;
  log.info({ tookMs, results, errors }, "Cron horario completado");

  return NextResponse.json({
    ok: Object.keys(errors).length === 0,
    tookMs,
    results,
    errors,
  });
}

/** GET para health check trivial */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "cron/hourly",
    jobs: ["reminders"],
  });
}
