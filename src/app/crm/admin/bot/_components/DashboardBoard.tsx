"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface Metrics {
  totalClientes: number; clientesNuevosUltimos7Dias: number;
  clientesPorSegmento: Record<string, number>;
  topObjecionesGlobales: Array<{ label: string; total: number; clientesAfectados: number }>;
  temperaturaPromedio: number; confianzaPromedio: number; totalPedidos: number;
}
interface OrderStats {
  pedidosPagados: number; ventasTotales: number; ordenesPendientes: number;
  montoPorCobrar: number; ventas7dMonto: number; ventas7dCount: number;
}
interface DayPoint { date: string; fullDate: string; revenue: number; orders: number; }

const PERIODOS = [
  { key: "hoy", label: "Hoy", dias: 1 },
  { key: "7d", label: "7 días", dias: 7 },
  { key: "30d", label: "30 días", dias: 30 },
];

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("es-MX");

// Hook count-up
function useCountUp(target: number, dur = 900) {
  const [val, setVal] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const from = ref.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = from + (target - from) * eased;
      setVal(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
      else ref.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return val;
}

function KpiNum({ value, money }: { value: number; money?: boolean }) {
  const v = useCountUp(value);
  return <>{money ? fmt(v) : Math.round(v).toLocaleString("es-MX")}</>;
}

export default function DashboardBoard({ metrics, orders, salesByDay }: { metrics: Metrics; orders: OrderStats; salesByDay: DayPoint[] }) {
  const [periodo, setPeriodo] = useState("7d");
  const dias = PERIODOS.find((p) => p.key === periodo)?.dias ?? 7;

  // Recorte real de la serie segun periodo
  const serie = useMemo(() => salesByDay.slice(-dias), [salesByDay, dias]);
  const ventasPeriodo = useMemo(() => serie.reduce((s, d) => s + d.revenue, 0), [serie]);
  const ordenesPeriodo = useMemo(() => serie.reduce((s, d) => s + d.orders, 0), [serie]);

  const maxObj = metrics.topObjecionesGlobales[0]?.total ?? 1;
  const tibia = metrics.temperaturaPromedio >= 50;
  const topObj = metrics.topObjecionesGlobales[0];
  const segmentos = Object.entries(metrics.clientesPorSegmento).sort(([, a], [, b]) => (b as number) - (a as number));

  let insight = "El Coyote esta operando con normalidad.";
  if (orders.montoPorCobrar > 0 && orders.ordenesPendientes > 0) {
    insight = `Tienes ${fmt(orders.montoPorCobrar)} por cobrar en ${orders.ordenesPendientes} ordenes pendientes. Revisa cuales ya se pagaron y marcalas.`;
  } else if (topObj) {
    insight = `Tu objecion #1 es "${topObj.label}" (${topObj.clientesAfectados} clientes). Atacarla destrabaria varias ventas.`;
  }

  const periodoLabel = PERIODOS.find((p) => p.key === periodo)?.label.toLowerCase();

  return (
    <div className="db">
      <style>{CSS}</style>

      <header className="dbhead">
        <div>
          <p className="eyebrow">El Coyote — Bot v2</p>
          <h1>Dashboard del <span>Bot</span></h1>
        </div>
        <div className="pswitch">
          {PERIODOS.map((p) => (
            <button key={p.key} className={periodo === p.key ? "on" : ""} onClick={() => setPeriodo(p.key)}>{p.label}</button>
          ))}
        </div>
      </header>

      <div className="insight">
        <div className="ico">🐺</div>
        <p>{insight}</p>
      </div>

      {/* KPIs con count-up */}
      <section className="kpis">
        <Link href="/crm/admin/bot/ordenes" className="kpi kgreen">
          <p className="kl">💰 Ventas {periodoLabel}</p>
          <p className="kv"><KpiNum value={ventasPeriodo} money /></p>
          <p className="kh">{ordenesPeriodo} pedidos · ver →</p>
        </Link>
        <Link href="/crm/admin/bot/ordenes" className="kpi kamber">
          <p className="kl">⏳ Por cobrar</p>
          <p className="kv"><KpiNum value={orders.montoPorCobrar} money /></p>
          <p className="kh">{orders.ordenesPendientes} pendientes · revisar →</p>
        </Link>
        <Link href="/crm/admin/pedidos" className="kpi kblue">
          <p className="kl">📦 Pedidos pagados</p>
          <p className="kv"><KpiNum value={orders.pedidosPagados} /></p>
          <p className="kh">total acumulado · surtir →</p>
        </Link>
        <Link href="/crm/admin/bot/contactos" className="kpi kviolet">
          <p className="kl">👥 Clientes</p>
          <p className="kv"><KpiNum value={metrics.totalClientes} /></p>
          <p className="kh">+{metrics.clientesNuevosUltimos7Dias} esta semana →</p>
        </Link>
      </section>

      {/* Grafica de tendencia arriba */}
      <section className="card chart">
        <div className="chhead"><h2>Tendencia de ventas — {periodoLabel}</h2><span className="big">{fmt(ventasPeriodo)}</span></div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={serie} margin={{ left: -10, right: 6, top: 6 }}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f5a623" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#f5a623" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#22272f" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7480" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7480" }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => v >= 1000 ? `$${Math.round(v/1000)}k` : `$${v}`} />
            <Tooltip contentStyle={{ background: "#15181d", border: "1px solid #2c323b", borderRadius: 12, color: "#eef1f5", fontSize: 12 }}
              formatter={(v: any) => [fmt(Number(v)), "Ventas"]} labelStyle={{ color: "#aab2bd" }} />
            <Area type="monotone" dataKey="revenue" stroke="#f5a623" strokeWidth={2.5} fill="url(#grad)" />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      <div className="grid2">
        <section className="card">
          <h2 className="ch2"><span>Que frena a tus clientes</span><Link href="/crm/admin/bot/objeciones" className="vt">Ver todas →</Link></h2>
          {metrics.topObjecionesGlobales.length === 0 ? <p className="muted">Sin objeciones acumuladas.</p> : (
            <div className="objs">
              {metrics.topObjecionesGlobales.map((obj, i) => {
                const w = maxObj > 0 ? Math.min(100, (obj.total / maxObj) * 100) : 0;
                return (
                  <Link key={i} href="/crm/admin/bot/objeciones" className="objrow">
                    <div className="objtop"><span>{i === 0 ? "🔥 " : ""}{obj.label}</span><span className="c">{obj.clientesAfectados} clientes</span></div>
                    <div className="bar"><i style={{ width: `${w}%` }} /></div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="ch2"><span>Salud de la cartera</span></h2>
          <div className="gauge">
            <div className="ring" style={{ ["--p" as any]: metrics.confianzaPromedio }}><div className="rnum">{metrics.confianzaPromedio}<s>/100</s></div></div>
            <div><p className="gtxt">{metrics.confianzaPromedio >= 60 ? "El bot esta convirtiendo bien." : "Confianza historica baja — cartera fria."}</p><p className="gtemp">Temperatura: {metrics.temperaturaPromedio}/100 {tibia ? "🔥" : "❄️"}</p></div>
          </div>
          <div className="segs">
            <p className="segh">Distribucion por segmento</p>
            {segmentos.map(([seg, count]) => {
              const pct = Math.round(((count as number) / metrics.totalClientes) * 100);
              return (
                <Link key={seg} href="/crm/admin/bot/contactos" className="segrow">
                  <span className="sn">{seg}</span>
                  <div className="sbar"><i style={{ width: `${pct}%` }} /></div>
                  <span className="sp">{pct}%</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

const CSS = `
.db{color:#eef1f5}
.db .dbhead{display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:22px}
.db .eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.2em;color:#6b7480}
.db .dbhead h1{font-size:32px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:#0f1115;margin-top:2px}
.db .dbhead h1 span{color:#f5a623}
.db .pswitch{display:flex;gap:5px;background:#15181d;border:1px solid #2c323b;border-radius:13px;padding:5px}
.db .pswitch button{border:none;background:none;color:#6b7480;font-size:13px;font-weight:600;padding:8px 18px;border-radius:9px;cursor:pointer;transition:.15s;font-family:inherit}
.db .pswitch button:hover{color:#eef1f5}
.db .pswitch button.on{background:#f5a623;color:#1a1205}
.db .insight{display:flex;gap:14px;align-items:center;background:linear-gradient(135deg,rgba(245,166,35,.13),transparent),#15181d;border:1px solid rgba(245,166,35,.28);border-radius:18px;padding:18px 22px;margin-bottom:22px}
.db .insight .ico{width:46px;height:46px;border-radius:13px;flex:none;background:radial-gradient(circle at 30% 30%,#fbbf24,#f5a623);display:grid;place-items:center;font-size:24px;box-shadow:0 8px 24px -8px rgba(245,166,35,.6)}
.db .insight p{font-size:15px;color:#eef1f5;line-height:1.5}
.db .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px}
.db .kpi{display:block;border-radius:18px;padding:20px 22px;border:1px solid #2c323b;background:#15181d;text-decoration:none;transition:transform .18s,border-color .18s,box-shadow .18s}
.db .kpi:hover{transform:translateY(-3px);border-color:rgba(245,166,35,.45);box-shadow:0 16px 40px -16px rgba(0,0,0,.7)}
.db .kpi .kl{font-size:11.5px;text-transform:uppercase;letter-spacing:.5px;font-weight:700;color:#6b7480}
.db .kpi .kv{font-family:'Space Grotesk',monospace;font-size:32px;font-weight:700;margin-top:12px;line-height:1;color:#eef1f5}
.db .kpi .kh{font-size:11.5px;color:#6b7480;margin-top:9px;font-weight:500}
.db .kgreen{background:linear-gradient(135deg,rgba(52,211,153,.14),transparent),#15181d;border-color:rgba(52,211,153,.3)}.db .kgreen .kv{color:#34d399}
.db .kamber{background:linear-gradient(135deg,rgba(245,166,35,.15),transparent),#15181d;border-color:rgba(245,166,35,.32)}.db .kamber .kv{color:#fbbf24}
.db .kblue{background:linear-gradient(135deg,rgba(91,157,255,.13),transparent),#15181d;border-color:rgba(91,157,255,.3)}.db .kblue .kv{color:#5b9dff}
.db .kviolet{background:linear-gradient(135deg,rgba(139,124,246,.14),transparent),#15181d;border-color:rgba(139,124,246,.3)}.db .kviolet .kv{color:#b794f6}
.db .card{background:#15181d;border:1px solid #2c323b;border-radius:18px;padding:22px;margin-bottom:18px}
.db .chart .chhead{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px}
.db .chart .chhead h2{font-size:14px;font-weight:600;color:#aab2bd;text-transform:uppercase;letter-spacing:.5px}
.db .chart .chhead .big{font-family:'Space Grotesk',monospace;font-size:26px;font-weight:700;color:#fbbf24}
.db .grid2{display:grid;grid-template-columns:1.4fr 1fr;gap:18px}
.db .ch2{display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:600;color:#aab2bd;text-transform:uppercase;letter-spacing:.5px;margin-bottom:18px}
.db .ch2 .vt{font-size:12px;color:#f5a623;text-transform:none;letter-spacing:0;font-weight:500;text-decoration:none}
.db .muted{color:#6b7480;font-size:14px}
.db .objs{display:flex;flex-direction:column;gap:11px}
.db .objrow{display:block;text-decoration:none;border:1px solid #2c323b;border-radius:13px;padding:13px 15px;transition:.13s}
.db .objrow:hover{border-color:rgba(245,166,35,.4);background:#1c2026;transform:translateX(3px)}
.db .objtop{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:9px}
.db .objtop span{font-size:14px;font-weight:500;color:#eef1f5}
.db .objtop .c{font-size:12px;color:#6b7480}
.db .bar{height:8px;background:#22272f;border-radius:6px;overflow:hidden}
.db .bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#fb923c,#fbbf24);transition:width .6s ease}
.db .gauge{display:flex;gap:18px;align-items:center;margin-bottom:22px}
.db .ring{--p:40;width:92px;height:92px;border-radius:50%;flex:none;background:conic-gradient(#f5a623 calc(var(--p)*1%),#22272f 0);display:grid;place-items:center;position:relative}
.db .ring::after{content:"";position:absolute;inset:9px;border-radius:50%;background:#15181d}
.db .ring .rnum{position:relative;font-family:'Space Grotesk',monospace;font-weight:700;font-size:22px}
.db .ring .rnum s{font-size:11px;color:#6b7480;text-decoration:none}
.db .gtxt{font-size:14px;color:#cdd3da;line-height:1.5}
.db .gtemp{font-size:12px;color:#6b7480;margin-top:5px}
.db .segh{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#6b7480;margin-bottom:12px}
.db .segrow{display:flex;align-items:center;gap:12px;text-decoration:none;margin-bottom:9px}
.db .segrow .sn{width:84px;font-size:13px;color:#aab2bd;text-transform:capitalize;transition:.13s}
.db .segrow:hover .sn{color:#fbbf24}
.db .segrow .sbar{flex:1;height:16px;background:#22272f;border-radius:6px;overflow:hidden}
.db .segrow .sbar i{display:block;height:100%;background:linear-gradient(90deg,#5b9dff,#3a6fd0);border-radius:6px}
.db .segrow .sp{width:42px;text-align:right;font-size:12px;color:#6b7480;font-family:'Space Grotesk',monospace}
@media(max-width:900px){.db .kpis{grid-template-columns:repeat(2,1fr)}.db .grid2{grid-template-columns:1fr}}
`;
