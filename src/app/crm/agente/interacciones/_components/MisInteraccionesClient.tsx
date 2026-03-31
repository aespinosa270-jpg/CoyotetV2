"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search, PhoneOutgoing, MessageSquare,
  Mail, Users, Calendar, ChevronDown,
} from "lucide-react";
import { InteractionType } from "@prisma/client";

type Interaction = {
  id:             string;
  type:           InteractionType;
  summary:        string;
  date:           string;
  nextFollowUp:   string | null;
  user:           { id: string; name: string; email: string } | null;
};

const TYPE_CFG: Record<InteractionType, {
  label: string;
  icon:  React.ReactNode;
  cls:   string;
  dot:   string;
}> = {
  LLAMADA:    {
    label: "Llamada",
    icon:  <PhoneOutgoing size={13} />,
    cls:   "bg-yellow-500/10 text-yellow-400 border-yellow-800",
    dot:   "bg-yellow-400",
  },
  WHATSAPP:   {
    label: "WhatsApp",
    icon:  <MessageSquare size={13} />,
    cls:   "bg-emerald-500/10 text-emerald-400 border-emerald-800",
    dot:   "bg-emerald-400",
  },
  CORREO:     {
    label: "Correo",
    icon:  <Mail size={13} />,
    cls:   "bg-sky-500/10 text-sky-400 border-sky-800",
    dot:   "bg-sky-400",
  },
  PRESENCIAL: {
    label: "Presencial",
    icon:  <Users size={13} />,
    cls:   "bg-violet-500/10 text-violet-400 border-violet-800",
    dot:   "bg-violet-400",
  },
};

const ALL_TYPES = Object.keys(TYPE_CFG) as InteractionType[];

export default function MisInteraccionesClient({
  interactions,
  porTipo,
}: {
  interactions: Interaction[];
  porTipo:      Record<string, number>;
}) {
  const [search,     setSearch]     = useState("");
  const [filterType, setFilterType] = useState<InteractionType | "TODOS">("TODOS");
  const [expanded,   setExpanded]   = useState<string | null>(null);

  const filtered = interactions.filter((i) => {
    const matchSearch =
      (i.user?.name  ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (i.user?.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (i.summary || "").toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "TODOS" || i.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] border border-white/[0.03] rounded-3xl overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.04] shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente o resumen..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#FDCB02]/40 transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setFilterType("TODOS")}
            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
              filterType === "TODOS"
                ? "bg-[#FDCB02] text-black border-[#FDCB02]"
                : "text-zinc-600 border-zinc-800 hover:text-zinc-400"
            }`}
          >
            Todos <span className="ml-1 opacity-60">{interactions.length}</span>
          </button>
          {ALL_TYPES.map((t) => {
            const cnt = porTipo[t] ?? 0;
            if (cnt === 0) return null;
            const cfg = TYPE_CFG[t];
            return (
              <button key={t} onClick={() => setFilterType(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                  filterType === t ? cfg.cls : "text-zinc-600 border-zinc-800 hover:text-zinc-400"
                }`}
              >
                {cfg.icon} {cfg.label}
                <span className="opacity-60">{cnt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/[0.03] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[10px] text-zinc-700 uppercase tracking-widest">Sin interacciones</p>
          </div>
        ) : (
          filtered.map((i, idx) => {
            const cfg      = TYPE_CFG[i.type];
            const isOpen   = expanded === i.id;
            const hasSummary = i.summary && i.summary.length > 0;

            return (
              <motion.div key={i.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : i.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-white/[0.01] transition-colors text-left group"
                >
                  {/* Tipo icon */}
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${cfg.cls}`}>
                    {cfg.icon}
                  </div>

                  {/* Cliente */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">
                        {i.user?.name ?? i.user?.email ?? "Cliente"}
                      </p>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-widest ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </div>
                    {hasSummary && (
                      <p className="text-[10px] text-zinc-500 italic truncate mt-0.5">
                        {i.summary}
                      </p>
                    )}
                  </div>

                  {/* Fecha + follow-up */}
                  <div className="text-right shrink-0 mr-2">
                    <p className="text-[10px] font-mono text-zinc-500">
                      {new Date(i.date).toLocaleDateString("es-MX", {
                        day: "2-digit", month: "short",
                      })}
                    </p>
                    {i.nextFollowUp && (
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <Calendar size={9} className="text-sky-500" />
                        <p className="text-[9px] font-mono text-sky-400">
                          {new Date(i.nextFollowUp).toLocaleDateString("es-MX", {
                            day: "2-digit", month: "short",
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  <ChevronDown size={13} className={`text-zinc-700 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Expanded */}
                <motion.div
                  initial={false}
                  animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-4 pl-20">
                    <div className="bg-zinc-900/60 border border-white/[0.04] rounded-xl p-4 space-y-3">
                      {hasSummary ? (
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Resumen</p>
                          <p className="text-xs text-zinc-300 leading-relaxed">{i.summary}</p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-zinc-700 italic">Sin resumen registrado</p>
                      )}
                      {i.nextFollowUp && (
                        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
                          <Calendar size={11} className="text-sky-400 shrink-0" />
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-sky-400">Follow-Up</p>
                            <p className="text-[10px] font-mono text-zinc-400">
                              {new Date(i.nextFollowUp).toLocaleDateString("es-MX", {
                                weekday: "long", day: "2-digit", month: "long",
                              })}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
                        <p className="text-[9px] text-zinc-700 font-mono">
                          {new Date(i.date).toLocaleString("es-MX", {
                            day: "2-digit", month: "short",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}