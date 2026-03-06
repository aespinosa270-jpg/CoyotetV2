'use client'

import { useEffect, useState } from 'react'
import { calcularPuntos, MEMBERSHIP_PLANS, type MembershipTier } from '@/lib/membership-benefits'
import Link from 'next/link'

interface CheckoutMembershipBannerProps {
  subtotalMXN: number
  onTierLoaded?: (tier: MembershipTier) => void
}

interface MembershipStatus {
  tier: MembershipTier
  puntos: number
  colocacionesRestantes: number
  tarifaServicio: number // 0 para ELITE
}

const TIER_COLORS: Record<MembershipTier, { bg: string; accent: string; text: string; border: string }> = {
  NONE:   { bg: '#1a1a1a', accent: '#aaa', text: '#ccc', border: '#333' },
  GOLD:   { bg: '#1a1000', accent: '#d89400', text: '#f5c842', border: '#4a3000' },
  BLACK:  { bg: '#111', accent: '#666', text: '#ddd', border: '#2a2a2a' },
  ELITE:  { bg: '#040e1c', accent: '#4a80c0', text: '#a0c0e8', border: '#1a3060' },
}

// Ícono de estrella para puntos
const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

export default function CheckoutMembershipBanner({
  subtotalMXN,
  onTierLoaded,
}: CheckoutMembershipBannerProps) {
  const [status, setStatus] = useState<MembershipStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/membership/status')
      .then((r) => r.json())
      .then((d: MembershipStatus) => {
        setStatus(d)
        onTierLoaded?.(d.tier)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [onTierLoaded])

  if (loading || !status || dismissed) return null

  const plan = MEMBERSHIP_PLANS[status.tier]
  const puntosAGanar = calcularPuntos(subtotalMXN, status.tier)
  const colors = TIER_COLORS[status.tier]

  // Beneficios relevantes para checkout
  const beneficiosCheckout = []

  if (puntosAGanar > 0) {
    beneficiosCheckout.push({
      id: 'points',
      icon: <StarIcon />,
      text: `+${puntosAGanar} pts con esta compra`,
    })
  }

  if (status.colocacionesRestantes > 0) {
    beneficiosCheckout.push({
      id: 'shipping',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
          <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
      text: `${status.colocacionesRestantes} colocación${status.colocacionesRestantes > 1 ? 'es' : ''} gratis disponible${status.colocacionesRestantes > 1 ? 's' : ''}`,
    })
  }

  if (status.tarifaServicio === 0 && status.tier === 'ELITE') {
    beneficiosCheckout.push({
      id: 'fee',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
      text: 'Sin tarifa de servicio',
    })
  }

  if (beneficiosCheckout.length === 0) return null

  return (
    <div
      className="relative rounded-2xl overflow-hidden mb-4 transition-all duration-300"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Línea de acento superior */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}, transparent)` }}
      />

      <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* Badge de tier */}
        <div
          className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase"
          style={{ background: `${colors.accent}18`, color: colors.text }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: colors.accent }} />
          {plan.name}
        </div>

        {/* Beneficios */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {beneficiosCheckout.map((b) => (
            <div key={b.id} className="flex items-center gap-1.5 text-xs font-medium"
              style={{ color: colors.text }}>
              <span style={{ color: colors.accent }}>{b.icon}</span>
              {b.text}
            </div>
          ))}
        </div>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 opacity-30 hover:opacity-60 transition-opacity ml-auto"
          style={{ color: colors.text }}
          aria-label="Cerrar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Variante: sin membresía activa (invitado) ──────────────────────────────────
export function CheckoutMembershipUpsell({ subtotalMXN }: { subtotalMXN: number }) {
  const goldPlan = MEMBERSHIP_PLANS['GOLD']
  const puntosGold = calcularPuntos(subtotalMXN, 'GOLD')

  if (puntosGold < 1) return null

  return (
    <div
      className="rounded-2xl p-4 mb-4"
      style={{
        background: 'linear-gradient(135deg, #1a1000, #0a0a00)',
        border: '1px solid #3a2800',
      }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-amber-600 font-bold tracking-wider uppercase mb-0.5">
            ¿Eres miembro?
          </div>
          <div className="text-sm text-amber-200">
            Con Gold ganarías{' '}
            <strong className="text-amber-400">+{puntosGold} puntos</strong> en esta compra
          </div>
        </div>
        <Link
          href="/membresia"
          className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-400 hover:bg-amber-300 transition-colors"
        >
          Ver membresías
        </Link>
      </div>
    </div>
  )
}