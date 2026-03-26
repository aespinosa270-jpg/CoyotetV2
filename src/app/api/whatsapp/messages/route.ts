import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");

  if (!conversationId) {
    return NextResponse.json({ error: "Falta el ID de la conversación" }, { status: 400 });
  }

  try {
    // 1. Traer todos los mensajes de esta conversación en orden cronológico
    const messages = await prisma.waMessage.findMany({
      where: { conversationId },
      orderBy: { sentAt: "asc" }, // Del más antiguo al más nuevo
    });

    // 2. Si el agente abre el chat, marcamos los mensajes como leídos
    await prisma.waConversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 }
    });

    // Siempre devolvemos un Array para que el frontend no truene
    return NextResponse.json(messages || []);
    
  } catch (error) {
    console.error("❌ Error cargando mensajes:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}