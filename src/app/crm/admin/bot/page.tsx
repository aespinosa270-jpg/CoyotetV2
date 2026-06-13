/**
 * Dashboard del Bot — rediseno funcional completo.
 * - KPIs reales clickeables (ventas/pedidos de Prisma + cartera de Redis)
 * - Insight escrito automatico
 * - Objeciones y segmentos clickeables
 * - Layout reorganizado, identidad oscura-ambar autocontenida
 */
import Link from "next/link";
import { getDashboardMetrics } from "@/lib/bot/repositories/admin-queries";
import { getOrderStats } from "@/lib/bot/repositories/order-stats";
import { getExecutiveDashboard, getChartsData } from "@/lib/bot/repositories/executive-dashboard";
import ExecutiveSection from "./_components/ExecutiveSection";
import CommandCharts from "./_components/CommandCharts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const fmt = (n: number) => "$" + n.toLocaleString("es-MX", { maximumFractionDigits: 0 });

export default async function BotDashboardPage() {
  const [metrics, orders, exec, charts] = await Promise.all([
    getDashboardMetrics(),
    getOrderStats(),
    getExecutiveDashboard().catch(() => null),
    getChartsData().catch(() => null),
  ]);

  const maxObj = metrics.topObjecionesGlobales[0]?.total ?? 1;
  const tibia = metrics.temperaturaPromedio >= 50;
  const topObj = metrics.topObjecionesGlobales[0];
  const segmentos = Object.entries(metrics.clientesPorSegmento).sort(([, a], [, b]) => (b as number) - (a as number));

  // Insight escrito automatico
  let insight = "El Coyote esta operando con normalidad.";
  if (orders.montoPorCobrar > 0 && orders.ordenesPendientes > 0) {
    insight = `Tienes ${fmt(orders.montoPorCobrar)} por cobrar en ${orders.ordenesPendientes} ordenes pendientes. Revisa cuales ya se pagaron y marcalas.`;
  } else if (topObj) {
    insight = `Tu objecion #1 es "${topObj.label}" (${topObj.clientesAfectados} clientes). Atacarla destrabaria varias ventas.`;
  }

  return (
    <div className="botdash space-y-6">
      <style>{CSS}</style>

      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">El Coyote — Bot v2</p>
          <h1 className="text-3xl font-black uppercase tracking-tight text-zinc-900">Dashboard del <span className="text-amber-500">Bot</span></h1>
        </div>
        <div className="periodchips">
          <span className="pc on">Resumen</span>
          <Link href="/crm/admin/bot/metricas" className="pc">Metricas a fondo →</Link>
        </div>
      </header>

      {/* INSIGHT del Coyote */}
      <div className="insight">
        <div className="ico">🐺</div>
        <p>{insight}</p>
      </div>

      {/* KPIs REALES clickeables */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/crm/admin/bot/ordenes?status=paid" className="kpi kpi-green">
          <p className="kl">💰 Ventas del bot</p>
          <p className="kv">{fmt(orders.ventasTotales)}</p>
          <p className="kh">{orders.pedidosPagados} pedidos pagados · ver →</p>
        </Link>
        <Link href="/crm/admin/bot/ordenes?status=pending" className="kpi kpi-amber">
          <p className="kl">⏳ Por cobrar</p>
          <p className="kv">{fmt(orders.montoPorCobrar)}</p>
          <p className="kh">{orders.ordenesPendientes} pendientes · revisar →</p>
        </Link>
        <Link href="/crm/admin/pedidos" className="kpi kpi-blue">
          <p className="kl">📦 Pedidos pagados</p>
          <p className="kv">{orders.pedidosPagados}</p>
          <p className="kh">{fmt(orders.ventas7dMonto)} en 7 dias · surtir →</p>
        </Link>
        <Link href="/crm/admin/bot/escalaciones" className="kpi kpi-violet">
          <p className="kl">👥 Clientes</p>
          <p className="kv">{metrics.totalClientes}</p>
          <p className="kh">+{metrics.clientesNuevosUltimos7Dias} esta semana →</p>
        </Link>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Objeciones — clickeables, ocupan mas espacio (son accionables) */}
        <section className="card p-5 lg:col-span-3">
          <h2 className="ch flex items-center justify-between">
            <span>Que frena a tus clientes</span>
            <Link href="/crm/admin/bot/objeciones" className="text-xs text-amber-500 hover:underline normal-case tracking-normal font-medium">Ver todas →</Link>
          </h2>
          {metrics.topObjecionesGlobales.length === 0 ? <p className="text-sm text-zinc-500">Sin objeciones acumuladas aun.</p> : (
            <div className="space-y-2.5">
              {metrics.topObjecionesGlobales.map((obj, i) => {
                const w = maxObj > 0 ? Math.min(100, (obj.total / maxObj) * 100) : 0;
                return (
                  <Link key={i} href="/crm/admin/bot/objeciones" className="objrow">
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-sm font-medium text-zinc-100">{i === 0 ? "🔥 " : ""}{obj.label}</span>
                      <span className="text-xs text-zinc-500">{obj.clientesAfectados} {obj.clientesAfectados === 1 ? "cliente" : "clientes"}</span>
                    </div>
                    <div className="relative h-2.5 bg-[#22272f] rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full" style={{ width: `${w}%` }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Salud de cartera — compacta */}
        <section className="card p-5 lg:col-span-2">
          <h2 className="ch">Salud de la cartera</h2>
          <div className="gauge">
            <div className="ring" style={{ ["--p" as any]: metrics.confianzaPromedio }}>
              <div className="rnum">{metrics.confianzaPromedio}<s>/100</s></div>
            </div>
            <div>
              <p className="text-sm text-zinc-300 leading-relaxed">{metrics.confianzaPromedio >= 60 ? "El bot esta convirtiendo bien." : "Confianza historica baja — cartera fria."}</p>
              <p className="text-xs text-zinc-500 mt-1">Temperatura: {metrics.temperaturaPromedio}/100 {tibia ? "🔥" : "❄️"}</p>
            </div>
          </div>
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2.5">Distribucion por segmento</p>
            <div className="space-y-2">
              {segmentos.map(([seg, count]) => {
                const pct = Math.round(((count as number) / metrics.totalClientes) * 100);
                return (
                  <Link key={seg} href="/crm/admin/bot/contactos" className="flex items-center gap-3 group">
                    <span className="w-20 text-xs text-zinc-400 capitalize group-hover:text-amber-300 transition">{seg}</span>
                    <div className="flex-1 h-4 bg-[#22272f] rounded relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 to-blue-500 rounded" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-14 text-[11px] text-zinc-500 text-right tabular-nums">{pct}%</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {exec && <ExecutiveSection data={exec} />}
      {charts && <CommandCharts data={charts} />}
    </div>
  );
}

const CSS = `
.botdash .card{background:#15181d;border:1px solid #2c323b;border-radius:16px;color:#eef1f5}
.botdash .ch{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#aab2bd;margin-bottom:16px}
.botdash .periodchips{display:flex;gap:8px;align-items:center}
.botdash .pc{font-size:12px;padding:7px 13px;border-radius:9px;border:1px solid #2c323b;background:#15181d;color:#aab2bd;font-weight:600;text-decoration:none}
.botdash .pc.on{background:#f5a623;color:#1a1205;border-color:#f5a623}
.botdash .pc:not(.on):hover{border-color:rgba(245,166,35,.4);color:#fbbf24}
.botdash .insight{display:flex;gap:14px;align-items:center;background:linear-gradient(135deg,rgba(245,166,35,.12),transparent),#15181d;border:1px solid rgba(245,166,35,.28);border-radius:16px;padding:16px 20px}
.botdash .insight .ico{width:42px;height:42px;border-radius:12px;flex:none;background:radial-gradient(circle at 30% 30%,#fbbf24,#f5a623);display:grid;place-items:center;font-size:22px}
.botdash .insight p{font-size:14px;color:#eef1f5;line-height:1.5}
.botdash .kpi{display:block;border-radius:16px;padding:18px 20px;border:1px solid #2c323b;background:#15181d;text-decoration:none;transition:.15s}
.botdash .kpi:hover{transform:translateY(-2px);border-color:rgba(245,166,35,.45)}
.botdash .kpi .kl{font-size:11px;text-transform:uppercase;letter-spacing:.5px;font-weight:700;color:#6b7480}
.botdash .kpi .kv{font-family:'Space Grotesk',monospace;font-size:28px;font-weight:700;margin-top:10px;line-height:1;color:#eef1f5}
.botdash .kpi .kh{font-size:11.5px;color:#6b7480;margin-top:7px;font-weight:500}
.botdash .kpi-green{background:linear-gradient(135deg,rgba(52,211,153,.13),transparent),#15181d;border-color:rgba(52,211,153,.3)}
.botdash .kpi-green .kv{color:#34d399}
.botdash .kpi-amber{background:linear-gradient(135deg,rgba(245,166,35,.14),transparent),#15181d;border-color:rgba(245,166,35,.3)}
.botdash .kpi-amber .kv{color:#fbbf24}
.botdash .kpi-blue{background:linear-gradient(135deg,rgba(91,157,255,.12),transparent),#15181d;border-color:rgba(91,157,255,.3)}
.botdash .kpi-blue .kv{color:#5b9dff}
.botdash .kpi-violet{background:linear-gradient(135deg,rgba(139,124,246,.13),transparent),#15181d;border-color:rgba(139,124,246,.3)}
.botdash .kpi-violet .kv{color:#b794f6}
.botdash .objrow{display:block;border:1px solid #2c323b;border-radius:12px;padding:12px 14px;transition:.12s;text-decoration:none}
.botdash .objrow:hover{border-color:rgba(245,166,35,.4);background:#1c2026}
.botdash .gauge{display:flex;gap:18px;align-items:center}
.botdash .ring{--p:40;width:88px;height:88px;border-radius:50%;flex:none;background:conic-gradient(#f5a623 calc(var(--p)*1%),#22272f 0);display:grid;place-items:center;position:relative}
.botdash .ring::after{content:"";position:absolute;inset:9px;border-radius:50%;background:#15181d}
.botdash .ring .rnum{position:relative;font-family:'Space Grotesk',monospace;font-weight:700;font-size:20px;color:#eef1f5}
.botdash .ring .rnum s{font-size:11px;color:#6b7480;text-decoration:none}
`;
