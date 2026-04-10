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
        orderBy: { sentAt: 'asc' }, 
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return conversations;
}

export default async function InteraccionesPage() {
  const conversations = await getChatData();

  return (
    // Le quitamos márgenes extra para que abarque todo el alto disponible
    <div className="h-full flex flex-col overflow-hidden bg-[#0a0a0a] pb-4">
      {/* Mini-Header discreto para no robar espacio al chat */}
      <div className="flex items-end justify-between shrink-0 mb-3 px-2">
        <div>
          <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">CRM / Centro de Comando</p>
          <h1 className="text-xl font-black uppercase tracking-tighter text-white italic">
            WhatsApp <span className="text-[#FDCB02]">Live</span>
          </h1>
        </div>
      </div>

      <InteraccionesClient initialConversations={conversations} />
    </div>
  );
}