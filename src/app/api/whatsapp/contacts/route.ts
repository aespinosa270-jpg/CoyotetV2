import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Buscamos clientes en la tabla User que tengan teléfono registrado
    const contacts = await prisma.user.findMany({
      where: { 
        phone: { not: null } 
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50, // Límite para no saturar el modal
    });

    return NextResponse.json(contacts || []);
  } catch (error) {
    console.error("❌ Error cargando contactos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}