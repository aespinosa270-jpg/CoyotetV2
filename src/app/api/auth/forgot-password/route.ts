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

    const emailClean = email.toLowerCase().trim()
    console.log("🔍 Buscando email:", emailClean)

    const user = await prisma.user.findUnique({
      where:  { email: emailClean },
      select: { id: true, name: true, email: true },
    })

    console.log("🔍 Usuario encontrado:", !!user, user?.email)

    if (!user) {
      return NextResponse.json({
        success: true,
        message: "Si ese correo está registrado, recibirás el enlace en breve.",
      })
    }

    const token     = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    const expires   = new Date(Date.now() + 60 * 60 * 1000)

    console.log("🔍 Token generado:", token.slice(0, 8) + "...")

    await prisma.passwordResetToken.upsert({
      where:  { userId: user.id },
      update: { tokenHash, expires, createdAt: new Date() },
      create: { userId: user.id, tokenHash, expires },
    })

    console.log("🔍 Token guardado en BD ✅")

    const resetUrl = `${process.env.NEXTAUTH_URL}/cuenta/reset?token=${token}`

    console.log("🔍 NEXTAUTH_URL:", process.env.NEXTAUTH_URL)
    console.log("🔍 SENDER:", process.env.ZEPTOMAIL_SENDER)
    console.log("🔍 KEY existe:", !!process.env.ZEPTOMAIL_API_KEY)
    console.log("🔍 Reset URL:", resetUrl)

    const result = await sendResetPasswordEmail(user.email, user.name || "Socio", resetUrl)

    console.log("🔍 Resultado ZeptoMail:", JSON.stringify(result))

    return NextResponse.json({
      success: true,
      message: "Si ese correo está registrado, recibirás el enlace en breve.",
    })

  } catch (error: any) {
    console.error("❌ Error en forgot-password:", error.message)
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 })
  }
}