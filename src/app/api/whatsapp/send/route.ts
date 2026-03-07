import { NextResponse } from 'next/server';

export async function GET() {
  // 🔑 1. Tomamos las llaves maestras desde tu .env (Seguridad al 100%)
  const TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  // 📱 2. Tu número de destino para la prueba
  const NUMERO_DESTINO = '525627301525'; 

  // Validamos que el servidor sí esté leyendo el .env
  if (!TOKEN || !PHONE_NUMBER_ID) {
    return NextResponse.json(
      { error: 'Faltan variables de entorno (WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID)' }, 
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: NUMERO_DESTINO,
        type: 'text',
        text: {
          preview_url: false,
          body: '🐺 ¡Aullido recibido, Patrón! Las variables de entorno funcionan perfecto. Coyote CRM en línea.'
        }
      })
    });

    const data = await response.json();

    // Si Meta rechaza el mensaje (por ejemplo, el token caducó), te avisará aquí
    if (!response.ok) {
      console.error("❌ Error de Meta:", data);
      return NextResponse.json({ error: 'Fallo al enviar desde Meta', detalles: data }, { status: response.status });
    }

    // Si todo sale bien
    return NextResponse.json({ success: true, respuesta_meta: data });
    
  } catch (error: any) {
    console.error("🔥 Error interno:", error);
    return NextResponse.json({ error: 'Fallo crítico al ejecutar el fetch', detalle: error.message }, { status: 500 });
  }
}