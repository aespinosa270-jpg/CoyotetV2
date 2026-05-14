/**
 * Health del bot v2 — status técnico.
 *
 * Muestra:
 *  - Conectividad a Redis, Supabase pgvector, OpenAI
 *  - Acciones de debugging (limpiar memoria de un cliente, reindexar)
 *
 * Llama al /api/admin/bot/health del lado del cliente para tener latencia
 * de los pings en tiempo real.
 */
import { HealthDashboardClient } from "../_components/HealthDashboardClient";

export const dynamic = "force-dynamic";

export default function HealthPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Estado técnico</h1>
        <p className="text-sm text-slate-500 mt-1">
          Diagnóstico de los servicios del bot y acciones de debugging.
        </p>
      </header>

      <HealthDashboardClient />
    </div>
  );
}
