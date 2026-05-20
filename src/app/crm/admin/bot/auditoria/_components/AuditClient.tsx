"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface BotEvent {
  type: string;
  clientId?: string;
  channel?: string;
  data?: Record<string, any>;
  ts: number;
}

const TYPE_LABELS: Record<string, string> = {
  message: "💬 Mensaje",
  conversion: "💸 Cobro",
  error: "🚨 Error",
  hallucination: "🤖 Hallucination",
  vision: "📷 Vision",
  objection: "🤔 Objeción",
  rag_used: "📚 RAG",
  reminder_sent: "🔔 Recordatorio",
  reactivation_sent: "♻️ Reactivación",
};

const TYPE_COLORS: Record<string, string> = {
  message: "bg-blue-100 text-blue-800 border-blue-300",
  conversion: "bg-emerald-100 text-emerald-800 border-emerald-300",
  error: "bg-red-100 text-red-800 border-red-300",
  hallucination: "bg-purple-100 text-purple-800 border-purple-300",
  vision: "bg-amber-100 text-amber-800 border-amber-300",
  objection: "bg-orange-100 text-orange-800 border-orange-300",
  rag_used: "bg-slate-100 text-slate-700 border-slate-300",
  reminder_sent: "bg-indigo-100 text-indigo-800 border-indigo-300",
  reactivation_sent: "bg-pink-100 text-pink-800 border-pink-300",
};

const TYPE_PILL_BG: Record<string, string> = {
  message: "bg-blue-600 hover:bg-blue-700",
  conversion: "bg-emerald-600 hover:bg-emerald-700",
  error: "bg-red-600 hover:bg-red-700",
  hallucination: "bg-purple-600 hover:bg-purple-700",
  vision: "bg-amber-600 hover:bg-amber-700",
  objection: "bg-orange-600 hover:bg-orange-700",
  rag_used: "bg-slate-600 hover:bg-slate-700",
  reminder_sent: "bg-indigo-600 hover:bg-indigo-700",
  reactivation_sent: "bg-pink-600 hover:bg-pink-700",
};

const ALL_TYPES = [
  "message",
  "conversion",
  "error",
  "hallucination",
  "vision",
  "objection",
  "rag_used",
  "reminder_sent",
  "reactivation_sent",
];

export default function AuditClient() {
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("todos");
  const [searchPhone, setSearchPhone] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [days, setDays] = useState<number>(1);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "todos") params.set("type", filterType);
      params.set("days", String(days));
      params.set("limit", "200");

      const res = await fetch(`/api/admin/bot/audit?${params.toString()}`);
      const data = await res.json();
      if (data.events) {
        setEvents(data.events);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error("Error fetching audit:", err);
    } finally {
      setLoading(false);
    }
  }, [filterType, days]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchEvents();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchEvents]);

  // Filtro local por phone
  const filtered = useMemo(() => {
    if (!searchPhone.trim()) return events;
    const q = searchPhone.toLowerCase().trim();
    return events.filter(
      (e) => e.clientId?.toLowerCase().includes(q)
    );
  }, [events, searchPhone]);

  // Conteos por tipo (sobre todos los events cargados)
  const countsByType = useMemo(() => {
    const counts: Record<string, number> = { todos: events.length };
    for (const e of events) {
      counts[e.type] = (counts[e.type] || 0) + 1;
    }
    return counts;
  }, [events]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-md p-3">
        <input
          type="text"
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
          placeholder="🔍 Buscar por phone / clientId..."
          className="flex-1 min-w-[250px] px-3 py-2 border border-slate-300 rounded text-sm"
        />

        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value, 10))}
          className="px-3 py-2 border border-slate-300 rounded text-sm font-medium"
        >
          <option value={1}>📅 Hoy</option>
          <option value={2}>📅 2 días</option>
          <option value={3}>📅 3 días</option>
          <option value={7}>📅 7 días</option>
        </select>

        <button
          onClick={fetchEvents}
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
            {autoRefresh ? "🟢 Auto (15s)" : "⏸️ Pausado"}
          </span>
        </label>

        <span className="text-xs text-slate-400 ml-auto">
          {lastRefresh.toLocaleTimeString("es-MX")}
        </span>
      </div>

      {/* Pills por tipo */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterType("todos")}
          className={`px-3 py-1.5 text-sm rounded-full border-2 font-medium transition-all ${
            filterType === "todos"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-700 border-slate-300 hover:border-slate-500"
          }`}
        >
          🌟 Todos ({countsByType.todos || 0})
        </button>
        {ALL_TYPES.map((t) => {
          const count = countsByType[t] || 0;
          if (count === 0 && filterType !== t) return null;
          const active = filterType === t;
          return (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-sm rounded-full border-2 font-medium transition-all ${
                active
                  ? `${TYPE_PILL_BG[t]} text-white border-transparent`
                  : "bg-white text-slate-700 border-slate-300 hover:border-slate-500"
              }`}
            >
              {TYPE_LABELS[t]} {count > 0 ? `(${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* Tabla de eventos */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-12 text-center">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-slate-500">
            {loading ? "Cargando eventos..." : "No hay eventos para este filtro."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-medium w-32">Hora</th>
                <th className="text-left px-3 py-2 font-medium w-40">Tipo</th>
                <th className="text-left px-3 py-2 font-medium w-44">Cliente</th>
                <th className="text-left px-3 py-2 font-medium">Detalles</th>
                <th className="text-right px-3 py-2 font-medium w-24">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, idx) => (
                <tr
                  key={`${e.ts}-${idx}`}
                  className={`border-b border-slate-100 hover:bg-slate-50 ${
                    e.type === "error" ? "bg-red-50/50" : ""
                  }`}
                >
                  <td className="px-3 py-2 text-xs text-slate-600 font-mono whitespace-nowrap">
                    {fmtTime(e.ts)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium border rounded ${
                        TYPE_COLORS[e.type] || ""
                      }`}
                    >
                      {TYPE_LABELS[e.type] || e.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {e.clientId ? (
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                        {e.clientId.length > 20
                          ? e.clientId.slice(0, 18) + "..."
                          : e.clientId}
                      </code>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                    {e.channel && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        via {e.channel}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs max-w-md">
                    <DataPreview data={e.data} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {e.clientId && !e.clientId.startsWith("web:") ? (
                      <Link
                        href={`/crm/admin/bot/conversaciones/${encodeURIComponent(e.clientId)}`}
                        className="inline-block px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                      >
                        💬 Ver
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer info */}
      <div className="text-xs text-slate-400 text-center">
        Mostrando {filtered.length} eventos · Retención de 30 días · Filtros locales por phone
      </div>
    </div>
  );
}

function DataPreview({ data }: { data?: Record<string, any> }) {
  if (!data || Object.keys(data).length === 0) {
    return <span className="text-slate-400">—</span>;
  }

  const entries = Object.entries(data);
  return (
    <div className="space-y-0.5">
      {entries.slice(0, 4).map(([key, val]) => (
        <div key={key} className="truncate">
          <span className="font-medium text-slate-600">{key}:</span>{" "}
          <span className="text-slate-700">
            {typeof val === "object" ? JSON.stringify(val).slice(0, 60) : String(val).slice(0, 80)}
          </span>
        </div>
      ))}
      {entries.length > 4 && (
        <div className="text-slate-400 italic">...y {entries.length - 4} más</div>
      )}
    </div>
  );
}

function fmtTime(ts: number): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}