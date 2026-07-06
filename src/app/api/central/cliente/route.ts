// src/app/api/central/cliente/route.ts
// Busca la ficha REAL del cliente en Upstash Redis por teléfono.
// Llave esperada: cliente:{telefono}  (ej. cliente:5215534081869)

import { NextRequest, NextResponse } from 'next/server';

const URL_BASE = process.env.UPSTASH_REDIS_REST_URL!;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

export async function GET(req: NextRequest) {
  const tel = req.nextUrl.searchParams.get('tel')?.replace(/\D/g, '');
  if (!tel) {
    return NextResponse.json({ error: 'Falta el parámetro tel' }, { status: 400 });
  }

  try {
    const r = await fetch(`${URL_BASE}/get/cliente:${tel}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: 'no-store',
    });
    const data = await r.json();

    if (!data.result) {
      // Cliente no existe en Redis: devolver ficha mínima
      return NextResponse.json({
        encontrado: false,
        cliente: {
          telefono: tel,
          nombre: '',
          genero: 'unknown',
        },
      });
    }

    const cliente = JSON.parse(data.result);
    return NextResponse.json({ encontrado: true, cliente });
  } catch (e) {
    console.error('[central/cliente]', e);
    return NextResponse.json({ error: 'Error consultando Upstash' }, { status: 500 });
  }
}
