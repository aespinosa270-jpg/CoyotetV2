/**
 * Página de seguimientos (follow-ups automáticos enviados por crons).
 *
 * Muestra:
 *  - KPIs por tipo: enviados / respondidos / convertidos
 *  - Tabla del histórico reciente
 */
import {
  listRecentFollowUps,
  getFollowUpStats,
  type FollowUpTipo,
} from "@/lib/bot/services/followup/followup-repo";
import FollowUpsTable from "./_components/FollowUpsTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TIPO_LABELS: Record<FollowUpTipo, string> = {
  carrito_abandonado: "🛒 Carrito abandonado",
  reactivacion_fria: "❄️ Reactivación fría",
  recompra_predictiva: "🔮 Recompra predictiva",
};

const TIPO_COLORS: Record<FollowUpTipo, string> = {
  carrito_abandonado: "border-orange-300 bg-orange-50",
  reactivacion_fria: "border-cyan-300 bg-cyan-50",
  recompra_predictiva: "border-purple-300 bg-purple-50",
};

export default async function SeguimientosPage() {
  const [records, stats] = await Promise.all([
    listRecentFollowUps(200),
    getFollowUpStats(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">📬 Seguimientos automáticos</h1>
        <p className="text-sm text-slate-500 mt-1">
          Follow-ups enviados por crons. Total: {stats.total}
        </p>
      </header>

      {/* KPIs por tipo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(stats.porTipo) as FollowUpTipo[]).map((tipo) => {
          const t = stats.porTipo[tipo];
          const tasaResp = t.enviados > 0 ? Math.round((t.respondidos / t.enviados) * 100) : 0;
          const tasaConv = t.enviados > 0 ? Math.round((t.convertidos / t.enviados) * 100) : 0;
          return (
            <div
              key={tipo}
              className={`border-2 rounded-md p-4 ${TIPO_COLORS[tipo]}`}
            >
              <h3 className="font-medium text-sm text-slate-700 mb-3">
                {TIPO_LABELS[tipo]}
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Enviados:</span>
                  <span className="font-bold tabular-nums">{t.enviados}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Respondidos:</span>
                  <span className="font-bold tabular-nums">
                    {t.respondidos} ({tasaResp}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Convertidos:</span>
                  <span className="font-bold tabular-nums text-emerald-700">
                    {t.convertidos} ({tasaConv}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla de histórico */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">
          Últimos {records.length} envíos
        </h2>
        <FollowUpsTable records={records} />
      </section>
    </div>
  );
}