// src/components/checkout/points-panel.tsx
// Reglas de puntos Coyote Textil:
//   NONE:  0.5 pts por cada $100 MXN
//   GOLD:  1   pt  por cada $100 MXN
//   BLACK: 2   pts por cada $100 MXN
//   ELITE: 4   pts por cada $100 MXN
//
//   1 punto = $0.50 MXN de descuento
//   Máximo canjeable: 20% del total de la compra

"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Star, Zap, ChevronDown, CheckCircle2, Info, TrendingUp } from "lucide-react"
import { useState } from "react"

type MembershipTier = "NONE" | "GOLD" | "BLACK" | "ELITE"

// ─── Reglas de negocio ────────────────────────────────────────────────────────
const POINTS_PER_100: Record<MembershipTier, number> = {
  NONE:  0.5,
  GOLD:  1,
  BLACK: 2,
  ELITE: 4,
}
const PESOS_POR_PUNTO = 0.50   // 1 punto = $0.50 MXN
const MAX_REDEEM_PCT  = 0.20   // máximo 20% del total

const TIER_COLOR: Record<MembershipTier, { glow: string; accent: string; bg: string; border: string; label: string }> = {
  NONE:  { glow: "#cccccc", accent: "#9ca3af", bg: "bg-neutral-800/40",       border: "border-neutral-700",      label: "Básico"  },
  GOLD:  { glow: "#fdc800", accent: "#fdc800", bg: "bg-[#fdc800]/10",         border: "border-[#fdc800]/30",     label: "Gold"    },
  BLACK: { glow: "#a8a8a8", accent: "#d4d4d4", bg: "bg-neutral-800/60",       border: "border-neutral-600",      label: "Black"   },
  ELITE: { glow: "#2c8cdc", accent: "#98d0f8", bg: "bg-[#0c1e4c]/60",         border: "border-[#2c8cdc]/30",     label: "Elite"   },
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface PointsPanelProps {
  tier:               MembershipTier
  puntosDisponibles:  number   // puntos actuales del usuario en BD
  subtotal:           number   // subtotal de mercancía — base para calcular puntos ganados
  total:              number   // total final — base para calcular límite de canje
  puntosUsados:       number   // estado controlado desde CheckoutPage
  onToggle:           (usar: boolean, cantidad: number) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function calcularPuntosGanados(subtotal: number, tier: MembershipTier): number {
  // floor con 1 decimal: ej. 350 MXN × (1/100) × 1pt = 3.5 pts
  return Math.floor((subtotal / 100) * POINTS_PER_100[tier] * 10) / 10
}

export function calcularDescuentoPuntos(puntos: number): number {
  // $0.50 por punto, redondeado a pesos enteros
  return Math.floor(puntos * PESOS_POR_PUNTO)
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function PointsPanel({
  tier,
  puntosDisponibles,
  subtotal,
  total,
  puntosUsados,
  onToggle,
}: PointsPanelProps) {
  const [expanded, setExpanded] = useState(false)

  const style        = TIER_COLOR[tier]
  const puntosGanados = calcularPuntosGanados(subtotal, tier)
  const rate          = POINTS_PER_100[tier]

  // Máximo canjeable = mín(puntos disponibles, 20% del total) expresado en puntos
  const maxPesosDesc  = Math.floor(total * MAX_REDEEM_PCT)
  const maxPuntosDesc = Math.floor(maxPesosDesc / PESOS_POR_PUNTO)
  const maxCanjeable  = Math.min(puntosDisponibles, maxPuntosDesc)
  const descuentoMXN  = calcularDescuentoPuntos(maxCanjeable)
  const canCanjear    = maxCanjeable > 0
  const estaActivo    = puntosUsados > 0

  const handleToggle = () => {
    if (estaActivo) {
      onToggle(false, 0)
    } else if (canCanjear) {
      onToggle(true, maxCanjeable)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden transition-all duration-300 ${style.bg} ${style.border} ${estaActivo ? `shadow-[0_0_18px_${style.glow}33]` : ""}`}
    >
      {/* ── Header ── */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3.5 gap-3"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${style.glow}22`, color: style.accent }}
          >
            <Star size={13} fill="currentColor" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 leading-none mb-0.5">
              Tus puntos
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-[1000] leading-none" style={{ color: style.accent }}>
                {puntosDisponibles.toLocaleString()}
              </span>
              <span className="text-[10px] text-neutral-500 font-bold">pts disponibles</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Puntos a ganar */}
          <div className="flex items-center gap-1 bg-black/20 rounded-lg px-2.5 py-1.5">
            <TrendingUp size={10} style={{ color: style.accent }} />
            <span className="text-[10px] font-black" style={{ color: style.accent }}>
              +{puntosGanados} pts
            </span>
          </div>
          <ChevronDown
            size={14}
            className="text-neutral-500 transition-transform duration-300"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </div>
      </button>

      {/* ── Detalle expandible ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">

              {/* Tabla de ganancia */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/20 rounded-xl p-3">
                  <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-black mb-1">
                    Tasa {style.label}
                  </p>
                  <p className="text-sm font-[1000]" style={{ color: style.accent }}>
                    {rate} pt{rate !== 1 ? "s" : ""} / $100 MXN
                  </p>
                </div>
                <div className="bg-black/20 rounded-xl p-3">
                  <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-black mb-1">
                    Ganarás en esta compra
                  </p>
                  <p className="text-sm font-[1000]" style={{ color: style.accent }}>
                    +{puntosGanados} pts
                  </p>
                  <p className="text-[9px] text-neutral-500 mt-0.5">
                    = ${calcularDescuentoPuntos(puntosGanados)} MXN futuros
                  </p>
                </div>
              </div>

              {/* Info de conversión */}
              <div className="flex items-start gap-2 bg-black/20 rounded-xl p-3">
                <Info size={12} className="text-neutral-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  <span style={{ color: style.accent }} className="font-black">1 punto = $0.50 MXN</span> de descuento.
                  Puedes usar hasta el <span className="text-white font-bold">20%</span> del total de tu compra en puntos.
                </p>
              </div>

              {/* Canje disponible */}
              {canCanjear ? (
                <div className="bg-black/20 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-black mb-1">
                      Puedes canjear ahora
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-[1000]" style={{ color: style.accent }}>
                        {maxCanjeable} pts
                      </span>
                      <span className="text-[10px] text-neutral-400 font-bold">
                        = −${descuentoMXN} MXN
                      </span>
                    </div>
                  </div>
                  {/* Barra de disponibilidad */}
                  <div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(maxCanjeable / puntosDisponibles) * 100}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: style.accent }}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-black/20 rounded-xl p-3">
                  <p className="text-[10px] text-neutral-500">
                    {puntosDisponibles === 0
                      ? "Aún no tienes puntos acumulados. ¡Esta compra te dará tus primeros puntos!"
                      : "No hay puntos canjeables para este monto."}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Botón de canje ── */}
      {canCanjear && (
        <div className="px-4 pb-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleToggle}
            className="w-full h-11 rounded-xl font-[1000] uppercase text-xs tracking-[0.15em] transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden"
            style={
              estaActivo
                ? { backgroundColor: `${style.glow}22`, color: style.accent, border: `1.5px solid ${style.glow}55` }
                : { backgroundColor: style.glow, color: "#000000" }
            }
          >
            {/* Shimmer al estar inactivo */}
            {!estaActivo && (
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
              />
            )}
            <span className="relative flex items-center gap-2">
              {estaActivo ? (
                <>
                  <CheckCircle2 size={14} />
                  Usando {puntosUsados} pts · −${descuentoMXN} MXN · Quitar
                </>
              ) : (
                <>
                  <Zap size={14} fill="currentColor" />
                  Usar {maxCanjeable} pts · Ahorrar ${descuentoMXN} MXN
                </>
              )}
            </span>
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}