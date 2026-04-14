import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Asegúrate de que esta ruta sea la correcta en tu proyecto

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const lastUpdateParam = searchParams.get('last_update');

    let queryCondition = {};

    // Lógica del Delta Sync
    if (lastUpdateParam) {
      const lastUpdateDate = new Date(parseInt(lastUpdateParam, 10));
      queryCondition = {
        where: {
          updatedAt: {
            gte: lastUpdateDate,
          },
        },
      };
    }

    // Query exacto a tu Prisma Schema
    const products = await prisma.product.findMany({
      ...queryCondition,
      select: {
        id: true,
        sku: true,
        title: true,            // <-- Match con tu schema
        thumbnail: true,        // <-- Match con tu schema
        unit: true,             // KILO, METRO, PIEZA
        priceMenudeo: true,     // Vital para la app
        priceMayoreo: true,     // Vital para reglas B2B
        hasRollo: true,
        category: true,
        composicion: true,      // Para filtros offline
        gramaje: true,          // Para filtros offline
        isActive: true,
        updatedAt: true,        // El motor de sincronización necesita esto
        
        // Me traje los colores porque el cliente necesita ver qué tonos hay
        colors: {
          select: {
            id: true,
            name: true,
            hex: true,
            imageUrl: true
          }
        },
        
        // Me traje el inventario para que la app sepa si hay stock en GUATEMALA_97 o PLOMO_203
        inventory: {
          select: {
            location: true,
            quantity: true,
            rollCount: true
          }
        }
      },
    });

    return NextResponse.json(
      {
        success: true,
        serverTimestamp: Date.now(), 
        count: products.length,
        data: products,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[MOBILE_SYNC_ERROR]:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno sincronizando catálogo' },
      { status: 500 }
    );
  }
}