/**
 * Endpoint: health check completo de los servicios del bot.
 *
 * Pinga (en paralelo, cada uno con timeout 5s):
 *  - Redis (Upstash)
 *  - Supabase pgvector (count de embeddings)
 *  - OpenAI (lista modelos)
 *  - Meta WhatsApp API (verifica phone ID + token)
 *  - Stripe (balance retrieve, gratis e instantáneo)
 *
 * Devuelve el estado de cada servicio + latencia + último timestamp.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "../_lib/guard";
import { getRedis } from "@/lib/bot/repositories/redis";
import { countEmbeddings } from "@/lib/bot/repositories/vector-repo";
import { getOpenAIClient } from "@/lib/bot/services/openai/client";
import { getStripeClient } from "@/lib/bot/services/stripe/client";
import { getEnv } from "@/lib/bot/config/env";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/admin/bot/health" });

const TIMEOUT_MS = 5000;

interface ServiceStatus {
  ok: boolean;
  latencyMs?: number;
  message?: string;
  data?: Record<string, unknown>;
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  const [redisStatus, supabaseStatus, openaiStatus, metaStatus, stripeStatus] =
    await Promise.all([
      withTimeout(checkRedis(), "Redis"),
      withTimeout(checkSupabase(), "Supabase"),
      withTimeout(checkOpenAI(), "OpenAI"),
      withTimeout(checkMeta(), "Meta WhatsApp"),
      withTimeout(checkStripe(), "Stripe"),
    ]);

  const allOk =
    redisStatus.ok &&
    supabaseStatus.ok &&
    openaiStatus.ok &&
    metaStatus.ok &&
    stripeStatus.ok;

  return NextResponse.json({
    ok: allOk,
    redis: redisStatus,
    supabase: supabaseStatus,
    openai: openaiStatus,
    meta: metaStatus,
    stripe: stripeStatus,
    timestamp: new Date().toISOString(),
  });
}

// ── Timeout wrapper ─────────────────────────────────────────────────────
function withTimeout(
  promise: Promise<ServiceStatus>,
  serviceName: string,
): Promise<ServiceStatus> {
  return Promise.race([
    promise,
    new Promise<ServiceStatus>((resolve) =>
      setTimeout(
        () =>
          resolve({
            ok: false,
            message: `Timeout >${TIMEOUT_MS}ms`,
            latencyMs: TIMEOUT_MS,
          }),
        TIMEOUT_MS,
      ),
    ),
  ]).catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ err: msg, service: serviceName }, "Health check threw");
    return { ok: false, message: msg };
  });
}

// ── Checks individuales ─────────────────────────────────────────────────
async function checkRedis(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const redis = getRedis();
    await redis.ping();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ err: msg }, "Redis health check failed");
    return { ok: false, message: msg, latencyMs: Date.now() - start };
  }
}

async function checkSupabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const count = await countEmbeddings();
    return {
      ok: true,
      latencyMs: Date.now() - start,
      data: { embeddingsCount: count },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ err: msg }, "Supabase health check failed");
    return { ok: false, message: msg, latencyMs: Date.now() - start };
  }
}

async function checkOpenAI(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const client = getOpenAIClient();
    const models = await client.models.list();
    return {
      ok: true,
      latencyMs: Date.now() - start,
      data: { modelsAvailable: models.data?.length ?? 0 },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ err: msg }, "OpenAI health check failed");
    return { ok: false, message: msg, latencyMs: Date.now() - start };
  }
}

async function checkMeta(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const env = getEnv();
    const url = `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}?fields=verified_name,display_phone_number,quality_rating`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      },
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return {
        ok: false,
        latencyMs: Date.now() - start,
        message: `HTTP ${res.status}: ${errBody.slice(0, 100)}`,
      };
    }
    const data = (await res.json()) as {
      verified_name?: string;
      display_phone_number?: string;
      quality_rating?: string;
    };
    return {
      ok: true,
      latencyMs: Date.now() - start,
      data: {
        verifiedName: data.verified_name ?? "n/a",
        phoneNumber: data.display_phone_number ?? "n/a",
        qualityRating: data.quality_rating ?? "n/a",
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ err: msg }, "Meta health check failed");
    return { ok: false, message: msg, latencyMs: Date.now() - start };
  }
}

async function checkStripe(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const stripe = getStripeClient();
    const balance = await stripe.balance.retrieve();
    const available =
      balance.available?.[0]?.amount !== undefined
        ? balance.available[0].amount / 100
        : 0;
    const pending =
      balance.pending?.[0]?.amount !== undefined
        ? balance.pending[0].amount / 100
        : 0;
    const currency = balance.available?.[0]?.currency?.toUpperCase() ?? "MXN";
    return {
      ok: true,
      latencyMs: Date.now() - start,
      data: {
        availableAmount: available,
        pendingAmount: pending,
        currency,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ err: msg }, "Stripe health check failed");
    return { ok: false, message: msg, latencyMs: Date.now() - start };
  }
}