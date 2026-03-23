"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Traer todo el historial de un chat específico cuando el agente le da clic
export async function getChatMessages(conversationId: string) {
  const messages = await prisma.waMessage.findMany({
    where: { conversationId },
    orderBy: { sentAt: "asc" },
  });

  return messages.map(m => ({
    ...m,
    sentAt: m.sentAt.toISOString(),
  }));
}

// Enviar un mensaje nuevo
export async function sendMessageAction(conversationId: string, body: string) {
  try {
    const newMessage = await prisma.waMessage.create({
      data: {
        conversationId,
        body,
        role: "AGENT", // El agente está respondiendo
      }
    });

    // Actualizar la conversación para que suba en la lista y cambie el preview
    await prisma.waConversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: body,
        lastMessageAt: new Date(),
        unreadCount: 0, // Al responder, marcamos como leído
      }
    });

    revalidatePath("/crm/agente/whatsapp");
    return { 
      success: true, 
      data: { ...newMessage, sentAt: newMessage.sentAt.toISOString() } 
    };
  } catch (error) {
    console.error("[sendMessageAction]", error);
    return { success: false, error: "Error al enviar el mensaje" };
  }
}