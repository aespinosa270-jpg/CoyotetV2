"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveDealAction, deleteDealAction } from "@/app/actions/deals";
import { PipelineStatus } from "@prisma/client";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";

const STAGES: PipelineStatus[] = [
  "PROSPECTO", "COTIZANDO", "NEGOCIACION", "CERRADO_GANADO", "CERRADO_PERDIDO",
];
const LABELS: Record<PipelineStatus, string> = {
  PROSPECTO: "Prospecto", COTIZANDO: "Cotizando", NEGOCIACION: "Negociación",
  CERRADO_GANADO: "Ganado", CERRADO_PERDIDO: "Perdido",
};

export default function MoverDealButtons({
  dealId, currentStatus,
}: {
  dealId: string;
  currentStatus: PipelineStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const idx = STAGES.indexOf(currentStatus);

  const move = (to: PipelineStatus) => {
    startTransition(async () => {
      await moveDealAction(dealId, to);
      router.refresh();
    });
  };

  const remove = () => {
    if (!confirm("¿Eliminar este deal permanentemente?")) return;
    startTransition(async () => {
      await deleteDealAction(dealId);
      router.push("/crm/admin/leads");
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Mover en el Pipeline</p>
      <div className="flex gap-3">
        {idx > 0 && (
          <button onClick={() => move(STAGES[idx - 1])} disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors disabled:opacity-40">
            <ArrowLeft size={14} /> {LABELS[STAGES[idx - 1]]}
          </button>
        )}
        {idx < STAGES.length - 1 && (
          <button onClick={() => move(STAGES[idx + 1])} disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#FDCB02] text-black text-xs font-[900] uppercase tracking-wider rounded-xl hover:bg-yellow-300 transition-colors disabled:opacity-40">
            {LABELS[STAGES[idx + 1]]} <ArrowRight size={14} />
          </button>
        )}
      </div>
      <button onClick={remove} disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-red-500 hover:bg-red-500/10 border border-red-900 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors disabled:opacity-40">
        <Trash2 size={13} /> Eliminar Deal
      </button>
    </div>
  );
}
