import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const ZADARMA_SECRET = process.env.ZADARMA_SECRET;

// Función para validar que el webhook realmente viene de Zadarma
function verifyZadarmaSignature(signature: string | null, rawBody: string) {
    if (!ZADARMA_SECRET || !signature) return false;
    
    // Zadarma firma el body crudo (raw URL-encoded string) con HMAC-SHA1 usando tu Secret
    const expectedSignature = crypto
        .createHmac('sha1', ZADARMA_SECRET)
        .update(rawBody)
        .digest('base64');

    return signature === expectedSignature;
}

export async function POST(req: NextRequest) {
    try {
        // 1. Extraer el raw body y los headers
        const rawBody = await req.text();
        const signature = req.headers.get('Signature');

        // 2. Seguridad: Validar firma
        if (!verifyZadarmaSignature(signature, rawBody)) {
            console.warn('⚠️ Webhook rechazado: Firma de Zadarma inválida.');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 3. Parsear el body (Zadarma lo manda como Form Data URL-encoded)
        const params = new URLSearchParams(rawBody);
        const event = params.get('event');
        
        // Datos comunes en casi todos los eventos
        const callerId = params.get('caller_id'); // Número del cliente
        const calledNumber = params.get('called_did'); // Tu número de Coyote (+52...)
        const callId = params.get('call_id'); // ID único de la llamada

        // 4. Enrutador de Eventos (Switch)
        switch (event) {
            case 'NOTIFY_START':
                // Entró una llamada o empezó a sonar.
                // Ideal para: Mostrar un popup en la pantalla del agente en el CRM ("Llamada entrante de: 55...")
                console.log(`[ZADARMA] 📞 Llamada entrante de ${callerId} hacia ${calledNumber}`);
                // TODO: Tu lógica de base de datos aquí (crear registro de llamada)
                break;

            case 'NOTIFY_INTERNAL':
                // La centralita ya contestó y lo está pasando a tu extensión
                console.log(`[ZADARMA] 🔄 Enrutando a extensión interna...`);
                break;

            case 'NOTIFY_END':
                // La llamada terminó.
                const duration = params.get('duration');
                const disposition = params.get('disposition'); // "answered", "cancel", "no answer", "failed"
                console.log(`[ZADARMA] 🛑 Llamada terminada. Estado: ${disposition}, Duración: ${duration}s`);
                // TODO: Actualizar el ticket/registro en la base de datos de tu CRM
                break;

            case 'NOTIFY_RECORD':
                // El audio de la llamada ya está procesado y listo.
                const recordLink = params.get('call_id_with_rec'); // Este ID se usa para descargar el MP3
                console.log(`[ZADARMA] 📼 Grabación lista. ID: ${recordLink}`);
                // TODO: Guardar el enlace o disparar una función que descargue el MP3 y lo suba a tu AWS S3 / Vercel Blob
                break;

            default:
                console.log(`[ZADARMA] Evento desconocido recibido: ${event}`);
                break;
        }

        // 5. Siempre responde 200 OK rápido para que Zadarma no intente reenviar
        return new NextResponse('OK', { status: 200 });

    } catch (error) {
        console.error('[ZADARMA WEBHOOK ERROR]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}