/**
 * Página de métricas históricas del Bot v2.
 *
 * Muestra gráficos de barras de 30 días para los eventos clave:
 *  - Mensajes procesados
 *  - Conversiones
 *  - Errores
 *  - Hallucinations cachadas
 *  - Fotos analizadas (vision)
 *  - Objeciones detectadas
 *  - RAG usado
 *
 * Plus: lista de los últimos 20 errores con su contexto (drill-down).
 */
import { getDailyCounts, getRecentEvents } from "@/lib/bot/observability/events";
import { BarChart30d } from "../_components/BarChart30d";
import { MetricCard } from "../_components/MetricCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MetricasPage() {
  // Cargar todos los counts en paralelo
  const [
    messages,
    conversions,
    errors,
    hallucinations,
    vision,
    objections,
    ragUsed,
    recentErrors,
  ] = await Promise.all([
    getDailyCounts("message", 30),
    getDailyCounts("conversion", 30),
    getDailyCounts("error", 30),
    getDailyCounts("hallucination", 30),
    getDailyCounts("vision", 30),
    getDailyCounts("objection", 30),
    getDailyCounts("rag_used", 30),
    getRecentEvents("error", new Date(), 20),
  ]);

  const totals = {
    messages: sum(messages),
    conversions: sum(conversions),
    errors: sum(errors),
    hallucinations: sum(hallucinations),
    vision: sum(vision),
    objections: sum(objections),
    ragUsed: sum(ragUsed),
  };

  const conversionRate =
    totals.messages > 0
      ? Math.round((totals.conversions / totals.messages) * 1000) / 10
      : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          Métricas históricas
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Últimos 30 días. Datos crudos desde Redis. Se renueva al recargar.
        </p>
      </header>

      {/* KPIs principales */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Mensajes (30d)"
          value={totals.messages.toLocaleString("es-MX")}
          accent="blue"
        />
        <MetricCard
          label="Conversiones (30d)"
          value={totals.conversions.toLocaleString("es-MX")}
          hint={
            totals.messages > 0
              ? `Tasa: ${conversionRate}%`
              : undefined
          }
          accent="green"
        />
        <MetricCard
          label="Errores (30d)"
          value={totals.errors.toLocaleString("es-MX")}
          accent={totals.errors === 0 ? "green" : totals.errors > 50 ? "red" : "orange"}
        />
        <MetricCard
          label="Hallucinations cachadas"
          value={totals.hallucinations.toLocaleString("es-MX")}
          hint="Validator anti-invención"
          accent={totals.hallucinations === 0 ? "green" : "orange"}
        />
      </section>

      {/* Gráficos en grid 2x2 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Mensajes por día">
          <BarChart30d data={messages} color="#3b82f6" />
        </ChartCard>

        <ChartCard title="Conversiones por día">
          <BarChart30d data={conversions} color="#10b981" />
        </ChartCard>

        <ChartCard title="Errores por día">
          <BarChart30d data={errors} color="#ef4444" />
        </ChartCard>

        <ChartCard title="Hallucinations cachadas por día">
          <BarChart30d data={hallucinations} color="#f59e0b" />
        </ChartCard>

        <ChartCard title="Fotos analizadas por día (Vision)">
          <BarChart30d data={vision} color="#8b5cf6" />
        </ChartCard>

        <ChartCard title="Objeciones detectadas por día">
          <BarChart30d data={objections} color="#ec4899" />
        </ChartCard>
      </section>

      {/* RAG usage */}
      <section className="bg-white border border-slate-200 rounded-md p-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Uso del RAG vs catálogo completo
        </h2>
        <BarChart30d
          data={ragUsed}
          color="#06b6d4"
          label="Veces que el bot usó RAG (búsqueda semántica)"
          height={100}
        />
        {totals.messages > 0 && (
          <p className="text-xs text-slate-500 mt-2">
            {Math.round((totals.ragUsed / totals.messages) * 100)}% de los
            mensajes usaron RAG en lugar del catálogo completo
          </p>
        )}
      </section>

      {/* Lista de errores recientes */}
      <section className="bg-white border border-slate-200 rounded-md p-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Últimos 20 errores
        </h2>
        {recentErrors.length === 0 ? (
          <p className="text-sm text-emerald-600">
            🎉 Sin errores recientes
          </p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {recentErrors.map((e, i) => (
              <ErrorRow key={i} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function sum(arr: Array<{ count: number }>): number {
  return arr.reduce((acc, d) => acc + d.count, 0);
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-4">
      <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ErrorRow({ event }: { event: any }) {
  const ts = event.ts ? new Date(event.ts) : new Date();
  const message = event.data?.message ?? "(sin mensaje)";
  const source = event.data?.source ?? event.channel ?? "—";

  return (
    <div className="border-b border-slate-100 last:border-0 py-2 flex gap-3 text-xs">
      <span className="text-slate-400 tabular-nums whitespace-nowrap shrink-0">
        {ts.toLocaleString("es-MX", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
      <span className="text-slate-500 shrink-0 w-32 truncate">{source}</span>
      <span className="text-red-700 break-words flex-1">
        {String(message).slice(0, 200)}
      </span>
      {event.clientId && (
        <code className="text-slate-400 shrink-0">
          {String(event.clientId).slice(0, 18)}
        </code>
      )}
    </div>
  );
}
