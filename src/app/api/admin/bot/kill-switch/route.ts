/**
 * POST /api/admin/bot/kill-switch
 *
 * Body: { "action": "kill" | "revive" }
 *
 * Apaga o re-activa el bot v2 globalmente.
 * Cuando está "killed", todos los mensajes van al v1 (legacy).
 *
 * Cambio surte efecto en <10 segundos sin redeploy.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/guard";
import {
  killBotV2,
  reviveBotV2,
  getKillSwitchStatus,
} from "@/lib/bot/config/feature-flags";

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  const status = await getKillSwitchStatus();
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const action = body.action;

  if (action === "kill") {
    await killBotV2();
    return NextResponse.json({
      ok: true,
      message: "🔴 V2 apagado. Mensajes ahora van a V1.",
      status: await getKillSwitchStatus(),
    });
  }

  if (action === "revive") {
    await reviveBotV2();
    return NextResponse.json({
      ok: true,
      message: "🟢 V2 re-activado al 100%.",
      status: await getKillSwitchStatus(),
    });
  }

  return NextResponse.json(
    { error: "action debe ser 'kill' o 'revive'" },
    { status: 400 }
  );
}
