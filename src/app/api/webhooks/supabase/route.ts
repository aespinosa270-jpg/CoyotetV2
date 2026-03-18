import { NextResponse } from 'next/server';
import { sendBienvenidaEmail } from '../../../../lib/zeptomail';

export async function POST(req: Request) {
  try {
    // 1. Seguridad: Evitar que alguien externo dispare correos falsos
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Acceso denegado a la bóveda' }, { status: 401 });
    }

    // 2. Extraer la data que nos manda Supabase
    const payload = await req.json();

    // 3. Confirmar que el evento es la creación de un nuevo usuario
    if (payload.type === 'INSERT' && payload.table === 'User') {
      const nuevoUsuario = payload.record;
      
      const email = nuevoUsuario.email;
      const nombre = nuevoUsuario.name || 'Cliente Coyote';

      // 🔥 4. Apretar el gatillo de ZeptoMail
      await sendBienvenidaEmail(email, nombre);
      console.log(`[WEBHOOK] Bienvenida enviada a: ${email}`);
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('[WEBHOOK] Error procesando evento de Supabase:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}