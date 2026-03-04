import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { employeeId, cliente, deal } = await req.json();

  if (!employeeId || !cliente?.email || !cliente?.nombre) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  try {
    // 1. Crear o encontrar usuario
    let user = await prisma.user.findUnique({ where: { email: cliente.email } });

    if (!user) {
      const tempPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
      user = await prisma.user.create({
        data: {
          name:    cliente.nombre,
          email:   cliente.email,
          phone:   cliente.telefono,
          company: cliente.empresa,
          rfc:     cliente.rfc     || null,
          city:    cliente.ciudad  || null,
          notes:   cliente.notas   || null,
          password: tempPassword,
        },
      });
    }

    // 2. Crear deal inicial
    const dealCreado = await prisma.deal.create({
      data: {
        title:      deal.titulo,
        company:    cliente.empresa,
        userId:     user.id,
        employeeId,
        productId:  deal.productoId  || null,
        quantity:   deal.cantidad    || null,
        value:      deal.valorEstimado,
        status:     deal.pipeline,
        color:      deal.color       || null,
        notes:      deal.notas       || null,
      },
    });

    // 3. Crear interacción inicial automática
    await prisma.interaction.create({
      data: {
        employeeId,
        userId:        user.id,
        type:          "PRESENCIAL",
        summary:       `Onboarding: ${cliente.nombre} registrado como nuevo cliente. Deal inicial: ${deal.titulo}.`,
        pipelineStatus: deal.pipeline,
        date:          new Date(),
      },
    });

    return NextResponse.json({ userId: user.id, dealId: dealCreado.id });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "El email ya existe en el sistema" }, { status: 409 });
    }
    return NextResponse.json({ error: e.message ?? "Error interno" }, { status: 500 });
  }
}
