import { NextResponse } from 'next/server';

export async function GET() {
  // 🔑 1. Tu token (Cópialo completo de tu panel, el que empieza con EAAesd)
  const TOKEN = 'EAAesdZBDp9koBQ8ZCjIe3WbdkHmMRHHpd2Mh2dmRFZB09S73A9GZBTp9GVpmKDPyGr4S3sNTBwEl52bM1ANLY9ra5irDxn7ECHPqbXIZAhLAAJVFfcPZBOpbTdmidCKBuJbjR3F5gtqklCoFzkh3O4x6LeKX2XTMGrJnzLGAtZAIZBFiZC7ciVjIdSfRzZAU1ZBFFPPZBoPqeHmBjIZAlfjkX5qttsy7eY0rKyM9oKQ0m47m68K0x9Rp1zzlUa0QO4CnyGDQPJE3oDZA38PVnI44vD5nJG3TSDaZAr4lm3V50laElwZD';
  
  // 📱 2. Tus datos exactos
  const PHONE_NUMBER_ID = '920775764462309'; 
  const NUMERO_DESTINO = '525627301525'; 

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
          body: '🐺 ¡Aullido recibido, CEO! Coyote CRM ahora tiene la capacidad de disparar mensajes desde el código.'
        }
      })
    });

    const data = await response.json();
    return NextResponse.json({ success: true, respuesta_meta: data });
    
  } catch (error) {
    return NextResponse.json({ error: 'Fallo al enviar' }, { status: 500 });
  }
}