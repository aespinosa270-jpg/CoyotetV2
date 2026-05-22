/**
 * GET  /api/admin/brand-voice -> devuelve la voz de marca actual desde Redis
 * PUT  /api/admin/brand-voice -> guarda nueva voz (invalida cache automaticamente)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../bot/_lib/guard";
import { getRedis } from "@/lib/bot/repositories/redis";
import { _resetRuntimeConfigCache } from "@/lib/bot/config/runtime-config";
import type { BrandVoice, BotConfigOverlay } from "@/lib/bot/config/runtime-config";
import { auth } from "@/auth";

const CONFIG_KEY = "v2:config";

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  const redis = getRedis();
  const overlay = await redis.get<BotConfigOverlay>(CONFIG_KEY);

  return NextResponse.json({
    brandVoice: overlay?.brandVoice ?? null,
    updatedAt: overlay?.updatedAt ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const session = await auth();
  const userEmail = session?.user?.email ?? "unknown";

  const body = (await req.json()) as BrandVoice;

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "body invalido" }, { status: 400 });
  }

  const cleaned: BrandVoice = {
    tone: body.tone?.trim() || undefined,
    allowedPhrases: Array.isArray(body.allowedPhrases)
      ? body.allowedPhrases.map((p: string) => String(p).trim()).filter(Boolean)
      : undefined,
    forbiddenPhrases: Array.isArray(body.forbiddenPhrases)
      ? body.forbiddenPhrases.map((p: string) => String(p).trim()).filter(Boolean)
      : undefined,
    emojis: Array.isArray(body.emojis)
      ? body.emojis.map((e: string) => String(e).trim()).filter(Boolean)
      : undefined,
    signature: body.signature?.trim() || undefined,
    structuralRules: body.structuralRules?.trim() || undefined,
    extraNotes: body.extraNotes?.trim() || undefined,
    updatedAt: new Date().toISOString(),
    updatedBy: userEmail,
  };

  const redis = getRedis();
  const existing = (await redis.get<BotConfigOverlay>(CONFIG_KEY)) ?? {};
  const newOverlay: BotConfigOverlay = {
    ...existing,
    brandVoice: cleaned,
    updatedAt: new Date().toISOString(),
  };

  await redis.set(CONFIG_KEY, newOverlay);
  _resetRuntimeConfigCache();

  return NextResponse.json({ ok: true, brandVoice: cleaned });
}