'use client'

import { useEffect, useState } from 'react'
import { MEMBERSHIP_PLANS, TIER_ORDER, calcularPuntos, type MembershipTier } from '@/lib/membership-benefits'
import Link from 'next/link'

interface MembershipData {
  tier: MembershipTier
  puntos: number
  colocacionesUsadas: number
  colocacionesTotal: number
  proximoRenovacion: string | null
  gastoMesActual: number
}

// ── Visual por tier ──────────────────────────────────────────────────────────
const VISUAL = {
  NONE: {
    cardBg: 'linear-gradient(135deg, #d4d4d4 0%, #a8a8a8 50%, #c8c8c8 100%)',
    textPrimary: '#1a1a1a',
    textSecondary: '#4a4a4a',
    badgeBg: 'rgba(0,0,0,0.12)',
    progressColor: '#666',
    glow: 'rgba(180,180,180,0.3)',
  },
  GOLD: {
    cardBg: 'linear-gradient(135deg, #f5c842 0%, #b87800 50%, #e0a020 100%)',
    textPrimary: '#1a0d00',
    textSecondary: '#5a3800',
    badgeBg: 'rgba(0,0,0,0.15)',
    progressColor: '#8a5a00',
    glow: 'rgba(216,148,0,0.4)',
  },
  BLACK: {
    cardBg: 'linear-gradient(135deg, #2a2a2a 0%, #0a0a0a 50%, #1e1e1e 100%)',
    textPrimary: '#f0f0f0',
    textSecondary: '#909090',
    badgeBg: 'rgba(255,255,255,0.08)',
    progressColor: '#888',
    glow: 'rgba(80,80,80,0.4)',
  },
  ELITE: {
    cardBg: 'linear-gradient(135deg, #1a3a6a 0%, #07111f 50%, #0f2040 100%)',
    textPrimary: '#c8d8f0',
    textSecondary: '#6080a0',
    badgeBg: 'rgba(255,255,255,0.07)',
    progressColor: '#4a80c0',
    glow: 'rgba(30,90,180,0.4)',
  },
}

// Tarjeta de crédito animada
const MembershipCard = ({ tier, puntos }: { tier: MembershipTier; puntos: number }) => {
  const plan = MEMBERSHIP_PLANS[tier]
  const v = VISUAL[tier]
  const isDark = tier === 'BLACK' || tier === 'ELITE'

  return (
    <div
      className="relative rounded-2xl overflow-hidden aspect-[1.586/1] w-full max-w-sm select-none"
      style={{
        background: v.cardBg,
        boxShadow: `0 20px 60px ${v.glow}, 0 4px 16px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Textura diagonal */}
      <div className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.5) 3px, rgba(255,255,255,0.5) 6px)`,
        }}
      />
      {/* Reflejo superior */}
      <div className="absolute top-0 left-0 right-0 h-1/2 opacity-10"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, transparent 100%)' }}
      />

      {/* Contenido */}
      <div className="relative z-10 h-full p-5 flex flex-col justify-between">
        {/* Top row */}
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] font-black tracking-[0.25em] uppercase"
              style={{ color: v.textSecondary }}>
              COYOTE TEXTIL
            </div>
            <div className="text-[9px] tracking-widest uppercase mt-0.5"
              style={{ color: v.textSecondary }}>
              INFRAESTRUCTURA NACIONAL
            </div>
          </div>
          <div className="px-2.5 py-1 rounded text-[10px] font-black tracking-widest uppercase"
            style={{ background: v.badgeBg, color: v.textPrimary }}>
            {plan.name.toUpperCase()}
          </div>
        </div>

        {/* Tier name grande */}
        <div className="font-black tracking-[0.15em] uppercase"
          style={{ fontSize: 'clamp(28px, 6vw, 44px)', color: `${v.textPrimary}22`, lineHeight: 1 }}>
          {plan.name.toUpperCase()}
        </div>

        {/* Bottom row */}
        <div className="flex justify-between items-end">
          <div>
            <div className="text-[9px] tracking-widest uppercase mb-1"
              style={{ color: v.textSecondary }}>
              CREDENCIAL DE ACCESO
            </div>
            <div className="text-sm font-bold tracking-widest"
              style={{ color: v.textPrimary }}>
              {puntos.toLocaleString('es-MX')} pts
            </div>
          </div>
          {/* Chip decorativo */}
          <div className="w-8 h-6 rounded-sm opacity-40 grid grid-cols-2 gap-px p-px"
            style={{ background: v.textSecondary }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-[1px]" style={{ background: v.cardBg }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Barra de progreso de colocaciones
const ColocacionesBar = ({
  usadas,
  total,
  tier,
}: {
  usadas: number
  total: number
  tier: MembershipTier
}) => {
  const v = VISUAL[tier]
  if (total === 0) return null
  const pct = Math.min((usadas / total) * 100, 100)

  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-zinc-400">Colocaciones este mes</span>
        <span className="font-bold text-white">
          {usadas} / {total}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: v.progressColor,
          }}
        />
      </div>
    </div>
  )
}

// Beneficio individual compacto
const getBenefitIcon = (id: string) => {
  switch (id) {
    case 'points':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )
    case 'colocacion':
    case 'envio_prioridad':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
          <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      )
    case 'ai_support':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
          <path d="M4 15a4 4 0 0 1 4-4h1" />
          <path d="M16 11h1a4 4 0 0 1 4 4v2a2 2 0 0 1-2 2h-2" />
          <path d="M8 11V9a4 4 0 0 1 8 0v2" />
          <path d="M8 19h8" />
        </svg>
      )
    default:
      return <span className="inline-block w-2 h-2 rounded-full bg-current opacity-70" />
  }
}

const BenefitPill = ({
  icon,
  label,
  tier,
}: {
  icon: React.ReactNode
  label: string
  tier: MembershipTier
}) => {
  const v = VISUAL[tier]
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
      style={{ background: `${v.glow}30`, color: VISUAL[tier].textPrimary === '#1a1a1a' ? '#222' : '#ccc' }}
    >
      <span className="opacity-70">{icon}</span>
      {label}
    </div>
  )
}

export default function MembershipDashboardSection() {
  const [data, setData] = useState<MembershipData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/membership/status')
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 animate-pulse">
        <div className="h-4 bg-zinc-800 rounded w-32 mb-6" />
        <div className="aspect-[1.586/1] max-w-sm bg-zinc-800 rounded-2xl mb-6" />
        <div className="space-y-2">
          <div className="h-3 bg-zinc-800 rounded w-full" />
          <div className="h-3 bg-zinc-800 rounded w-2/3" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-500 text-sm">No se pudo cargar tu membresía</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-xs text-zinc-400 underline"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const plan = MEMBERSHIP_PLANS[data.tier]
  const v = VISUAL[data.tier]
  const tierIdx = TIER_ORDER.indexOf(data.tier)
  const nextTier = TIER_ORDER[tierIdx + 1]
  const nextPlan = nextTier ? MEMBERSHIP_PLANS[nextTier] : null
  const nextVisual = nextTier ? VISUAL[nextTier] : null
  const puntosSiguienteTier = nextPlan ? Math.max(0, 500 - (data.puntos % 500)) : 0

  // Puntos que ganaría con su gasto actual si subiera de tier
  const puntosEstimados = calcularPuntos(data.gastoMesActual, data.tier)

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-500">
          Mi Membresía
        </h2>
        <Link
          href="/membresia"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
        >
          Ver planes
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* ── Card + puntos ── */}
      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* Tarjeta */}
        <MembershipCard tier={data.tier} puntos={data.puntos} />

        {/* Métricas */}
        <div className="space-y-4">
          {/* Puntos actuales */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
              Puntos acumulados
            </div>
            <div className="text-4xl font-black text-white">
              {data.puntos.toLocaleString('es-MX')}
              <span className="text-lg font-normal text-zinc-500 ml-1">pts</span>
            </div>
            {data.gastoMesActual > 0 && (
              <div className="text-xs text-zinc-600 mt-1">
                +{puntosEstimados} pts este mes ({plan.pointsPerHundred} pts/$100 MXN)
              </div>
            )}
          </div>

          {/* Colocaciones */}
          {plan.benefits.find((b) => b.id === 'colocacion' && b.available) && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <ColocacionesBar
                usadas={data.colocacionesUsadas}
                total={data.colocacionesTotal}
                tier={data.tier}
              />
              {data.colocacionesUsadas >= data.colocacionesTotal && (
                <p className="text-xs text-amber-500 mt-2">
                  Colocaciones agotadas — se renuevan el día 1
                </p>
              )}
            </div>
          )}

          {/* Renovación */}
          {data.proximoRenovacion && (
            <div className="text-xs text-zinc-600 px-1">
              Renovación:{' '}
              <span className="text-zinc-400">
                {new Date(data.proximoRenovacion).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Beneficios activos ── */}
      <div>
        <div className="text-xs text-zinc-600 uppercase tracking-widest mb-3">
          Tus beneficios
        </div>
        <div className="flex flex-wrap gap-2">
          {plan.benefits
            .filter((b) => b.available)
            .map((b) => (
              <BenefitPill key={b.id} icon={getBenefitIcon(b.id)} label={b.label} tier={data.tier} />
            ))}
        </div>
      </div>

      {/* ── Upgrade nudge ── */}
      {nextPlan && nextVisual && (
        <div
          className="rounded-2xl p-5 flex items-center justify-between gap-4"
          style={{
            background: `linear-gradient(135deg, ${nextVisual.progressColor}18, ${nextVisual.progressColor}10)`,
            border: `1px solid ${nextVisual.progressColor}30`,
          }}
        >
          <div>
            <div className="text-xs text-zinc-500 mb-0.5">Siguiente nivel</div>
            <div className="font-bold text-white text-sm">{nextPlan.name}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {nextPlan.pointsPerHundred} pts/$100 MXN · +
              {nextPlan.benefits.filter((b) => b.available).length -
                plan.benefits.filter((b) => b.available).length}{' '}
              beneficios
            </div>
          </div>
          <Link
            href="/membresia"
            className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
            style={{ background: `${nextVisual.progressColor}cc` }}
          >
            Ver plan {nextPlan.name}
          </Link>
        </div>
      )}
    </div>
  )
}