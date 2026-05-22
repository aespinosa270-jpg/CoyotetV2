"use client";

import { useEffect, useState, useCallback } from "react";

type Item = { title: string; quantity: number; unit: string | null };
type Order = {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  customerName: string;
  customerPhone: string | null;
  sourcingStatus: string | null;
  sourcingDays: number | null;
  sourcingPromisedAt: string | null;
  sourcingResolvedAt: string | null;
  sourcingInternalNotes: string | null;
  createdAt: string;
  items: Item[];
  totalKg: number;
  diasTranscurridos: number;
  diasRestantes: number;
  isOverdue: boolean;
};

type Counts = {
  pending: number;
  inProgress: number;
  resolved: number;
  failed: number;
  total: number;
};

const STATUS_FILTER = [
  { value: "ACTIVE", label: "Activas (Pending + In progress)" },
  { value: "PENDING", label: "Pendientes" },
  { value: "IN_PROGRESS", label: "En proceso" },
  { value: "RESOLVED", label: "Resueltas" },
  { value: "FAILED", label: "Fallidas" },
  { value: "ALL", label: "Todas" },
];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SourcingQueueClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ACTIVE");
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ status: string; notes: string; days: string }>({
    status: "",
    notes: "",
    days: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sourcing-queue?status=${filter}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setOrders(data.orders);
      setCounts(data.counts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function startEdit(o: Order) {
    setEditing(o.id);
    setEditForm({
      status: o.sourcingStatus ?? "PENDING",
      notes: o.sourcingInternalNotes ?? "",
      days: String(o.sourcingDays ?? ""),
    });
  }

  async function saveEdit(orderId: string) {
    const body: any = {
      sourcingStatus: editForm.status,
      sourcingInternalNotes: editForm.notes || null,
    };
    const daysNum = Number(editForm.days);
    if (!isNaN(daysNum) && daysNum > 0) {
      body.sourcingDays = daysNum;
    }

    const res = await fetch(`/api/admin/sourcing-queue/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setEditing(null);
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`Error: ${err.error ?? res.status}`);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {counts && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
            <div className="text-2xl font-bold text-amber-800">{counts.pending}</div>
            <div className="text-xs uppercase text-amber-700">Pendientes</div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center">
            <div className="text-2xl font-bold text-blue-800">{counts.inProgress}</div>
            <div className="text-xs uppercase text-blue-700">En proceso</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
            <div className="text-2xl font-bold text-emerald-800">{counts.resolved}</div>
            <div className="text-xs uppercase text-emerald-700">Resueltas</div>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
            <div className="text-2xl font-bold text-red-800">{counts.failed}</div>
            <div className="text-xs uppercase text-red-700">Fallidas</div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
            <div className="text-2xl font-bold text-neutral-900">{counts.total}</div>
            <div className="text-xs uppercase text-neutral-600">Total</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          {STATUS_FILTER.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={fetchData}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs hover:bg-neutral-50"
        >
          ↻ Refrescar
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Orden</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Cantidad</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Prometido</th>
              <th className="px-4 py-3">Días restantes</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-neutral-500">Cargando…</td></tr>
            )}
            {!loading && orders.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-neutral-500">Sin órdenes en este estado.</td></tr>
            )}
            {!loading && orders.map((o) => {
              const isEditing = editing === o.id;
              const cls = STATUS_STYLES[o.sourcingStatus ?? "PENDING"] ?? "bg-neutral-100 text-neutral-700";

              return (
                <>
                  <tr key={o.id} className={o.isOverdue ? "bg-red-50/40" : "hover:bg-amber-50/40"}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{o.orderNumber}</div>
                      <div className="text-xs text-neutral-500">${o.total.toLocaleString("es-MX")}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-neutral-900">{o.customerName || "Cliente bot"}</div>
                      <div className="text-xs text-neutral-500">{o.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-neutral-900">{o.totalKg.toLocaleString("es-MX")} kg</div>
                      <div className="text-xs text-neutral-500">{o.items.length} item{o.items.length !== 1 ? "s" : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{o.sourcingStatus}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600">
                      {fmtDate(o.sourcingPromisedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {o.sourcingStatus === "RESOLVED" ? (
                        <span className="text-emerald-700">✓ Resuelta</span>
                      ) : o.isOverdue ? (
                        <span className="font-semibold text-red-700">⚠ Vencida ({Math.abs(o.diasRestantes)}d)</span>
                      ) : (
                        <span className="text-neutral-700">{o.diasRestantes}d</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => isEditing ? setEditing(null) : startEdit(o)}
                        className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-amber-500"
                      >
                        {isEditing ? "Cancelar" : "Resolver"}
                      </button>
                    </td>
                  </tr>
                  {isEditing && (
                    <tr key={`${o.id}-edit`}>
                      <td colSpan={7} className="bg-neutral-50 px-4 py-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-neutral-600">Estado</label>
                            <select
                              value={editForm.status}
                              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="IN_PROGRESS">IN_PROGRESS</option>
                              <option value="RESOLVED">RESOLVED</option>
                              <option value="FAILED">FAILED</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-neutral-600">Días estimados (opcional)</label>
                            <input
                              type="number"
                              value={editForm.days}
                              onChange={(e) => setEditForm({ ...editForm, days: e.target.value })}
                              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                              min={1}
                            />
                          </div>
                          <div className="flex items-end justify-end">
                            <button
                              onClick={() => saveEdit(o.id)}
                              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                            >
                              Guardar cambios
                            </button>
                          </div>
                          <div className="md:col-span-3">
                            <label className="mb-1 block text-xs font-medium text-neutral-600">Notas internas</label>
                            <textarea
                              value={editForm.notes}
                              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                              placeholder='Ej: "Proveedor Puebla confirmó 800kg para el martes"'
                              className="w-full rounded-lg border border-neutral-300 p-2 text-sm"
                              rows={3}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}