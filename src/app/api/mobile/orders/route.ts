import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================================
// 1. CREAR UNA NUEVA ORDEN (POST) - Viene del Carrito
// ==========================================================
export async function POST(request: Request) {
  try {
    // EL CADENERO: Validamos el token falso de Flutter
    const authHeader = request.headers.get('authorization');
    if (authHeader !== 'Bearer token_secreto_super_seguro') {
      return NextResponse.json({ error: 'No autorizado, perro.' }, { status: 401 });
    }

    // ABRIMOS EL PAQUETE DE FLUTTER
    const body = await request.json();
    const { userId, total, items } = body;

    // BUSCAMOS AL CLIENTE REAL EN TU BD
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.findFirst(); 
      if (!user) {
         return NextResponse.json({ error: 'No hay usuarios en la base de datos para asignar esta orden.' }, { status: 404 });
      }
    }

    // GUARDAMOS EN PRISMA EXACTAMENTE CON TUS COLUMNAS
    const nuevaOrden = await prisma.order.create({
      data: {
        userId: user.id,
        customerName: user.name || 'Cliente App Móvil', // Campo obligatorio en tu schema
        customerEmail: user.email,                      // Campo obligatorio en tu schema
        customerPhone: user.phone || '0000000000',
        subtotal: total,
        total: total,
        status: 'PENDING', // Usamos tu Enum
        items: {
          create: items.map((item: any) => ({
            sku: item.sku,
            title: `Coyote SKU: ${item.sku}`, // Llenamos el title obligatorio
            quantity: item.quantity,
            price: item.unitPrice,            // Lo mapeamos a tu columna 'price'
            unit: item.isRollo ? 'PIEZA' : 'METRO', // Usamos tu enum UnitType (KILO, METRO, PIEZA)
          })),
        },
      },
    });

    console.log(`¡Éxito! Orden ${nuevaOrden.orderNumber} creada por $${total}`);

    // RESPUESTA AL CELULAR
    return NextResponse.json(
      { success: true, message: 'Orden creada con éxito', orderId: nuevaOrden.id }, 
      { status: 201 }
    );

  } catch (error) {
    console.error('El servidor tronó al recibir la orden:', error);
    return NextResponse.json(
      { success: false, error: 'Hubo un pedo interno en el servidor.' }, 
      { status: 500 }
    );
  }
}


// ==========================================================
// 2. LEER HISTORIAL DE ÓRDENES (GET) - Para la pantalla de Pedidos
// ==========================================================
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== 'Bearer token_secreto_super_seguro') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    // Extraemos el userId de la URL (ej: /api/mobile/orders?userId=123)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Falta el ID del cliente.' }, { status: 400 });
    }

    // Como estamos usando un userId de prueba desde Flutter, lo mapeamos al usuario real
    let actualUserId = userId;
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.findFirst(); 
      if (user) {
        actualUserId = user.id;
      }
    }

    // Traemos las órdenes del cliente, ordenadas de la más nueva a la más vieja
    const orders = await prisma.order.findMany({
      where: { userId: actualUserId },
      orderBy: { createdAt: 'desc' },
      include: { items: true }, // Incluimos el detalle de las telas compradas
    });

    return NextResponse.json({ success: true, data: orders }, { status: 200 });
  } catch (error) {
    console.error('Error al traer el historial:', error);
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}