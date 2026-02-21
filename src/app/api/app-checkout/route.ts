import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const OPENPAY_ID = process.env.OPENPAY_MERCHANT_ID || 'tu_id_openpay';
const OPENPAY_SK = process.env.OPENPAY_PRIVATE_KEY || 'sk_tu_llave_privada';
const openpayAuth = Buffer.from(`${OPENPAY_SK}:`).toString('base64');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { carrito, total, cliente } = body;

    const nuevaOrden = await prisma.order.create({
      data: {
        user: {
          connectOrCreate: {
            where: { email: cliente.email },
            create: {
              email: cliente.email,
              name: cliente.nombre,
              phone: cliente.telefono,
              password: `app_guest_${Date.now()}`, 
            }
          }
        },
        
        subtotal: total,
        total: total,
        status: 'PENDING',
        logisticsType: 'SKYDROPX_NACIONAL', 
        customerName: cliente.nombre,
        customerPhone: cliente.telefono,
        customerEmail: cliente.email,
        items: {
          create: carrito.map((item: any) => ({
            title: item.nombre,
            price: item.precio,
            quantity: 1,
            unit: item.tipo === 'mayoreo' ? 'Rollo' : 'KG',
          }))
        }
      }
    });

    console.log(`📱 App Móvil solicitó cobro. Orden interna: ${nuevaOrden.id}`);

    const openpayRes = await fetch(`https://sandbox-api.openpay.mx/v1/${OPENPAY_ID}/checkouts`, {
      method: 'POST',
      headers: { 
        'Authorization': `Basic ${openpayAuth}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        amount: total,
        currency: "MXN",
        description: `Compra en App Coyote Textil - Orden ${nuevaOrden.id}`,
        order_id: nuevaOrden.id, 
        redirect_url: "https://coyotetextil.com/success", 
        customer: { 
          name: cliente.nombre, 
          phone_number: cliente.telefono,
          email: cliente.email 
        },
        send_email: false,
        metadata: { phone: cliente.telefono, origen: 'APP_MOVIL' } 
      })
    });

    const cobroData = await openpayRes.json();

    if (openpayRes.ok) {
      return NextResponse.json({ success: true, link: cobroData.checkout_link });
    } else {
      console.error("Error OpenPay App:", cobroData);
      return NextResponse.json({ success: false, error: 'Rechazo de OpenPay' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error en App Checkout:', error);
    return NextResponse.json({ success: false, error: 'Falla interna' }, { status: 500 });
  }
}