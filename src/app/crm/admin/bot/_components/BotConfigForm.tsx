"use client";

import { useState } from "react";

interface BotConfig {
  enabled?: boolean;
  percentage?: number;
  phones?: string[];
  extraInstructions?: string;
  tone?: string;
}

interface Props {
  initial: BotConfig;
}

export function BotConfigForm({ initial }: Props) {
  const [enabled, setEnabled] = useState(initial.enabled ?? false);
  const [percentage, setPercentage] = useState(initial.percentage ?? 0);
  const [phonesText, setPhonesText] = useState(
    (initial.phones ?? []).join("\n")
  );
  const [extraInstructions, setExtraInstructions] = useState(
    initial.extraInstructions ?? ""
  );
  const [tone, setTone] = useState(initial.tone ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const phones = phonesText
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/bot/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          percentage,
          phones,
          extraInstructions,
          tone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`❌ Error: ${data.error}`);
        return;
      }
      setStatus("✓ Configuración guardada");
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`❌ ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-6"
    >
      {/* Toggle global */}
      <section className="bg-white border border-slate-200 rounded-md p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5"
          />
          <div>
            <p className="text-sm font-medium text-slate-900">
              Bot v2 habilitado
            </p>
            <p className="text-xs text-slate-500">
              Si está apagado, todos los mensajes vuelven a usar el bot v1.
            </p>
          </div>
        </label>
      </section>

      {/* Slider de porcentaje */}
      <section className="bg-white border border-slate-200 rounded-md p-4">
        <label className="block">
          <div className="flex justify-between items-baseline mb-2">
            <p className="text-sm font-medium text-slate-900">
              Porcentaje de tráfico al v2
            </p>
            <p className="text-lg font-bold text-blue-600 tabular-nums">
              {percentage}%
            </p>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={percentage}
            onChange={(e) => setPercentage(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-slate-500 mt-1">
            Los clientes se eligen aleatoriamente. 0% = nadie, 100% = todos.
          </p>
        </label>
      </section>

      {/* Phones whitelist */}
      <section className="bg-white border border-slate-200 rounded-md p-4">
        <label className="block">
          <p className="text-sm font-medium text-slate-900 mb-1">
            Números siempre en v2 (whitelist)
          </p>
          <p className="text-xs text-slate-500 mb-2">
            Uno por línea, formato E.164 sin signos. Ej:{" "}
            <code>5215551234567</code>. Estos números usan v2 sin importar el
            porcentaje.
          </p>
          <textarea
            value={phonesText}
            onChange={(e) => setPhonesText(e.target.value)}
            rows={4}
            placeholder="5215551234567&#10;5215559876543"
            className="w-full text-sm font-mono border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500"
          />
        </label>
      </section>

      {/* Tono */}
      <section className="bg-white border border-slate-200 rounded-md p-4">
        <label className="block">
          <p className="text-sm font-medium text-slate-900 mb-1">
            Tono especial (opcional)
          </p>
          <p className="text-xs text-slate-500 mb-2">
            Instrucción corta sobre cómo debe hablar el bot. Se agrega al system
            prompt. Ej: "más casual de lo normal con tutearás" o "más formal".
          </p>
          <input
            type="text"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            maxLength={500}
            className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500"
          />
        </label>
      </section>

      {/* Instrucciones extra */}
      <section className="bg-white border border-slate-200 rounded-md p-4">
        <label className="block">
          <p className="text-sm font-medium text-slate-900 mb-1">
            Instrucciones extra al system prompt
          </p>
          <p className="text-xs text-slate-500 mb-2">
            Reglas adicionales para el bot. Se agregan AL FINAL del system prompt
            (después del catálogo y reglas anti-invención).
          </p>
          <textarea
            value={extraInstructions}
            onChange={(e) => setExtraInstructions(e.target.value)}
            rows={6}
            maxLength={2000}
            placeholder="Ej: Esta semana hay promoción de 10% en pedidos mayores a $5000. Menciónalo solo si el cliente está en zona caliente de compra."
            className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-slate-400 mt-1 tabular-nums">
            {extraInstructions.length} / 2000
          </p>
        </label>
      </section>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium text-sm disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
        {status && (
          <p
            className={`text-sm ${
              status.startsWith("✓") ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {status}
          </p>
        )}
      </div>
    </form>
  );
}
