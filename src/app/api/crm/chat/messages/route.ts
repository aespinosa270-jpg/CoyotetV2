// src/app/api/crm/chat/messages/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "../../../../../auth";

export const GET = auth(async (req: Request) => {
  try {
    const session = (req as any).auth;
    if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const convoId = searchParams.get("convoId");

    if (!convoId) return NextResponse.json({ error: "Falta convoId" }, { status: 400 });

    // 🔥 CORREGIDO: Usamos 'sentAt' que es el nombre exacto en tu schema.prisma
    const messages = await prisma.waMessage.findMany({
      where: { conversationId: convoId },
      orderBy: { sentAt: 'asc' } 
    });

    // Marcamos todos los mensajes del CLIENTE como leídos
    await prisma.waMessage.updateMany({
      where: { conversationId: convoId, role: "CLIENT", isRead: false },
      data: { isRead: true }
    });

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});