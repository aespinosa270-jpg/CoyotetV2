"use client";

import { useSession } from "next-auth/react";
import { Product } from "@/lib/products";

export function usePriceEngine(product: Product, buyingMode: 'kilo' | 'rollo' = 'kilo') {
  const { data: session, status } = useSession();
  
  // 1. Alineación con BD: Si no hay sesión, es 'silver' (Público)
  const role = status === "authenticated" ? session?.user?.role : "silver";

  // Precios base
  const priceRetail = product.prices.menudeo;    // Precio alto (Corte)
  const priceWholesale = product.prices.mayoreo; // Precio bajo (Rollo)

  // Precio inicial según el modo seleccionado
  let finalPrice = buyingMode === 'rollo' ? priceWholesale : priceRetail;
  let label = buyingMode === 'rollo' ? "Precio Mayoreo" : "Precio Público";
  let isDiscounted = false;

  // --- REGLAS DE NEGOCIO (Producción) ---

  if (role === "black") {
    // ⚫ NIVEL BLACK (Distribuidor)
    // Beneficio: Siempre precio Mayoreo - 5% DESCUENTO EXTRA
    const base = priceWholesale; 
    finalPrice = base * 0.95; 
    label = "Precio Black";
    isDiscounted = true;
  } 
  else if (role === "gold") {
    // 🟡 NIVEL GOLD (Socio)
    // Beneficio: Compra Kilos a precio de Mayoreo (Upgrade automático)
    if (buyingMode === 'kilo') {
        finalPrice = priceWholesale; 
        label = "Precio Gold";
        isDiscounted = true;
    } else {
        // En rollo ya es precio mayoreo, se mantiene igual pero con etiqueta VIP
        finalPrice = priceWholesale;
        label = "Precio Gold";
    }
  }
  else {
    // ⚪ NIVEL SILVER (Default)
    // Paga precio de lista.
    if (buyingMode === 'rollo') {
        label = "Precio Mayoreo";
    }
  }

  // Calculamos % de ahorro real visual para la UI
  // Siempre comparamos contra el precio que pagaría un público por esa misma cantidad/modalidad
  const referencePrice = buyingMode === 'rollo' ? priceWholesale : priceRetail;
  
  const discountPercent = isDiscounted 
    ? Math.round((1 - (finalPrice / referencePrice)) * 100) 
    : 0;

  return {
    finalPrice,
    label,
    isDiscounted,
    discountPercent,
    role // Retornamos 'silver', 'gold' o 'black' para los badges
  };
}