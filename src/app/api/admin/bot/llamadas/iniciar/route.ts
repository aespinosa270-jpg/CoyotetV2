/**
 * POST /api/admin/bot/llamadas/iniciar
 *
 * Body: { phone: string }
 *
 * Inicia una llamada Zadarma click-to-call: primero suena en el SIP del
 * agente; al contestar, conecta con el cliente.
 *
 * Requiere admin auth.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../_lib/guard";
import { iniciarLlamadaZadarma } from "@/lib/bot/services/zadarma/callback";
import { getLogger } from "@/lib/bot/observability/logger";

const log = getLogger({ module: "api/admin/bot/llamadas/iniciar" });

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const phone = (body?.phone as string | undefined)?.trim();
  if (!phone) {
    return NextResponse.json({ error: "phone requerido" }, { status: 400 });
  }

  // Validar formato (10-15 dígitos, sin caracteres especiales)
  const phoneNorm = phone.replace(/[^\d]/g, "");
  if (!/^\d{10,15}$/.test(phoneNorm)) {
    return NextResponse.json(
      { error: `Teléfono inválido: ${phone} (los IDs web no se pueden llamar)` },
      { status: 400 }
    );
  }

  log.info({ phone: phoneNorm }, "Iniciando llamada Zadarma");

  const result = await iniciarLlamadaZadarma(phoneNorm);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // Telemetría: log básico, sin recordEvent
  log.info({ phone: phoneNorm, callId: result.callId }, "Llamada Zadarma iniciada OK");

  return NextResponse.json({
    ok: true,
    callId: result.callId,
    message: "Llamada iniciada. Conteste su teléfono SIP.",
  });
}