import { Suspense } from "react";
import SalesAgentTable from "./_components/SalesAgentTable";

export const dynamic = "force-dynamic";

export default function SalesAgentPage() {
  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <header className="mb-6 flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🐺</span>
          <h1 className="text-2xl font-bold text-neutral-900">
            CRM Sales Agent — Reactivación de fríos
          </h1>
        </div>
        <p className="text-sm text-neutral-600">
          Contactos enriquecidos con perfil IA del bot V2. Reactivación
          estratégica + asignación a la jauría.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-neutral-500">
            Cargando contactos…
          </div>
        }
      >
        <SalesAgentTable />
      </Suspense>
    </div>
  );
}