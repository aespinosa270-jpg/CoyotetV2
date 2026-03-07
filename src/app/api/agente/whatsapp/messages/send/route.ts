import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { conversationId, body, employeeId } = await req.json();
    
    if (!conversationId || !body) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    // 1. Buscamos a qué número de teléfono pertenece esta conversación
    const conversation = await prisma.waConversation.findUnique({
      where: { id: conversationId },
      select: { contactPhone: true } // 👈 Aseguramos usar el campo correcto
    });

    if (!conversation || !conversation.contactPhone) {
      return NextResponse.json({ error: "Conversación no encontrada o sin teléfono" }, { status: 404 });
    }

    // 2. 🚀 DISPARAMOS EL MENSAJE REAL A META (WHATSAPP)
    const TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

    const metaResponse = await fetch(`https://graph.facebook.com/v22.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: conversation.contactPhone, // El teléfono real extraído de Prisma
        type: 'text',
        text: {
          preview_url: false,
          body: body // El texto que el agente tipeó en el CRM
        }
      })
    });

    if (!metaResponse.ok) {
      const metaError = await metaResponse.json();
      console.error("❌ Meta rechazó el envío:", metaError);
      return NextResponse.json({ error: "Fallo al enviar a WhatsApp", detalles: metaError }, { status: 500 });
    }

    // 3. 💾 SI META LO ENTREGÓ, AHORA SÍ LO GUARDAMOS EN EL HISTORIAL DEL CRM
    const [message] = await prisma.$transaction([
      prisma.waMessage.create({
        data: { conversationId, role: "AGENT", body, isRead: true }, 
      }),
      prisma.waConversation.update({
        where: { id: conversationId },
        data:  { lastMessage: body, lastMessageAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ...message, sentAt: message.sentAt.toISOString() });

  } catch (error: any) {
    console.error("🔥 Error interno en POST send:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}