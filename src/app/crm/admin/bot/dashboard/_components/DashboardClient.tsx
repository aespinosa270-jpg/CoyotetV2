"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

interface DashboardData {
  kpis: {
    ventasHoy: number; ordenesHoy: number; ventasTotalBot: number; ordenesTotalBot: number;
    mensajesHoy: number; mensajesAyer: number; mensajesChange: number | null;
    conversionesHoy: number; conversionesAyer: number; conversionesChange: number | null;
    errorsToday: number; escalacionesPendientes: number;
  };
  dailySeries: Array<{ date: string; dia: string; mensajes: number; conversiones: number }>;
  escalationsByReason: Array<{ razon: string; count: number }>;
  topProducts: Array<{ titulo: string; cantidad: number; ingreso: number; ordenes: number }>;
  topObjections: Array<{ name: string; count: number }>;
  lastEscalations: Array<{ id: string; phone: string; nombre: string | null; razon: string; contexto: string; createdAt: string }>;
}

const RAZON_LABELS: Record<string, string> = {
  queja: "😠 Queja", humano: "👤 Pide humano", alto_valor: "💰 Alto valor",
  retries: "🤖 Bot atorado", frustracion: "😤 Frustración", facturacion: "📄 Facturación",
};
const RAZON_COLORS: Record<string, string> = {
  queja: "#fb6f6f", humano: "#5b9dff", alto_valor: "#f5a623",
  retries: "#b794f6", frustracion: "#fb923c", facturacion: "#94a3b8",
};

// Tooltip oscuro para recharts
const darkTooltip = {
  contentStyle: { background: "#15181d", border: "1px solid #2c323b", borderRadius: 12, color: "#eef1f5", fontSize: 12 },
  labelStyle: { color: "#aab2bd" },
};

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/bot/dashboard");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error cargando dashboard");
      setData(json); setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  if (loading && !data) {
    return <div className="dash-dark"><style>{CSS}</style><div className="card p-12 text-center text-zinc-500">⏳ Cargando datos del dashboard…</div></div>;
  }
  if (error) {
    return <div className="dash-dark"><style>{CSS}</style><div className="card p-6" style={{borderColor:"rgba(251,111,111,.4)"}}><p className="text-rose-300 font-bold">❌ Error: {error}</p><button onClick={fetchData} className="mt-2 px-3 py-1.5 bg-rose-500/20 text-rose-300 text-sm rounded-lg border border-rose-500/30">Reintentar</button></div></div>;
  }
  if (!data) return null;

  const { kpis, dailySeries, escalationsByReason, topProducts, topObjections, lastEscalations } = data;

  return (
    <div className="dash-dark space-y-6">
      <style>{CSS}</style>

      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">El Coyote — Bot v2</p>
          <h1 className="text-3xl font-black uppercase tracking-tight text-zinc-900">Dashboard del <span className="text-amber-500">Bot</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} disabled={loading} className="tbtn">{loading ? "⏳…" : "🔄 Refresh"}</button>
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer text-zinc-600">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-4 h-4 accent-amber-500" />
            <span className={autoRefresh ? "text-emerald-600" : "text-zinc-400"}>{autoRefresh ? "🟢 Auto (60s)" : "⏸️ Pausado"}</span>
          </label>
          <span className="text-xs text-zinc-400">{lastRefresh.toLocaleTimeString("es-MX")}</span>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon="💸" label="Ventas hoy" value={`$${kpis.ventasHoy.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`} hint={`${kpis.ordenesHoy} ${kpis.ordenesHoy === 1 ? "orden" : "órdenes"}`} tone="amber" />
        <KpiCard icon="💬" label="Mensajes hoy" value={kpis.mensajesHoy.toLocaleString("es-MX")} hint={kpis.mensajesChange !== null ? `${kpis.mensajesChange > 0 ? "↑" : "↓"} ${Math.abs(kpis.mensajesChange)}% vs ayer` : `Ayer: ${kpis.mensajesAyer}`} tone="blue" />
        <KpiCard icon="🚨" label="Escalaciones" value={kpis.escalacionesPendientes.toString()} hint={kpis.errorsToday > 0 ? `${kpis.errorsToday} errores hoy` : "Sin errores hoy"} tone={kpis.escalacionesPendientes > 0 ? "red" : "slate"} />
        <KpiCard icon="🏆" label="Total ventas bot" value={`$${kpis.ventasTotalBot.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`} hint={`${kpis.ordenesTotalBot} acumuladas`} tone="green" />
      </div>

      {/* Linea 7d */}
      <div className="card p-5">
        <h3 className="ch">📈 Mensajes y conversiones — últimos 7 días</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dailySeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2c323b" />
            <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#6b7480" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7480" }} />
            <Tooltip {...darkTooltip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="mensajes" stroke="#5b9dff" strokeWidth={2.5} dot={{ r: 3 }} name="💬 Mensajes" />
            <Line type="monotone" dataKey="conversiones" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3 }} name="💸 Conversiones" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Donut + barras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="ch">🥧 Escalaciones por razón (30d)</h3>
          {escalationsByReason.length === 0 ? <p className="text-zinc-500 text-center py-12">Sin escalaciones registradas</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={escalationsByReason} dataKey="count" nameKey="razon" cx="50%" cy="50%" outerRadius={90} innerRadius={52}
                  label={(entry: any) => `${RAZON_LABELS[entry.razon] || entry.razon}: ${entry.count}`} stroke="#15181d" strokeWidth={2}>
                  {escalationsByReason.map((entry, idx) => (<Cell key={idx} fill={RAZON_COLORS[entry.razon] || "#94a3b8"} />))}
                </Pie>
                <Tooltip {...darkTooltip} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card p-5">
          <h3 className="ch">🏅 Top productos vendidos (30d)</h3>
          {topProducts.length === 0 ? <p className="text-zinc-500 text-center py-12">Sin ventas registradas</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c323b" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7480" }} />
                <YAxis dataKey="titulo" type="category" tick={{ fontSize: 11, fill: "#6b7480" }} width={80} />
                <Tooltip {...darkTooltip} cursor={{ fill: "rgba(245,166,35,.08)" }} />
                <Bar dataKey="cantidad" fill="#f5a623" name="Kilos vendidos" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Objeciones */}
      <div className="card p-5">
        <h3 className="ch">🤔 Top objeciones del cliente (hoy)</h3>
        {topObjections.length === 0 ? <p className="text-zinc-500 text-center py-8">Sin objeciones detectadas hoy</p> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topObjections}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c323b" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7480" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7480" }} />
              <Tooltip {...darkTooltip} cursor={{ fill: "rgba(251,146,60,.08)" }} />
              <Bar dataKey="count" fill="#fb923c" name="Veces detectada" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Escalaciones */}
      <div className="card p-5">
        <h3 className="ch flex items-center justify-between">
          <span>🚨 Últimas escalaciones pendientes</span>
          <Link href="/crm/admin/bot/escalaciones" className="text-xs font-medium text-amber-500 hover:underline">Ver todas →</Link>
        </h3>
        {lastEscalations.length === 0 ? <p className="text-emerald-600 text-center py-8 font-medium">✅ No hay escalaciones pendientes</p> : (
          <div className="space-y-2">
            {lastEscalations.map((e) => (
              <Link key={e.id} href={`/crm/admin/bot/conversaciones/${encodeURIComponent(e.phone)}`} className="esc-row">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-100">{RAZON_LABELS[e.razon] || e.razon}</span>
                    <span className="text-sm text-zinc-400">{e.nombre || "(sin nombre)"} · +{e.phone}</span>
                  </div>
                  <span className="text-xs text-zinc-500">{new Date(e.createdAt).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1 truncate">{e.contexto}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const KPI_TONE: Record<string, string> = {
  amber: "kpi-amber", blue: "kpi-blue", red: "kpi-red", green: "kpi-green", slate: "kpi-slate",
};
function KpiCard({ icon, label, value, hint, tone = "slate" }: { icon: string; label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className={`kpi ${KPI_TONE[tone] || KPI_TONE.slate}`}>
      <p className="kl">{icon} {label}</p>
      <p className="kv">{value}</p>
      {hint && <p className="kh">{hint}</p>}
    </div>
  );
}

const CSS = `
.dash-dark .card{background:#15181d;border:1px solid #2c323b;border-radius:16px;color:#eef1f5}
.dash-dark .ch{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#aab2bd;margin-bottom:14px}
.dash-dark .tbtn{padding:9px 14px;font-size:13px;background:#15181d;border:1px solid #2c323b;border-radius:10px;color:#aab2bd;font-weight:600;cursor:pointer}
.dash-dark .tbtn:hover{border-color:rgba(245,166,35,.4);color:#fbbf24}
.dash-dark .kpi{border-radius:16px;padding:18px 20px;border:1px solid #2c323b;background:#15181d}
.dash-dark .kpi .kl{font-size:11px;text-transform:uppercase;letter-spacing:.5px;font-weight:700;color:#6b7480}
.dash-dark .kpi .kv{font-family:'Space Grotesk',monospace;font-size:30px;font-weight:700;margin-top:10px;line-height:1;color:#eef1f5}
.dash-dark .kpi .kh{font-size:12px;color:#6b7480;margin-top:7px;font-weight:500}
.dash-dark .kpi-amber{background:linear-gradient(135deg,rgba(245,166,35,.14),transparent),#15181d;border-color:rgba(245,166,35,.3)}
.dash-dark .kpi-amber .kv{color:#fbbf24}
.dash-dark .kpi-blue{background:linear-gradient(135deg,rgba(91,157,255,.12),transparent),#15181d;border-color:rgba(91,157,255,.3)}
.dash-dark .kpi-blue .kv{color:#5b9dff}
.dash-dark .kpi-red{background:linear-gradient(135deg,rgba(251,111,111,.14),transparent),#15181d;border-color:rgba(251,111,111,.3)}
.dash-dark .kpi-red .kv{color:#fb6f6f}
.dash-dark .kpi-green{background:linear-gradient(135deg,rgba(52,211,153,.14),transparent),#15181d;border-color:rgba(52,211,153,.3)}
.dash-dark .kpi-green .kv{color:#34d399}
.dash-dark .kpi-slate .kv{color:#eef1f5}
.dash-dark .esc-row{display:block;border:1px solid #2c323b;border-radius:12px;padding:12px 14px;transition:.12s}
.dash-dark .esc-row:hover{border-color:rgba(245,166,35,.4);background:#1c2026}
`;
