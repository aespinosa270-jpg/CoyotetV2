import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase"; 

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const conversationId = formData.get("conversationId") as string;
    const employeeId = formData.get("employeeId") as string;

    if (!file || !conversationId) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // 1. Obtener el teléfono y limpiarlo (La regla de oro del "521")
    const convo = await prisma.waConversation.findUnique({ where: { id: conversationId } });
    if (!convo) return NextResponse.json({ error: "Chat no encontrado" }, { status: 404 });

    let cleanPhone = convo.contactPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith("521") && cleanPhone.length === 13) {
      cleanPhone = cleanPhone.replace(/^521/, "52");
    } else if (cleanPhone.length === 10) {
      cleanPhone = "52" + cleanPhone;
    }

    // 2. Subir el archivo a Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Sacamos la extensión (ej. png, pdf, mp3)
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("whatsapp_media")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Error Supabase: ${uploadError.message}`);
    }

    // 3. Obtener URL pública directa de tu cubeta de Supabase
    const { data: publicUrlData } = supabase.storage.from("whatsapp_media").getPublicUrl(fileName);
    const mediaUrl = publicUrlData.publicUrl;

    // 4. Determinar tipo de archivo para Meta (image, audio, document)
    let metaType = "document";
    if (file.type.startsWith("image/")) metaType = "image";
    else if (file.type.startsWith("audio/")) metaType = "audio";
    else if (file.type.startsWith("video/")) metaType = "video";

    // 5. Disparar el mensaje a la API de Meta Cloud
    const TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

    const payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: metaType,
      // Meta exige que la llave se llame "image", "audio" o "document" según el tipo
      [metaType]: { link: mediaUrl } 
    };

    const metaResponse = await fetch(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const metaData = await metaResponse.json();
    
    if (!metaResponse.ok) {
      console.error("❌ Error enviando media a Meta:", metaData);
      return NextResponse.json({ error: "Error enviando archivo a WhatsApp", detalle: metaData }, { status: 400 });
    }

    // 6. Guardar en Prisma para que se pinte en tu historial del CRM
    const waId = metaData.messages?.[0]?.id || `media-${Date.now()}`;
    const newMessage = await prisma.waMessage.create({
      data: {
        waId: waId,
        role: "AGENT", 
        body: file.name, // Guardamos el nombre original como "texto"
        mediaUrl: mediaUrl,
        mediaType: metaType,
        conversationId: conversationId,
        isRead: true, 
      },
    });

    // 7. Actualizar el último mensaje de la conversación
    await prisma.waConversation.update({
      where: { id: conversationId },
      data: { 
        lastMessage: metaType === "image" ? "📸 Imagen" : metaType === "audio" ? "🎙️ Audio" : "📎 Documento", 
        lastMessageAt: new Date(), 
        employeeId: employeeId 
      }
    });

    return NextResponse.json(newMessage);

  } catch (error: any) {
    console.error("❌ Error en send-media/route.ts:", error);
    return NextResponse.json({ error: "Error interno del servidor", detalle: error.message }, { status: 500 });
  }
}