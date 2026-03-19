"use client"

import { useState, useEffect, Suspense } from "react"
import { motion } from "framer-motion"
import { Check, AlertCircle, Loader2, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"

function ResetContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const token        = searchParams.get("token")

  const [password,    setPassword]    = useState("")
  const [confirm,     setConfirm]     = useState("")
  const [isLoading,   setIsLoading]   = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null)
  const [tokenValid,  setTokenValid]  = useState(true)

  const customEase = [0.22, 1, 0.36, 1] as const

  useEffect(() => {
    if (!token) setTokenValid(false)
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.")
      return
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setIsLoading(true)
    try {
      const res  = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || "Error al restablecer la contraseña.")

      setSuccessMsg("¡Contraseña actualizada! Redirigiendo al inicio de sesión…")
      setTimeout(() => router.push("/cuenta"), 2500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#000000] text-white font-sans selection:bg-[#FDCB02] selection:text-black overflow-hidden relative">

      {/* LADO IZQUIERDO */}
      <div className="hidden lg:flex w-1/2 relative bg-[#050505] items-center justify-center border-r border-white/5 overflow-hidden">
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0" src="/assets/coyotelogin.mp4" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-20" />
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="relative z-30 w-full max-w-xl p-12"
        >
          <Link href="/" className="text-[32px] font-[1000] uppercase tracking-tighter italic flex items-center mb-16 drop-shadow-2xl">
            COYOTE<span className="text-[#FDCB02]">.</span>
          </Link>
          <h2 className="text-8xl xl:text-[100px] font-[1000] uppercase tracking-tighter leading-[0.82] text-white drop-shadow-2xl mb-10">
            NUEVA<br/><span className="text-[#FDCB02]">CLAVE</span><br/>DE ACCESO.
          </h2>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#FDCB02] shadow-[0_0_15px_rgba(253,203,2,0.5)]" />
            <p className="text-xl font-black uppercase tracking-[0.15em] text-white pl-8 leading-tight drop-shadow-md">
              Seguridad ante todo.<br/>
              <span className="text-neutral-300">Tu cuenta, tu control.</span>
            </p>
          </div>
        </motion.div>
      </div>

      {/* LADO DERECHO */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative bg-[#000000] z-40">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.03, 0.08, 0.03] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,_#FDCB02_0%,_transparent_55%)]"
        />

        <div className="w-full max-w-[420px] relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0,  filter: "blur(0px)" }}
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
          >
            {/* Logo */}
            <div className="mb-14">
              <div className="mb-8">
                <Image src="/coyotelogo.svg" alt="Coyote Logo" width={180} height={45} className="object-contain" />
              </div>
              <h1 className="text-5xl font-[1000] uppercase tracking-tighter leading-none italic">
                <span className="text-white">NUEVA</span> <span className="text-[#FDCB02]">CONTRASEÑA</span>
              </h1>
              <motion.div
                initial={{ width: 0 }} animate={{ width: "3rem" }}
                transition={{ duration: 0.8, ease: customEase, delay: 0.3 }}
                className="h-[4px] bg-[#FDCB02] mt-4"
              />
            </div>

            {/* Token inválido */}
            {!tokenValid && (
              <div className="p-4 bg-red-950/30 border border-red-500/50 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 mb-8">
                <AlertCircle size={16} strokeWidth={2} />
                Enlace inválido o expirado. <Link href="/cuenta" className="underline ml-1">Solicita uno nuevo</Link>
              </div>
            )}

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-4 bg-red-950/30 border border-red-500/50 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
              >
                <AlertCircle size={16} strokeWidth={2} /> {error}
              </motion.div>
            )}

            {/* Éxito */}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-4 bg-green-950/30 border border-green-500/50 text-green-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
              >
                <Check size={16} strokeWidth={2} /> {successMsg}
              </motion.div>
            )}

            {/* Formulario */}
            {tokenValid && !successMsg && (
              <form onSubmit={handleSubmit} className="space-y-10">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full h-12 bg-transparent border-b-2 border-white/20 focus:border-[#FDCB02] outline-none font-bold text-lg text-white transition-colors rounded-none placeholder:text-neutral-800 px-0"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(null); }}
                    required
                    placeholder="••••••••"
                    className="w-full h-12 bg-transparent border-b-2 border-white/20 focus:border-[#FDCB02] outline-none font-bold text-lg text-white transition-colors rounded-none placeholder:text-neutral-800 px-0"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-16 bg-white hover:bg-[#FDCB02] text-black font-[1000] text-sm uppercase tracking-[0.2em] transition-colors duration-300 flex items-center justify-between px-8 group rounded-none"
                  >
                    {isLoading ? (
                      <Loader2 size={24} className="animate-spin mx-auto" />
                    ) : (
                      <>
                        <span>ACTUALIZAR CONTRASEÑA</span>
                        <ArrowRight size={20} strokeWidth={2.5} className="group-hover:translate-x-2 transition-transform duration-300" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-14 pt-8 border-t border-white/10 text-center">
              <Link href="/cuenta" className="text-[11px] font-black text-neutral-500 hover:text-white uppercase tracking-widest transition-colors">
                ← Volver al inicio de sesión
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex bg-black items-center justify-center text-[#FDCB02]">
        <Loader2 className="animate-spin" size={40} />
      </div>
    }>
      <ResetContent />
    </Suspense>
  )
}