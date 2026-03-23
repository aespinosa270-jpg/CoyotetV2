"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/crm/admin/tickets/abiertos",   label: "Abiertos",   activeColor: "text-red-400    border-red-500"      },
  { href: "/crm/admin/tickets/pendientes", label: "En Revisión",activeColor: "text-amber-400  border-amber-400"    },
  { href: "/crm/admin/tickets/cerrados",   label: "Cerrados",   activeColor: "text-emerald-400 border-emerald-500" },
];

// Tipado completo alineado con getTicketKPIs()
type KPIs = { 
  abiertos: number; 
  pendientes: number; 
  resueltos: number; 
  criticos: number;
  avgHours?: string;
};

export default function TicketsNav({ kpis }: { kpis: KPIs }) {
  const path    = usePathname();
  const counts: Record<string, number> = {
    "/crm/admin/tickets/abiertos":   kpis.abiertos,
    "/crm/admin/tickets/pendientes": kpis.pendientes,
    "/crm/admin/tickets/cerrados":   kpis.resueltos,
  };

  return (
    <div className="flex items-center gap-1 border-b border-white/5 shrink-0 bg-[#0a0a0a]">
      {TABS.map((tab) => {
        const isActive = path.startsWith(tab.href);
        const isAbiertos = tab.href.includes("abiertos");
        const hasCriticos = isAbiertos && kpis.criticos > 0;

        return (
          <Link key={tab.href} href={tab.href}
            className={`relative flex items-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
              isActive ? tab.activeColor : "text-zinc-600 border-transparent hover:text-zinc-400"
            }`}
          >
            {tab.label}
            
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
              isActive ? "bg-white/10" : "bg-zinc-900 text-zinc-600"
            }`}>
              {counts[tab.href] ?? 0}
            </span>

            {/* 🔥 Indicador de urgencia si hay tickets críticos */}
            {hasCriticos && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}