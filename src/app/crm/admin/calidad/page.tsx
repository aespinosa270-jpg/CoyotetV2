import { getQualityMetrics } from "./actions";
import QualityDashboardClient from "./_components/QualityDashboardClient";
import { Stethoscope } from "lucide-react";
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
    <div className="h-full flex flex-col p-4 md:p-8 bg-[#050505] overflow-hidden font-mono text-white min-h-screen">
      <div className="mb-6 shrink-0 flex items-center gap-4">
        <div className="bg-[#FDCB02]/10 p-3 rounded-2xl border border-[#FDCB02]/20">
          <Stethoscope className="text-[#FDCB02]" size={24} />
        </div>
        <div>
          <p className="text-[10px] tracking-[0.4em] text-[#FDCB02]/70 uppercase mb-1 font-black">Quality Assurance</p>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">
            Monitor de <span className="text-white">Calidad (IA)</span>
          </h1>
        </div>
      </div>

      <QualityDashboardClient data={serializedData} />
    </div>
  );
}