import { getPayrollData } from "@/app/actions/payroll";
import NominaClient from "./_components/NominaClient";
import { DollarSign, TrendingUp, Award, CalendarDays } from "lucide-react";

export const dynamic = 'force-dynamic';

const fmt = (v: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

export default async function NominaPage() {
  const payrollData = await getPayrollData();

  // KPIs Globales del Mes
  const totalSalesMonth = payrollData.reduce((acc, emp) => acc + emp.totalSales, 0);
  const totalCommissionsMonth = payrollData.reduce((acc, emp) => acc + emp.totalCommission, 0);
  const topPerformer = payrollData[0] || null;

  const currentMonthName = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(new Date());

  return (
    <div className="h-full min-h-screen bg-[#050505] text-white p-8 font-mono flex flex-col gap-8">
      
      {/* ─── HEADER & KPIs ─── */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 border-b border-white/5 pb-6 shrink-0">
        <div>
          <p className="text-[10px] tracking-[0.4em] text-zinc-600 uppercase mb-1 font-black flex items-center gap-2">
            <CalendarDays size={12} className="text-[#FDCB02]" /> 
            Corte: {currentMonthName}
          </p>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-none">
            CÁLCULO DE <span className="text-[#FDCB02]">NÓMINA</span>
          </h1>
        </div>

        <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2 xl:pb-0 w-full xl:w-auto">
          <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl min-w-[150px]">
            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1 flex items-center gap-1.5"><TrendingUp size={12}/> Ventas del Mes</p>
            <p className="text-xl font-black text-white">{fmt(totalSalesMonth)}</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl min-w-[150px]">
            <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mb-1 flex items-center gap-1.5"><DollarSign size={12}/> Total a Pagar</p>
            <p className="text-xl font-black text-emerald-400">{fmt(totalCommissionsMonth)}</p>
          </div>
          {topPerformer && topPerformer.totalSales > 0 && (
            <div className="bg-[#FDCB02]/10 border border-[#FDCB02]/20 p-4 rounded-2xl min-w-[180px]">
              <p className="text-[9px] text-[#FDCB02] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5"><Award size={12}/> Top Performer</p>
              <div className="flex justify-between items-end">
                <p className="text-sm font-black text-white uppercase truncate pr-2">{topPerformer.name.split(' ')[0]}</p>
                <p className="text-lg font-black text-[#FDCB02]">{fmt(topPerformer.totalSales)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── TABLA DE COMISIONES ─── */}
      <div className="flex-1 overflow-hidden">
        <NominaClient initialData={payrollData} />
      </div>

    </div>
  );
}