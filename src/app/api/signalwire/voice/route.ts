import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    console.log(`📞 [COYOTE] Recibiendo llamada externa...`);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="Polly.Jorge" language="es-MX">
        Estás en la línea con Coyote Textil: Vistiendo la Fuerza de México. Aguarda un momento en la línea, mientras te enlazamos con un asesor. Para información sobre nuestro aviso de privacidad, y términos legales, visita: triple doble u, punto, coyote textil, punto, com. En breve te atenderemos.
      </Say>
      <Play>http://com.twilio.sounds.music.s3.amazonaws.com/MARKOV_AWAY.mp3</Play>
    </Response>`;

    return new NextResponse(xml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('❌ Error en el Webhook de Voz:', error);
    return new NextResponse('Error', { status: 500 });
  }
}