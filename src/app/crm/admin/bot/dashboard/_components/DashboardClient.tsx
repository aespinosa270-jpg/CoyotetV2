"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface DashboardData {
  kpis: {
    ventasHoy: number;
    ordenesHoy: number;
    ventasTotalBot: number;
    ordenesTotalBot: number;
    mensajesHoy: number;
    mensajesAyer: number;
    mensajesChange: number | null;
    conversionesHoy: number;
    conversionesAyer: number;
    conversionesChange: number | null;
    errorsToday: number;
    escalacionesPendientes: number;
  };
  dailySeries: Array<{ date: string; dia: string; mensajes: number; conversiones: number }>;
  escalationsByReason: Array<{ razon: string; count: number }>;
  topProducts: Array<{ titulo: string; cantidad: number; ingreso: number; ordenes: number }>;
  topObjections: Array<{ name: string; count: number }>;
  lastEscalations: Array<{
    id: string;
    phone: string;
    nombre: string | null;
    razon: string;
    contexto: string;
    createdAt: string;
  }>;
}

const RAZON_LABELS: Record<string, string> = {
  queja: "😠 Queja",
  humano: "👤 Pide humano",
  alto_valor: "💰 Alto valor",
  retries: "🤖 Hallucinations",
  frustracion: "😤 Frustración",
  facturacion: "📄 Facturación",
};

const RAZON_COLORS: Record<string, string> = {
  queja: "#dc2626",
  humano: "#2563eb",
  alto_valor: "#d97706",
  retries: "#9333ea",
  frustracion: "#ea580c",
  facturacion: "#475569",
};

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/bot/dashboard");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error cargando dashboard");
      setData(json);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  if (loading && !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-md p-12 text-center">
        <p className="text-slate-500">⏳ Cargando datos del dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-md p-6">
        <p className="text-red-800 font-bold">❌ Error: {error}</p>
        <button onClick={fetchData} className="mt-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded">
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, dailySeries, escalationsByReason, topProducts, topObjections, lastEscalations } = data;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-md p-3">
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 border border-slate-300 rounded font-medium"
        >
          {loading ? "⏳..." : "🔄 Refresh"}
        </button>
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="w-4 h-4"
          />
          <span className={autoRefresh ? "text-emerald-700" : "text-slate-500"}>
            {autoRefresh ? "🟢 Auto (60s)" : "⏸️ Pausado"}
          </span>
        </label>
        <span className="text-xs text-slate-400 ml-auto">
          {lastRefresh.toLocaleTimeString("es-MX")}
        </span>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon="💸"
          label="VENTAS HOY"
          value={`$${kpis.ventasHoy.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`}
          hint={`${kpis.ordenesHoy} ${kpis.ordenesHoy === 1 ? "orden" : "órdenes"}`}
          color="emerald"
        />
        <KpiCard
          icon="💬"
          label="MENSAJES HOY"
          value={kpis.mensajesHoy.toLocaleString("es-MX")}
          hint={
            kpis.mensajesChange !== null
              ? `${kpis.mensajesChange > 0 ? "↑" : "↓"} ${Math.abs(kpis.mensajesChange)}% vs ayer`
              : `Ayer: ${kpis.mensajesAyer}`
          }
          color={kpis.mensajesChange && kpis.mensajesChange > 0 ? "emerald" : "blue"}
        />
        <KpiCard
          icon="🚨"
          label="ESCALACIONES PENDIENTES"
          value={kpis.escalacionesPendientes.toString()}
          hint={kpis.errorsToday > 0 ? `${kpis.errorsToday} errores hoy` : "Sin errores hoy"}
          color={kpis.escalacionesPendientes > 0 ? "red" : "slate"}
        />
        <KpiCard
          icon="🏆"
          label="TOTAL VENTAS BOT"
          value={`$${kpis.ventasTotalBot.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`}
          hint={`${kpis.ordenesTotalBot} ${kpis.ordenesTotalBot === 1 ? "orden" : "órdenes"} acumuladas`}
          color="amber"
        />
      </div>

      {/* Línea de mensajes + conversiones (7d) */}
      <div className="bg-white border border-slate-200 rounded-md p-4">
        <h3 className="text-sm font-bold uppercase text-slate-700 mb-3">
          📈 Mensajes y conversiones — últimos 7 días
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dailySeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="mensajes" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} name="💬 Mensajes" />
            <Line type="monotone" dataKey="conversiones" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="💸 Conversiones" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Grid 2x2: donut + bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut escalaciones por razón */}
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <h3 className="text-sm font-bold uppercase text-slate-700 mb-3">
            🥧 Escalaciones por razón (30d)
          </h3>
          {escalationsByReason.length === 0 ? (
            <p className="text-slate-400 text-center py-12">Sin escalaciones registradas</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={escalationsByReason}
                  dataKey="count"
                  nameKey="razon"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  label={(entry: any) => `${RAZON_LABELS[entry.razon] || entry.razon}: ${entry.count}`}
                >
                  {escalationsByReason.map((entry, idx) => (
                    <Cell key={idx} fill={RAZON_COLORS[entry.razon] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top productos */}
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <h3 className="text-sm font-bold uppercase text-slate-700 mb-3">
            🏅 Top productos vendidos (30d)
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-slate-400 text-center py-12">Sin ventas registradas</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="titulo" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#FDCB02" name="Kilos vendidos" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top objeciones */}
      <div className="bg-white border border-slate-200 rounded-md p-4">
        <h3 className="text-sm font-bold uppercase text-slate-700 mb-3">
          🤔 Top objeciones del cliente (hoy)
        </h3>
        {topObjections.length === 0 ? (
          <p className="text-slate-400 text-center py-8">Sin objeciones detectadas hoy</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topObjections}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#ea580c" name="Veces detectada" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Últimas escalaciones pendientes */}
      <div className="bg-white border border-slate-200 rounded-md p-4">
        <h3 className="text-sm font-bold uppercase text-slate-700 mb-3 flex items-center justify-between">
          <span>🚨 Últimas escalaciones pendientes</span>
          <Link
            href="/crm/admin/bot/escalaciones"
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Ver todas →
          </Link>
        </h3>
        {lastEscalations.length === 0 ? (
          <p className="text-emerald-600 text-center py-8 font-medium">
            ✅ No hay escalaciones pendientes
          </p>
        ) : (
          <div className="space-y-2">
            {lastEscalations.map((e) => (
              <Link
                key={e.id}
                href={`/crm/admin/bot/conversaciones/${encodeURIComponent(e.phone)}`}
                className="block border border-slate-200 hover:border-slate-400 rounded p-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {RAZON_LABELS[e.razon] || e.razon}
                    </span>
                    <span className="text-sm text-slate-600">
                      {e.nombre || "(sin nombre)"} · +{e.phone}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(e.createdAt).toLocaleString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 truncate">{e.contexto}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// KPI Card grande con icono y color
// ════════════════════════════════════════════════════════════════

const COLOR_CLASSES: Record<string, string> = {
  emerald: "border-emerald-500 bg-emerald-50 text-emerald-900",
  blue: "border-blue-500 bg-blue-50 text-blue-900",
  red: "border-red-500 bg-red-50 text-red-900",
  amber: "border-amber-500 bg-amber-50 text-amber-900",
  slate: "border-slate-300 bg-white text-slate-900",
};

function KpiCard({
  icon,
  label,
  value,
  hint,
  color = "slate",
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  color?: string;
}) {
  return (
    <div
      className={`border-l-4 ${COLOR_CLASSES[color] || COLOR_CLASSES.slate} p-4 rounded-md shadow-sm`}
    >
      <p className="text-xs uppercase tracking-wide font-bold opacity-80">
        {icon} {label}
      </p>
      <p className="text-3xl font-black mt-2">{value}</p>
      {hint && <p className="text-xs opacity-70 mt-1 font-medium">{hint}</p>}
    </div>
  );
}