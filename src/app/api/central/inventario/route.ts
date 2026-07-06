// src/app/api/central/inventario/route.ts
// Inventario/catálogo REAL desde tu Upstash (bodega_coyote_v3 → v2 → v1, el primero que exista)

import { NextResponse } from 'next/server';

const URL_BASE = process.env.UPSTASH_REDIS_REST_URL!;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function getLlave(llave: string): Promise<string | null> {
  const r = await fetch(`${URL_BASE}/get/${llave}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: 'no-store',
  });
  const data = await r.json();
  return data.result ?? null;
}

export async function GET() {
  try {
    for (const llave of ['bodega_coyote_v3', 'bodega_coyote_v2', 'bodega_coyote']) {
      const raw = await getLlave(llave);
      if (raw) {
        return NextResponse.json({ fuente: llave, bodega: JSON.parse(raw) });
      }
    }
    return NextResponse.json({ fuente: null, bodega: {} });
  } catch (e) {
    console.error('[central/inventario]', e);
    return NextResponse.json({ error: 'Error consultando bodega' }, { status: 500 });
  }
}
