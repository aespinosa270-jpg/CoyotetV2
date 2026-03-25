import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ConfiguracionClient from "./_components/ConfiguracionClient";

export default async function ConfiguracionPage() {
  const session = await auth();

  // Cargar datos reales del empleado en sesión
  const employee = session?.user?.id
    ? await prisma.employee.findUnique({
        where:  { id: session.user.id },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      })
    : null;

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      <div className="shrink-0">
        <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">CRM / Sistema</p>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
          CONFIGURACIÓN <span className="text-[#FDCB02]">DEL SISTEMA</span>
        </h1>
      </div>
      <ConfiguracionClient employee={employee} />
    </div>
  );
}