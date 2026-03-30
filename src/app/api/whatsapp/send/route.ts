import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTrace } from "@/lib/tracer"; // 🕵️‍♂️ EL OJO DE DIOS (Rastreabilidad)

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { conversationId, body, employeeId, isInitial, phone, name } = data;

    // =========================================================================
    // CASO 1: CREAR NUEVA CONVERSACIÓN DESDE EL MODAL
    // =========================================================================
    if (isInitial && !body) {
      let convo = await prisma.waConversation.findUnique({
        where: { contactPhone: phone },
        include: { 
          messages: { orderBy: { sentAt: "desc" }, take: 1 },
          user: true 
        }
      });

      if (!convo) {
        // Creamos la convo desde cero
        convo = await prisma.waConversation.create({
          data: {
            contactPhone: phone,
            contactName: name || "Sin Nombre",
            employeeId: employeeId,
            isOpen: true,
          },
          include: { 
            messages: { orderBy: { sentAt: "desc" }, take: 1 },
            user: true 
          }
        });
      } else {
        // Si ya existía el historial, se lo asignamos al agente humano actual
        convo = await prisma.waConversation.update({
          where: { id: convo.id },
          data: { employeeId: employeeId, isOpen: true },
          include: { 
            messages: { orderBy: { sentAt: "desc" }, take: 1 },
            user: true 
          }
        });
      }

      // Devolvemos el objeto de la conversación para que el frontend lo pinte
      return NextResponse.json(convo);
    }

    // =========================================================================
    // CASO 2: ENVIAR UN MENSAJE REAL HACIA META WHATSAPP
    // =========================================================================
    if (!conversationId || !body) {
      return NextResponse.json({ error: "Faltan datos (conversationId o body)" }, { status: 400 });
    }

    // 1. Buscamos los datos de la conversación
    const convo = await prisma.waConversation.findUnique({
      where: { id: conversationId }
    });

    if (!convo) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    const targetPhone = convo.contactPhone;

    // 2. Si el bot (El Coyote) estaba atendiendo, el humano toma el control absoluto
    if (!convo.employeeId || convo.employeeId !== employeeId) {
      await prisma.waConversation.update({
        where: { id: conversationId },
        data: { employeeId: employeeId }
      });
    }

    // 🛡️ LIMPIADOR AGRESIVO DE NÚMEROS (MATA EL 521 DE LOS CHATS VIEJOS)
    let cleanPhone = targetPhone.replace(/\D/g, ''); // Quita espacios, símbolos, etc.
    
    // Si empieza con 521 y tiene 13 dígitos, le quitamos el '1'
    if (cleanPhone.startsWith("521") && cleanPhone.length === 13) {
      cleanPhone = cleanPhone.replace(/^521/, "52");
    } 
    // Si el agente puso solo 10 dígitos, le agregamos el 52
    else if (cleanPhone.length === 10) {
      cleanPhone = "52" + cleanPhone;
    }

    console.log(`📞 [DEBUG] Teléfono DB: ${targetPhone} -> Limpiado para Meta: ${cleanPhone}`);

    // 3. Disparar el mensaje a la API de Meta Cloud usando el número limpio
    const TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

    const metaResponse = await fetch(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanPhone, // <--- AQUÍ SE USA EL NÚMERO YA PURIFICADO
          type: "text",
          text: {
            preview_url: false,
            body: body, 
          },
        }),
      }
    );

    const metaData = await metaResponse.json();

    // Si Meta lo rechaza
    if (!metaResponse.ok) {
      console.error("❌ Error de Meta enviando WA:", metaData);
      return NextResponse.json({ error: metaData.error?.message || "Error de Meta" }, { status: 400 });
    }

    // 4. Guardar en Supabase (Solo si Meta aceptó y lo envió con éxito)
    const waId = metaData.messages?.[0]?.id || `manual-${Date.now()}`;

    const newMessage = await prisma.waMessage.create({
      data: {
        waId: waId,
        role: "AGENT", 
        body: body,
        conversationId: conversationId,
        isRead: true, 
      },
    });

    // 5. Actualizar el chat principal
    await prisma.waConversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: body,
        lastMessageAt: new Date(),
        unreadCount: 0,
        contactPhone: cleanPhone // <--- ACTUALIZAMOS EL NÚMERO EN LA DB PARA EL FUTURO
      },
    });

    // 🕵️‍♂️ 6. RASTREABILIDAD ENTERPRISE: Dejar el Trace inborrable del Agente
    await createTrace({
      employeeId: employeeId,
      phone: cleanPhone,
      type: "WHATSAPP",
      summary: `Mensaje saliente: ${body.substring(0, 50)}...`,
      content: { messageId: waId, fullBody: body, mediaUrl: null },
      actionName: "ENVIO_WHATSAPP_AGENTE"
    });

    // Le regresamos el mensaje confirmado al frontend
    return NextResponse.json(newMessage);

  } catch (error: any) {
    console.error("❌ Error crítico en send/route.ts:", error);
    return NextResponse.json({ error: "Error interno del servidor", detalle: error.message }, { status: 500 });
  }
}