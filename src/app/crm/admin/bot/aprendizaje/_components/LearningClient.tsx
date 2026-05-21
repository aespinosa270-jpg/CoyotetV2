"use client";

import { useCallback, useEffect, useState } from "react";

interface LearnedRule {
  id: string;
  semana: string;
  regla: string;
  evidencia: string;
  fechaAgregada: string;
  activa: boolean;
}

interface WeeklyAnalysis {
  id: string;
  semana: string;
  fechaAnalisis: string;
  resumen: string;
  patrones: string[];
  kpis: {
    mensajes: number;
    ventas: number;
    escalaciones: number;
    objecionesTotales: number;
  };
}

export default function LearningClient() {
  const [rules, setRules] = useState<LearnedRule[]>([]);
  const [history, setHistory] = useState<WeeklyAnalysis[]>([]);
  const [counts, setCounts] = useState({ total: 0, activas: 0, inactivas: 0 });
  const [loading, setLoading] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"rules" | "history">("rules");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bot/aprendizaje");
      const data = await res.json();
      if (data.ok) {
        setRules(data.rules || []);
        setHistory(data.history || []);
        setCounts(data.counts || { total: 0, activas: 0, inactivas: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleToggle(id: string, activa: boolean) {
    if (busy) return;
    setBusy(id);
    try {
      await fetch("/api/admin/bot/aprendizaje", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, activa }),
      });
      await fetchData();
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(id: string) {
    if (busy) return;
    if (!confirm("¿Borrar esta regla permanentemente?")) return;
    setBusy(id);
    try {
      await fetch("/api/admin/bot/aprendizaje", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await fetchData();
    } finally {
      setBusy(null);
    }
  }

  async function handleRunAnalysis() {
    if (runningAnalysis) return;
    if (!confirm("Esto correrá el análisis manual (consume tokens GPT-4o). ¿Continuar?")) return;
    setRunningAnalysis(true);
    try {
      const res = await fetch("/api/admin/bot/aprendizaje", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        alert(`✅ Análisis completado.\nReglas nuevas: ${data.reglasAgregadas}\n\n${data.resumen || ""}`);
        await fetchData();
      } else {
        alert(`❌ Error: ${data.error || "desconocido"}`);
      }
    } finally {
      setRunningAnalysis(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-md p-4">
          <p className="text-xs uppercase text-emerald-700 font-bold">Reglas Activas</p>
          <p className="text-3xl font-black text-emerald-900">{counts.activas}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
          <p className="text-xs uppercase text-slate-500">Inactivas</p>
          <p className="text-2xl font-black">{counts.inactivas}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-xs uppercase text-blue-700">Análisis semanales</p>
          <p className="text-2xl font-black text-blue-900">{history.length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-md p-3">
        <button
          onClick={() => setTab("rules")}
          className={`px-3 py-2 text-sm rounded font-medium ${
            tab === "rules"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700 border border-slate-300"
          }`}
        >
          📋 Reglas ({counts.total})
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-3 py-2 text-sm rounded font-medium ${
            tab === "history"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700 border border-slate-300"
          }`}
        >
          📊 Historial análisis ({history.length})
        </button>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-medium"
        >
          🔄 Refresh
        </button>

        <button
          onClick={handleRunAnalysis}
          disabled={runningAnalysis}
          className="ml-auto px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white rounded font-bold shadow"
        >
          {runningAnalysis ? "⏳ Analizando..." : "🚀 Correr análisis manual"}
        </button>
      </div>

      {/* Contenido */}
      {tab === "rules" ? (
        <div className="space-y-2">
          {loading ? (
            <p className="text-center text-slate-400 py-12">⏳ Cargando reglas...</p>
          ) : rules.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-md p-12 text-center">
              <p className="text-4xl mb-2">🧠</p>
              <p className="text-slate-500">
                Aún no hay reglas aprendidas. El primer análisis corre cada viernes 18:00 CDMX.
              </p>
              <p className="text-xs text-slate-400 mt-2">
                O presiona "Correr análisis manual" arriba para forzar uno ahora.
              </p>
            </div>
          ) : (
            rules.map((r) => (
              <div
                key={r.id}
                className={`border-2 rounded-md p-4 ${
                  r.activa
                    ? "border-emerald-300 bg-emerald-50/50"
                    : "border-slate-300 bg-slate-50/50 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{r.regla}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      📍 Evidencia: <em>{r.evidencia}</em>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Semana: {r.semana} · Agregada: {new Date(r.fechaAgregada).toLocaleDateString("es-MX")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleToggle(r.id, !r.activa)}
                      disabled={busy === r.id}
                      className={`px-3 py-1.5 text-xs font-bold rounded ${
                        r.activa
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-slate-300 hover:bg-slate-400 text-slate-700"
                      }`}
                    >
                      {r.activa ? "✓ ACTIVA" : "○ INACTIVA"}
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={busy === r.id}
                      className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
                    >
                      🗑️ Borrar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-md p-12 text-center">
              <p className="text-4xl mb-2">📊</p>
              <p className="text-slate-500">No hay análisis previos todavía.</p>
            </div>
          ) : (
            history.map((h) => (
              <div key={h.id} className="bg-white border-2 border-blue-200 rounded-md p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <p className="font-bold text-slate-900">📅 Semana {h.semana}</p>
                  <span className="text-xs text-slate-400">
                    {new Date(h.fechaAnalisis).toLocaleString("es-MX")}
                  </span>
                </div>
                <p className="text-sm text-slate-700 mb-3 whitespace-pre-wrap">{h.resumen}</p>

                {h.patrones.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-bold uppercase text-slate-600 mb-1">🔍 Patrones detectados:</p>
                    <ul className="text-xs text-slate-700 space-y-0.5 list-disc list-inside">
                      {h.patrones.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 text-center bg-slate-50 rounded p-2">
                  <div>
                    <p className="text-xs text-slate-500">Mensajes</p>
                    <p className="font-bold">{h.kpis.mensajes.toLocaleString("es-MX")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Ventas</p>
                    <p className="font-bold">${h.kpis.ventas.toLocaleString("es-MX", { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Escalaciones</p>
                    <p className="font-bold">{h.kpis.escalaciones}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Objeciones</p>
                    <p className="font-bold">{h.kpis.objecionesTotales}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}