// src/app/api/central/venta/route.ts
// Ventas REALES desde la Central:
// - POST: crea la venta (con productos + conceptos de envío manuales)
//   Si pagoConfirmado=true → genera la nota (folio) y descuenta el inventario en Upstash
// - GET ?tel=XXX&pendientes=1: pagos pendientes/por confirmar de ese cliente (lo único que ven las vendedoras)
// - PATCH: confirmar pago de una venta existente → genera nota + descuenta inventario

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const R_URL = process.env.UPSTASH_REDIS_REST_URL!;
const R_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

type Item =
  | { tipo: 'PRODUCTO'; nombre: string; cantidad: number; precioUnit: number; tier?: string }
  | { tipo: 'ENVIO'; concepto: string; precio: number };

// ── Descuento de inventario en Upstash (misma bodega del POS) ──
// Busca la llave de bodega activa y decrementa el campo de existencias del producto.
// Campos de stock que intenta, en orden: stock, existencias, kilos, rollos.
async function descontarInventario(items: Item[]): Promise<{ ok: boolean; detalle: string[] }> {
  const detalle: string[] = [];
  try {
    let llaveBodega = '';
    let bodega: Record<string, Record<string, unknown>> | null = null;

    for (const llave of ['bodega_coyote_v3', 'bodega_coyote_v2', 'bodega_coyote']) {
      const r = await fetch(`${R_URL}/get/${llave}`, {
        headers: { Authorization: `Bearer ${R_TOKEN}` },
        cache: 'no-store',
      });
      const data = await r.json();
      if (data.result) {
        llaveBodega = llave;
        bodega = JSON.parse(data.result);
        break;
      }
    }
    if (!bodega) return { ok: false, detalle: ['No se encontró la bodega en Upstash'] };

    const camposStock = ['stock', 'existencias', 'kilos', 'rollos'];
    let huboCambios = false;

    for (const item of items) {
      if (item.tipo !== 'PRODUCTO') continue;
      const prod = bodega[item.nombre];
      if (!prod) {
        detalle.push(`⚠️ "${item.nombre}" no está en la bodega — no se descontó`);
        continue;
      }
      const campo = camposStock.find((c) => typeof prod[c] === 'number');
      if (!campo) {
        detalle.push(`⚠️ "${item.nombre}" no tiene campo de existencias (stock/existencias/kilos/rollos) — no se descontó`);
        continue;
      }
      const antes = prod[campo] as number;
      prod[campo] = Math.max(0, antes - item.cantidad);
      huboCambios = true;
      detalle.push(`✅ "${item.nombre}": ${campo} ${antes} → ${prod[campo]}`);
    }

    if (huboCambios) {
      await fetch(`${R_URL}/set/${llaveBodega}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${R_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(bodega),
      });
    }
    return { ok: true, detalle };
  } catch (e) {
    console.error('[venta/inventario]', e);
    return { ok: false, detalle: ['Error descontando inventario'] };
  }
}

function calcular(items: Item[]) {
  let subtotal = 0;
  let envioTotal = 0;
  for (const it of items) {
    if (it.tipo === 'PRODUCTO') subtotal += it.cantidad * it.precioUnit;
    else envioTotal += it.precio;
  }
  return { subtotal, envioTotal, total: subtotal + envioTotal };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telefono, clienteNombre, agente, items, pagoConfirmado, llamadaId } = body as {
      telefono: string;
      clienteNombre?: string;
      agente?: string;
      items: Item[];
      pagoConfirmado: boolean;
      llamadaId?: string;
    };

    if (!telefono || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Faltan teléfono o items de la venta' }, { status: 400 });
    }

    const { subtotal, envioTotal, total } = calcular(items);

    let inventarioDescontado = false;
    let detalleInventario: string[] = [];

    if (pagoConfirmado) {
      const res = await descontarInventario(items);
      inventarioDescontado = res.ok;
      detalleInventario = res.detalle;
    }

    const venta = await prisma.venta.create({
      data: {
        telefono: telefono.replace(/\D/g, ''),
        clienteNombre: clienteNombre || null,
        agente: agente || null,
        items: items as object,
        subtotal,
        envioTotal,
        total,
        pagoConfirmado: Boolean(pagoConfirmado),
        notaGenerada: Boolean(pagoConfirmado), // pago confirmado ⇒ nota emitida con su folio
        inventarioDescontado,
        llamadaId: llamadaId || null,
      },
    });

    return NextResponse.json({
      ok: true,
      folio: venta.pagoConfirmado ? venta.folio : null,
      ventaId: venta.id,
      total,
      inventario: detalleInventario,
    });
  } catch (e) {
    console.error('[central/venta]', e);
    const msg = e instanceof Error ? e.message : 'Error guardando la venta';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const tel = req.nextUrl.searchParams.get('tel')?.replace(/\D/g, '');
  const soloPendientes = req.nextUrl.searchParams.get('pendientes') === '1';
  const where: Record<string, unknown> = {};
  if (tel) where.telefono = tel;
  if (soloPendientes) where.pagoConfirmado = false;

  const ventas = await prisma.venta.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  return NextResponse.json({ ventas });
}

export async function PATCH(req: NextRequest) {
  // Confirmar pago de una venta pendiente → emite nota + descuenta inventario
  try {
    const { ventaId } = await req.json();
    const venta = await prisma.venta.findUnique({ where: { id: ventaId } });
    if (!venta) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    if (venta.pagoConfirmado) return NextResponse.json({ ok: true, folio: venta.folio });

    const res = await descontarInventario(venta.items as unknown as Item[]);

    const actualizada = await prisma.venta.update({
      where: { id: ventaId },
      data: { pagoConfirmado: true, notaGenerada: true, inventarioDescontado: res.ok },
    });

    return NextResponse.json({ ok: true, folio: actualizada.folio, inventario: res.detalle });
  } catch (e) {
    console.error('[central/venta PATCH]', e);
    return NextResponse.json({ error: 'Error confirmando pago' }, { status: 500 });
  }
}
