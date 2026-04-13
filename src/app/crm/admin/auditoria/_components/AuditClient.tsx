"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ShieldCheck, Clock, User, Activity, Filter } from "lucide-react";

type AuditLog = {
  id: string;
  timestamp: string;
  action: string;
  resourceId: string | null;
  ipAddress: string | null;
  metadata: Record<string, any> | null;
  employee: { name: string; role: string; email: string } | null;
};

export default function AuditClient({ initialLogs }: { initialLogs: AuditLog[] }) {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("TODAS");

  const uniqueActions = Array.from(new Set(initialLogs.map(log => log.action)));

  const filteredLogs = initialLogs.filter(log => {
    const matchSearch = 
      (log.employee?.name.toLowerCase().includes(search.toLowerCase())) ||
      (log.action.toLowerCase().includes(search.toLowerCase())) ||
      (log.metadata?.summary?.toLowerCase().includes(search.toLowerCase()));
      
    const matchFilter = filterAction === "TODAS" || log.action === filterAction;
    
    return matchSearch && matchFilter;
  });

  const getBadgeColor = (action: string) => {
    if (action.includes("CREATE") || action.includes("ENTRADA") || action.includes("LOGIN")) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (action.includes("UPDATE") || action.includes("AJUSTE") || action.includes("RESOLVE")) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    if (action.includes("DELETE") || action.includes("BLOCK") || action.includes("CANCEL") || action.includes("SALIDA")) return "text-red-400 bg-red-500/10 border-red-500/20";
    return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden shadow-2xl">
      
      {/* ─── TOOLBAR ─── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 border-b border-white/[0.04] bg-zinc-950/50 shrink-0">
        <div className="relative w-full md:w-96">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar responsable, acción o detalle..."
            className="w-full bg-[#050505] border border-zinc-800 rounded-full py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 md:pb-0 w-full md:w-auto">
          <Filter size={14} className="text-zinc-600 mr-2 shrink-0" />
          <button 
            onClick={() => setFilterAction("TODAS")}
            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all shrink-0 ${
              filterAction === "TODAS" ? "bg-white text-black border-white" : "text-zinc-500 border-zinc-800 hover:text-zinc-300"
            }`}
          >
            Todas
          </button>
          {uniqueActions.slice(0, 5).map(action => (
            <button 
              key={action}
              onClick={() => setFilterAction(action)}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all shrink-0 ${
                filterAction === action ? "bg-zinc-800 text-white border-zinc-600" : "text-zinc-500 border-zinc-800 hover:text-zinc-300"
              }`}
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TABLA DE AUDITORÍA ─── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-4 mt-20">
            <ShieldCheck size={48} className="opacity-20" />
            <p className="text-[10px] uppercase tracking-widest font-black">No hay registros de auditoría</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0a0a0a] z-10 shadow-md">
              <tr className="border-b border-white/[0.04] text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
                <th className="px-6 py-4">Fecha y Hora</th>
                <th className="px-6 py-4">Responsable</th>
                <th className="px-6 py-4">Acción</th>
                <th className="px-6 py-4 w-1/2">Detalle (Metadata)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredLogs.map((log, idx) => (
                <motion.tr 
                  key={log.id}
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                  className="hover:bg-white/[0.01] transition-colors group items-start"
                >
                  {/* Fecha */}
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-start gap-1.5 text-zinc-500 mt-1">
                      <Clock size={12} className="mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-zinc-300">
                          {new Date(log.timestamp).toLocaleDateString("es-MX", { day: '2-digit', month: 'short' })}
                        </p>
                        <p className="text-[9px] font-mono mt-0.5 text-zinc-500">
                          {new Date(log.timestamp).toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Responsable */}
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-center gap-3">
                      <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-full shrink-0">
                        {log.employee ? <User size={12} className="text-zinc-400" /> : <Activity size={12} className="text-[#FDCB02]" />}
                      </div>
                      <div>
                        {log.employee ? (
                          <>
                            <p className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">
                              {log.employee.name}
                            </p>
                            <p className="text-[9px] text-zinc-600 font-mono uppercase mt-0.5">
                              {log.employee.role}
                            </p>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#FDCB02]">
                            🤖 SISTEMA
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Acción */}
                  <td className="px-6 py-4 align-top">
                    <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border mt-1 ${getBadgeColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>

                  {/* Detalle (El Chisme) */}
                  <td className="px-6 py-4 align-top">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-zinc-300 font-bold truncate max-w-md" title={log.metadata?.summary || ""}>
                        {log.metadata?.summary || (log.resourceId ? `Recurso afectado: ${log.resourceId}` : "Sin resumen")}
                      </p>
                      
                      {/* JSON Viewer */}
                      <div className="bg-[#050505] border border-white/5 text-emerald-500/80 p-3 rounded-xl text-[10px] overflow-x-auto max-h-32 custom-scrollbar shadow-inner">
                        <pre className="font-mono leading-relaxed">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </td>

                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}} />
    </div>
  );
}