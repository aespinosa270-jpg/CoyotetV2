import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AuditClient from "./_components/AuditClient";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AuditMonitorPage() {
  // 1. Proteger la página para que solo ADMINS la vean
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/crm"); // Si no es admin, lo mandamos al inicio
  }

  // 2. Traemos los últimos 100 movimientos de la base de datos
  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { timestamp: "desc" },
    include: { 
      employee: {
        select: { name: true, role: true, email: true }
      } 
    }
  });

  // 3. Serializar fechas y metadata para que pasen limpio al Client Component
  const serializedLogs = logs.map((log) => ({
    ...log,
    timestamp: log.timestamp.toISOString(),
    // Aseguramos que metadata sea un objeto pasable al cliente
    metadata: log.metadata ? JSON.parse(JSON.stringify(log.metadata)) : null,
  }));

  return (
    <div className="h-full flex flex-col p-4 md:p-8 bg-[#050505] overflow-hidden font-mono text-white min-h-screen">
      {/* HEADER */}
      <div className="mb-6 shrink-0 flex items-center gap-4">
        <div className="bg-red-500/10 p-3 rounded-2xl border border-red-500/20">
          <ShieldCheck className="text-red-400" size={24} />
        </div>
        <div>
          <p className="text-[10px] tracking-[0.4em] text-red-500/70 uppercase mb-1 font-black">Centro de Seguridad</p>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">
            Monitor de <span className="text-white">Actividad</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Rastreo en tiempo real de las acciones del equipo y del sistema.</p>
        </div>
      </div>

      <AuditClient initialLogs={serializedLogs} />
    </div>
  );
}