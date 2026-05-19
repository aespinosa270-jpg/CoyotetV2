"use client";

import { useMemo, useState } from "react";
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

const ESTADO_COLORS: Record<string, string> = {
  pendiente: "bg-red-100 text-red-800 border-red-300",
  atendida: "bg-emerald-100 text-emerald-800 border-emerald-300",
  descartada: "bg-slate-100 text-slate-600 border-slate-300",
};

export default function EscalationsTable({ items }: { items: Escalation[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>("pendiente");
  const [filterRazon, setFilterRazon] = useState<string>("todas");

  const filtered = useMemo(() => {
    return items.filter((e) => {
      if (filterEstado !== "todos" && e.estado !== filterEstado) return false;
      if (filterRazon !== "todas" && e.razon !== filterRazon) return false;
      return true;
    });
  }, [items, filterEstado, filterRazon]);

  async function handleAtender(id: string) {
    if (busy) return;
    if (!confirm("¿Marcar como atendida? Esto la quita de pendientes pero NO libera el bot — debes liberar control desde la conversación si quieres que el bot vuelva."))
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
        router.refresh();
      }
    } finally {
      setBusy(null);
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
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 bg-white border border-slate-200 rounded-md p-3">
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded text-sm"
        >
          <option value="pendiente">Solo pendientes</option>
          <option value="atendida">Solo atendidas</option>
          <option value="descartada">Solo descartadas</option>
          <option value="todos">Todos los estados</option>
        </select>
        <select
          value={filterRazon}
          onChange={(e) => setFilterRazon(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded text-sm"
        >
          <option value="todas">Todas las razones</option>
          <option value="queja">😠 Quejas</option>
          <option value="humano">👤 Piden humano</option>
          <option value="alto_valor">💰 Alto valor</option>
          <option value="retries">🤖 Hallucinations</option>
          <option value="frustracion">😤 Repetición</option>
          <option value="facturacion">📄 Facturación</option>
        </select>
        <span className="ml-auto text-xs text-slate-500 self-center">
          {filtered.length} de {items.length} escalaciones
        </span>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-12 text-center text-slate-400">
          No hay escalaciones para este filtro.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Cliente</th>
                <th className="text-left px-3 py-2 font-medium">Razón</th>
                <th className="text-left px-3 py-2 font-medium">Contexto / Mensaje</th>
                <th className="text-left px-3 py-2 font-medium">Estado</th>
                <th className="text-left px-3 py-2 font-medium">Fecha</th>
                <th className="text-right px-3 py-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {e.nombre || "(sin nombre)"}
                    </div>
                    <div className="text-xs text-slate-400">+{e.phone}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs">
                      {RAZON_EMOJI[e.razon]} {RAZON_LABELS[e.razon] || e.razon}
                    </span>
                  </td>
                  <td className="px-3 py-2 max-w-[400px]">
                    <div className="text-xs text-slate-700 font-medium">
                      {e.contexto}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 italic truncate">
                      "{e.ultimoMsg}"
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium border rounded ${
                        ESTADO_COLORS[e.estado] || ""
                      }`}
                    >
                      {e.estado}
                    </span>
                    {e.atendidaPor && (
                      <div className="text-xs text-slate-400 mt-1">
                        por {e.atendidaPor}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {fmt(e.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-right space-x-1">
                    <Link
                      href={`/crm/admin/bot/conversaciones/${encodeURIComponent(e.phone)}`}
                      className="inline-block px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                    >
                      💬 Ver
                    </Link>
                    {e.estado === "pendiente" && (
                      <>
                        <button
                          onClick={() => handleAtender(e.id)}
                          disabled={busy === e.id}
                          className="px-2 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white rounded"
                        >
                          {busy === e.id ? "..." : "✓ Atender"}
                        </button>
                        <LlamarButton phone={e.phone} variant="secondary" size="sm" label="Llamar" />
                        <button
                          onClick={() => handleDescartar(e.id)}
                          disabled={busy === e.id}
                          className="px-2 py-1 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded"
                        >
                          ✗ Descartar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

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
