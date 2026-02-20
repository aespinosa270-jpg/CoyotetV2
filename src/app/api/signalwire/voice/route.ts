import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    console.log(`📞 [COYOTE] Recibiendo llamada externa...`);

    // 🔥 La I.A. contesta directamente la llamada telefónica
    const xml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice" language="es-MX">Felicidades CEO. El conmutador de Coyote Textil está en línea y su código funciona a la perfección.</Say></Response>';

    return new NextResponse(xml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return new NextResponse('Error', { status: 500 });
  }
}