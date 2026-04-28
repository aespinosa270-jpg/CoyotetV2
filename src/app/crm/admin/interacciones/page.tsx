import { prisma } from "@/lib/prisma";
import InteraccionesClient from "./_components/InteraccionesClient";

// Forzamos a que esta ruta sea dinámica para que siempre traiga los chats más frescos
export const dynamic = 'force-dynamic';

async function getChatData() {
  const conversations = await prisma.waConversation.findMany({
    include: {
      employee: { select: { id: true, name: true } },
      user: { 
        include: {
          orders: {
            where: { status: { in: ["PENDING", "PROCESSING", "PAID"] } },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      },
      messages: {
        // 1. SOLUCIÓN DATA: Traemos los más recientes primero para no ahogar la base de datos
        orderBy: { sentAt: 'desc' }, 
        // Límite de seguridad. Evita crashear la UI si un cliente tiene miles de mensajes
        take: 100, 
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  // 2. SOLUCIÓN ORDEN: Volteamos el array para que en la UI el scroll 
  // pinte los mensajes cronológicamente (de arriba hacia abajo)
  const formattedConversations = conversations.map(conv => ({
    ...conv,
    messages: conv.messages.reverse()
  }));

  return formattedConversations;
}

export default async function InteraccionesPage() {
  const conversations = await getChatData();

  return (
    // 3. SOLUCIÓN CSS: Cambiamos `h-full` por `h-[calc(100vh-80px)]` o `h-screen`.
    <div className="h-[calc(100vh-80px)] min-h-[600px] flex flex-col overflow-hidden bg-[#0a0a0a] pb-4">
      
      {/* Mini-Header */}
      <div className="flex items-end justify-between shrink-0 mb-3 px-4 pt-4">
        <div>
          <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">CRM / Centro de Comando</p>
          <h1 className="text-xl font-black uppercase tracking-tighter text-white italic">
            WhatsApp <span className="text-[#FDCB02]">Live</span>
          </h1>
        </div>
      </div>

      {/* FIX: Agregamos 'flex w-full h-full' aquí para que el hijo herede las dimensiones */}
      <div className="flex-1 min-h-0 px-2 flex w-full h-full">
        <InteraccionesClient initialConversations={conversations} />
      </div>
    </div>
  );
}