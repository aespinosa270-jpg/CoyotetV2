import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get("conversationId");
    
    // Si no mandan el ID de la conversación, devolvemos un array vacío
    if (!conversationId) return NextResponse.json([]);

    // Buscamos todos los mensajes de este chat ordenados del más viejo al más nuevo
    const messages = await prisma.waMessage.findMany({
      where:   { conversationId },
      orderBy: { sentAt: "asc" },
    });

    return NextResponse.json(
      messages.map((m) => ({ ...m, sentAt: m.sentAt.toISOString() }))
    );
  } catch (error) {
    console.error("🔥 Error al obtener historial de mensajes:", error);
    return NextResponse.json({ error: "Fallo al cargar mensajes" }, { status: 500 });
  }
}