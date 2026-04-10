// src/lib/crm-router.ts
import { prisma } from "@/lib/prisma"

export interface RoutingDecision {
  action: "ROUTE_TO_AGENT" | "ROUTE_TO_AI_BOT" | "ROUTE_TO_IVR"
  agentId?: string         // El ID del agente elegido
  conversationId?: string  // Si ya existía un chat abierto
  reason: string
}

// 🧠 ALGORITMO: Buscar al agente humano con menos chats abiertos
async function getLeastBusyAgent() {
  const agents = await prisma.employee.findMany({
    where: { role: "VENDEDORA" }, // 💡 Asegúrate de usar un rol que exista en tu EmployeeRole
    select: {
      id: true,
      _count: {
        select: { 
          // Contamos cuántas conversaciones tienen la bandera isOpen en true
          waConversations: { where: { isOpen: true } } 
        }
      }
    }
  });

  if (!agents || agents.length === 0) return null;

  // Ordenamos de menor a mayor carga de trabajo
  agents.sort((a, b) => a._count.waConversations - b._count.waConversations);
  
  // Retornamos al agente más libre (el primero de la lista)
  return agents[0];
}

export async function determineRouting(phone: string, channel: "WHATSAPP" | "CALL"): Promise<RoutingDecision> {
  const cleanPhone = phone.replace(/\D/g, ''); 

  // ─── 1. REGLA DE RETENCIÓN: ¿Ya está hablando con un humano? ───
  if (channel === "WHATSAPP") {
    const activeConvo = await prisma.waConversation.findFirst({
      where: { contactPhone: cleanPhone, isOpen: true },
      orderBy: { updatedAt: 'desc' }
    });

    if (activeConvo) {
      return {
        // 🔥 FIX: Cambiamos ROUTE_TO_AGENT por ROUTE_TO_AI_BOT. 
        // El bot siempre entra, pero mantenemos los IDs para no perder el hilo.
        action: "ROUTE_TO_AI_BOT", 
        agentId: activeConvo.employeeId || undefined,
        conversationId: activeConvo.id,
        reason: "El cliente tiene un chat activo con un agente, pero se fuerza la respuesta de la IA."
      };
    }
  }

  // ─── 2. IDENTIFICAR AL CLIENTE ───
  const user = await prisma.user.findFirst({
    where: { phone: { contains: cleanPhone } },
  });

  if (!user) {
    return {
      action: channel === "WHATSAPP" ? "ROUTE_TO_AI_BOT" : "ROUTE_TO_IVR",
      reason: "Prospecto nuevo. Se va a la IA (El Coyote)."
    };
  }

  // ─── 3. TRATO VIP (STRIPE: GOLD, BLACK, ELITE) -> ASIGNACIÓN INTELIGENTE ───
  if (user.membershipTier === "ELITE" || user.membershipTier === "BLACK") {
    const bestAgent = await getLeastBusyAgent();

    if (bestAgent) {
      return {
        // 🔥 FIX: También aquí aseguramos que la IA responda por WhatsApp a los VIP, 
        // aunque por debajo ya le hayamos asignado el agente menos ocupado.
        action: channel === "WHATSAPP" ? "ROUTE_TO_AI_BOT" : "ROUTE_TO_AGENT",
        agentId: bestAgent.id,
        reason: `Socio VIP. Asignado al agente (${bestAgent.id}), pero la IA atiende en WA.`
      };
    }
  }

  // ─── 4. CLIENTE REGULAR ───
  return {
    action: channel === "WHATSAPP" ? "ROUTE_TO_AI_BOT" : "ROUTE_TO_IVR",
    reason: "Cliente regular, lo atiende El Coyote."
  };
}