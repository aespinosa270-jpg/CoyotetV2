// src/app/api/checkout/webhook/route.ts
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { sendAdminOrderNotification } from "@/lib/mailer"      // 🔥 Tu misil de ZeptoMail (Admin)
import { timbrarFacturaReal } from "@/lib/facturapi"       // 🧾 Tu misil del SAT (CFDI 4.0)

// 🐺 Inicializamos Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
})

const webhookSecret = process.env.STRIPE_CHECKOUT_WEBHOOK_SECRET!

// =====================================================================
// 📧 HELPER: CORREO AL CLIENTE (ZEPTOMAIL)
// =====================================================================
async function enviarCorreoClienteZepto(order: any, urlFactura: string | null) {
  if (!order.customerEmail) return;

  const botonFacturaHtml = urlFactura 
    ? `<a href="${urlFactura}" style="display: inline-block; background-color: #222; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; border: 1px solid #444; margin-top: 15px;">📄 Descargar Factura (PDF)</a>`
    : `<p style="color: #888; font-size: 12px; margin-top: 15px;">*No se solicitó factura o está procesándose.</p>`;

  // Armamos la lista de productos
  const itemsHtml = order.items.map((item: any) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #222; color: #ccc;">${item.quantity} ${item.unit || 'Kg'} - ${item.title} ${item.color ? `(${item.color})` : ''}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #222; text-align: right; color: #fff; font-weight: bold;">$${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; background-color: #0A0A0A; color: #ffffff; padding: 40px; border-radius: 16px; border: 1px solid #333;">
      <h2 style="color: #FDCB02; text-transform: uppercase; margin-top: 0; font-size: 24px; font-style: italic; font-weight: 900;">¡Pedido Confirmado! 🐺</h2>
      <p style="color: #cccccc; font-size: 16px; line-height: 1.5;">Qué onda <strong>${order.customerName}</strong>, el Coyote ya recibió tu pago. Tu pedido <strong>#${order.orderNumber.slice(-8)}</strong> acaba de entrar a la fila de corte y preparación en nuestra bodega.</p>
      
      <div style="background-color: #111; padding: 25px; border-radius: 12px; border: 1px solid #222; margin: 30px 0;">
        <p style="margin: 0 0 15px 0; color: #888; font-size: 10px; text-transform: uppercase; font-weight: bold; letter-spacing: 2px;">Resumen de tu Inversión</p>
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          ${itemsHtml}
          <tr>
            <td style="padding-top: 20px; font-weight: 900; text-transform: uppercase; color: #888; font-size: 12px;">Total Pagado:</td>
            <td style="padding-top: 20px; font-weight: 900; text-align: right; color: #FDCB02; font-size: 18px;">$${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</td>
          </tr>
        </table>
      </div>

      <a href="https://coyotetextil.com/perfil" style="display: inline-block; background-color: #FDCB02; color: #000; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 900; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">📦 Rastrear en mi Perfil</a>
      <br>
      ${botonFacturaHtml}

      <hr style="border-color: #222; margin: 40px 0 20px 0;">
      <p style="color: #555; font-size: 10px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Coyote Textil - Líderes en Proveeduría B2B<br>Este es un correo automático generado por nuestro sistema.</p>
    </div>
  `;

  try {
    await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `SendMailToken ${process.env.ZEPTOMAIL_TOKEN}` 
      },
      body: JSON.stringify({
        from: { address: "ventas@coyotetextil.com", name: "Coyote Textil" }, // Cambia si usas otro
        to: [{ email_address: { address: order.customerEmail, name: order.customerName } }],
        subject: `🐺 Recibo de tu pedido #${order.orderNumber.slice(-8)} - Coyote Textil`,
        htmlbody: htmlBody
      })
    });
    console.log(`✅ Correo de cliente enviado a ${order.customerEmail}`);
  } catch (error) {
    console.error("🔥 Error enviando correo al cliente:", error);
  }
}

export async function POST(req: Request) {
  const body = await req.text()
  const reqHeaders = await headers()
  const signature = reqHeaders.get("Stripe-Signature") as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error: any) {
    console.error("🔥 Error de firma en el Webhook de Tienda:", error.message)
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
  }

  // ─── MANEJO DE EVENTOS DEL CARRITO DE COMPRAS ──────────────────────────────
  switch (event.type) {

    // 1. EL CLIENTE PAGÓ SU CARRITO CON ÉXITO
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const orderId = paymentIntent.metadata.order_id

      if (orderId) {
        // 🔥 Actualizamos a "PAID" e incluimos los "items" y al "user" de tu Prisma
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "PAID", 
            paymentId: paymentIntent.id, // Guardamos el ID de pago de Stripe por si hay devoluciones
          },
          include: {
            items: true, 
            user: true, 
          }
        })
        
        console.log(`✅ Pago exitoso. Orden ${updatedOrder.orderNumber} marcada como PAGADA.`)

        // =====================================================================
        // 💰 INYECCIÓN: SISTEMA DE PUNTOS COYOTE (SOLO USUARIOS REGISTRADOS)
        // =====================================================================
        try {
          if (updatedOrder.userId) { // <-- VALIDACIÓN: Solo entra si es usuario registrado
            const puntosUsados = parseInt(paymentIntent.metadata.puntos_usados || '0');
            const tier = updatedOrder.user?.membershipTier || 'NONE'; // <-- El ? por si acaso
            let multiplicador = 0.5; // Silver
            if (tier === 'GOLD') multiplicador = 1.0;
            if (tier === 'BLACK') multiplicador = 2.0;
            if (tier === 'ELITE') multiplicador = 4.0;
            
            const puntosGanados = Math.floor((updatedOrder.subtotal / 100) * multiplicador);
            const balanceNeto = puntosGanados - puntosUsados;

            if (balanceNeto !== 0) {
              await prisma.user.update({
                where: { id: updatedOrder.userId },
                data: { points: { increment: balanceNeto } }
              });
              console.log(`🐺 Puntos actualizados para el socio: ${balanceNeto > 0 ? '+' : ''}${balanceNeto}`);
            }
          } else {
            console.log("👤 Compra de invitado. Se omite el cálculo de puntos.");
          }
        } catch (pointsErr) {
          console.error("⚠️ Error actualizando puntos (no detiene la orden):", pointsErr);
        }

        // =====================================================================
        // 🧾 INYECCIÓN FACTURAPI (SAT CFDI 4.0)
        // =====================================================================
        const reqInvoice = paymentIntent.metadata.req_invoice === 'YES';
        let linkFacturaParaCorreo: string | null = null; // Guardamos el link para mandarlo en el email

        if (reqInvoice) {
          try {
            console.log("⏳ Iniciando timbrado automático ante el SAT...");
            
            const fiscalData = JSON.parse(paymentIntent.metadata.fiscal_data || '{}');
            const enviosYFletes = parseFloat(paymentIntent.metadata.shipping_cost || '0') + parseFloat(paymentIntent.metadata.freight_cost || '0');
            const serviceFee = parseFloat(paymentIntent.metadata.service_fee || '175');
            const customerData = { email: updatedOrder.customerEmail, name: updatedOrder.customerName };

            const cfdi = await timbrarFacturaReal(
              customerData,
              fiscalData,
              updatedOrder.items,
              'stripe',
              enviosYFletes,
              serviceFee
            );

            // 🔥 LA MAGIA OCURRE AQUÍ: Extracción segura para TypeScript
            if (cfdi.success) {
              const pdfSeguro = cfdi.pdf || null; 
              linkFacturaParaCorreo = pdfSeguro; 
              await prisma.order.update({
                where: { id: orderId },
                data: { invoiceStatus: pdfSeguro } 
              });
            } else {
              throw new Error(cfdi.error); 
            }

          } catch (facturaError: any) {
            console.error("⚠️ Falló el timbrado automático:", facturaError.message || facturaError);
            await prisma.order.update({
              where: { id: orderId },
              data: { invoiceStatus: "ERROR" }
            });
          }
        }

        // =====================================================================
        // ✉️ INYECCIÓN ZEPTOMAIL (Reporte al Patrón + Recibo al Cliente)
        // =====================================================================
        try {
          // 1️⃣ Le avisamos al Patrón (Tú)
          const orderInfo = {
            orderId: updatedOrder.orderNumber, 
            customerName: updatedOrder.customerName,
            customerEmail: updatedOrder.customerEmail,
            customerPhone: updatedOrder.customerPhone || "No proporcionado",
            shippingMethod: updatedOrder.logisticsType.replace('_', ' '), 
            shippingAddress: updatedOrder.address || "Recolección en sucursal",
            paymentMethod: "Tarjeta (Stripe)",
            totalAmount: updatedOrder.total.toLocaleString('es-MX', { minimumFractionDigits: 2 }),
            items: updatedOrder.items.map((item) => ({
              name: `${item.title} ${item.color ? `(${item.color})` : ''}`,
              quantity: `${item.quantity} ${item.unit || ''}`,
              price: item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })
            }))
          };

          await sendAdminOrderNotification(orderInfo);
          console.log("📨 Notificación de ZeptoMail enviada al Patrón.");

          // 2️⃣ Le disparamos el comprobante fresón al cliente
          await enviarCorreoClienteZepto(updatedOrder, linkFacturaParaCorreo);

        } catch (mailError) {
          console.error("⚠️ El pago se guardó, pero falló el envío del correo:", mailError);
        }

      } else {
        console.warn("⚠️ Pago exitoso pero sin order_id en la metadata:", paymentIntent.id)
      }
      break
    }

    // 2. EL PAGO FALLÓ O FUE RECHAZADO
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const orderId = paymentIntent.metadata.order_id

      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "FAILED", 
          },
        })
        console.warn(`❌ Pago rechazado para la orden de tienda ${orderId}`)
      }
      break
    }

    default:
      console.log(`ℹ️ Evento de tienda ignorado: ${event.type}`)
  }

  return new NextResponse("Webhook de tienda procesado", { status: 200 })
}