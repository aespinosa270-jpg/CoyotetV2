"use server";

import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

// Inicializamos OpenAI de forma segura
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type QualityCheckPayload = {
  sourceId: string;      // ID del WaMessage o TicketMessage
  sourceType: "WHATSAPP" | "TICKET";
  employeeId: string;
  text: string;
};

// Interfaz para la respuesta de la IA
interface IAEvaluation {
  isFlagged: boolean;
  reason: string;
  category: "LENGUAJE" | "PROMESA_FALSA" | "DESCUENTO_NO_AUTORIZADO" | "OK";
}

export async function evaluateInteractionQuality({ 
  sourceId, 
  sourceType, 
  employeeId, 
  text 
}: QualityCheckPayload) {
  
  // Si el texto está vacío, no perdemos dinero en la API
  if (!text || text.trim().length < 2) return { success: false, error: "Texto insuficiente" };

  try {
    // 1. El System Prompt: Configuración del Auditor
    const systemPrompt = `
      Eres el Auditor Jefe de Calidad de Coyote Textil (CRM Logístico).
      Analiza el mensaje enviado por un agente y detecta infracciones.

      INFRACCIONES:
      1. "LENGUAJE": Groserías, insultos, tono pasivo-agresivo o excesivamente informal.
      2. "PROMESA_FALSA": Prometer tiempos exactos (ej. "llega en 5 min") o cosas fuera de control.
      3. "DESCUENTO_NO_AUTORIZADO": Ofrecer reembolsos o productos gratis sin permiso previo.

      REGLA: Si el mensaje es profesional, ayuda al cliente o es una disculpa válida, marca como OK.

      Responde ÚNICAMENTE con este formato JSON:
      {
        "isFlagged": boolean,
        "reason": "Explicación breve",
        "category": "LENGUAJE" | "PROMESA_FALSA" | "DESCUENTO_NO_AUTORIZADO" | "OK"
      }
    `;

    // 2. Llamada a OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Mensaje del agente: "${text}"` }
      ],
      temperature: 0, // Máxima consistencia
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) throw new Error("No hubo respuesta de OpenAI");

    const evaluation = JSON.parse(responseContent) as IAEvaluation;

    // 3. Lógica de Auditoría en Base de Datos
    // Solo creamos log si hay infracción real
    if (evaluation.isFlagged && evaluation.category !== "OK") {
      await prisma.auditLog.create({
        data: {
          employeeId: employeeId,
          action: "FLAG_CALIDAD", // Asegúrate de que este String/Enum sea válido en tu Prisma
          resourceId: `${sourceType}_${sourceId}`,
          ipAddress: "AI_MONITOR_SYSTEM",
          metadata: {
            summary: `Infracción: ${evaluation.category}`,
            aiReason: evaluation.reason,
            originalText: text,
            severity: evaluation.category === "LENGUAJE" ? "CRITICAL" : "HIGH",
            timestamp: new Date().toISOString()
          }
        }
      });

      console.warn(`🚩 [ALERTA] Infracción de calidad detectada en Agente ${employeeId}`);
    }

    return { success: true, evaluation };

  } catch (error) {
    console.error("🚨 Error en qualityMonitor:", error);
    // Retornamos success false pero con error manejado para no romper el chat/ticket
    return { success: false, error: "Servicio de auditoría no disponible" };
  }
}