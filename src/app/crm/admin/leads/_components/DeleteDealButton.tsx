"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDealAction } from "@/app/actions/deals";
import { Trash2, Loader2 } from "lucide-react";

export default function DeleteDealButton({ dealId }: { dealId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (!confirm("¿Eliminar este deal? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      await deleteDealAction(dealId);
      router.push("/crm/admin/leads");
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 border border-red-900/60 hover:bg-red-950 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all disabled:opacity-40"
    >
      {isPending
        ? <Loader2 size={12} className="animate-spin" />
        : <Trash2   size={12} />}
      Eliminar
    </button>
  );
}