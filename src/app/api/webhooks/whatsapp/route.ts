import { NextResponse } from "next/server";
import { handleWhatsAppWebhook } from "../../../../lib/bot/transports/whatsapp/inbound";
import { updateMessageStatus } from "@/lib/bot/repositories/conversation-repo";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ── Procesar eventos de STATUS (enviado/entregado/leido/fallido) ──
    const statuses = body?.entry?.[0]?.changes?.[0]?.value?.statuses;
    if (statuses && Array.isArray(statuses)) {
      // Procesar en background, no bloquear la respuesta a Meta
      (async () => {
        for (const st of statuses) {
          try {
            const waId: string | undefined = st?.id;
            const recipient: string | undefined = st?.recipient_id;
            const rawStatus: string | undefined = st?.status; // sent|delivered|read|failed
            if (!waId || !recipient || !rawStatus) continue;
            const status = rawStatus as "sent" | "delivered" | "read" | "failed";
            // Meta manda el recipient sin el "1" extra (52...), probamos variantes
            const variantes = [
              recipient,
              recipient.startsWith("52") && !recipient.startsWith("521")
                ? "521" + recipient.slice(2)
                : recipient,
            ];
            for (const phone of variantes) {
              const ok = await updateMessageStatus(phone, waId, status);
              if (ok) break;
            }
          } catch (e) {
            console.error("Error procesando status individual", e);
          }
        }
      })().catch(console.error);

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // ── Mensajes entrantes (flujo normal del bot) ──
    handleWhatsAppWebhook(body).catch(console.error);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error procesando webhook de WA", error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
