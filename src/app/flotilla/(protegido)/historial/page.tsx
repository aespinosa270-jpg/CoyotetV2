import { prisma } from "@/lib/prisma";
import { CheckCircle2, Calendar, Package, ChevronRight } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function HistorialEntregas() {
  const entregados = await prisma.order.findMany({
    where: { status: 'DELIVERED', logisticsType: 'COYOTE_LOCAL' },
    orderBy: { updatedAt: 'desc' },
    take: 20
  });

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-6 pb-24 font-sans">
      <div className="mb-8">
        <h2 className="text-3xl font-[900] text-black uppercase tracking-tight">Completados</h2>
        <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-1">Últimas 20 entregas con éxito</p>
      </div>

      <div className="space-y-4">
        {entregados.length === 0 ? (
          <div className="bg-white p-10 rounded-[2.5rem] text-center border border-neutral-100 shadow-sm flex flex-col items-center opacity-60">
            <Package size={40} className="text-neutral-300 mb-3" />
            <p className="text-neutral-500 font-[900] text-sm uppercase tracking-widest">Sin registros</p>
          </div>
        ) : (
          entregados.map((orden) => (
            <div key={orden.id} className="bg-white p-5 rounded-[2rem] border border-neutral-100 shadow-sm flex items-center justify-between active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shadow-inner">
                  <CheckCircle2 size={24} />
                </div>
                <div className="flex flex-col">
                  <h4 className="text-sm font-[900] text-black uppercase truncate max-w-[160px] leading-none mb-1.5">{orden.customerName}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-bold uppercase tracking-tighter">
                    <Calendar size={10} /> {new Date(orden.updatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <span className="text-[10px] font-mono font-bold text-neutral-300">#{orden.id.slice(-6).toUpperCase()}</span>
                <div className="bg-green-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Éxito</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}