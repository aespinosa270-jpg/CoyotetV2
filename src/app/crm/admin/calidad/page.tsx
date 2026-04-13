import { getQualityMetrics } from "./actions";
import QualityDashboardClient from "./_components/QualityDashboardClient";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function QualityMonitorPage() {
  const { data, success } = await getQualityMetrics();

  if (!success || !data) {
    redirect("/crm/admin");
  }

  // Serialización para el Client Component
  const serializedData = {
    ranking: data.ranking,
    flags: data.flags.map(flag => ({
      ...flag,
      timestamp: flag.timestamp.toISOString(),
      metadata: flag.metadata ? JSON.parse(JSON.stringify(flag.metadata)) : {}
    }))
  };

  return (
    <div className="p-6 md:p-8 w-full max-w-[1600px] mx-auto">
      
      {/* ─── HEADER COYOTE ADMIN (Adaptado a tu captura) ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <p className="text-[10px] tracking-widest text-gray-500 uppercase font-bold mb-1">
            CRM / AUDITORÍA QA
          </p>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic flex items-center gap-2">
            <span className="text-black">MONITOR</span>
            <span className="text-[#FDCB02]">CALIDAD IA</span>
          </h1>
        </div>
        
        {/* Badge derecho estilo captura */}
        <div className="bg-[#FFF8D6] border border-[#FDCB02] text-[#B28D00] px-4 py-2 rounded font-black text-xs uppercase tracking-widest">
          INFRACCIONES: {serializedData.flags.length}
        </div>
      </div>

      {/* ─── CONTENIDO PRINCIPAL ─── */}
      <QualityDashboardClient data={serializedData} />
      
    </div>
  );
}