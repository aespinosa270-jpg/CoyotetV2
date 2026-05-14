"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function KillSwitchButton() {
  const router = useRouter();
  const [killed, setKilled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/bot/kill-switch")
      .then((r) => r.json())
      .then((d) => setKilled(d.killed))
      .catch(() => setKilled(false));
  }, []);

  async function handleAction(action: "kill" | "revive") {
    if (action === "kill") {
      if (
        !confirm(
          "⚠️ ¿APAGAR el bot v2? Todos los clientes nuevos serán atendidos por el v1 legacy hasta que reactives. Esto se aplica en <10 segundos."
        )
      )
        return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bot/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setKilled(action === "kill");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (killed === null) {
    return <div className="text-slate-400 text-sm">Cargando estado...</div>;
  }

  return (
    <div
      className={`p-4 border-2 rounded-lg ${
        killed
          ? "bg-red-50 border-red-300"
          : "bg-emerald-50 border-emerald-300"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg">
            {killed ? "🔴 Bot v2 APAGADO" : "🟢 Bot v2 ACTIVO 100%"}
          </h3>
          <p className="text-sm mt-1">
            {killed
              ? "Los mensajes están siendo atendidos por el bot v1 legacy."
              : "Todos los mensajes de WhatsApp son atendidos por el bot v2."}
          </p>
          <p className="text-xs text-slate-600 mt-2">
            Este kill switch se aplica en <strong>menos de 10 segundos</strong>{" "}
            sin necesidad de redeploy.
          </p>
        </div>
        <button
          onClick={() => handleAction(killed ? "revive" : "kill")}
          disabled={loading}
          className={`px-4 py-2 rounded font-semibold text-sm whitespace-nowrap disabled:opacity-50 ${
            killed
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {loading
            ? "..."
            : killed
              ? "🟢 Re-activar"
              : "🔴 Apagar v2 (emergency)"}
        </button>
      </div>
    </div>
  );
}
