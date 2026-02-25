import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { password } = await req.json();

    // Validación Coyote: mínimo 8 caracteres para seguridad real
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" }, 
        { status: 400 }
      );
    }

    // Hasheamos la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualizamos el campo password nativo
    await prisma.employee.update({
      where: { id: params.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ ok: true, message: "Contraseña actualizada en Coyote OS" });
  } catch (err) {
    console.error("Error al setear password:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}