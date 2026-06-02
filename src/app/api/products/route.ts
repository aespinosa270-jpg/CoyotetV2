// storefront/src/app/api/products/route.ts
// Fuente unica de verdad: src/lib/products.ts (NUNCA la BD).
// El catalogo publico jamas mezcla productos de la base de datos.
import { NextResponse } from 'next/server';
import { products } from '@/lib/products';

// Catalogo estatico: se sirve igual en cada request, cacheable.
export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json(
    { success: true, products },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
  );
}
