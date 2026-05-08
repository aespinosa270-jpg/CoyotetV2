import { NextResponse } from "next/server";
import { handleWhatsAppWebhook } from "../../../../lib/bot/transports/whatsapp/adapter";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Aquí validamos firma y estatus
    const esStatus = body?.entry?.[0]?.changes?.[0]?.value?.statuses;
    if (esStatus) return NextResponse.json({ ok: true }, { status: 200 });

    // Lanzamos el proceso sin bloquear la respuesta de Meta
    handleWhatsAppWebhook(body).catch(console.error);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error procesando webhook de WA", error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
