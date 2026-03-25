// src/app/api/crm/chat/send/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "../../../../../auth";

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export const POST = auth(async (req: Request) => {
  try {
    const session = (req as any).auth;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { conversationId, message } = await req.json();

    if (!conversationId || !message) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // 1. Buscamos la conversación para saber a qué número disparar
    const conversation = await prisma.waConversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    // 2. Disparamos a la API de WhatsApp Cloud
    const res = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        messaging_product: 'whatsapp', 
        recipient_type: 'individual', 
        to: conversation.contactPhone, 
        type: 'text', 
        text: { body: message } 
      })
    });

    const metaResponse = await res.json();

    if (!res.ok) {
      console.error("🔥 Error de Meta:", metaResponse);
      return NextResponse.json({ error: "Meta rechazó el mensaje" }, { status: 500 });
    }

    // 3. Guardamos el mensaje en Prisma (como enviado por el AGENTE)
    const savedMessage = await prisma.$transaction([
      prisma.waMessage.create({
        data: {
          conversationId,
          role: "AGENT", // 👨‍💻 Identificamos que lo mandó un humano
          body: message,
          isRead: true, // Como lo mandó el agente, ya está "leído"
        }
      }),
      prisma.waConversation.update({
        where: { id: conversationId },
        data: {
          lastMessage: message,
          lastMessageAt: new Date()
        }
      })
    ]);

    return NextResponse.json({ success: true, message: savedMessage[0] });

  } catch (error: any) {
    console.error("🔥 Error enviando mensaje de agente:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});