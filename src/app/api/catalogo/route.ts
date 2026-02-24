import { NextResponse } from 'next/server';
import { products } from '@/lib/products';
// 🔥 Importamos tu motor de precios para que la App sepa las reglas
import { getDiscountMultiplier, getTierBadge } from '@/lib/pricing';

export async function GET() {
  console.log('🐺 [API] Sirviendo catálogo directo y en vivo a la App Móvil');
  
  const data: Record<string, any> = {};

  // 1. Empaquetamos los productos
  for (const p of products) {
    const pExtra = p as any; 
    const factor = pExtra.unidadesPorRollo || 25; 
    const unidad = pExtra.unit || "Kilo";

    data[p.id] = {
      id:          p.id,
      title:       p.title,
      thumbnail:   p.thumbnail,
      description: p.description,
      composicion: p.composicion,
      gramaje:     p.gramaje,
      ancho:       p.ancho,
      rendimiento: p.rendimiento,
      category:    p.category,
      unit:        unidad,          
      unidadesPorRollo: factor,     
      menudeo:     p.prices.menudeo,
      mayoreo:     p.prices.mayoreo,
      precioRollo: p.prices.mayoreo * factor, 
      hasRollo:    p.hasRollo,
      singleColor: p.singleColor ?? false,
      // 🔥 También le pasamos las imágenes de los colores a la app por si las ocupas
      colors:      (p.colors ?? []).map((c: any) => ({ name: c.name, hex: c.hex, image: c.image })),
    };
  }

  // 🔥 2. Empaquetamos las reglas del negocio (Multiplicadores B2B)
  // Así la App Móvil sabe cómo calcular los descuentos sin tener que programarlo allá
  const b2bRules = {
    GOLD: { 
        multiplier: getDiscountMultiplier('GOLD'), 
        badge: getTierBadge('GOLD') 
    },
    BLACK: { 
        multiplier: getDiscountMultiplier('BLACK'), 
        badge: getTierBadge('BLACK') 
    },
    ELITE: { 
        multiplier: getDiscountMultiplier('ELITE'), 
        badge: getTierBadge('ELITE'),
        freeShipping: true // Beneficio extra para que la app lo sepa
    }
  };

  return NextResponse.json({ 
      success: true, 
      b2bRules, // 👈 Se lo mandamos a la App en la cabecera
      data 
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0', // 🔴 CERO CACHÉ: Se actualiza al segundo
      'Access-Control-Allow-Origin': '*', 
    },
  });
}