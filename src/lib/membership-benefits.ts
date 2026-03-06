// src/lib/membership-benefits.ts
// Fuente de verdad para beneficios de membresía Coyote Textil
// Alineado con el enum MembershipTier de schema.prisma: NONE | GOLD | BLACK | ELITE

import { MembershipTier } from "@prisma/client"
export { MembershipTier }

export interface MembershipBenefit {
  id: string
  label: string
  detail: string
  available: boolean
}

export interface MembershipPlan {
  tier: MembershipTier
  name: string
  tagline: string
  priceMonthly: number
  pointsPerHundred: number
  benefits: MembershipBenefit[]
}

export const MEMBERSHIP_PLANS: Record<MembershipTier, MembershipPlan> = {
  // NONE = acceso base sin suscripción
  [MembershipTier.NONE]: {
    tier: MembershipTier.NONE,
    name: "Acceso Inicial",
    tagline: "El punto de partida",
    priceMonthly: 0,
    pointsPerHundred: 0.5,
    benefits: [
      { id: "points",         label: "0.5 pts por cada $100 MXN",             detail: "Acumula puntos en cada compra y canjéalos por descuentos",              available: true  },
      { id: "ai_support",     label: "Atención vía IA 24 horas",               detail: "Servicio de atención y ventas con IA disponible todo el día",           available: true  },
      { id: "colocacion",     label: "Colocaciones gratis al mes",              detail: "",                                                                       available: false },
      { id: "envio_prioridad",label: "Prioridad en envíos Coyote Logistics",    detail: "",                                                                       available: false },
      { id: "reserva_textil", label: "Reserva de textiles",                     detail: "",                                                                       available: false },
      { id: "merchandising",  label: "Merchandising sorpresa anual",             detail: "",                                                                       available: false },
      { id: "muestras",       label: "Muestras gratis + acceso anticipado",     detail: "",                                                                       available: false },
      { id: "tarifa_cero",    label: "Costo $0 en tarifa de servicio",          detail: "",                                                                       available: false },
    ],
  },

  [MembershipTier.GOLD]: {
    tier: MembershipTier.GOLD,
    name: "Socio Comercial",
    tagline: "Para clientes frecuentes",
    priceMonthly: 299,
    pointsPerHundred: 1,
    benefits: [
      { id: "points",         label: "1 pto por cada $100 MXN",                detail: "El doble que el acceso base — acumula más rápido",                      available: true  },
      { id: "ai_support",     label: "Atención vía IA 24 horas",               detail: "Servicio de atención y ventas con IA disponible todo el día",           available: true  },
      { id: "colocacion",     label: "1 colocación gratis al mes",              detail: "Una colocación a paquetería sin costo cada mes",                        available: true  },
      { id: "envio_prioridad",label: "Prioridad en envíos Coyote Logistics",    detail: "",                                                                       available: false },
      { id: "reserva_textil", label: "Reserva de textiles",                     detail: "",                                                                       available: false },
      { id: "merchandising",  label: "Merchandising sorpresa anual",             detail: "",                                                                       available: false },
      { id: "muestras",       label: "Muestras gratis + acceso anticipado",     detail: "",                                                                       available: false },
      { id: "tarifa_cero",    label: "Costo $0 en tarifa de servicio",          detail: "",                                                                       available: false },
    ],
  },

  [MembershipTier.BLACK]: {
    tier: MembershipTier.BLACK,
    name: "Socio Ejecutivo",
    tagline: "El nivel profesional",
    priceMonthly: 699,
    pointsPerHundred: 2,
    benefits: [
      { id: "points",         label: "2 ptos por cada $100 MXN",               detail: "4× más puntos que el acceso base",                                      available: true  },
      { id: "ai_support",     label: "Atención vía IA 24 horas",               detail: "Servicio de atención y ventas con IA disponible todo el día",           available: true  },
      { id: "colocacion",     label: "3 colocaciones gratis al mes",            detail: "Tres colocaciones a paquetería sin costo cada mes",                     available: true  },
      { id: "envio_prioridad",label: "Prioridad en envíos Coyote Logistics",    detail: "Tus pedidos manejados por Coyote Logistics salen primero",              available: true  },
      { id: "reserva_textil", label: "Reserva de textiles",                     detail: "Reserva tus telas favoritas antes de que se agoten",                   available: true  },
      { id: "merchandising",  label: "Merchandising sorpresa anual",             detail: "Una caja sorpresa de productos Coyote cada año",                       available: true  },
      { id: "muestras",       label: "Muestras gratis + acceso anticipado",     detail: "",                                                                       available: false },
      { id: "tarifa_cero",    label: "Costo $0 en tarifa de servicio",          detail: "",                                                                       available: false },
    ],
  },

  [MembershipTier.ELITE]: {
    tier: MembershipTier.ELITE,
    name: "Master Partner",
    tagline: "Acceso total sin límites",
    priceMonthly: 1129,
    pointsPerHundred: 4,
    benefits: [
      { id: "points",         label: "4 ptos por cada $100 MXN",               detail: "8× más puntos que el acceso base — la acumulación más rápida",         available: true  },
      { id: "ai_support",     label: "Atención vía IA 24 horas",               detail: "Servicio de atención y ventas con IA disponible todo el día",           available: true  },
      { id: "colocacion",     label: "6 colocaciones gratis al mes",            detail: "Seis colocaciones a paquetería sin costo cada mes",                     available: true  },
      { id: "envio_prioridad",label: "Prioridad en envíos Coyote Logistics",    detail: "Máxima prioridad — tus pedidos siempre al frente de la fila",          available: true  },
      { id: "reserva_textil", label: "Reserva de textiles",                     detail: "Reserva ilimitada de cualquier textil del catálogo",                   available: true  },
      { id: "merchandising",  label: "Merchandising sorpresa anual",             detail: "La mejor caja sorpresa del año, exclusiva para Elite",                 available: true  },
      { id: "muestras",       label: "Muestras gratis + acceso anticipado",     detail: "Recibe muestras de textiles nuevos antes que nadie",                   available: true  },
      { id: "tarifa_cero",    label: "Costo $0 en tarifa de servicio",          detail: "Sin cargos por servicio en ninguna operación",                         available: true  },
    ],
  },
}

// Helpers
export function getBeneficiosActivos(tier: MembershipTier): MembershipBenefit[] {
  return MEMBERSHIP_PLANS[tier].benefits.filter(b => b.available)
}

export function calcularPuntos(subtotalMXN: number, tier: MembershipTier): number {
  const plan = MEMBERSHIP_PLANS[tier]
  return Math.floor((subtotalMXN / 100) * plan.pointsPerHundred * 10) / 10
}

export function getColocacionesGratis(tier: MembershipTier): number {
  const map: Record<MembershipTier, number> = {
    [MembershipTier.NONE]:  0,
    [MembershipTier.GOLD]:  1,
    [MembershipTier.BLACK]: 3,
    [MembershipTier.ELITE]: 6,
  }
  return map[tier]
}

// Orden visual para comparativas
export const TIER_ORDER: MembershipTier[] = [
  MembershipTier.NONE,
  MembershipTier.GOLD,
  MembershipTier.BLACK,
  MembershipTier.ELITE,
]