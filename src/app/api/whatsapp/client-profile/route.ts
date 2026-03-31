import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const phone = searchParams.get("phone");

    let user = null;

    // Buscamos al cliente por ID o por su teléfono
    if (userId && userId !== "undefined") {
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: { _count: { select: { orders: true } } } // Contamos sus compras
      });
    } else if (phone) {
      user = await prisma.user.findFirst({
        where: { phone },
        include: { _count: { select: { orders: true } } }
      });
    }

    if (!user) {
      return NextResponse.json({ ordersCount: 0, ltv: 0 });
    }

    // Regresamos la inteligencia B2B
    return NextResponse.json({
      ordersCount: user._count.orders,
      ltv: user.ltv || 0,
    });

  } catch (error) {
    console.error("❌ Error sacando perfil:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}