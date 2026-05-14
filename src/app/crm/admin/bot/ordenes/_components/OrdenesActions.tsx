"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NEXT_STATUS: Record<string, { status: string; label: string }[]> = {
  PENDING: [
    { status: "CANCELLED", label: "Cancelar" },
  ],
  PAID: [
    { status: "PROCESSING", label: "📦 Preparar" },
    { status: "CANCELLED", label: "Cancelar" },
  ],
  PROCESSING: [
    { status: "SHIPPED", label: "🚚 Marcar enviada" },
  ],
  SHIPPED: [
    { status: "DELIVERED", label: "✅ Marcar entregada" },
  ],
};

export default function OrdenesActions({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const transitions = NEXT_STATUS[currentStatus] ?? [];
  if (transitions.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  async function handleAction(newStatus: string) {
    if (loading) return;
    if (newStatus === "CANCELLED") {
      if (!confirm("¿Cancelar esta orden? No se puede deshacer.")) return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bot/ordenes/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error ?? "no se pudo actualizar"}`);
      }
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-1 justify-end">
      {transitions.map((t) => (
        <button
          key={t.status}
          disabled={loading}
          onClick={() => handleAction(t.status)}
          className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
