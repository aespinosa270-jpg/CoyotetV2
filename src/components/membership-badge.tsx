// src/components/membership-badge.tsx
// Badge del tier de membresía — úsalo en Navbar y Perfil
//
// USO EN NAVBAR:
//   <MembershipBadge />                          — solo badge pequeño
//   <MembershipBadge showPoints />               — badge + puntos
//
// USO EN PERFIL:
//   <MembershipBadge variant="full" showPoints showRenewal showColocaciones />

"use client"

type MembershipTier = "NONE" | "GOLD" | "BLACK" | "ELITE"

import { useMembership } from "@/lib/hooks/use-membership"

import { Crown, Zap, Star, Package } from "lucide-react"
import { motion } from "framer-motion"

// ─── Paleta por tier ──────────────────────────────────────────────────────────
const TIER_STYLE: Record<MembershipTier, {
  bg: string; text: string; border: string; glow: string; label: string; icon: React.ReactNode
}> = {
  ["NONE"]: {
    bg:     "bg-neutral-100",
    text:   "text-neutral-500",
    border: "border-neutral-200",
    glow:   "",
    label:  "Básico",
    icon:   <Star size={10} />,
  },
  ["GOLD"]: {
    bg:     "bg-[#fdc800]/15",
    text:   "text-[#b87800]",
    border: "border-[#fdc800]/40",
    glow:   "shadow-[0_0_12px_#fdc80044]",
    label:  "Gold",
    icon:   <Crown size={10} className="fill-current" />,
  },
  ["BLACK"]: {
    bg:     "bg-neutral-900",
    text:   "text-neutral-200",
    border: "border-neutral-700",
    glow:   "shadow-[0_0_12px_#ffffff18]",
    label:  "Black",
    icon:   <Zap size={10} className="fill-current" />,
  },
  ["ELITE"]: {
    bg:     "bg-[#0c1e4c]/80",
    text:   "text-[#98d0f8]",
    border: "border-[#2c8cdc]/40",
    glow:   "shadow-[0_0_14px_#2c8cdc44]",
    label:  "Elite",
    icon:   <Crown size={10} className="fill-current" />,
  },
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface MembershipBadgeProps {
  variant?:           "pill" | "full"   // pill = compacto para nav, full = card para perfil
  showPoints?:        boolean
  showRenewal?:       boolean
  showColocaciones?:  boolean
  className?:         string
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function MembershipBadge({
  variant = "pill",
  showPoints = false,
  showRenewal = false,
  showColocaciones = false,
  className = "",
}: MembershipBadgeProps) {
  const {
    tier, hasPaid, loading,
    puntos, discountPct,
    colocacionesRestantes, colocacionesTotal,
    proximoRenovacion,
  } = useMembership()

  if (loading) {
    return (
      <div className={`h-6 w-16 bg-neutral-200 animate-pulse rounded-full ${className}`} />
    )
  }

  const style = TIER_STYLE[tier]

  // ── VARIANT: PILL (nav / header) ───────────────────────────────────────────
  if (variant === "pill") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
          border text-[10px] font-black uppercase tracking-widest
          ${style.bg} ${style.text} ${style.border} ${style.glow}
          ${className}
        `}
      >
        {style.icon}
        {style.label}
        {showPoints && hasPaid && (
          <span className="opacity-60 font-bold">· {puntos} pts</span>
        )}
      </motion.div>
    )
  }

  // ── VARIANT: FULL (perfil) ─────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-2xl border p-5 space-y-4
        ${style.bg} ${style.border} ${style.glow}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${style.text} bg-black/10`}>
            {style.icon}
          </div>
          <div>
            <p className={`text-[9px] uppercase tracking-widest font-black opacity-50 ${style.text}`}>
              Membresía Activa
            </p>
            <p className={`text-lg font-[1000] uppercase tracking-tight leading-none ${style.text}`}>
              {style.label}
            </p>
          </div>
        </div>

        {hasPaid && discountPct > 0 && (
          <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-black/10 ${style.text}`}>
            −{discountPct}% en productos
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Puntos */}
        {showPoints && (
          <div className="bg-black/10 rounded-xl p-3">
            <p className={`text-[9px] uppercase tracking-widest font-black opacity-50 mb-1 ${style.text}`}>
              Puntos
            </p>
            <p className={`text-xl font-[1000] ${style.text}`}>{puntos.toLocaleString()}</p>
          </div>
        )}

        {/* Colocaciones */}
        {showColocaciones && hasPaid && (
          <div className="bg-black/10 rounded-xl p-3">
            <p className={`text-[9px] uppercase tracking-widest font-black opacity-50 mb-1 ${style.text}`}>
              Colocaciones
            </p>
            <div className="flex items-baseline gap-1">
              <p className={`text-xl font-[1000] ${style.text}`}>{colocacionesRestantes}</p>
              <p className={`text-xs opacity-50 ${style.text}`}>/ {colocacionesTotal}</p>
            </div>
            {/* Barra de progreso */}
            <div className="mt-2 h-1.5 bg-black/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${colocacionesTotal > 0 ? (colocacionesRestantes / colocacionesTotal) * 100 : 0}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-current opacity-70"
              />
            </div>
          </div>
        )}
      </div>

      {/* Renovación */}
      {showRenewal && hasPaid && proximoRenovacion && (
        <div className={`text-[10px] opacity-50 font-bold ${style.text} flex items-center gap-1.5`}>
          <Package size={10} />
          Renueva el{" "}
          {new Date(proximoRenovacion).toLocaleDateString("es-MX", {
            day: "numeric", month: "long", year: "numeric",
          })}
        </div>
      )}

      {/* NONE — CTA */}
      {!hasPaid && (
        <a
          href="/membresia"
          className="block w-full text-center text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl bg-[#FDCB02] text-black hover:bg-black hover:text-[#FDCB02] transition-all"
        >
          Activar Membresía
        </a>
      )}
    </motion.div>
  )
}