// src/app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendResetPasswordEmail } from "@/lib/zeptomail"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requerido." }, { status: 400 })
    }

    // Buscar usuario — siempre responder igual para no revelar si el email existe
    const user = await prisma.user.findUnique({
      where:  { email: email.toLowerCase().trim() },
      select: { id: true, name: true, email: true },
    })

    // Si no existe, respondemos OK igual (seguridad: no revelar emails registrados)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "Si ese correo está registrado, recibirás el enlace en breve.",
      })
    }

    // Generar token seguro y su hash para guardar en BD
    const token     = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    const expires   = new Date(Date.now() + 60 * 60 * 1000) // 60 minutos

    // Guardar token hasheado en BD
    // Usamos upsert para reemplazar cualquier token previo del mismo usuario
    await prisma.passwordResetToken.upsert({
      where:  { userId: user.id },
      update: { tokenHash, expires, createdAt: new Date() },
      create: { userId: user.id, tokenHash, expires },
    })

    // Construir URL de reset con el token en claro (NO el hash)
    const resetUrl = `${process.env.NEXTAUTH_URL}/cuenta/reset?token=${token}`

    // Enviar correo
    await sendResetPasswordEmail(user.email, user.name || "Socio", resetUrl)

    return NextResponse.json({
      success: true,
      message: "Si ese correo está registrado, recibirás el enlace en breve.",
    })

  } catch (error: any) {
    console.error("❌ Error en forgot-password:", error.message)
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 })
  }
}