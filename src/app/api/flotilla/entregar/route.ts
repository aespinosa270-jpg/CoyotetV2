import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

// ─── HELPER: Subida de Evidencia a Supabase ──────────────────────────────────
async function subirFoto(base64: string, prefix: string): Promise<string | null> {
  try {
    // Limpiamos el prefijo del base64 para obtener el buffer puro
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `${prefix}-${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from('evidencias')
      .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: true });

    if (error) { 
      console.error('❌ Error al subir a Supabase:', error); 
      return null; 
    }

    const { data: { publicUrl } } = supabase.storage
      .from('evidencias')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (err) {
    console.error('❌ Error interno en subirFoto:', err);
    return null;
  }
}

// ─── HELPER: Notificación por WhatsApp (No Bloqueante) ───────────────────────
async function enviarWhatsApp(
  telefono: string | null | undefined,
  nombre: string | null | undefined,
  folioId: string,
  fotoUrl: string
) {
  try {
    const cleanPhone = telefono?.replace(/\D/g, '');
    
    if (!cleanPhone || !process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
      console.log('⚠️ WhatsApp omitido (falta teléfono o credenciales de entorno)');
      return;
    }

    // Formateo de lada MX si es necesario
    const waPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
    
    await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: waPhone,
        type: 'text',
        text: {
          preview_url: true,
          body: `🐺 *¡Hola ${nombre ?? 'Cliente'}!*\n\nTu entrega ha sido completada exitosamente. 🚚💨\n\n📸 *Evidencia fotográfica:*\n${fotoUrl}\n\n¡Gracias por confiar en la red logística de Coyote Textil!`,
        },
      }),
    });
    
    console.log(`💬 WhatsApp enviado exitosamente → ${waPhone}`);
  } catch (err) {
    // Si WhatsApp falla, solo logueamos. NO bloqueamos la entrega del chofer.
    console.error('⚠️ Error en módulo WhatsApp:', err);
  }
}

// ─── CONTROLADOR PRINCIPAL: Recepción de Entrega ─────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderId,
      tags,                 // Array: [{ itemId, qtyDelivered }] (Los oficiales)
      extraTags,            // Array: [{ tag, qtyDelivered, description }] (Los creados en ruta)
      fotos,                // Array: string[] (Base64)
      signatureOrigin,      // String: Base64
      signatureDestination, // String: Base64
      issueNote,            // String | null
      finalStatus,          // Enum: 'COMPLETADA' | 'CANCELADA'
      lat,                  // Float
      lng,                  // Float
    } = body;

    // 1. Validaciones Críticas Iniciales
    if (!orderId || !finalStatus) {
      return NextResponse.json({ success: false, error: 'Falta orderId o finalStatus en el payload.' }, { status: 400 });
    }

    console.log(`🐺 [COYOTE OS] Procesando Orden: ${orderId} → Estatus: ${finalStatus}`);

    const orden = await prisma.routeOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!orden) {
      return NextResponse.json({ success: false, error: 'Orden no encontrada en la base de datos.' }, { status: 404 });
    }

    if (orden.status !== 'EN_CAMINO') {
      return NextResponse.json(
        { success: false, error: `Estado operativo inválido: ${orden.status}. La orden debe estar EN_CAMINO para cerrarse.` },
        { status: 400 }
      );
    }

    // 2. Auditoría de Trazabilidad Exigida
    if (finalStatus === 'COMPLETADA' && !signatureDestination) {
      return NextResponse.json(
        { success: false, error: 'AUDITORÍA: La firma de conformidad del destinatario es obligatoria.' },
        { status: 422 }
      );
    }

    // El delta se calcula si un tag oficial no cuadra, O SI HAY extraTags.
    const hasDelta = (tags?.some((t: { itemId: string; qtyDelivered: number }) => {
      const item = orden.items.find((i) => i.id === t.itemId);
      return item && item.qtyDispatched !== t.qtyDelivered;
    }) ?? false) || (extraTags?.length > 0);

    if (hasDelta && !issueNote) {
      return NextResponse.json(
        { success: false, error: 'CRITICAL_AUDIT: Diferencia de mercancía o carga no registrada detectada. Se exige nota de impedimento.' },
        { status: 422 }
      );
    }

    if (finalStatus === 'CANCELADA' && !issueNote) {
      return NextResponse.json(
        { success: false, error: 'AUDITORÍA: Es obligatorio documentar el motivo de la cancelación.' },
        { status: 422 }
      );
    }

    // 3. Procesamiento en la Nube (Evidencias)
    const fotosUrls: string[] = [];
    if (fotos?.length > 0) {
      for (const [idx, b64] of fotos.entries()) {
        const url = await subirFoto(b64, `evidencia-${orderId}-${idx}`);
        if (url) fotosUrls.push(url);
      }
    }
    
    console.log(`📸 Evidencias procesadas: ${fotosUrls.length}`);
    if (lat && lng) console.log(`📍 Coordenadas de cierre: ${lat}, ${lng}`);

    // 4. Conciliación de Mercancía Oficial (Tags existentes)
    if (tags?.length > 0) {
      await Promise.all(
        tags.map((t: { itemId: string; qtyDelivered: number }) =>
          prisma.routeOrderItem.update({
            where: { id: t.itemId },
            data: { qtyDelivered: t.qtyDelivered },
          })
        )
      );
    }

    // 4.5 🔥 INYECCIÓN DE CARGA EXTRA (Tags creados en la calle)
    if (extraTags?.length > 0) {
      console.log(`📦 Creando ${extraTags.length} bultos no registrados en sistema...`);
      await Promise.all(
        extraTags.map((et: { tag: string; qtyDelivered: number; description: string }) =>
          prisma.routeOrderItem.create({
            data: {
              routeOrderId: orderId,
              tag: et.tag,
              description: et.description,
              qtyDispatched: 0, // 0 porque no se despachó originalmente
              qtyDelivered: et.qtyDelivered,
            }
          })
        )
      );
    }

    // 5. Registro de Impedimentos (IssueLog)
    if (issueNote) {
      await prisma.issueLog.create({
        data: { 
          routeOrderId: orderId, 
          note: issueNote, 
          hasDelta 
        },
      });
      console.log(`⚠️ Registro táctico de impedimento creado (Delta: ${hasDelta})`);
    }

    // 6. Cierre Oficial de la Operación
    const ordenFinalizada = await prisma.routeOrder.update({
      where: { id: orderId },
      data: {
        status: finalStatus,
        signatureOrigin: signatureOrigin ?? null,
        signatureDestination: signatureDestination ?? null,
        photoDropoff: fotosUrls,
        deliveryLat: lat ? parseFloat(String(lat)) : null,
        deliveryLng: lng ? parseFloat(String(lng)) : null,
        completedAt: new Date(),
      },
    });

    // 7. Notificación al Cliente (Proceso en background)
    if (finalStatus === 'COMPLETADA' && fotosUrls.length > 0) {
      await enviarWhatsApp(orden.contactPhone, orden.contactName, orderId, fotosUrls[0]);
    }

    return NextResponse.json({ 
      success: true, 
      orden: ordenFinalizada, 
      fotosSubidas: fotosUrls.length, 
      hasDelta 
    });

  } catch (error: any) {
    console.error('❌ Error crítico en /api/flotilla/entregar:', error);
    return NextResponse.json(
      { success: false, error: error.message ?? 'Error interno del servidor de Coyote OS.' }, 
      { status: 500 }
    );
  }
}