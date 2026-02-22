import { NextResponse } from 'next/server';
import { products } from '@/lib/products';

export async function GET() {
  console.log('🐺 [API] Sirviendo catálogo directo y en vivo a la App Móvil');
  const data: Record<string, any> = {};

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

  return NextResponse.json({ success: true, data }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0', // 🔴 CERO CACHÉ: Se actualiza al segundo
      'Access-Control-Allow-Origin': '*', 
    },
  });
}