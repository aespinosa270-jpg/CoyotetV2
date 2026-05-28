"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  pendingCount: number;
}

export default function SendAllButton({ pendingCount }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [plantilla, setPlantilla] = useState<"BIENVENIDA" | "OFERTA_REACTIVACION">("BIENVENIDA");
  const [result, setResult] = useState<{
    enviados: number;
    fallidos: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (pendingCount === 0) {
    return (
      <div className="px-4 py-2 bg-slate-100 text-slate-500 text-sm rounded">
        ✓ No hay contactos pendientes
      </div>
    );
  }

  async function handleSend() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/bot/contactos/send-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey: plantilla }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en envío masivo");
      setResult({
        enviados: data.enviados,
        fallidos: data.fallidos,
        total: data.total,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={busy}
        className="px-4 py-2 bg-[#FDCB02] hover:bg-amber-400 disabled:bg-slate-300 text-slate-900 text-sm font-bold rounded shadow"
      >
        📤 Enviar plantilla a {pendingCount} contacto{pendingCount !== 1 ? "s" : ""} pendiente{pendingCount !== 1 ? "s" : ""}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Confirmar envío masivo
            </h2>

            {!result && !error && (
              <>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Plantilla a enviar:
                </label>
                <select
                  value={plantilla}
                  onChange={(e) => setPlantilla(e.target.value as "BIENVENIDA" | "OFERTA_REACTIVACION")}
                  disabled={busy}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white mb-3"
                >
                  <option value="BIENVENIDA">Bienvenida (saludo inicial)</option>
                  <option value="OFERTA_REACTIVACION">Oferta de reactivación (clientes fríos)</option>
                </select>
                <p className="text-sm text-slate-700">
                  Se enviará la plantilla{" "}
                  <strong>
                    {plantilla === "BIENVENIDA" ? "bienvenida" : "oferta_de_reactivacion"}
                  </strong>{" "}
                  a <strong>{pendingCount}</strong> contactos que cumplen una de:
                </p>
                <ul className="text-xs text-slate-600 list-disc ml-5 space-y-1">
                  <li>Nunca han recibido plantilla</li>
                  <li>Recibieron plantilla pero NO han respondido</li>
                </ul>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  ⚠️ Esto tomará aproximadamente{" "}
                  <strong>{Math.ceil((pendingCount * 0.3) / 60)} minutos</strong>.
                  No cierres la pestaña hasta que termine.
                </p>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={busy}
                    className="px-4 py-2 text-sm bg-slate-200 hover:bg-slate-300 rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={busy}
                    className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded"
                  >
                    {busy ? "Enviando..." : "✓ Confirmar envío"}
                  </button>
                </div>
              </>
            )}

            {busy && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin h-8 w-8 border-4 border-amber-400 border-t-transparent rounded-full mb-2"></div>
                <p className="text-sm text-slate-600">
                  Enviando plantillas... no cierres la pestaña.
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-2">
                <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm">
                  <p className="font-bold text-emerald-900">
                    ✅ Envío completado
                  </p>
                  <p className="text-emerald-700 mt-1">
                    Total procesados: <strong>{result.total}</strong>
                  </p>
                  <p className="text-emerald-700">
                    Enviados exitosamente: <strong>{result.enviados}</strong>
                  </p>
                  {result.fallidos > 0 && (
                    <p className="text-red-700">
                      Fallidos: <strong>{result.fallidos}</strong>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setResult(null);
                  }}
                  className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold rounded"
                >
                  Cerrar
                </button>
              </div>
            )}

            {error && (
              <div className="space-y-2">
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                  <p className="font-bold text-red-900">❌ Error</p>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                  }}
                  className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold rounded"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
