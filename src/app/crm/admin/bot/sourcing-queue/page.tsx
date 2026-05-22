import { Suspense } from "react";
import SourcingQueueClient from "./_components/SourcingQueueClient";

export const dynamic = "force-dynamic";

export default function SourcingQueuePage() {
  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <header className="mb-6 flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔧</span>
          <h1 className="text-2xl font-bold text-neutral-900">
            Cola de Sourcing — Pedidos &gt; 1 tonelada
          </h1>
        </div>
        <p className="text-sm text-neutral-600">
          Operativo interno (invisible al cliente). Resuelve los pedidos grandes
          que el bot prometió con &quot;timing al cierre&quot;.
        </p>
      </header>

      <Suspense fallback={
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-neutral-500">
          Cargando cola…
        </div>
      }>
        <SourcingQueueClient />
      </Suspense>
    </div>
  );
}