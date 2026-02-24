import { NextResponse } from 'next/server';
import { PrismaClient, Prisma, OrderStatus } from '@prisma/client';
import crypto from 'crypto';
import { z } from 'zod';

// ─────────────────────────────────────────────
// 🐺 COYOTE PAYHOOK v2.0 — MODO VERIFICACIÓN
// ─────────────────────────────────────────────

const prisma = new PrismaClient();

// ─── Env vars (nunca hardcodeado, nunca más) ───
const ENV = {
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN!,
  PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID!,
  SKYDROPX_API_KEY: process.env.SKYDROPX_API_KEY!,
  OPENPAY_WEBHOOK_SECRET: process.env.OPENPAY_WEBHOOK_SECRET!, // Para verificar firma HMAC
};

// ─── Validación del payload con Zod ───────────
const OpenPayTransactionSchema = z.object({
  id: z.string(),
  order_id: z.string().optional(),
  amount: z.number(),
  status: z.string(),
  metadata: z.record(z.string(), z.string()).optional(),
});

const OpenPayWebhookSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('verification'), verification_code: z.string() }),
  z.object({ type: z.literal('charge.succeeded'), transaction: OpenPayTransactionSchema }),
  z.object({ type: z.literal('charge.failed'), transaction: OpenPayTransactionSchema }),
  z.object({ type: z.literal('charge.cancelled'), transaction: OpenPayTransactionSchema }),
]);

type OpenPayWebhook = z.infer<typeof OpenPayWebhookSchema>;

// ─── Logger estructurado ───────────────────────
const log = {
  info:  (msg: string, ctx?: object) => console.log (JSON.stringify({ level: 'INFO',  msg, ...ctx, ts: new Date().toISOString() })),
  warn:  (msg: string, ctx?: object) => console.warn(JSON.stringify({ level: 'WARN',  msg, ...ctx, ts: new Date().toISOString() })),
  error: (msg: string, ctx?: object) => console.error(JSON.stringify({ level: 'ERROR', msg, ...ctx, ts: new Date().toISOString() })),
};

// ─── Firma HMAC de OpenPay ─────────────────────
function verifyOpenPaySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !ENV.OPENPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', ENV.OPENPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}

// ─── Retry con backoff exponencial ────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 3, delayMs = 500, label = 'op' } = {}
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      log.warn(`[${label}] Intento ${attempt} fallido, reintentando en ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs * attempt));
    }
  }
  throw new Error(`[${label}] Agotados todos los reintentos`);
}

// ─── SkyDropX: solicitar guía ─────────────────
async function createShipment(order: any): Promise<string | null> {
  const payload = {
    address_from: {
      province: 'Ciudad de México',
      city: 'CDMX',
      name: 'Coyote Textil Almacén',
      zip: process.env.WAREHOUSE_ZIP || '06000',
      country: 'MX',
      address1: process.env.WAREHOUSE_ADDRESS || 'Calle Principal 123',
      company: 'Coyote Textil',
      phone: process.env.WAREHOUSE_PHONE || '5555555555',
      email: process.env.WAREHOUSE_EMAIL || 'logistica@coyotetextil.com',
    },
    address_to: {
      province: order.user?.state ?? 'CDMX',
      city: order.user?.city ?? 'CDMX',
      name: order.user?.name ?? order.customerName ?? 'Cliente',
      zip: order.user?.zipCode ?? '00000',
      country: 'MX',
      address1: order.user?.street ?? order.address ?? 'Domicilio Conocido',
      company: 'N/A',
      phone: order.user?.phone ?? order.customerPhone ?? '0000000000',
      email: order.user?.email ?? order.customerEmail ?? 'cliente@email.com',
    },
    parcels: [{ weight: 15, distance_unit: 'CM', mass_unit: 'KG', length: 40, width: 40, height: 40 }],
  };

  const res = await withRetry(
    () =>
      fetch('https://api.skydropx.com/v1/shipments', {
        method: 'POST',
        headers: {
          Authorization: `Token token=${ENV.SKYDROPX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }),
    { retries: 3, delayMs: 800, label: 'SkyDropX' }
  );

  if (!res.ok) {
    const errBody = await res.text();
    log.error('SkyDropX rechazó la solicitud', { status: res.status, body: errBody });
    return null;
  }

  const data = await res.json();
  const trackingId: string = data?.data?.id;
  log.info('Guía generada', { trackingId });
  return trackingId;
}

// ─── WhatsApp: enviar mensaje ──────────────────
async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const clean = phone.replace(/\D/g, '');
  if (!clean) { log.warn('Número de WhatsApp inválido', { phone }); return; }

  await withRetry(
    () =>
      fetch(`https://graph.facebook.com/v22.0/${ENV.PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ENV.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: clean,
          type: 'text',
          text: { body: message },
        }),
      }),
    { retries: 3, delayMs: 500, label: 'WhatsApp' }
  );

  log.info('WhatsApp enviado', { to: clean });
}

// ─── Handler: charge.succeeded ─────────────────
async function handleChargeSucceeded(transaction: z.infer<typeof OpenPayTransactionSchema>) {
  const { id: openPayId, order_id: orderId, amount, metadata } = transaction;

  if (!orderId) {
    log.warn('Webhook sin order_id, ignorado', { openPayId });
    return;
  }

  // 🔒 Idempotencia: evitar doble procesamiento
  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (existing?.status === OrderStatus.PAID) {
    log.warn('Orden ya procesada (idempotencia)', { orderId });
    return;
  }

  // ⚡ Transacción atómica en BD
  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID, paymentId: openPayId },
      include: { user: true },
    });

    await tx.user.update({
      where: { id: order.userId },
      data: { ltv: { increment: amount } },
    });

    return order;
  });

  log.info('Orden marcada como PAGADA', { orderId, amount });

  // 📦 Solicitar guía (no bloquea si falla)
  let trackingId: string | null = null;
  try {
    trackingId = await createShipment(updatedOrder);
    if (trackingId) {
      await prisma.order.update({
        where: { id: orderId },
        data: { trackingNumber: trackingId } as Prisma.OrderUpdateInput,
      });
    }
  } catch (err) {
    log.error('Error al generar guía SkyDropX', { orderId, err: String(err) });
  }

  // 💬 Notificar al cliente por WhatsApp
  const phone = metadata?.phone ?? updatedOrder.user?.phone ?? updatedOrder.customerPhone;
  if (phone) {
    const msg = trackingId
      ? `🐺 ¡Tu pago de *$${amount} MXN* quedó confirmado! ✅\n\n📦 *Guía lista:* \`${trackingId}\`\nYa estamos empacando tu pedido. ¡Va en camino!`
      : `🐺 ¡Tu pago de *$${amount} MXN* quedó confirmado! ✅\n\n📦 Tu pedido ya está en bodega. Te mando el número de rastreo en cuanto salga la guía.`;
    await sendWhatsApp(phone, msg);
  }
}

// ─── Handler: charge.failed / cancelled ───────
async function handleChargeFailed(transaction: z.infer<typeof OpenPayTransactionSchema>) {
  const { order_id: orderId, metadata } = transaction;
  if (!orderId) return;

  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CANCELLED },
  }).catch((_e: unknown) => { /* silencioso: no romper si la orden no existe */ });

  const phone = metadata?.phone;
  if (phone) {
    await sendWhatsApp(
      phone,
      `🐺 Oye jefe, tu pago no pudo procesarse. 😞\nIntenta de nuevo o escríbeme si necesitas ayuda. Aquí andamos.`
    );
  }
}

// ─────────────────────────────────────────────
// 🚀 POST — Webhook principal
// ─────────────────────────────────────────────
export async function POST(req: Request) {
  const rawBody = await req.text();

  // 🚨 ATENCIÓN JEFE: ESCUDO APAGADO TEMPORALMENTE 🚨
  // Comenté estas líneas para que OpenPay pueda entrar y darnos el código.
  // En cuanto verifiques, QUÍTALES LAS DOBLES DIAGONALES a estas 5 líneas.
  
  // const signature = req.headers.get('x-openpay-signature');
  // if (!verifyOpenPaySignature(rawBody, signature)) {
  //   log.warn('Firma inválida — posible request no autorizado');
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  let payload: OpenPayWebhook;
  try {
    payload = OpenPayWebhookSchema.parse(JSON.parse(rawBody));
  } catch (err) {
    log.warn('Payload inválido', { err: String(err) });
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  log.info('Webhook recibido', { type: payload.type });

  try {
    switch (payload.type) {
      case 'verification':
        // 🔥 AQUÍ VA A SALIR TU CÓDIGO EN LA TERMINAL 🔥
        console.log('\n======================================================');
        console.log('🐺 CÓDIGO DE VERIFICACIÓN OPENPAY:', payload.verification_code);
        console.log('======================================================\n');
        log.info('🔑 Código de verificación OpenPay', { code: payload.verification_code });
        break;

      case 'charge.succeeded':
        await handleChargeSucceeded(payload.transaction);
        break;

      case 'charge.failed':
      case 'charge.cancelled':
        await handleChargeFailed(payload.transaction);
        break;
    }

    return NextResponse.json({ status: 'ok' });

  } catch (err) {
    log.error('Error crítico en webhook', { err: String(err), type: payload.type });
    return NextResponse.json({ status: 'ok', warning: 'processed_with_errors' });
  }
}

// ─── GET — Health check ─────────────────────
export async function GET() {
  return new NextResponse('🐺 Coyote Payhook v2.0 — Operando a toda máquina', { status: 200 });
}