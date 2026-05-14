"use client";

import { useState, useTransition } from "react";
import { PipelineStatus } from "@prisma/client";
import { moveDealAction } from "@/app/actions/deals";
import { Plus, ChevronRight, ChevronLeft, Trophy, XCircle, TrendingUp, MessageCircle, Target , LucideIcon} from "lucide-react";
import Link from "next/link";
import ModalNuevoDeal from "@/app/crm/admin/leads/_components/ModalNuevoDeal";

// ðŸ”¥ IMPORTACIONES PARA EL DRAG & DROP
import { DndContext, DragEndEvent, closestCorners, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

// â”€â”€ TYPES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ STAGES CONFIG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STAGES: {
  status: PipelineStatus;
  label:  string;
  accent: string;
  border: string;
  icon: LucideIcon;
}[] = [
  { status: "PROSPECTO",       label: "Prospecto",   accent: "text-zinc-400",    border: "border-zinc-700",    icon: Target        },
  { status: "COTIZANDO",       label: "Cotizando",   accent: "text-sky-400",     border: "border-sky-800",     icon: MessageCircle },
  { status: "NEGOCIACION",     label: "NegociaciÃ³n", accent: "text-amber-400",  border: "border-amber-800",   icon: TrendingUp    },
  { status: "CERRADO_GANADO",  label: "âœ“ Ganado",    accent: "text-emerald-400",border: "border-emerald-800", icon: Trophy        },
  { status: "CERRADO_PERDIDO", label: "Perdido",     accent: "text-red-400",    border: "border-red-900",     icon: XCircle       },
];

// â”€â”€ BOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // ðŸ”¥ LÃ“GICA DE DRAG & DROP
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return; // Se soltÃ³ en el vacÃ­o

    const dealId = String(active.id);
    const toStatus = String(over.id) as PipelineStatus;

    // Buscamos en quÃ© columna estaba originalmente
    let fromStatus: PipelineStatus | null = null;
    for (const status of Object.keys(columns) as PipelineStatus[]) {
      if (columns[status].some(d => d.id === dealId)) {
        fromStatus = status;
        break;
      }
    }

    if (!fromStatus || fromStatus === toStatus) return;

    handleMove(dealId, fromStatus, toStatus);
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

      {/* ðŸ”¥ ENVOLVEMOS EL TABLERO EN EL CONTEXTO DND */}
      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto min-h-0">
          <div className="flex gap-3 h-full min-w-[960px] pb-4">
            {STAGES.map((stage, idx) => (
              <DroppableColumn 
                key={stage.status}
                stage={stage}
                idx={idx}
                deals={columns[stage.status]}
                handleMove={handleMove}
              />
            ))}
          </div>
        </div>
      </DndContext>

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

// â”€â”€ DROPPABLE COLUMN (NUEVO COMPONENTE) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DroppableColumn({ stage, idx, deals, handleMove }: { stage: typeof STAGES[0], idx: number, deals: DealRow[], handleMove: any }) {
  const Icon = stage.icon;
  const total = deals.reduce((s, d) => s + d.value, 0);

  // ðŸ”¥ Hook para que la columna acepte tarjetas
  const { isOver, setNodeRef } = useDroppable({ id: stage.status });

  return (
    <div 
      ref={setNodeRef} // Inyectamos la referencia droppable
      className={`flex flex-col flex-1 rounded-xl border transition-colors ${stage.border} ${isOver ? 'bg-zinc-900/80' : 'bg-zinc-950/50'} min-w-[180px]`}
    >
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
          <p className="text-[9px] text-zinc-700 text-center uppercase tracking-widest pt-8 pointer-events-none">VacÃ­o</p>
        )}
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            onMoveLeft={idx > 0 ? () => handleMove(deal.id, deal.status, STAGES[idx - 1].status) : undefined}
            onMoveRight={idx < STAGES.length - 1 ? () => handleMove(deal.id, deal.status, STAGES[idx + 1].status) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// â”€â”€ DEAL CARD (ACTUALIZADA CON DRAG) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DealCard({
  deal, onMoveLeft, onMoveRight,
}: {
  deal:        DealRow;
  onMoveLeft?:  () => void;
  onMoveRight?: () => void;
}) {
  const initials = deal.employee.name
    .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  // ðŸ”¥ Hook para que la tarjeta se pueda arrastrar
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1, // Efecto fantasma al arrastrar
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef} // Inyectamos la ref
      style={style}
      {...listeners} // Escucha el click/arrastre
      {...attributes} // Atributos de accesibilidad
      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg p-3 group transition-all cursor-grab active:cursor-grabbing relative"
    >
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
          ðŸ“¦ {deal.product.title}{deal.quantity ? ` Â· ${deal.quantity}` : ""}{deal.color ? ` Â· ${deal.color}` : ""}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-[#FDCB02] text-black text-[8px] font-black flex items-center justify-center shrink-0">
            {initials}
          </div>
          <span className="text-[9px] text-zinc-500 truncate max-w-[65px]">{deal.employee.name}</span>
        </div>

        {/* Mantenemos los botones, pero les detenemos la propagaciÃ³n para que no interfieran con el drag */}
        <div 
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onPointerDown={(e) => e.stopPropagation()} // ðŸ”¥ EVITA QUE ARRASTRE AL DAR CLIC EN BOTONES
        >
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
