import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { products } from '@/lib/products';

export async function GET() {
  try {
    // 1. INTENTO PRINCIPAL: Conectar al cerebro central (Redis)
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const bodega = await redis.get('bodega_coyote');

    if (bodega) {
      console.log('🟢 [API] Sirviendo catálogo en vivo desde Redis');
      return NextResponse.json({ success: true, data: bodega }, { 
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=60', // Se actualiza cada minuto
          'Access-Control-Allow-Origin': '*', // ⚠️ VITAL para que tu App Móvil (Expo) lo pueda leer
        }
      });
    }
  } catch (error) {
    console.warn('⚠️ [API] Falló Redis. Activando protocolo de respaldo local...', error);
  }

  // 2. SISTEMA DE RESPALDO: Si Redis falla o está vacío, usamos tu archivo local
  console.log('🟡 [API] Sirviendo catálogo desde el archivo estático de respaldo');
  const data: Record<string, any> = {};

  for (const p of products) {
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
      menudeo:     p.prices.menudeo,
      mayoreo:     p.prices.mayoreo,
      precioRollo: p.prices.mayoreo * 25,
      hasRollo:    p.hasRollo,
      singleColor: p.singleColor ?? false,
      colors:      (p.colors ?? []).map((c: any) => ({ name: c.name, hex: c.hex })),
    };
  }

  return NextResponse.json({ success: true, data }, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*', // ⚠️ VITAL para la App Móvil
    },
  });
}