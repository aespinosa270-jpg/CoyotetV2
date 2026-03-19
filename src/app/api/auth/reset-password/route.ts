// src/app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json({ error: "Token y contraseña son requeridos." }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 })
    }

    // Hashear el token recibido para comparar con el de la BD
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

    // Buscar el token en BD
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where:  { tokenHash },
      select: { userId: true, expires: true },
    })

    if (!resetRecord) {
      return NextResponse.json({ error: "Enlace inválido o ya utilizado." }, { status: 400 })
    }

    // Verificar que no expiró
    if (resetRecord.expires < new Date()) {
      // Limpiar el token expirado
      await prisma.passwordResetToken.delete({ where: { tokenHash } })
      return NextResponse.json({ error: "El enlace expiró. Solicita uno nuevo." }, { status: 400 })
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Actualizar contraseña y eliminar el token en una transacción
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data:  { password: hashedPassword },
      }),
      prisma.passwordResetToken.delete({ where: { tokenHash } }),
    ])

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada. Ya puedes iniciar sesión.",
    })

  } catch (error: any) {
    console.error("❌ Error en reset-password:", error.message)
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 })
  }
}