// src/app/crm/admin/interacciones/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth"; // Tu configuración de NextAuth
import { revalidatePath } from "next/cache";

// ==========================================
// 1. ENVIAR MENSAJE A META Y GUARDAR EN BD
// ==========================================
export async function sendAdminMessage(conversationId: string, phone: string, text: string) {
  try {
    // 1. Validar quién es el agente/admin usando la sesión segura
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "No tienes autorización." };
    }

    const adminId = session.user.id;

    // 2. Llamada a la API Graph de Meta (WhatsApp)
    // Asegúrate de tener estas variables en tu archivo .env
    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

    const metaResponse = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: { preview_url: false, body: text }
      }),
    });

    if (!metaResponse.ok) {
      const errorData = await metaResponse.json();
      console.error("Meta API Error:", errorData);
      return { success: false, error: "Meta rechazó el mensaje." };
    }

    const metaData = await metaResponse.json();
    const waMessageId = metaData.messages?.[0]?.id;

    // 3. Registrar el mensaje en Prisma (Auditoría)
    await prisma.waMessage.create({
      data: {
        waId: waMessageId,
        conversationId: conversationId,
        role: "AGENT", // Fue enviado por un humano
        body: text,
      }
    });

    // 4. TOMAR EL CONTROL Y REINICIAR EL RELOJ (Aquí matamos el time-frame de la IA)
    await prisma.waConversation.update({
      where: { id: conversationId },
      data: {
        handledBy: "ADMIN",
        lastAdminMessageAt: new Date(), // El reloj de los 5 minutos empieza AHORA
        employeeId: adminId, // Dejamos rastro de quién tomó el chat
        isOpen: true,
      }
    });

    // Refrescar la página para que el mensaje aparezca
    revalidatePath('/crm/admin/interacciones');
    return { success: true };

  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    return { success: false, error: "Error interno del servidor." };
  }
}

// ==========================================
// 2. TOMAR / DEVOLVER CONTROL MANUALMENTE
// ==========================================
export async function toggleChatControl(conversationId: string, toAction: "ADMIN" | "BOT") {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado." };

    await prisma.waConversation.update({
      where: { id: conversationId },
      data: {
        handledBy: toAction,
        lastAdminMessageAt: toAction === "ADMIN" ? new Date() : null,
        employeeId: toAction === "ADMIN" ? session.user.id : null
      }
    });

    revalidatePath('/crm/admin/interacciones');
    return { success: true };
  } catch (error) {
    console.error("Error toggling control:", error);
    return { success: false, error: "Error interno del servidor." };
  }
}

// ==========================================
// 3. CREAR NUEVO CHAT MANUALMENTE
// ==========================================
export async function createNewChat(name: string, phone: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "No autorizado." };

    // Limpiar el teléfono (quitar espacios o guiones si el admin los puso)
    const cleanPhone = phone.replace(/\D/g, '');

    // Verificar si ya existe
    const existing = await prisma.waConversation.findUnique({
      where: { contactPhone: cleanPhone }
    });

    if (existing) {
      // Si ya existía, simplemente le abrimos el chat y le avisamos
      return { success: true, conversationId: existing.id, message: "El contacto ya existía." };
    }

    // Crear la nueva conversación
    const newChat = await prisma.waConversation.create({
      data: {
        contactName: name,
        contactPhone: cleanPhone,
        handledBy: "ADMIN", // Lo toma el admin por defecto al crearlo
        employeeId: session.user.id,
        lastAdminMessageAt: new Date(),
      }
    });

    revalidatePath('/crm/admin/interacciones');
    return { success: true, conversationId: newChat.id };
  } catch (error) {
    console.error("Error al crear chat:", error);
    return { success: false, error: "Error interno al crear el contacto." };
  }
}