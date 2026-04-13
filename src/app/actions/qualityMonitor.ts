"use server";

import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

// Instanciamos el cliente (automáticamente toma process.env.OPENAI_API_KEY)
const openai = new OpenAI();

type QualityCheckPayload = {
  sourceId: string;      // ID del WaMessage o TicketMessage
  sourceType: "WHATSAPP" | "TICKET";
  employeeId: string;
  text: string;
};

export async function evaluateInteractionQuality({ sourceId, sourceType, employeeId, text }: QualityCheckPayload) {
  try {
    // 1. El System Prompt: Las reglas de oro de tu negocio
    const systemPrompt = `
      Eres el Auditor Jefe de Calidad de un CRM Logístico B2B/B2C.
      Tu trabajo es analizar el mensaje enviado por un agente a un cliente y detectar infracciones estrictas.
      
      INFRACCIONES A DETECTAR:
      1. "LENGUAJE": Uso de groserías, insultos, tono pasivo-agresivo o excesivamente informal/poco profesional.
      2. "PROMESA_FALSA": Prometer tiempos de entrega exactos sin condicionales (ej. "llega en 10 minutos seguro"), o prometer cosas fuera del control logístico.
      3. "DESCUENTO_NO_AUTORIZADO": Ofrecer reembolsos, descuentos o mercancía gratis sin aparente autorización (ej. "te doy 50%", "te lo dejo gratis").

      REGLA: Si el mensaje es normal, de soporte, o una disculpa profesional, no es infracción.

      Debes responder ÚNICAMENTE con un JSON válido usando esta estructura exacta:
      {
        "isFlagged": boolean,
        "reason": "Explicación muy breve de por qué se marcó (o por qué está ok)",
        "category": "LENGUAJE" | "PROMESA_FALSA" | "DESCUENTO_NO_AUTORIZADO" | "OK"
      }
    `;

    // 2. Llamada a OpenAI (Usamos gpt-4o-mini por velocidad/costo, forzando JSON output)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Mensaje del agente: "${text}"` }
      ],
      temperature: 0.1, // Baja temperatura para respuestas consistentes y lógicas
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) return { success: false, error: "OpenAI no respondió" };

    const evaluation = JSON.parse(responseContent);

    // 3. Si la IA detecta una infracción, clavamos el AuditLog
    if (evaluation.isFlagged && evaluation.category !== "OK") {
      await prisma.auditLog.create({
        data: {
          employeeId: employeeId,
          action: "FLAG_CALIDAD", // 🚩 Esta es la etiqueta que brillará en tu monitor
          resourceId: `${sourceType}-${sourceId}`,
          ipAddress: "IA_MONITOR",
          metadata: {
            summary: `Infracción detectada: ${evaluation.category}`,
            aiReason: evaluation.reason,
            originalText: text,
            severity: "HIGH"
          }
        }
      });
      
      // Opcional: Aquí podrías disparar un email al supervisor o un mensaje de Slack/Discord
      console.warn(`🚩 [ALERTA DE CALIDAD] Agente ${employeeId} flageado por: ${evaluation.category}`);
    }

    return { success: true, evaluation };

  } catch (error) {
    console.error("🚨 Error en evaluateInteractionQuality:", error);
    // Retornamos true para no romper el flujo de la app principal si la IA falla
    return { success: false, error: "Falla en el servicio de IA" };
  }
}