import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Inicializamos Resend con tu variable de entorno
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razonSocial, rfc, cp, regimen, pedido, email } = body;

    // 1. CORREO PARA EL CLIENTE (Confirmación Institucional)
    const emailCliente = await resend.emails.send({
      from: 'COYOTE TEXTIL <facturacion@huup.com.mx>', // Cambia el dominio por el tuyo verificado en Resend
      to: [email],
      subject: `[COYOTE TEXTIL] Solicitud de Factura Recibida - Pedido ${pedido}`,
      html: `
        <div style="background-color: #050505; color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; border: 1px solid #222; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #FDCB02; text-transform: uppercase; font-style: italic; letter-spacing: -1px; margin-bottom: 5px;">COYOTE TEXTIL</h1>
          <h2 style="text-transform: uppercase; font-size: 11px; letter-spacing: 3px; color: #666; margin-top: 0; border-bottom: 1px solid #222; padding-bottom: 20px;">Departamento Fiscal</h2>
          
          <p style="font-size: 14px; margin-top: 30px;">Estimado Socio: <strong style="color: #FDCB02;">${razonSocial}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6;">Hemos recibido correctamente tu información fiscal correspondiente al pedido <strong>${pedido}</strong>.</p>
          
          <div style="background-color: #111; padding: 20px; border-left: 4px solid #FDCB02; margin: 30px 0;">
            <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">
              Tu CFDI 4.0 y el archivo XML serán procesados y enviados a este correo electrónico en un lapso máximo de 24 horas hábiles.
            </p>
          </div>
          
          <p style="font-size: 10px; color: #555; text-transform: uppercase; margin-top: 40px; border-top: 1px solid #222; padding-top: 20px;">
            Este es un mensaje automatizado del sistema de Coyote Textil. Por favor no responda a esta dirección.
          </p>
        </div>
      `
    });

    // 2. CORREO INTERNO PARA TI (Datos crudos para timbrar)
    const emailAdmin = await resend.emails.send({
      from: 'SISTEMA COYOTE <facturacion@huup.com.mx>',
      to: ['tu-correo-admin@huup.com.mx'], // Pon aquí tu correo o el del contador
      subject: `⚡ TIMBRAR FACTURA: ${pedido} - ${razonSocial}`,
      html: `
        <div style="background-color: #111; color: #fff; font-family: monospace; padding: 20px;">
          <h2 style="color: #FDCB02; text-transform: uppercase;">NUEVA SOLICITUD DE FACTURACIÓN</h2>
          <hr style="border-color: #333;" />
          <ul style="list-style: none; padding: 0; font-size: 16px;">
            <li style="margin-bottom: 10px;"><strong>PEDIDO:</strong> <span style="color: #FDCB02;">${pedido}</span></li>
            <li style="margin-bottom: 10px;"><strong>Razón Social:</strong> ${razonSocial}</li>
            <li style="margin-bottom: 10px;"><strong>RFC:</strong> ${rfc}</li>
            <li style="margin-bottom: 10px;"><strong>C.P.:</strong> ${cp}</li>
            <li style="margin-bottom: 10px;"><strong>Régimen:</strong> ${regimen}</li>
            <li style="margin-bottom: 10px;"><strong>Correo Cliente:</strong> ${email}</li>
          </ul>
          <hr style="border-color: #333;" />
          <p style="color: #888;">Copia y pega estos datos en el portal del SAT. El cliente ya recibió el SLA de 24 hrs.</p>
        </div>
      `
    });

    // Validamos que Resend no haya regresado error
    if (emailCliente.error || emailAdmin.error) {
      console.error("Resend Error:", emailCliente.error || emailAdmin.error);
      return NextResponse.json({ error: 'Fallo al despachar correos' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Operación completada' }, { status: 200 });

  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}