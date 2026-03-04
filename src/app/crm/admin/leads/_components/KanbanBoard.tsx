"use client";

import { useState, useTransition } from "react";
import { PipelineStatus } from "@prisma/client";
import { moveDealAction } from "@/app/actions/deals";
import { Plus, ChevronRight, ChevronLeft, Trophy, XCircle, TrendingUp, MessageCircle, Target } from "lucide-react";
import Link from "next/link";
import ModalNuevoDeal from "@/app/crm/admin/leads/_components/ModalNuevoDeal";

// ── TYPES ─────────────────────────────────────────────────────────────────────

export type DealRow = {
  id: string; title: string; company: string; value: number;
  color?: string | null; quantity?: number | null; status: PipelineStatus;
  updatedAt: Date;
  employee: { id: string; name: string };
  product:  { id: string; title: string; sku: string } | null;
  user:     { id: string; name: string | null; email: string } | null;
};

export type Agent   = { id: string; name: string; role: string };
export type Product = { id: string; title: string; sku: string; unit: string; priceMayoreo: number };

type Columns = Record<PipelineStatus, DealRow[]>;

// ── STAGES CONFIG ─────────────────────────────────────────────────────────────

const STAGES: {
  status: PipelineStatus;
  label:  string;
  accent: string;
  border: string;
  icon:   React.ElementType;
}[] = [
  { status: "PROSPECTO",       label: "Prospecto",   accent: "text-zinc-400",   border: "border-zinc-700",    icon: Target        },
  { status: "COTIZANDO",       label: "Cotizando",   accent: "text-sky-400",    border: "border-sky-800",     icon: MessageCircle },
  { status: "NEGOCIACION",     label: "Negociación", accent: "text-amber-400",  border: "border-amber-800",   icon: TrendingUp    },
  { status: "CERRADO_GANADO",  label: "✓ Ganado",    accent: "text-emerald-400",border: "border-emerald-800", icon: Trophy        },
  { status: "CERRADO_PERDIDO", label: "Perdido",     accent: "text-red-400",    border: "border-red-900",     icon: XCircle       },
];

// ── BOARD ─────────────────────────────────────────────────────────────────────

export default function KanbanBoard({
  initialColumns, agents, products,
}: {
  initialColumns: Columns;
  agents:   Agent[];
  products: Product[];
}) {
  const [columns,   setColumns]   = useState<Columns>(initialColumns);
  const [showModal, setShowModal] = useState(false);
  const [, startTransition]       = useTransition();

  const handleMove = (dealId: string, from: PipelineStatus, to: PipelineStatus) => {
    setColumns((prev) => {
      const deal = prev[from].find((d) => d.id === dealId);
      if (!deal) return prev;
      return {
        ...prev,
        [from]: prev[from].filter((d) => d.id !== dealId),
        [to]:   [{ ...deal, status: to }, ...prev[to]],
      };
    });
    startTransition(() => { moveDealAction(dealId, to); });
  };

  const handleCreated = (deal: DealRow) => {
    setColumns((prev) => ({ ...prev, PROSPECTO: [deal, ...prev.PROSPECTO] }));
    setShowModal(false);
  };

  return (
    <>
      <div className="shrink-0 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FDCB02] text-black text-xs font-[900] uppercase tracking-widest hover:bg-yellow-300 transition-colors rounded-lg"
        >
          <Plus size={14} /> Nuevo Deal
        </button>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto min-h-0">
        <div className="flex gap-3 h-full min-w-[960px] pb-4">
          {STAGES.map((stage, idx) => {
            const Icon   = stage.icon;
            const deals  = columns[stage.status];
            const total  = deals.reduce((s, d) => s + d.value, 0);

            return (
              <div key={stage.status} className={`flex flex-col flex-1 rounded-xl border ${stage.border} bg-zinc-950/50 min-w-[180px]`}>
                {/* Column header */}
                <div className="px-3 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
                  <span className={`flex items-center gap-1.5 text-[10px] font-[900] uppercase tracking-widest ${stage.accent}`}>
                    <Icon size={12} /> {stage.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-zinc-600 font-mono">${(total/1000).toFixed(0)}k</span>
                    <span className="bg-zinc-800 text-zinc-400 text-[9px] font-black px-1.5 py-0.5 rounded">{deals.length}</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {deals.length === 0 && (
                    <p className="text-[9px] text-zinc-700 text-center uppercase tracking-widest pt-8">Vacío</p>
                  )}
                  {deals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      stageIdx={idx}
                      onMoveLeft={idx > 0
                        ? () => handleMove(deal.id, deal.status, STAGES[idx - 1].status)
                        : undefined}
                      onMoveRight={idx < STAGES.length - 1
                        ? () => handleMove(deal.id, deal.status, STAGES[idx + 1].status)
                        : undefined}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <ModalNuevoDeal
          agents={agents}
          products={products}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}

// ── DEAL CARD ─────────────────────────────────────────────────────────────────

function DealCard({
  deal, stageIdx, onMoveLeft, onMoveRight,
}: {
  deal:        DealRow;
  stageIdx:    number;
  onMoveLeft?:  () => void;
  onMoveRight?: () => void;
}) {
  const initials = deal.employee.name
    .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-3 group transition-all cursor-default">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <p className="text-[9px] text-zinc-500 uppercase tracking-widest truncate">{deal.company}</p>
          <p className="text-xs font-bold text-white truncate leading-snug">{deal.title}</p>
        </div>
        <span className="text-xs font-[900] text-[#FDCB02] shrink-0 tabular-nums">
          ${deal.value.toLocaleString("es-MX")}
        </span>
      </div>

      {deal.product && (
        <p className="text-[9px] text-zinc-600 truncate mb-2">
          📦 {deal.product.title}{deal.quantity ? ` · ${deal.quantity}` : ""}{deal.color ? ` · ${deal.color}` : ""}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-[#FDCB02] text-black text-[8px] font-black flex items-center justify-center shrink-0">
            {initials}
          </div>
          <span className="text-[9px] text-zinc-500 truncate max-w-[65px]">{deal.employee.name}</span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onMoveLeft && (
            <button onClick={onMoveLeft}
              className="w-5 h-5 bg-zinc-800 hover:bg-zinc-700 rounded flex items-center justify-center transition-colors">
              <ChevronLeft size={10} className="text-zinc-400" />
            </button>
          )}
          <Link href={`/crm/admin/leads/${deal.id}`}
            className="w-5 h-5 bg-zinc-800 hover:bg-[#FDCB02] hover:text-black rounded flex items-center justify-center transition-colors">
            <ChevronRight size={10} className="text-zinc-400" />
          </Link>
          {onMoveRight && (
            <button onClick={onMoveRight}
              className="w-5 h-5 bg-zinc-800 hover:bg-zinc-700 rounded flex items-center justify-center transition-colors">
              <ChevronRight size={10} className="text-zinc-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}