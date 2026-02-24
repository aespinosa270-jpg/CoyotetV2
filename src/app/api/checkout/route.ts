// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import Openpay from 'openpay';
import { PrismaClient } from '@prisma/client';
// 🔥 IMPORTAMOS TU NUEVO MOTOR DE FACTURACIÓN CFDI 4.0 🔥
import { timbrarFacturaReal } from '@/lib/facturapi';

const prisma = new PrismaClient();

// Inicializar OpenPay de forma segura con variables de entorno
const openpay = new Openpay(
  process.env.OPENPAY_MERCHANT_ID!,
  process.env.OPENPAY_PRIVATE_KEY!,
  process.env.OPENPAY_PRODUCTION === 'true'
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Extraemos todo el payload premium que envía nuestro front
    const { method, token, deviceSessionId, customer, amount, description, items, metadata } = body;

    // 1. Validación básica
    if (!amount || !description || !items) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos en el payload.' },
        { status: 400 }
      );
    }

    // 2. Mapeo de datos para la Base de Datos B2B
    const fullAddress = `${customer.street} ${customer.number} ${customer.unit ? 'Int ' + customer.unit : ''}, ${customer.neighborhood}, CP ${customer.zip}, ${customer.city}, ${customer.state}`;
    const dbLogisticsType = metadata.logistics_type === 'coyote' ? 'COYOTE_LOCAL' : 'SKYDROPX_NACIONAL';
    const subtotalCalc = amount - metadata.freight_cost - metadata.shipping_cost - metadata.service_fee - metadata.tax_iva;

    // 3. CREAR ORDEN EN PRISMA (ESTADO: PENDING)
    const newOrder = await prisma.order.create({
      data: {
        user: {
          connectOrCreate: {
            where: { email: customer.email },
            create: {
              email: customer.email,
              name: `${customer.name} ${customer.lastName}`.trim(),
              password: `guest_${Date.now()}`, 
              phone: customer.phone,
              street: customer.street,
              neighborhood: customer.neighborhood,
              zipCode: customer.zip,
              city: customer.city,
              state: customer.state
            }
          }
        },
        subtotal: subtotalCalc,
        freightCost: metadata.freight_cost,
        shippingCost: metadata.shipping_cost,
        serviceFee: metadata.service_fee,
        taxIVA: metadata.tax_iva,
        total: amount,
        status: 'PENDING',
        paymentMethod: method, 
        logisticsType: dbLogisticsType,
        vehiclesNeeded: metadata.vehicles_used,
        customerName: `${customer.name} ${customer.lastName}`.trim(),
        customerEmail: customer.email,
        customerPhone: customer.phone,
        address: fullAddress,
        wantsInvoice: metadata.req_invoice === 'YES',
        invoiceStatus: metadata.req_invoice === 'YES' ? 'PENDING' : null,
        items: {
          create: items.map((item: any) => ({
            productId: item.id || item.productId,
            title: item.title,
            price: Number(item.price),
            quantity: Number(item.quantity),
            unit: item.unit || 'Pieza',
            color: item.meta?.color || null
          }))
        }
      }
    });

    console.log(`✅ Orden interna creada: ${newOrder.id}. Enviando a OpenPay...`);

    // 4. PREPARAR CARGO PARA OPENPAY
    const chargeRequest: any = {
      method: method, // 'card', 'bank_account', 'store'
      amount: parseFloat(amount),
      currency: 'MXN',
      description: description,
      order_id: newOrder.id, 
      device_session_id: deviceSessionId,
      customer: {
        name: customer.name,
        last_name: customer.lastName || '',
        phone_number: customer.phone,
        email: customer.email,
      }
    };

    if (method === 'card') {
      chargeRequest.source_id = token;
    }

    // 5. PROCESAR EN OPENPAY
    const charge: any = await new Promise((resolve, reject) => {
      openpay.charges.create(chargeRequest, (error: any, charge: any) => {
        if (error) reject(error);
        else resolve(charge);
      });
    });

    // 🔥 6. BLOQUE DE FACTURACIÓN REAL CFDI 4.0 🔥
    let invoiceData: any = null;
    if (metadata.req_invoice === 'YES' && metadata.fiscal_data) {
        console.log("🧾 Iniciando proceso de facturación automática...");
        const totalLogistica = (metadata.freight_cost || 0) + (metadata.shipping_cost || 0) + (metadata.service_fee || 0);

        // Se dispara el timbrado al SAT (PUE si es Tarjeta, PPD si es OXXO/SPEI)
        const facturacion = await timbrarFacturaReal(
            customer, 
            metadata.fiscal_data, 
            items, 
            method, 
            totalLogistica
        );

        if (facturacion.success) {
            invoiceData = facturacion;
            
            // Actualizamos la orden en la BD para que quede registro de que ya se emitió la factura
            await prisma.order.update({
              where: { id: newOrder.id },
              data: { invoiceStatus: 'ISSUED' } 
            });
        }
    }

    // 7. ACTUALIZACIONES POST-OPENPAY Y WHATSAPP
    if (method === 'card') {
      await prisma.order.update({
        where: { id: newOrder.id },
        data: { 
          status: 'PAID', 
          paymentId: charge.id 
        }
      });
      
      await prisma.user.update({
        where: { id: newOrder.userId },
        data: { ltv: { increment: amount } }
      });

      // 🚀 MAGIA OMNICANAL: EL COYOTE AVISA POR WHATSAPP (¡AHORA CON FACTURA!)
      try {
        const waToken = process.env.WHATSAPP_TOKEN;
        const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '920775764462309'; 
        const numeroLimpio = customer.phone.replace(/\D/g, ''); 

        let mensajeCoyote = `🐺 ¡Qué onda ${customer.name}! Soy El Coyote de Coyote Textil.\n\nEl sistema me avisa que tu pago con Tarjeta por *$${amount} MXN* en nuestra página web pasó al 100% (Orden: ${newOrder.id}). ✅\n\nTu pedido ya está en fila para bodega. Por aquí te iré avisando cualquier novedad. 📦`;

        if (metadata.req_invoice === 'YES') {
           if (invoiceData && invoiceData.pdf) {
               // 🔥 Si se timbró con éxito, le mandamos el link del PDF de inmediato
               mensajeCoyote += `\n\n🧾 *¡Tu factura ya fue timbrada ante el SAT!* Descarga tu PDF oficial aquí:\n📄 ${invoiceData.pdf}`;
           } else {
               mensajeCoyote += `\n\n🧾 *Tus datos fiscales fueron recibidos.* Te haré llegar tu factura por este medio a la brevedad.`;
           }
        }

        if (waToken) {
          await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${waToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: "individual",
              to: numeroLimpio,
              type: 'text',
              text: { body: mensajeCoyote }
            })
          });
          console.log(`💬 WhatsApp enviado al cliente web: ${numeroLimpio}`);
        }
      } catch (errWa) {
        console.error('⚠️ El pago pasó, pero falló el aviso de WhatsApp:', errWa);
      }

    } else {
      // Si es OXXO/SPEI, solo guardamos el ID de OpenPay y se queda en PENDING
      await prisma.order.update({
        where: { id: newOrder.id },
        data: { paymentId: charge.id }
      });
    }

    // Retornamos éxito al Frontend
    return NextResponse.json({ 
      success: true, 
      charge, 
      orderId: newOrder.id,
      invoice: invoiceData // Pasamos la info por si el frontend quiere mostrar un botón de descarga
    });

  } catch (error: any) {
    console.error('❌ Error en Checkout:', error);
    const errorCode = error.error_code || 500;
    const errorMessage = error.description || 'Error procesando la transacción B2B';

    return NextResponse.json(
      { success: false, error: errorMessage, code: errorCode },
      { status: 400 }
    );
  }
}