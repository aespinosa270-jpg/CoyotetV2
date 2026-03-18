// src/app/crm/agente/chat/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ChatInterface from "@/components/crm/ChatInterface"
import { MessageSquare } from "lucide-react"

export default async function AgenteChatPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    redirect("/crm/login")
  }

  // Buscamos al agente en la base de datos para saber su ID
  const agent = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!agent) redirect("/crm/login");

  // Traemos las conversaciones (chats) que estén asignadas a un humano (abiertas)
  // Ordenamos para que los que tienen mensajes más recientes salgan hasta arriba.
  const conversations = await prisma.waConversation.findMany({
    where: { 
      isOpen: true 
      // Si tienes muchos agentes, podrías filtrar por: employeeId: agent.id
    },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      // Contamos cuántos mensajes hay del cliente que NO han sido leídos
      _count: {
        select: { 
          messages: { where: { role: 'CLIENT', isRead: false } } 
        }
      }
    }
  });

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6 md:p-12">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-[1000] uppercase tracking-tighter text-white flex items-center gap-4">
            <MessageSquare className="text-[#FDCB02]" size={36}/> Coyote Chat
          </h1>
          <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-2">Módulo de Atención Directa (IA Silenciada)</p>
        </div>

        {/* Instanciamos el cliente visual pasándole los chats encontrados */}
        <ChatInterface initialConversations={conversations} />
      </div>
    </div>
  )
}