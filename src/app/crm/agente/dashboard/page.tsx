import { prisma } from "@/lib/prisma";
import { getAgentDashboardData } from "@/app/actions/agentPortal";
import AgenteDashboardClient from "./_components/AgenteDashboardClient";
import { AlertCircle } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AgenteDashboardPage() {
  // ⚠️ ALAN: Aquí debes meter el ID de tu sesión real (NextAuth, Clerk, etc.)
  // EJEMPLO: const session = await getSession(); const agentId = session.user.id;
  
  // Para que el copy-paste funcione AHORITA, agarramos al primer agente de ventas:
  const tempAgent = await prisma.employee.findFirst({
    where: { isActive: true }
  });

  if (!tempAgent) {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center p-8 font-mono">
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl flex items-center gap-4">
          <AlertCircle size={24} />
          <div>
            <h2 className="font-black uppercase tracking-widest text-sm">Error de Acceso</h2>
            <p className="text-xs mt-1">No hay agentes activos en la base de datos para mostrar el dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  const data = await getAgentDashboardData(tempAgent.id);

  if (!data) return <div className="text-white">Error cargando datos...</div>;

  return (
    <div className="h-full min-h-screen bg-[#050505] text-white p-4 md:p-8 font-mono">
      <AgenteDashboardClient data={data} />
    </div>
  );
}