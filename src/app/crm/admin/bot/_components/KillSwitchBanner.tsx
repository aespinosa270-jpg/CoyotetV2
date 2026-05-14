"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function KillSwitchBanner() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRevive() {
    if (
      !confirm(
        "¿Re-activar bot v2? Todos los mensajes volverán a ser atendidos por el bot."
      )
    )
      return;
    setLoading(true);
    try {
      await fetch("/api/admin/bot/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revive" }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4 bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-center justify-between">
      <div>
        <p className="text-red-900 font-bold uppercase text-sm">
          🔴 Bot v2 APAGADO
        </p>
        <p className="text-red-700 text-xs">
          El kill switch está activado. Los mensajes están yendo al bot v1
          legacy.
        </p>
      </div>
      <button
        onClick={handleRevive}
        disabled={loading}
        className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 text-sm font-semibold"
      >
        {loading ? "Re-activando..." : "🟢 Re-activar v2"}
      </button>
    </div>
  );
}
