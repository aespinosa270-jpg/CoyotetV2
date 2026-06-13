/**
 * Dashboard principal del Bot v2 — rediseno oscuro-ambar autocontenido.
 * Mismas queries (getDashboardMetrics, executive, charts). No usa los
 * componentes compartidos MetricCard/ObjecionBar para no afectar /metricas.
 */
import { getDashboardMetrics } from "@/lib/bot/repositories/admin-queries";
import { getExecutiveDashboard, getChartsData } from "@/lib/bot/repositories/executive-dashboard";
import ExecutiveSection from "./_components/ExecutiveSection";
import CommandCharts from "./_components/CommandCharts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BotDashboardPage() {
  const [metrics, exec, charts] = await Promise.all([
    getDashboardMetrics(),
    getExecutiveDashboard().catch((err) => { console.error("Failed exec dashboard:", err); return null; }),
    getChartsData().catch((err) => { console.error("Failed charts:", err); return null; }),
  ]);
  const maxObj = metrics.topObjecionesGlobales[0]?.total ?? 1;
  const tibia = metrics.temperaturaPromedio >= 50;
  const buenaConf = metrics.confianzaPromedio >= 60;

  const segmentos = Object.entries(metrics.clientesPorSegmento).sort(([, a], [, b]) => (b as number) - (a as number));

  return (
    <div className="botdash space-y-6">
      <style>{CSS}</style>

      <header>
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">El Coyote — Bot v2</p>
        <h1 className="text-3xl font-black uppercase tracking-tight text-zinc-900">Dashboard del <span className="text-amber-500">Bot</span></h1>
        <p className="text-sm text-zinc-500 mt-1">Vista general de como esta operando El Coyote.</p>
      </header>

      {/* Cards principales */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi kpi-blue"><p className="kl">Total clientes</p><p className="kv">{metrics.totalClientes}</p></div>
        <div className="kpi kpi-green"><p className="kl">Nuevos ultimos 7 dias</p><p className="kv">{metrics.clientesNuevosUltimos7Dias} {metrics.clientesNuevosUltimos7Dias > 0 && <span className="up">↑</span>}</p></div>
        <div className="kpi kpi-green"><p className="kl">Total pedidos</p><p className="kv">{metrics.totalPedidos}</p></div>
        <div className={`kpi ${tibia ? "kpi-orange" : "kpi-slate"}`}><p className="kl">Temp. compra promedio</p><p className="kv">{metrics.temperaturaPromedio}/100</p><p className="kh">{tibia ? "Cartera tibia 🔥" : "Cartera fria ❄️"}</p></div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribucion por segmento */}
        <section className="card p-5">
          <h2 className="ch">Distribucion por segmento</h2>
          {segmentos.length === 0 ? <p className="text-sm text-zinc-500">Sin datos aun.</p> : (
            <div className="space-y-3">
              {segmentos.map(([seg, count]) => {
                const pct = Math.round(((count as number) / metrics.totalClientes) * 100);
                return (
                  <div key={seg} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-zinc-300 capitalize">{seg}</span>
                    <div className="flex-1 h-5 bg-[#22272f] rounded relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 to-blue-500 rounded" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-16 text-xs text-zinc-400 text-right tabular-nums">{count as number} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Top objeciones */}
        <section className="card p-5">
          <h2 className="ch">Top objeciones de la cartera</h2>
          {metrics.topObjecionesGlobales.length === 0 ? <p className="text-sm text-zinc-500">Sin objeciones acumuladas aun.</p> : (
            <div className="space-y-2.5">
              {metrics.topObjecionesGlobales.map((obj, i) => {
                const w = maxObj > 0 ? Math.min(100, (obj.total / maxObj) * 100) : 0;
                return (
                  <div key={i} className="objrow">
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-sm font-medium text-zinc-100">{obj.label}</span>
                      <span className="text-xs text-zinc-500">{obj.clientesAfectados} {obj.clientesAfectados === 1 ? "cliente" : "clientes"}</span>
                    </div>
                    <div className="relative h-2 bg-[#22272f] rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full" style={{ width: `${w}%` }} />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">Peso acumulado: {obj.total.toFixed(1)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Salud de la cartera */}
      <section className="card p-5">
        <h2 className="ch">Salud de la cartera</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className={`kpi ${buenaConf ? "kpi-green" : "kpi-orange"}`}>
            <p className="kl">Confianza promedio</p><p className="kv">{metrics.confianzaPromedio}/100</p>
            <p className="kh">{buenaConf ? "El bot esta convirtiendo bien" : "Cartera con poca confianza historica"}</p>
          </div>
          <div className={`kpi ${tibia ? "kpi-orange" : "kpi-slate"}`}>
            <p className="kl">Temperatura promedio</p><p className="kv">{metrics.temperaturaPromedio}/100</p>
          </div>
        </div>
      </section>

      {exec && <ExecutiveSection data={exec} />}
      {charts && <CommandCharts data={charts} />}
    </div>
  );
}

const CSS = `
.botdash .card{background:#15181d;border:1px solid #2c323b;border-radius:16px;color:#eef1f5}
.botdash .ch{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#aab2bd;margin-bottom:16px}
.botdash .kpi{border-radius:16px;padding:18px 20px;border:1px solid #2c323b;background:#15181d}
.botdash .kpi .kl{font-size:11px;text-transform:uppercase;letter-spacing:.5px;font-weight:700;color:#6b7480}
.botdash .kpi .kv{font-family:'Space Grotesk',monospace;font-size:30px;font-weight:700;margin-top:10px;line-height:1;color:#eef1f5}
.botdash .kpi .kh{font-size:12px;color:#6b7480;margin-top:7px;font-weight:500}
.botdash .kpi .up{color:#34d399;font-size:18px}
.botdash .kpi-blue{background:linear-gradient(135deg,rgba(91,157,255,.12),transparent),#15181d;border-color:rgba(91,157,255,.3)}
.botdash .kpi-blue .kv{color:#5b9dff}
.botdash .kpi-green{background:linear-gradient(135deg,rgba(52,211,153,.13),transparent),#15181d;border-color:rgba(52,211,153,.3)}
.botdash .kpi-green .kv{color:#34d399}
.botdash .kpi-orange{background:linear-gradient(135deg,rgba(251,146,60,.13),transparent),#15181d;border-color:rgba(251,146,60,.3)}
.botdash .kpi-orange .kv{color:#fb923c}
.botdash .kpi-slate .kv{color:#eef1f5}
.botdash .objrow{border:1px solid #2c323b;border-radius:12px;padding:12px 14px;transition:.12s}
.botdash .objrow:hover{border-color:rgba(245,166,35,.35);background:#1c2026}
`;
