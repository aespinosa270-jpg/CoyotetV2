// storefront/src/app/api/products/route.ts
export const dynamic = 'force-dynamic'; // 🔥 Evita el error de build en Vercel

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Jalamos los productos reales de tu base de datos Supabase
    const dbProducts = await prisma.orderItem.findMany({
       distinct: ['productId'], // O usa tu tabla de productos si ya la migraste
    });

    // Si aún usas el archivo local en la web, impórtalo y mándalo:
    // import { products } from '@/lib/products';
    
    return NextResponse.json({ success: true, products: dbProducts }, {
      headers: {
        'Access-Control-Allow-Origin': '*', // Permite que la app móvil se conecte
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}