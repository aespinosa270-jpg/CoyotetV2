"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LlamarButton from "../../_components/LlamarButton";

interface Escalation {
  id: string;
  phone: string;
  nombre: string | null;
  razon: string;
  contexto: string;
  ultimoMsg: string;
  estado: string;
  atendidaPor: string | null;
  atendidaAt: Date | string | null;
  createdAt: Date | string;
}

const RAZON_LABELS: Record<string, string> = {
  queja: "Queja / molestia",
  humano: "Pide humano",
  alto_valor: "Pedido alto valor",
  retries: "Hallucinations",
  frustracion: "Repetición",
  facturacion: "Facturación",
};

const RAZON_EMOJI: Record<string, string> = {
  queja: "😠",
  humano: "👤",
  alto_valor: "💰",
  retries: "🤖",
  frustracion: "😤",
  facturacion: "📄",
};

const RAZON_COLOR_CARD: Record<string, string> = {
  queja: "border-red-400 bg-red-50",
  humano: "border-blue-400 bg-blue-50",
  alto_valor: "border-amber-400 bg-amber-50",
  retries: "border-purple-400 bg-purple-50",
  frustracion: "border-orange-400 bg-orange-50",
  facturacion: "border-slate-400 bg-slate-50",
};

const RAZON_PILL_BG: Record<string, string> = {
  queja: "bg-red-600 hover:bg-red-700",
  humano: "bg-blue-600 hover:bg-blue-700",
  alto_valor: "bg-amber-600 hover:bg-amber-700",
  retries: "bg-purple-600 hover:bg-purple-700",
  frustracion: "bg-orange-600 hover:bg-orange-700",
  facturacion: "bg-slate-600 hover:bg-slate-700",
};

const ESTADO_COLORS: Record<string, string> = {
  pendiente: "bg-red-100 text-red-800 border-red-300",
  atendida: "bg-emerald-100 text-emerald-800 border-emerald-300",
  descartada: "bg-slate-100 text-slate-600 border-slate-300",
};

export default function EscalationsTable({ items: initialItems }: { items: Escalation[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Escalation[]>(initialItems);
  const [busy, setBusy] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>("pendiente");
  const [filterRazon, setFilterRazon] = useState<string>("todas");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // ── Auto-refresh cada 30s ────────────────────────────────────────
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refreshList();
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  async function refreshList() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/bot/escalaciones?take=500");
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error("Error refreshing escalations:", err);
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    return items.filter((e) => {
      if (filterEstado !== "todos" && e.estado !== filterEstado) return false;
      if (filterRazon !== "todas" && e.razon !== filterRazon) return false;
      return true;
    });
  }, [items, filterEstado, filterRazon]);

  // Conteos por razón (solo pendientes)
  const countsByRazon = useMemo(() => {
    const counts: Record<string, number> = { todas: 0 };
    for (const e of items) {
      if (e.estado !== "pendiente") continue;
      counts.todas++;
      counts[e.razon] = (counts[e.razon] || 0) + 1;
    }
    return counts;
  }, [items]);

  async function handleAtender(id: string, phone: string, goToConv: boolean) {
    if (busy) return;
    if (goToConv) {
      // No confirm — directo a la conversación
      setBusy(id);
      try {
        const res = await fetch(`/api/admin/bot/escalaciones/${id}/atender`, {
          method: "POST",
        });
        if (res.ok) {
          // Tomar control de la conversación automáticamente
          try {
            await fetch(`/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/take-over`, {
              method: "POST",
            });
          } catch (err) {
            console.warn("No se pudo tomar control auto:", err);
          }
          // Navegar a la conversación
          router.push(`/crm/admin/bot/conversaciones/${encodeURIComponent(phone)}`);
        }
      } finally {
        setBusy(null);
      }
    } else {
      if (!confirm("¿Marcar como atendida? Esto la quita de pendientes."))
        return;
      setBusy(id);
      try {
        const res = await fetch(`/api/admin/bot/escalaciones/${id}/atender`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          alert(`Error: ${data.error}`);
        } else {
          await refreshList();
        }
      } finally {
        setBusy(null);
      }
    }
  }

  async function handleDescartar(id: string) {
    if (busy) return;
    if (!confirm("¿Descartar esta escalación? Esto la marca como falsa alarma."))
      return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/bot/escalaciones/${id}/descartar`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Error: ${data.error}`);
      } else {
        await refreshList();
      }
    } finally {
      setBusy(null);
    }
  }

  const razones = ["queja", "humano", "alto_valor", "retries", "frustracion", "facturacion"];

  return (
    <div className="space-y-4">
      {/* ─── Top toolbar: estado + auto-refresh ─── */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-md p-3">
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded text-sm font-medium"
        >
          <option value="pendiente">🔴 Solo pendientes</option>
          <option value="atendida">✅ Solo atendidas</option>
          <option value="descartada">⏭️ Solo descartadas</option>
          <option value="todos">📋 Todos los estados</option>
        </select>

        <button
          onClick={refreshList}
          disabled={refreshing}
          className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 border border-slate-300 rounded font-medium"
        >
          {refreshing ? "⏳ Actualizando..." : "🔄 Actualizar"}
        </button>

        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="w-4 h-4"
          />
          <span className={autoRefresh ? "text-emerald-700" : "text-slate-500"}>
            {autoRefresh ? "🟢 Auto-refresh activo (30s)" : "⏸️ Auto-refresh pausado"}
          </span>
        </label>

        <span className="ml-auto text-xs text-slate-400">
          Última actualización: {lastRefresh.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>

      {/* ─── Filtros pills por razón ─── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterRazon("todas")}
          className={`px-3 py-1.5 text-sm rounded-full border-2 font-medium transition-all ${
            filterRazon === "todas"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-700 border-slate-300 hover:border-slate-500"
          }`}
        >
          🌟 Todas {countsByRazon.todas > 0 ? `(${countsByRazon.todas})` : ""}
        </button>
        {razones.map((r) => {
          const count = countsByRazon[r] || 0;
          if (count === 0 && filterRazon !== r) return null; // Ocultar pills vacías
          const active = filterRazon === r;
          return (
            <button
              key={r}
              onClick={() => setFilterRazon(r)}
              className={`px-3 py-1.5 text-sm rounded-full border-2 font-medium transition-all ${
                active
                  ? `${RAZON_PILL_BG[r]} text-white border-transparent`
                  : "bg-white text-slate-700 border-slate-300 hover:border-slate-500"
              }`}
            >
              {RAZON_EMOJI[r]} {RAZON_LABELS[r]} {count > 0 ? `(${count})` : ""}
            </button>
          );
        })}
        <span className="ml-auto self-center text-xs text-slate-500 font-medium">
          {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
        </span>
      </div>

      {/* ─── Tarjetas de escalaciones ─── */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-12 text-center">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-slate-500">No hay escalaciones con este filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((e) => (
            <EscalationCard
              key={e.id}
              esc={e}
              busy={busy === e.id}
              onAtenderConv={() => handleAtender(e.id, e.phone, true)}
              onAtenderSolo={() => handleAtender(e.id, e.phone, false)}
              onDescartar={() => handleDescartar(e.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// COMPONENTE: Tarjeta de escalación
// ════════════════════════════════════════════════════════════════

function EscalationCard({
  esc,
  busy,
  onAtenderConv,
  onAtenderSolo,
  onDescartar,
}: {
  esc: Escalation;
  busy: boolean;
  onAtenderConv: () => void;
  onAtenderSolo: () => void;
  onDescartar: () => void;
}) {
  const cardBorder = RAZON_COLOR_CARD[esc.razon] || "border-slate-300 bg-white";
  const tiempo = timeAgo(esc.createdAt);
  const isPending = esc.estado === "pendiente";

  return (
    <div className={`border-2 ${cardBorder} rounded-lg p-4 space-y-3 shadow-sm`}>
      {/* Header con razón + tiempo + estado */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{RAZON_EMOJI[esc.razon]}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              {RAZON_LABELS[esc.razon] || esc.razon}
            </p>
            <p className="text-xs text-slate-500">hace {tiempo}</p>
          </div>
        </div>
        <span
          className={`inline-block px-2 py-1 text-xs font-bold uppercase border rounded ${
            ESTADO_COLORS[esc.estado] || ""
          }`}
        >
          {esc.estado}
        </span>
      </div>

      {/* Cliente */}
      <div className="bg-white/70 rounded p-2 border border-slate-200">
        <p className="font-bold text-slate-900">
          {esc.nombre || "(sin nombre registrado)"}
        </p>
        <p className="text-xs text-slate-500 font-mono">+{esc.phone}</p>
      </div>

      {/* Contexto */}
      {esc.contexto && (
        <div>
          <p className="text-xs font-bold uppercase text-slate-600 tracking-wide mb-1">
            📝 Contexto
          </p>
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{esc.contexto}</p>
        </div>
      )}

      {/* Último mensaje del cliente */}
      {esc.ultimoMsg && (
        <div className="border-l-4 border-slate-400 pl-3 py-1 bg-white/50 rounded-r">
          <p className="text-xs font-bold uppercase text-slate-600 mb-1">
            💬 Último mensaje
          </p>
          <p className="text-sm text-slate-700 italic">"{esc.ultimoMsg}"</p>
        </div>
      )}

      {/* Atendida info */}
      {esc.atendidaPor && (
        <p className="text-xs text-slate-500">
          ✅ Atendida por <strong>{esc.atendidaPor}</strong> · {fmt(esc.atendidaAt!)}
        </p>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
        {isPending ? (
          <>
            <button
              onClick={onAtenderConv}
              disabled={busy}
              className="flex-1 px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded shadow"
              title="Marca atendida + toma control + abre conversación"
            >
              {busy ? "..." : "✋ Atender y abrir"}
            </button>
            <LlamarButton phone={esc.phone} variant="secondary" size="sm" label="📞 Llamar" />
            <button
              onClick={onDescartar}
              disabled={busy}
              className="px-3 py-2 text-sm bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700 rounded"
            >
              ✗ Descartar
            </button>
            <button
              onClick={onAtenderSolo}
              disabled={busy}
              className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-600 rounded"
              title="Marca atendida sin abrir conversación"
            >
              ✓ Marcar sin abrir
            </button>
          </>
        ) : (
          <Link
            href={`/crm/admin/bot/conversaciones/${encodeURIComponent(esc.phone)}`}
            className="flex-1 text-center px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded font-medium"
          >
            💬 Ver conversación
          </Link>
        )}
      </div>

      {/* Fecha original */}
      <p className="text-xs text-slate-400 text-right">
        Creada {fmt(esc.createdAt)}
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════

function fmt(d: Date | string): string {
  try {
    const date = new Date(d);
    return date.toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function timeAgo(d: Date | string): string {
  try {
    const date = new Date(d);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}min`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  } catch {
    return "—";
  }
}