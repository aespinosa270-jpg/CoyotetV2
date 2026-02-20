import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export async function GET() {
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    // Traemos los precios vivos del mismo lugar que usa el Bot de WhatsApp
    const bodega = await redis.get('bodega_coyote');

    return NextResponse.json({ success: true, data: bodega }, { status: 200 });
  } catch (error) {
    console.error('Error cargando catálogo para la App:', error);
    return NextResponse.json({ success: false, error: 'Falla en bodega' }, { status: 500 });
  }
}