// src/app/api/user/profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    // Buscamos al socio coyote
    const user = await prisma.user.findUnique({
      where: { email },
      select: { 
        id: true, name: true, email: true, phone: true, 
        membershipTier: true, points: true, membershipExpiry: true 
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Buscamos todo su historial de compras, incluyendo los productos
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true } // 🔥 Traemos los items para el botón de "Volver a comprar"
    });

    return NextResponse.json({ user, orders });
  } catch (error) {
    console.error("🔥 Error cargando perfil:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}