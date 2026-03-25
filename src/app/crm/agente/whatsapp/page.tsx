import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import WhatsappClient from "./_components/WhatsappClient";
import { auth } from "@/auth";

async function getMisConversaciones(employeeId: string) {
  const conversaciones = await prisma.waConversation.findMany({
    where:   { employeeId },
    include: {
      user:     { select: { id: true, name: true, email: true, phone: true } },
      messages: { orderBy: { sentAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return conversaciones.map((c) => ({
    ...c,
    createdAt:     c.createdAt.toISOString(),
    updatedAt:     c.updatedAt.toISOString(),
    lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
    messages:      c.messages.map((m) => ({
      ...m,
      sentAt: m.sentAt.toISOString(),
    })),
    user: c.user
      ? { ...c.user, name: c.user.name ?? c.user.email }
      : null,
  }));
}

export default async function WhatsappPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, name: true },
  });
  if (!employee) redirect("/login");

  const conversaciones = await getMisConversaciones(employee.id);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 mb-4">
        <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">Mi CRM / Mensajería</p>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
          WhatsApp <span className="text-emerald-400">Business</span>
        </h1>
      </div>
      <WhatsappClient
        conversaciones={conversaciones}
        employeeId={employee.id}
        employeeName={employee.name}
      />
    </div>
  );
}