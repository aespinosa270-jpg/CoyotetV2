"use client"

import { useSession } from "next-auth/react"

export function useB2BPrice(basePrice: number) {
  const { data: session } = useSession()
  // @ts-ignore - TypeScript a veces se queja del campo role personalizado
  const role = session?.user?.role || "silver" // Silver es el default (público)

  let finalPrice = basePrice
  let label = "Precio Público"
  let discount = 0

  if (role === "gold") {
    finalPrice = basePrice * 0.85 // 15% de descuento
    label = "Precio Mayorista"
    discount = 15
  } else if (role === "black") {
    finalPrice = basePrice * 0.70 // 30% de descuento
    label = "Precio Distribuidor"
    discount = 30
  }

  return {
    price: Math.round(finalPrice), // Redondeamos para evitar decimales feos
    originalPrice: basePrice,
    label,
    discount,
    role
  }
}