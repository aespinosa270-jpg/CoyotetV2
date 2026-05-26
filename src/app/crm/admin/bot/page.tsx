/**
 * Dashboard principal del Bot v2.
 *
 * Métricas en cards, top objeciones, distribución de segmentos.
 * Todo se calcula leyendo del Redis (Upstash) en cada render.
 */
import { getDashboardMetrics } from "@/lib/bot/repositories/admin-queries";
import { getExecutiveDashboard, getChartsData } from "@/lib/bot/repositories/executive-dashboard";
import ExecutiveSection from "./_components/ExecutiveSection";
import CommandCharts from "./_components/CommandCharts";
import { MetricCard } from "./_components/MetricCard";
import { ObjecionBar } from "./_components/ObjecionBar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BotDashboardPage() {
  const [metrics, exec, charts] = await Promise.all([
    getDashboardMetrics(),
    getExecutiveDashboard().catch((err) => {
      console.error("Failed to load executive dashboard:", err);
      return null;
    }),
    getChartsData().catch((err) => {
      console.error("Failed to load charts data:", err);
      return null;
    }),
  ]);
  const maxObj =
    metrics.topObjecionesGlobales[0]?.total ?? 1;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard del Bot</h1>
        <p className="text-sm text-slate-500 mt-1">
          Vista general de cómo está operando El Coyote.
        </p>
      </header>

      {/* Cards principales */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total clientes"
          value={metrics.totalClientes}
          accent="blue"
        />
        <MetricCard
          label="Nuevos últimos 7 días"
          value={metrics.clientesNuevosUltimos7Dias}
          accent="green"
          trend={metrics.clientesNuevosUltimos7Dias > 0 ? "up" : "neutral"}
        />
        <MetricCard
          label="Total pedidos"
          value={metrics.totalPedidos}
          accent="green"
        />
        <MetricCard
          label="Temp. compra promedio"
          value={`${metrics.temperaturaPromedio}/100`}
          hint={
            metrics.temperaturaPromedio >= 50
              ? "Cartera tibia 🔥"
              : "Cartera fría ❄️"
          }
          accent={metrics.temperaturaPromedio >= 50 ? "orange" : "slate"}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por segmento */}
        <section className="bg-white border border-slate-200 rounded-md p-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Distribución por segmento
          </h2>
          {Object.keys(metrics.clientesPorSegmento).length === 0 ? (
            <p className="text-sm text-slate-500">Sin datos aún.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(metrics.clientesPorSegmento)
                .sort(([, a], [, b]) => b - a)
                .map(([seg, count]) => {
                  const pct = Math.round((count / metrics.totalClientes) * 100);
                  return (
                    <div key={seg} className="flex items-center gap-3">
                      <span className="w-24 text-sm text-slate-700 capitalize">
                        {seg}
                      </span>
                      <div className="flex-1 h-5 bg-slate-100 rounded relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-blue-500 rounded"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-16 text-xs text-slate-600 text-right tabular-nums">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        {/* Top objeciones */}
        <section className="bg-white border border-slate-200 rounded-md p-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Top objeciones de la cartera
          </h2>
          {metrics.topObjecionesGlobales.length === 0 ? (
            <p className="text-sm text-slate-500">
              Sin objeciones acumuladas aún.
            </p>
          ) : (
            <div className="space-y-2">
              {metrics.topObjecionesGlobales.map((obj, i) => (
                <ObjecionBar
                  key={i}
                  label={obj.label}
                  total={obj.total}
                  clientesAfectados={obj.clientesAfectados}
                  maxTotal={maxObj}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Confianza promedio */}
      <section className="bg-white border border-slate-200 rounded-md p-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Salud de la cartera
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            label="Confianza promedio"
            value={`${metrics.confianzaPromedio}/100`}
            hint={
              metrics.confianzaPromedio >= 60
                ? "El bot está convirtiendo bien"
                : "Cartera con poca confianza histórica"
            }
            accent={metrics.confianzaPromedio >= 60 ? "green" : "orange"}
          />
          <MetricCard
            label="Temperatura promedio"
            value={`${metrics.temperaturaPromedio}/100`}
            accent={metrics.temperaturaPromedio >= 50 ? "orange" : "slate"}
          />
        </div>
      </section>

      {/* ════ EXECUTIVE OVERVIEW ════ */}
      {exec && <ExecutiveSection data={exec} />}
      {charts && <CommandCharts data={charts} />}
    </div>
  );
}
