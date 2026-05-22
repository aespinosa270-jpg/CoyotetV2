"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Contact = {
  id: string;
  phone: string;
  nombre: string | null;
  empresa: string | null;
  status: string;
  engagementScore: number;
  reactivationPriority: number;
  totalAttempts: number;
  lastAttemptAt: string | null;
  nextFollowUpAt: string | null;
  clienteRespondio: boolean;
  tags: string[];
  assignedToEmployee: { id: string; name: string; email: string } | null;
  _count: { attempts: number; feedbacks: number };
  updatedAt: string;
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "CONTACTED", label: "Contactados" },
  { value: "INTERESTED", label: "Interesados" },
  { value: "CONVERTED", label: "Convertidos" },
  { value: "LOST", label: "Perdidos" },
  { value: "DO_NOT_CONTACT", label: "No contactar" },
];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-neutral-100 text-neutral-700",
  CONTACTED: "bg-blue-100 text-blue-700",
  INTERESTED: "bg-emerald-100 text-emerald-700",
  CONVERTED: "bg-purple-100 text-purple-700",
  LOST: "bg-red-100 text-red-700",
  DO_NOT_CONTACT: "bg-neutral-800 text-white",
};

function priorityBadge(score: number) {
  if (score >= 60) return { label: "🔥 Alta", cls: "bg-orange-100 text-orange-700" };
  if (score >= 30) return { label: "⚡ Media", cls: "bg-amber-100 text-amber-700" };
  return { label: "· Baja", cls: "bg-neutral-100 text-neutral-600" };
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SalesAgentTable() {
  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [status, setStatus] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [minPriority, setMinPriority] = useState(0);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("priority");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (assignedTo) params.set("assignedTo", assignedTo);
    if (minPriority > 0) params.set("minPriority", String(minPriority));
    if (search.trim()) params.set("search", search.trim());
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    params.set("sortBy", sortBy);

    try {
      const res = await fetch(`/api/admin/sales-agent/contacts?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items);
      setTotal(data.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [status, assignedTo, minPriority, search, page, pageSize, sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [status, assignedTo, minPriority, sortBy]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Asignado a</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="unassigned">Sin asignar</option>
              <option value="me">A mí</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Prioridad mín ({minPriority})
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={minPriority}
              onChange={(e) => setMinPriority(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Ordenar por</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            >
              <option value="priority">Prioridad (alta→baja)</option>
              <option value="recent">Más recientes</option>
              <option value="attempts">Menos intentos primero</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Buscar</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchData()}
              placeholder="phone/nombre/empresa"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-neutral-600">
        <span>
          <strong className="text-neutral-900">{total}</strong> contactos · página {page} de {totalPages}
        </span>
        <button
          onClick={fetchData}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs hover:bg-neutral-50"
        >
          ↻ Refrescar
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Prioridad</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Engagement</th>
                <th className="px-4 py-3">Intentos</th>
                <th className="px-4 py-3">Asignado</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-neutral-500">Cargando…</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-neutral-500">Sin contactos con estos filtros.</td></tr>
              )}
              {!loading && items.map((c) => {
                const p = priorityBadge(c.reactivationPriority);
                const statusCls = STATUS_STYLES[c.status] ?? "bg-neutral-100 text-neutral-700";
                const displayName = c.nombre && !/^\d+$/.test(c.nombre) ? c.nombre : null;
                return (
                  <tr key={c.id} className="hover:bg-amber-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${p.cls}`}>{p.label}</span>
                        <span className="text-xs tabular-nums text-neutral-500">{c.reactivationPriority}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{displayName ?? c.phone}</div>
                      {displayName && <div className="text-xs text-neutral-500">{c.phone}</div>}
                      {c.empresa && <div className="text-xs text-neutral-500">{c.empresa}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusCls}`}>{c.status}</span>
                      {c.clienteRespondio && (
                        <span className="ml-1 text-xs text-emerald-600" title="Respondió">✓</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-neutral-700">{c.engagementScore}</td>
                    <td className="px-4 py-3 tabular-nums text-neutral-700">{c.totalAttempts}</td>
                    <td className="px-4 py-3">
                      {c.assignedToEmployee ? (
                        <span className="text-xs text-neutral-700">{c.assignedToEmployee.name}</span>
                      ) : (
                        <span className="text-xs italic text-neutral-400">sin asignar</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 2).map((t) => (
                          <span key={t} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">{t}</span>
                        ))}
                        {c.tags.length > 2 && <span className="text-[10px] text-neutral-400">+{c.tags.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/crm/admin/bot/sales-agent/${c.id}`}
                        className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-amber-500"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-neutral-50"
        >← Anterior</button>
        <span className="text-neutral-600">Página {page} de {totalPages}</span>
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-neutral-50"
        >Siguiente →</button>
      </div>
    </div>
  );
}