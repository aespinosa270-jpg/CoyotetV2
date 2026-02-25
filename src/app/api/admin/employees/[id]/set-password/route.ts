import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(
  req: Request, 
  { params }: { params: Promise<{ id: string }> } // 🐺 1. Declaramos que params es una Promesa
) {
  try {
    const { id } = await params; // 🐺 2. Desenvolvemos la promesa con await

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
      where: { id: id }, // 🐺 3. Usamos la variable limpia que sacamos arriba
      data: { password: hashedPassword },
    });

    return NextResponse.json({ ok: true, message: "Contraseña actualizada en Coyote OS" });
  } catch (err) {
    console.error("Error al setear password:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}