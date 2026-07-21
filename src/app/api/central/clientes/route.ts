// src/app/api/central/clientes/route.ts
// GET  ?q=texto  → busca clientes en Upstash por teléfono o nombre (escanea llaves cliente:*)
// POST           → da de alta un cliente nuevo en Upstash (llave cliente:{telefono})

import { NextRequest, NextResponse } from 'next/server';

const R_URL = process.env.UPSTASH_REDIS_REST_URL!;
const R_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

const headers = { Authorization: `Bearer ${R_TOKEN}` };

type Ficha = Record<string, unknown> & { telefono?: string; nombre?: string; empresa?: string };

// ── SCAN paginado sobre cliente:* ──
async function escanearClientes(patron: string, limite = 400): Promise<string[]> {
  const llaves: string[] = [];
  let cursor = '0';
  let vueltas = 0;
  do {
    const r = await fetch(`${R_URL}/scan/${cursor}/match/${patron}/count/100`, {
      headers,
      cache: 'no-store',
    });
    const data = await r.json();
    // Upstash devuelve [cursor, [llaves...]]
    const [nuevoCursor, lote] = data.result as [string, string[]];
    cursor = nuevoCursor;
    llaves.push(...lote);
    vueltas++;
  } while (cursor !== '0' && llaves.length < limite && vueltas < 10);
  return llaves;
}

async function traerFichas(llaves: string[]): Promise<Ficha[]> {
  if (llaves.length === 0) return [];
  const fichas = await Promise.all(
    llaves.map(async (llave) => {
      try {
        const r = await fetch(`${R_URL}/get/${llave}`, { headers, cache: 'no-store' });
        const d = await r.json();
        if (!d.result) return null;
        const ficha = JSON.parse(d.result) as Ficha;
        if (!ficha.telefono) ficha.telefono = llave.replace('cliente:', '');
        return ficha;
      } catch {
        return null;
      }
    }),
  );
  return fichas.filter((f): f is Ficha => f !== null);
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
  if (!q) return NextResponse.json({ clientes: [] });

  try {
    const soloDigitos = q.replace(/\D/g, '');

    // Si parece teléfono: intento directo primero (rapidísimo)
    if (soloDigitos.length >= 7) {
      const r = await fetch(`${R_URL}/get/cliente:${soloDigitos}`, { headers, cache: 'no-store' });
      const d = await r.json();
      if (d.result) {
        const ficha = JSON.parse(d.result) as Ficha;
        if (!ficha.telefono) ficha.telefono = soloDigitos;
        return NextResponse.json({ clientes: [ficha] });
      }
      // no exacto: busca teléfonos que contengan esos dígitos
      const llaves = await escanearClientes(`cliente:*${soloDigitos}*`);
      return NextResponse.json({ clientes: await traerFichas(llaves.slice(0, 25)) });
    }

    // Búsqueda por nombre/empresa: escanea y filtra
    const llaves = await escanearClientes('cliente:*');
    const fichas = await traerFichas(llaves);
    const filtradas = fichas.filter((f) => {
      const nombre = String(f.nombre || '').toLowerCase();
      const empresa = String(f.empresa || '').toLowerCase();
      return nombre.includes(q) || empresa.includes(q);
    });
    return NextResponse.json({ clientes: filtradas.slice(0, 25) });
  } catch (e) {
    console.error('[central/clientes GET]', e);
    return NextResponse.json({ error: 'Error buscando clientes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const telefono = String(body.telefono || '').replace(/\D/g, '');
    if (!telefono || telefono.length < 10) {
      return NextResponse.json({ error: 'Teléfono inválido (mínimo 10 dígitos)' }, { status: 400 });
    }

    // ¿ya existe?
    const rExiste = await fetch(`${R_URL}/get/cliente:${telefono}`, { headers, cache: 'no-store' });
    const dExiste = await rExiste.json();
    if (dExiste.result) {
      return NextResponse.json({ error: 'Ese teléfono ya está registrado' }, { status: 409 });
    }

    const ahora = new Date().toISOString();
    const ficha: Ficha = {
      telefono,
      nombre: body.nombre || '',
      empresa: body.empresa || '',
      genero: body.genero || 'unknown',
      notas: body.notas || '',
      temperatura: body.temperatura || 'frio',
      origen: 'alta manual CRM',
      altaPor: body.altaPor || '',
      primerContacto: ahora,
      ultimoContacto: ahora,
    };

    const rSet = await fetch(`${R_URL}/set/cliente:${telefono}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(ficha),
    });
    if (!rSet.ok) throw new Error('Upstash rechazó el guardado');

    return NextResponse.json({ ok: true, cliente: ficha });
  } catch (e) {
    console.error('[central/clientes POST]', e);
    return NextResponse.json({ error: 'Error registrando el cliente' }, { status: 500 });
  }
}
