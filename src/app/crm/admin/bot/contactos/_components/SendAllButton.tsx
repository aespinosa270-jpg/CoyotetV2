"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  pendingCount: number;
}

type Progreso = {
  total: number;
  procesados: number;
  enviados: number;
  fallidos: number;
};

export default function SendAllButton({ pendingCount }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [plantilla, setPlantilla] = useState<"BIENVENIDA" | "OFERTA_REACTIVACION">("BIENVENIDA");
  const [corriendo, setCorriendo] = useState(false);
  const [prog, setProg] = useState<Progreso | null>(null);
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelar = useRef(false);

  async function correrCampana() {
    setCorriendo(true);
    setError(null);
    setHecho(false);
    cancelar.current = false;
    setProg({ total: 0, procesados: 0, enviados: 0, fallidos: 0 });

    let offset = 0;
    let total = 0;
    let enviados = 0;
    let fallidos = 0;

    try {
      // Bucle de tandas: llama al endpoint hasta done=true
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (cancelar.current) break;

        const res = await fetch("/api/admin/bot/contactos/send-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateKey: plantilla, offset, batchSize: 25 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error en la tanda");

        total = data.total;
        enviados += data.batchEnviados;
        fallidos += data.batchFallidos;
        offset = data.nextOffset;

        setProg({ total, procesados: offset, enviados, fallidos });

        if (data.done) break;

        // Respiro entre tandas (ademas del goteo interno del endpoint)
        await new Promise((r) => setTimeout(r, 800));
      }
      setHecho(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCorriendo(false);
    }
  }

  function cerrar() {
    cancelar.current = true;
    setShowModal(false);
    setProg(null);
    setHecho(false);
    setError(null);
  }

  const pct = prog && prog.total > 0 ? Math.round((prog.procesados / prog.total) * 100) : 0;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-[#FDCB02] hover:bg-amber-400 text-slate-900 text-sm font-bold rounded shadow"
      >
        📤 Enviar plantilla a toda la cartera
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Campaña a toda la cartera</h2>

            {!corriendo && !hecho && !error && (
              <>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plantilla a enviar:</label>
                <select
                  value={plantilla}
                  onChange={(e) => setPlantilla(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white mb-2"
                >
                  <option value="BIENVENIDA">Bienvenida (saludo inicial)</option>
                  <option value="OFERTA_REACTIVACION">Oferta de reactivación</option>
                </select>
                <p className="text-sm text-slate-700">
                  Se enviará la plantilla a <strong>TODA la cartera</strong>, en tandas de 25 con goteo seguro.
                </p>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  ⚠️ Va en lotes para proteger el número de WhatsApp. Puedes cerrar el modal y volver; pero si cierras durante el envío, se detiene donde iba.
                </p>
                <div className="flex gap-2 justify-end">
                  <button onClick={cerrar} className="px-4 py-2 text-sm bg-slate-200 hover:bg-slate-300 rounded">Cancelar</button>
                  <button onClick={correrCampana} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded">
                    ✓ Iniciar campaña
                  </button>
                </div>
              </>
            )}

            {(corriendo || (prog && !hecho && !error)) && (
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-3xl font-black text-slate-900">{pct}%</div>
                  <div className="text-sm text-slate-600">
                    {prog?.procesados ?? 0} de {prog?.total ?? 0} contactos
                  </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div className="bg-emerald-500 h-3 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-around text-sm">
                  <span className="text-emerald-700">✅ {prog?.enviados ?? 0} enviados</span>
                  {(prog?.fallidos ?? 0) > 0 && <span className="text-red-600">❌ {prog?.fallidos} fallidos</span>}
                </div>
                <button onClick={cerrar} className="w-full px-4 py-2 text-sm bg-slate-200 hover:bg-slate-300 rounded">
                  Detener y cerrar
                </button>
              </div>
            )}

            {hecho && prog && (
              <div className="space-y-2">
                <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm">
                  <p className="font-bold text-emerald-900">✅ Campaña completada</p>
                  <p className="text-emerald-700 mt-1">Enviados: <strong>{prog.enviados}</strong> de {prog.total}</p>
                  {prog.fallidos > 0 && <p className="text-red-700">Fallidos: <strong>{prog.fallidos}</strong></p>}
                </div>
                <button onClick={cerrar} className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold rounded">Cerrar</button>
              </div>
            )}

            {error && (
              <div className="space-y-2">
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                  <p className="font-bold text-red-900">❌ Error</p>
                  <p className="text-red-700 mt-1">{error}</p>
                  {prog && <p className="text-slate-600 mt-1">Alcanzó a enviar {prog.enviados} antes de fallar.</p>}
                </div>
                <button onClick={cerrar} className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold rounded">Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
