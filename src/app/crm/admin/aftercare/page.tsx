import { Suspense } from "react";
import AftercareClient from "./_components/AftercareClient";

export const dynamic = "force-dynamic";

export default function AftercarePage() {
  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <header className="mb-6 flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💝</span>
          <h1 className="text-2xl font-bold text-neutral-900">
            Aftercare — Cuidado post-venta
          </h1>
        </div>
        <p className="text-sm text-neutral-600">
          Check D+7 (entrega) y re-engagement D+30. Construye Trust Score
          y convierte clientes en fans.
        </p>
      </header>
      <Suspense fallback={<div className="p-8 text-center text-neutral-500">Cargando…</div>}>
        <AftercareClient />
      </Suspense>
    </div>
  );
}