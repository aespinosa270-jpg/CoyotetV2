import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Buscamos a todos los usuarios que tengan un teléfono registrado
    const contacts = await prisma.user.findMany({
      where: { phone: { not: null } },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" }
    });
    
    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Error obteniendo contactos:", error);
    return NextResponse.json({ error: "Fallo al cargar contactos" }, { status: 500 });
  }
}