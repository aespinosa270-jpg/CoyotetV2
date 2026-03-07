// src/app/api/agente/whatsapp/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId, phone, name, employeeId } = await req.json();

    // 1. Verificamos si ya existe un chat abierto con este cliente
    let convo = await prisma.waConversation.findFirst({
      where: { contactPhone: phone }, // Buscamos si existe con este número
      include: { user: { select: { id: true, name: true, email: true, phone: true } } }
    });

    // 2. Si no existe, creamos la nueva conversación
    if (!convo) {
      convo = await prisma.waConversation.create({
        data: {
          contactPhone: phone,
          contactName: name,
          isOpen: true,
          employeeId: employeeId,
          userId: userId, // Lo vinculamos a su cuenta
          unreadCount: 0  // 👈 Clave para que no falle el frontend
        },
        include: { user: { select: { id: true, name: true, email: true, phone: true } } }
      });
    } else if (!convo.isOpen) {
      // Si existía pero estaba cerrada, la reabrimos
      convo = await prisma.waConversation.update({
        where: { id: convo.id },
        data: { isOpen: true, employeeId: employeeId },
        include: { user: { select: { id: true, name: true, email: true, phone: true } } }
      });
    }

    // 3. Devolvemos la conversación
    return NextResponse.json({
      ...convo,
      messages: [],
      lastMessageAt: convo.lastMessageAt ? convo.lastMessageAt.toISOString() : null,
    });
  } catch (error: any) {
    console.error("Error creando conversación:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}