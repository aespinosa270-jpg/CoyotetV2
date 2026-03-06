// src/lib/hooks/use-membership.ts
// Hook central de membresía — consúmelo en cualquier componente cliente
// Fuente de verdad: session (tier) + /api/membership/status (colocaciones, puntos, expiración)
//
// USO:
//   const { tier, isElite, isBlack, isGold, hasPaid,
//           serviceFee, discountPct, colocacionesRestantes,
//           puntos, proximoRenovacion } = useMembership()

"use client"

// Mismo type que next-auth.d.ts — no importar de @prisma/client en cliente
type MembershipTier = "NONE" | "GOLD" | "BLACK" | "ELITE"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"


// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface MembershipStatus {
  tier:                    MembershipTier
  isElite:                 boolean
  isBlack:                 boolean
  isGold:                  boolean
  hasPaid:                 boolean   // cualquier tier de pago activo

  // Precios / descuentos
  discountPct:             number    // 0 | 10 | 15
  discountMultiplier:      number    // 1 | 0.90 | 0.85
  serviceFee:              number    // 175 | 0 para ELITE

  // Colocaciones (desde API — requiere llamada)
  colocacionesUsadas:      number
  colocacionesTotal:       number
  colocacionesRestantes:   number

  // Puntos y renovación
  puntos:                  number
  proximoRenovacion:       string | null  // ISO string

  // Estado de carga
  loading:                 boolean
}

const DEFAULTS: MembershipStatus = {
  tier:                   "NONE",
  isElite:                false,
  isBlack:                false,
  isGold:                 false,
  hasPaid:                false,
  discountPct:            0,
  discountMultiplier:     1,
  serviceFee:             175,
  colocacionesUsadas:     0,
  colocacionesTotal:      0,
  colocacionesRestantes:  0,
  puntos:                 0,
  proximoRenovacion:      null,
  loading:                true,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useMembership(): MembershipStatus {
  const { data: session, status: sessionStatus } = useSession()
  const [apiData, setApiData] = useState<Partial<MembershipStatus>>({})
  const [apiLoading, setApiLoading] = useState(true)

  // El tier viene directo de la session (no requiere llamada extra)
  const tier: MembershipTier =
    (session?.user as any)?.membershipTier ?? "NONE"

  const isElite = tier === "ELITE"
  const isBlack = tier === "BLACK"
  const isGold  = tier === "GOLD"
  const hasPaid = isGold || isBlack || isElite

  const discountPct        = isElite || isBlack ? 15 : isGold ? 10 : 0
  const discountMultiplier = isElite || isBlack ? 0.85 : isGold ? 0.90 : 1
  const serviceFee         = isElite ? 0 : 175

  // Fetch de datos adicionales (colocaciones, puntos, expiración) solo si hay sesión
  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      setApiLoading(false)
      return
    }

    let cancelled = false
    setApiLoading(true)

    fetch("/api/membership/status")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data) return
        setApiData({
          colocacionesUsadas:    data.colocacionesUsadas    ?? 0,
          colocacionesTotal:     data.colocacionesTotal     ?? 0,
          colocacionesRestantes: data.colocacionesRestantes ?? 0,
          puntos:                data.puntos                ?? 0,
          proximoRenovacion:     data.proximoRenovacion     ?? null,
        })
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setApiLoading(false) })

    return () => { cancelled = true }
  }, [sessionStatus, tier])

  return {
    ...DEFAULTS,
    tier,
    isElite,
    isBlack,
    isGold,
    hasPaid,
    discountPct,
    discountMultiplier,
    serviceFee,
    ...apiData,
    loading: sessionStatus === "loading" || apiLoading,
  }
}