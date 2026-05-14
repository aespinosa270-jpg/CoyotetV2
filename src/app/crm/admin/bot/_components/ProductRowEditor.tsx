"use client";

import { useState } from "react";

interface Props {
  productId: string;
  nombre: string;
  categoria: string;
  precioMenudeo: number;
  precioMayoreo: number;
  hidden: boolean;
}

export function ProductRowEditor({
  productId,
  nombre,
  categoria,
  precioMenudeo: initMenudeo,
  precioMayoreo: initMayoreo,
  hidden: initHidden,
}: Props) {
  const [menudeo, setMenudeo] = useState(initMenudeo);
  const [mayoreo, setMayoreo] = useState(initMayoreo);
  const [hidden, setHidden] = useState(initHidden);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  async function savePartial(patch: Record<string, unknown>) {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/admin/bot/catalog-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, ...patch }),
      });
      setStatus(res.ok ? "ok" : "error");
      // Auto-fade del status después de 2s
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  function onBlurMenudeo() {
    if (menudeo !== initMenudeo) savePartial({ precioMenudeo: menudeo });
  }
  function onBlurMayoreo() {
    if (mayoreo !== initMayoreo) savePartial({ precioMayoreo: mayoreo });
  }
  function toggleHidden() {
    const next = !hidden;
    setHidden(next);
    savePartial({ hidden: next });
  }

  const rowClass = hidden ? "opacity-50" : "";
  const statusBadge =
    status === "ok" ? (
      <span className="text-xs text-emerald-600">✓</span>
    ) : status === "error" ? (
      <span className="text-xs text-red-600">✗</span>
    ) : saving ? (
      <span className="text-xs text-slate-400">…</span>
    ) : null;

  return (
    <tr className={`hover:bg-slate-50 ${rowClass}`}>
      <td className="px-3 py-2">
        <div className="text-sm font-medium text-slate-900">{nombre}</div>
        <code className="text-xs text-slate-400">{productId}</code>
      </td>
      <td className="px-3 py-2 text-xs text-slate-600 capitalize">
        {categoria}
      </td>
      <td className="px-3 py-2 text-right">
        <PriceInput
          value={menudeo}
          onChange={setMenudeo}
          onBlur={onBlurMenudeo}
        />
      </td>
      <td className="px-3 py-2 text-right">
        <PriceInput
          value={mayoreo}
          onChange={setMayoreo}
          onBlur={onBlurMayoreo}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <button
          type="button"
          onClick={toggleHidden}
          className={`text-xs px-2 py-1 rounded ${
            hidden
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {hidden ? "Oculto" : "Visible"}
        </button>
      </td>
      <td className="px-3 py-2 w-8">{statusBadge}</td>
    </tr>
  );
}

function PriceInput({
  value,
  onChange,
  onBlur,
}: {
  value: number;
  onChange: (n: number) => void;
  onBlur: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <span className="text-xs text-slate-400">$</span>
      <input
        type="number"
        step="1"
        min="0"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onBlur={onBlur}
        className="w-20 text-right text-sm border border-slate-200 rounded px-1.5 py-0.5 tabular-nums focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
