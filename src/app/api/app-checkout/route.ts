// app/api/app-checkout/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OPENPAY_ID   = process.env.OPENPAY_MERCHANT_ID;
const OPENPAY_SK   = process.env.OPENPAY_PRIVATE_KEY;
const openpayAuth  = Buffer.from(`${OPENPAY_SK}:`).toString('base64');
const OPENPAY_BASE = 'https://sandbox-api.openpay.mx'; // → cambiar a api.openpay.mx en producción

const TARIFA_SERVICIO = 175;
const KG_POR_ROLLO    = 25;

interface ItemCarrito {
  id:       string;
  nombre:   string;
  precio:   number;
  tipo:     'menudeo' | 'mayoreo';
  cantidad: number;
  color?:   string;
  subtotal: number;
}

interface ClienteApp {
  nombre:          string;
  telefono:        string;
  email:           string;
  direccion:       string;
  cp:              string;
  requiereFactura: boolean;
  rfc?:            string;
  razonSocial?:    string;
  cpFiscal?:       string;
  regimen?:        string;
  usoCfdi?:        string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { carrito, cliente }: { carrito: ItemCarrito[]; cliente: ClienteApp } = body;

    // ── Validaciones básicas ──────────────────────────────────────
    if (!carrito?.length) return NextResponse.json({ success: false, message: 'Carrito vacío.' }, { status: 400 });

    const faltantes = ['nombre','telefono','email','direccion'].filter(k => !cliente?.[k as keyof ClienteApp]);
    if (faltantes.length) return NextResponse.json({ success: false, message: `Faltan datos: ${faltantes.join(', ')}.` }, { status: 400 });

    // ── Recalcular subtotal en el servidor ─────────────────────────
    const subtotalProductos = carrito.reduce((sum, item) => sum + item.subtotal, 0);

    // ── Flete y Totales ────────────────────────────────────────────
    const { flete, traslado } = calcularFlete(carrito, cliente.cp);
    const base       = subtotalProductos + flete + traslado + TARIFA_SERVICIO;
    const iva        = cliente.requiereFactura ? parseFloat((base * 0.16).toFixed(2)) : 0;
    const totalFinal = parseFloat((base + iva).toFixed(2));

    const descripcion = carrito.map(i => {
      const unidad = i.tipo === 'mayoreo' ? `${i.cantidad} rollo(s)` : `${i.cantidad} kg`;
      return `${i.nombre} ${unidad}${i.color ? ` ${i.color}` : ''}`;
    }).join(' | ').slice(0, 250);

    // ── 1. GUARDAR EN PRISMA (Para el CRM) ──────────────────────────
    const nuevaOrden = await prisma.order.create({
      data: {
        user: {
          connectOrCreate: {
            where: { email: cliente.email },
            create: {
              hashId: `CYT-${Math.floor(Math.random() * 900000) + 100000}`,
              email: cliente.email,
              name: cliente.nombre,
              phone: cliente.telefono,
              password: `app_guest_${Date.now()}`, 
              street: cliente.direccion,
            }
          }
        },
        orderNumber: `APP-${Date.now().toString().slice(-6)}`,
        subtotal: subtotalProductos,
        total: totalFinal,
        status: 'PENDING',
        logisticsType: 'SKYDROPX_NACIONAL', // 🔥 PON AQUÍ LA PALABRA EXACTA DE TU SCHEMA
        customerName: cliente.nombre,
        customerPhone: cliente.telefono,
        customerEmail: cliente.email,
        address: `${cliente.direccion}, CP: ${cliente.cp}`,
        items: {
          create: carrito.map(item => ({
            // 🔥 Corrección 2: Agregamos productId que Prisma exigía
            productId: item.id, 
            title: item.nombre,
            price: item.precio,
            quantity: item.cantidad,
            unit: item.tipo === 'mayoreo' ? 'Rollo' : 'KG'
          }))
        }
      }
    });

    console.log(`📱 [APP] Orden interna guardada: ${nuevaOrden.orderNumber}`);

    // ── 2. CREAR CHECKOUT EN OPENPAY ───────────────────────────────
    const res = await fetch(`${OPENPAY_BASE}/v1/${OPENPAY_ID}/checkouts`, {
      method:  'POST',
      headers: { 'Authorization': `Basic ${openpayAuth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:       totalFinal,
        currency:     'MXN',
        description:  `Orden ${nuevaOrden.orderNumber} | Coyote Textil`,
        order_id:     nuevaOrden.id,
        redirect_url: 'https://wa.me/5215627301525', 
        customer: {
          name:         cliente.nombre,
          phone_number: `52${cliente.telefono.replace(/\D/g, '')}`,
          email:        cliente.email,
        },
        send_email: false,
        metadata: {
          canal:              'app',
          orden_prisma_id:    nuevaOrden.id,
          direccion_envio:    cliente.direccion,
          req_invoice:        cliente.requiereFactura ? 'YES' : 'NO',
          flete,
          traslado,
          iva,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('❌ OpenPay:', JSON.stringify(data));
      await prisma.order.update({ where: { id: nuevaOrden.id }, data: { status: 'FAILED' }});
      
      const msg = data.error_code === 1012
        ? 'El monto supera el límite permitido. Contáctanos por WhatsApp.'
        : data.description || 'Error al generar el cobro.';
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }

    console.log(`✅ [APP] Link OpenPay generado para orden ${nuevaOrden.orderNumber}`);

    return NextResponse.json({
      success: true,
      link: data.checkout_link,
      desglose: { productos: subtotalProductos, flete, traslado, tarifa: TARIFA_SERVICIO, iva, total: totalFinal },
    });

  } catch (err) {
    console.error('❌ /api/app-checkout:', err);
    return NextResponse.json({ success: false, message: 'Error interno.' }, { status: 500 });
  }
}

// ── Lógica de flete (espejo del webhook de WhatsApp) ──────────────
function calcularFlete(carrito: ItemCarrito[], cpEnvio: string) {
  const totalKilos  = carrito.reduce((acc, i) => acc + (i.tipo === 'mayoreo' ? i.cantidad * KG_POR_ROLLO : i.cantidad), 0);
  const totalRollos = Math.max(1, Math.ceil(totalKilos / KG_POR_ROLLO));

  let flete = 0;
  if      (totalKilos < 10 && totalRollos === 1) flete = 150;
  else if (totalRollos === 1)  flete = 200;
  else if (totalRollos <= 4)   flete = 250;
  else if (totalRollos <= 10)  flete = 300;
  else if (totalRollos <= 15)  flete = 400;
  else if (totalRollos <= 20)  flete = 500;
  else                         flete = 1000;

  const prefix2 = Math.floor(parseInt(cpEnvio || '0') / 1000);
  let distanciaKm = 0;
  let esSkydropx  = true;

  if (prefix2 >= 1 && prefix2 <= 16) {
    esSkydropx = false;
    if      ([15,6,8].includes(prefix2))       distanciaKm = 5;
    else if ([7,9,3].includes(prefix2))        distanciaKm = 12;
    else if ([2,4,11].includes(prefix2))       distanciaKm = 18;
    else                                       distanciaKm = 28;
  } else if (prefix2 >= 50 && prefix2 <= 57) {
    esSkydropx = false;
    if      (prefix2 === 57)                   distanciaKm = 10;
    else if (prefix2 === 55)                   distanciaKm = 20;
    else if (prefix2 === 53 || prefix2 === 54) distanciaKm = 25;
    else if (prefix2 === 56)                   distanciaKm = 35;
    else if (prefix2 === 52)                   distanciaKm = 55;
    else                                       distanciaKm = 70;
  } else if (prefix2 === 42 || prefix2 === 43) { esSkydropx = false; distanciaKm = 100; }
  else if (prefix2 >= 72 && prefix2 <= 75)     { esSkydropx = false; distanciaKm = 130; }
  else if (prefix2 === 62)                     { esSkydropx = false; distanciaKm = 90; }

  let traslado = 0;
  if (esSkydropx) {
    traslado = 180 + Math.max(0, totalKilos - 5) * 12;
  } else {
    const litros = (distanciaKm * 2 / 100) * 20;      
    traslado     = Math.round(litros * 27 * 4);         
  }

  return { flete: Math.round(flete), traslado: Math.round(traslado) };
}