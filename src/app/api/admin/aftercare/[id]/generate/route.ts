/**
 * POST /api/admin/aftercare/[id]/generate
 *
 * Genera mensaje WA personalizado según tipo de aftercare:
 *   - post_delivery_7d → "¿Cómo te llegó tu pedido?"
 *   - re_engagement_30d → mensaje re-engagement con tono Coyote
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../bot/_lib/guard";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;

  const event = await prisma.aftercareEvent.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, trustScore: true } },
      order: {
        select: {
          orderNumber: true,
          total: true,
          customerName: true,
          deliveredAt: true,
          items: { select: { title: true, quantity: true, unit: true } },
        },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event no existe" }, { status: 404 });
  }

  const nombre = event.user?.name ?? event.order?.customerName ?? "amigo";
  const orderInfo = event.order
    ? `${event.order.orderNumber} ($${event.order.total.toLocaleString("es-MX")} MXN)`
    : "pedido reciente";

  const itemsTexto = event.order?.items
    ?.map((i: any) => `${i.quantity}${i.unit ?? "kg"} ${i.title}`)
    .join(", ");

  let systemPrompt = "";
  let userPrompt = "";

  if (event.type === "post_delivery_7d") {
    systemPrompt = `Eres Jack de Coyote Textil. Vas a escribir un check post-venta WhatsApp a un cliente que recibio su pedido hace 7 dias.
TONO: directo, calido, breve (max 3-4 lineas). Termina con UNA pregunta SI/NO sobre como le llego.
NUNCA empieces con "Espero que te encuentres bien".
EJEMPLO de estilo: "Hola [nombre] 🐺 te escribo a ver como te llego la [tela] del pedido [num]. ¿Quedaste contento o hubo algun detalle? Cualquier feedback me sirve un mundo."
Devuelve SOLO el texto del mensaje, sin comillas, sin markdown.`;

    userPrompt = `Cliente: ${nombre}\nPedido: ${orderInfo}\nItems: ${itemsTexto ?? "tela"}\nFecha entrega: ${event.order?.deliveredAt}\nTrust score actual: ${event.user?.trustScore ?? 70}`;
  } else if (event.type === "re_engagement_30d") {
    systemPrompt = `Eres Jack de Coyote Textil. Vas a re-engager un cliente que compro hace 30 dias y NO ha vuelto.
TONO: directo, calido, NO insistente. Max 4 lineas WhatsApp.
ANGULO: que se sienta recordado, NO presionado. Una pregunta abierta o de 1 paso.
EJEMPLO de estilo: "Hola [nombre] 🐺 ya pasaron 30 dias desde que te entregamos [tela]. ¿Como te ha funcionado? Si vas a entrar a otra produccion, te dejo agendado el siguiente pedido con mismo precio."
Devuelve SOLO el texto del mensaje, sin comillas, sin markdown.`;

    userPrompt = `Cliente: ${nombre}\nUltimo pedido: ${orderInfo} hace 30 dias\nItems: ${itemsTexto ?? "tela"}\nTrust score: ${event.user?.trustScore ?? 70}`;
  } else {
    return NextResponse.json({ error: "Tipo aftercare desconocido" }, { status: 400 });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 250,
    });

    const mensaje = response.choices[0]?.message?.content?.trim();
    if (!mensaje) {
      return NextResponse.json({ error: "OpenAI no devolvio contenido" }, { status: 500 });
    }

    return NextResponse.json({ mensaje });
  } catch (err: any) {
    return NextResponse.json({ error: `OpenAI: ${err.message}` }, { status: 500 });
  }
}