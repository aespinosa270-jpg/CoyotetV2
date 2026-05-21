"use client";

import { useState } from "react";

type AnalysisData = {
  situacion: string;
  estrategia: string;
  mensaje: string;
  mensajesAlternativos: {
    suave: string;
    directo: string;
  };
  meta: {
    model: string;
    cached: boolean;
    generatedAt: string;
    costUSD?: number;
  };
};

export default function AnalysisResult({
  contactId,
  onMessageSent,
}: {
  contactId: string;
  onMessageSent?: () => void;
}) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<"principal" | "suave" | "directo">("principal");
  const [copied, setCopied] = useState(false);
  const [marking, setMarking] = useState(false);

  async function analyze(force = false) {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/sales-agent/contacts/${contactId}/analyze${force ? "?force=1" : ""}`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setSelectedVariant("principal");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyMessage() {
    if (!data) return;
    const msg =
      selectedVariant === "suave"
        ? data.mensajesAlternativos.suave
        : selectedVariant === "directo"
        ? data.mensajesAlternativos.directo
        : data.mensaje;

    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function markAsSent() {
    if (!data) return;
    setMarking(true);
    try {
      const msg =
        selectedVariant === "suave"
          ? data.mensajesAlternativos.suave
          : selectedVariant === "directo"
          ? data.mensajesAlternativos.directo
          : data.mensaje;

      const res = await fetch(`/api/admin/sales-agent/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CONTACTED",
          notas: `[IA enviada ${new Date().toLocaleDateString("es-MX")}]\n${msg}`,
        }),
      });

      if (res.ok) {
        alert("Marcado como enviado. Status -> CONTACTED.");
        onMessageSent?.();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error: ${err.error ?? res.status}`);
      }
    } finally {
      setMarking(false);
    }
  }

  // Estado inicial — solo botón
  if (!data && !loading) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-amber-700">
          🧠 Análisis IA del contacto
        </h3>
        <p className="mb-4 text-sm text-amber-900">
          GPT-4o analiza el perfil completo del cliente (notas, historial, órdenes previas,
          intentos, feedback) y genera un mensaje de WhatsApp listo para enviar, alineado
          con la voz de Coyote.
        </p>
        {error && (
          <div className="mb-3 rounded-lg bg-red-100 p-3 text-sm text-red-800">
            ❌ {error}
          </div>
        )}
        <button
          onClick={() => analyze()}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
        >
          🧠 Analizar con IA
        </button>
        <p className="mt-2 text-xs text-amber-700">
          Costo aproximado: $0.005 USD por análisis. Resultado se cachea 24h.
        </p>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-amber-900">
            Analizando contacto con GPT-4o…
          </p>
        </div>
        <p className="mt-2 text-xs text-amber-700">
          Procesando perfil + historial + órdenes + intentos previos. ~10-15 segundos.
        </p>
      </div>
    );
  }

  // Resultado completo
  if (!data) return null;

  const mensajeMostrado =
    selectedVariant === "suave"
      ? data.mensajesAlternativos.suave
      : selectedVariant === "directo"
      ? data.mensajesAlternativos.directo
      : data.mensaje;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2">
        <div className="text-xs text-amber-800">
          <strong>🧠 CRM Sales Agent v1.0</strong> · Modelo: {data.meta.model}
          {data.meta.cached && <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5">cached</span>}
          {data.meta.costUSD && (
            <span className="ml-2 text-amber-600">
              ${data.meta.costUSD.toFixed(4)} USD
            </span>
          )}
        </div>
        <button
          onClick={() => analyze(true)}
          className="rounded-md border border-amber-400 bg-white px-2 py-1 text-xs text-amber-700 hover:bg-amber-100"
        >
          🔄 Re-analizar
        </button>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-700">
          📊 Situación
        </h4>
        <p className="whitespace-pre-wrap text-sm text-neutral-900">{data.situacion}</p>
      </div>

      <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-purple-700">
          🎯 Estrategia
        </h4>
        <p className="whitespace-pre-wrap text-sm text-neutral-900">{data.estrategia}</p>
      </div>

      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            💬 Mensaje listo para WhatsApp
          </h4>
          <div className="flex gap-1 rounded-lg border border-emerald-300 bg-white p-1 text-xs">
            <button
              onClick={() => setSelectedVariant("suave")}
              className={`rounded px-2 py-1 ${
                selectedVariant === "suave"
                  ? "bg-emerald-500 text-white"
                  : "text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Suave
            </button>
            <button
              onClick={() => setSelectedVariant("principal")}
              className={`rounded px-2 py-1 ${
                selectedVariant === "principal"
                  ? "bg-emerald-500 text-white"
                  : "text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              ⭐ Principal
            </button>
            <button
              onClick={() => setSelectedVariant("directo")}
              className={`rounded px-2 py-1 ${
                selectedVariant === "directo"
                  ? "bg-emerald-500 text-white"
                  : "text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Directo
            </button>
          </div>
        </div>

        <div className="mb-3 rounded-lg border border-emerald-200 bg-white p-3">
          <p className="whitespace-pre-wrap text-sm text-neutral-900">{mensajeMostrado}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyMessage}
            className="flex-1 rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            {copied ? "✓ Copiado" : "📋 Copiar mensaje"}
          </button>
          <button
            onClick={markAsSent}
            disabled={marking}
            className="rounded-md border border-emerald-400 bg-white px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            {marking ? "Guardando…" : "✉ Marcar como enviado"}
          </button>
        </div>
      </div>
    </div>
  );
}