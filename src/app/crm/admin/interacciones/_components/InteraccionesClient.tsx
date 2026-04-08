"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Filter, PhoneIncoming, PhoneOutgoing,
  Mail, MessageSquare, Users, Calendar,
  Clock, ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { InteractionType, PipelineStatus } from "@prisma/client";

type Interaction = {
  id:             string;
  type:           InteractionType;
  summary:        string;
  date:           string;
  nextFollowUp:   string | null;
  pipelineStatus: PipelineStatus | null;
  // 🔥 FIX 1: Le avisamos a TypeScript que el empleado puede no existir (ser nulo)
  employee:       { id: string; name: string } | null;
  user:           { id: string; name: string; email: string };
};

const TYPE_CFG: Record<InteractionType, {
  label: string;
  icon:  React.ElementType;
  cls:   string;
}> = {
  LLAMADA:    { label: "Llamada",    icon: PhoneOutgoing, cls: "bg-[#FDCB02]/10 text-[#FDCB02] border-[#FDCB02]/20"  },
  WHATSAPP:   { label: "WhatsApp",   icon: MessageSquare, cls: "bg-emerald-500/10 text-emerald-400 border-emerald-800" },
  CORREO:     { label: "Correo",     icon: Mail,          cls: "bg-blue-500/10 text-blue-400 border-blue-800"          },
  PRESENCIAL: { label: "Presencial", icon: Users,         cls: "bg-purple-500/10 text-purple-400 border-purple-800"   },
};

const PIPELINE_CLS: Partial<Record<PipelineStatus, string>> = {
  PROSPECTO:       "text-slate-400",
  COTIZANDO:       "text-sky-400",
  NEGOCIACION:     "text-amber-400",
  CERRADO_GANADO:  "text-emerald-400",
  CERRADO_PERDIDO: "text-red-400",
};

const PIPELINE_LABEL: Partial<Record<PipelineStatus, string>> = {
  PROSPECTO:       "Prospecto",
  COTIZANDO:       "Cotizando",
  NEGOCIACION:     "Negociación",
  CERRADO_GANADO:  "Ganado",
  CERRADO_PERDIDO: "Perdido",
};

const ALL_TYPES = ["TODOS", "LLAMADA", "WHATSAPP", "CORREO", "PRESENCIAL"] as const;

export default function InteraccionesClient({
  interactions,
}: {
  interactions: Interaction[];
}) {
  const [search,   setSearch]   = useState("");
  const [typeFilt, setTypeFilt] = useState<"TODOS" | InteractionType>("TODOS");

  const lista    = interactions ?? [];
  const filtered = lista.filter((i) => {
    // 🔥 FIX 2: Validamos con `?.` que el empleado exista antes de buscar en su nombre
    const matchSearch =
      i.user.name?.toLowerCase().includes(search.toLowerCase())     ||
      i.employee?.name.toLowerCase().includes(search.toLowerCase()) ||
      i.summary.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilt === "TODOS" || i.type === typeFilt;
    return matchSearch && matchType;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0 gap-4">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por agente, cliente o resumen..."
            className="bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-xs w-80 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#FDCB02] transition-all"
          />
        </div>

        {/* Filtro por tipo */}
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-zinc-600" />
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilt(t)}
              className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${
                typeFilt === t
                  ? "bg-[#FDCB02] text-black border-[#FDCB02]"
                  : "text-zinc-600 border-zinc-800 hover:border-zinc-600"
              }`}
            >
              {t === "TODOS" ? "Todos" : TYPE_CFG[t as InteractionType].label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0a0a0a] z-10">
            <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">Agente</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Resumen</th>
              <th className="px-6 py-4">Pipeline</th>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Follow-Up</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[10px] text-zinc-700 uppercase tracking-widest">
                  Sin interacciones registradas
                </td>
              </tr>
            )}
            {filtered.map((item, idx) => {
              const cfg = TYPE_CFG[item.type];
              const Icon = cfg.icon;
              return (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="hover:bg-white/[0.01] transition-colors group"
                >
                  {/* Tipo */}
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest ${cfg.cls}`}>
                      <Icon size={10} />
                      {cfg.label}
                    </div>
                  </td>

                  {/* 🔥 FIX 3: Agente (Con fallback visual si el empleado es null) */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded ${item.employee ? 'bg-[#FDCB02] text-black' : 'bg-purple-900/40 text-purple-400 border border-purple-800/50'} text-[8px] font-black flex items-center justify-center shrink-0`}>
                        {item.employee 
                          ? item.employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                          : "🤖"
                        }
                      </div>
                      <span className={`text-[10px] truncate max-w-[80px] ${item.employee ? 'text-zinc-400' : 'text-purple-400 font-bold tracking-widest'}`}>
                        {item.employee ? item.employee.name : "SISTEMA"}
                      </span>
                    </div>
                  </td>

                  {/* Cliente */}
                  <td className="px-6 py-4">
                    <Link href={`/crm/admin/clientes/${item.user.id}`} className="group/link block">
                      <p className="text-xs font-bold text-zinc-200 flex items-center gap-1 group-hover/link:text-white">
                        {item.user.name}
                        <ArrowUpRight size={10} className="opacity-0 group-hover/link:opacity-100 transition-opacity text-zinc-600" />
                      </p>
                      <p className="text-[10px] text-zinc-600 truncate max-w-[120px]">{item.user.email}</p>
                    </Link>
                  </td>

                  {/* Resumen */}
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-xs text-zinc-400 line-clamp-2 italic">
                      {item.summary || <span className="text-zinc-700">Sin resumen</span>}
                    </p>
                  </td>

                  {/* Pipeline status */}
                  <td className="px-6 py-4">
                    {item.pipelineStatus ? (
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${PIPELINE_CLS[item.pipelineStatus]}`}>
                        {PIPELINE_LABEL[item.pipelineStatus]}
                      </span>
                    ) : (
                      <span className="text-zinc-700 text-[9px]">—</span>
                    )}
                  </td>

                  {/* Fecha */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-zinc-600">
                      <Calendar size={10} />
                      <span className="text-[10px] font-mono">
                        {new Date(item.date).toLocaleDateString("es-MX", {
                          day: "2-digit", month: "short",
                        })}
                      </span>
                    </div>
                    <p className="text-[9px] font-mono text-zinc-700 mt-0.5">
                      {new Date(item.date).toLocaleTimeString("es-MX", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </td>

                  {/* Follow-up */}
                  <td className="px-6 py-4">
                    {item.nextFollowUp ? (
                      <div className="flex items-center gap-1.5">
                        <Clock size={10} className="text-blue-400 shrink-0" />
                        <span className="text-[10px] font-mono text-blue-400">
                          {new Date(item.nextFollowUp).toLocaleDateString("es-MX", {
                            day: "2-digit", month: "short",
                          })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-700 text-[9px]">—</span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}