"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const FLUJO: { status: string; label: string }[] = [
  { status: "PENDING", label: "Pendiente pago" },
  { status: "PAID", label: "Pagada" },
  { status: "PROCESSING", label: "Preparando" },
  { status: "SHIPPED", label: "Enviada" },
  { status: "DELIVERED", label: "Entregada" },
];

export default function OrdenesActions({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function setStatus(newStatus: string) {
    if (loading) return;
    if (newStatus === "CANCELLED" && !confirm("¿Cancelar esta orden? No se puede deshacer.")) return;
    setLoading(true);
    setMenuOpen(false);
    try {
      const res = await fetch(`/api/admin/bot/ordenes/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) router.refresh();
      else { const d = await res.json(); alert(`Error: ${d.error ?? "no se pudo actualizar"}`); }
    } catch (err) { alert(`Error: ${err}`); }
    finally { setLoading(false); }
  }

  // Estados terminales: solo permitir reabrir vía selector
  const esTerminal = ["CANCELLED", "FAILED"].includes(currentStatus);

  return (
    <div className="flex gap-1.5 justify-end items-center" ref={ref}>
      {/* Boton rapido PAGADA (solo si esta pendiente) */}
      {currentStatus === "PENDING" && (
        <button
          disabled={loading}
          onClick={() => setStatus("PAID")}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50 transition whitespace-nowrap"
        >
          {loading ? "…" : "✓ Pagada"}
        </button>
      )}

      {/* Selector de status (cualquier estado) */}
      <div className="relative">
        <button
          disabled={loading}
          onClick={() => setMenuOpen((v) => !v)}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-[#22272f] text-zinc-300 border border-[#2c323b] hover:border-amber-400/40 hover:text-amber-300 disabled:opacity-50 transition flex items-center gap-1.5"
        >
          Cambiar ▾
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-9 z-50 w-44 rounded-xl border border-[#2c323b] bg-[#15181d] shadow-2xl py-1">
            {FLUJO.map((f) => (
              <button
                key={f.status}
                onClick={() => setStatus(f.status)}
                disabled={f.status === currentStatus}
                className={`w-full text-left px-3 py-2 text-xs transition ${
                  f.status === currentStatus
                    ? "text-amber-300 bg-amber-400/10 cursor-default font-semibold"
                    : "text-zinc-300 hover:bg-[#22272f]"
                }`}
              >
                {f.status === currentStatus ? "● " : ""}{f.label}
              </button>
            ))}
            <div className="border-t border-[#22272f] my-1" />
            <button
              onClick={() => setStatus("CANCELLED")}
              disabled={esTerminal}
              className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 disabled:opacity-40 transition"
            >
              Cancelar orden
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
