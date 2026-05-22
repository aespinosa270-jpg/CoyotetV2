"use client";

import { useEffect, useState } from "react";

type BrandVoice = {
  tone?: string;
  allowedPhrases?: string[];
  forbiddenPhrases?: string[];
  emojis?: string[];
  signature?: string;
  structuralRules?: string;
  extraNotes?: string;
  updatedAt?: string;
  updatedBy?: string;
};

const DEFAULT_VOICE: BrandVoice = {
  tone: "directo, cálido, profesional pero NO empalagoso. Habla de tú.",
  allowedPhrases: [
    "te confirmo",
    "claro que sí",
    "te dejo agendado",
    "perfecto",
    "va!",
  ],
  forbiddenPhrases: [
    "Espero que te encuentres bien",
    "Cordialmente",
    "Quedo a sus órdenes",
    "Estimado cliente",
  ],
  emojis: ["🐺", "🔥", "✅", "📦"],
  signature: "Jack de Coyote",
  structuralRules:
    "Max 4-5 líneas en WhatsApp. Termina con UNA pregunta SÍ/NO. NUNCA bullets ni listas largas en WA.",
  extraNotes: "",
};

export default function VozDeMarcaClient() {
  const [voice, setVoice] = useState<BrandVoice>(DEFAULT_VOICE);
  const [original, setOriginal] = useState<BrandVoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Inputs string para arrays (texto separado por nueva línea)
  const [allowedInput, setAllowedInput] = useState("");
  const [forbiddenInput, setForbiddenInput] = useState("");
  const [emojisInput, setEmojisInput] = useState("");

  useEffect(() => {
    fetch("/api/admin/brand-voice", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const loaded = data.brandVoice ?? DEFAULT_VOICE;
        setVoice(loaded);
        setOriginal(data.brandVoice);
        setAllowedInput((loaded.allowedPhrases ?? []).join("\n"));
        setForbiddenInput((loaded.forbiddenPhrases ?? []).join("\n"));
        setEmojisInput((loaded.emojis ?? []).join(" "));
        if (loaded.updatedAt) setSavedAt(loaded.updatedAt);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const payload: BrandVoice = {
        tone: voice.tone,
        signature: voice.signature,
        structuralRules: voice.structuralRules,
        extraNotes: voice.extraNotes,
        allowedPhrases: allowedInput.split("\n").map((s) => s.trim()).filter(Boolean),
        forbiddenPhrases: forbiddenInput.split("\n").map((s) => s.trim()).filter(Boolean),
        emojis: emojisInput.split(/\s+/).map((s) => s.trim()).filter(Boolean),
      };

      const res = await fetch("/api/admin/brand-voice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Error: ${err.error ?? res.status}`);
        return;
      }

      const data = await res.json();
      alert("Voz de marca guardada ✓\nEl bot la usará en <60s.");
      setSavedAt(data.brandVoice.updatedAt);
      setOriginal(data.brandVoice);
    } finally {
      setSaving(false);
    }
  }

  function resetDefaults() {
    if (!confirm("¿Restablecer voz de marca a los defaults sugeridos?")) return;
    setVoice(DEFAULT_VOICE);
    setAllowedInput((DEFAULT_VOICE.allowedPhrases ?? []).join("\n"));
    setForbiddenInput((DEFAULT_VOICE.forbiddenPhrases ?? []).join("\n"));
    setEmojisInput((DEFAULT_VOICE.emojis ?? []).join(" "));
  }

  if (loading) {
    return <div className="rounded-xl bg-white p-8 text-center text-neutral-500">Cargando…</div>;
  }

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      {savedAt && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          ✓ Última actualización: <strong>{new Date(savedAt).toLocaleString("es-MX")}</strong>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <label className="block text-sm font-semibold text-neutral-900 mb-1">
          🎙 Tono general
        </label>
        <p className="text-xs text-neutral-600 mb-2">
          ¿Cómo suena el bot? Una frase. Ej: "directo, cálido, profesional pero NO empalagoso. Habla de tú."
        </p>
        <textarea
          value={voice.tone ?? ""}
          onChange={(e) => setVoice({ ...voice, tone: e.target.value })}
          className="w-full rounded-lg border border-neutral-300 p-3 text-sm"
          rows={2}
          placeholder="ej: directo, cálido, profesional pero NO empalagoso"
        />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <label className="block text-sm font-semibold text-neutral-900 mb-1">
          ✍ Firma
        </label>
        <p className="text-xs text-neutral-600 mb-2">
          ¿Como quién habla el bot? Ej: "Jack de Coyote". Esto se inyecta al prompt.
        </p>
        <input
          value={voice.signature ?? ""}
          onChange={(e) => setVoice({ ...voice, signature: e.target.value })}
          className="w-full rounded-lg border border-neutral-300 p-2 text-sm"
          placeholder="Jack de Coyote"
        />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <label className="block text-sm font-semibold text-neutral-900 mb-1">
          📏 Reglas estructurales
        </label>
        <p className="text-xs text-neutral-600 mb-2">
          Sobre formato y longitud. Ej: "Max 4-5 líneas. Termina con pregunta SÍ/NO."
        </p>
        <textarea
          value={voice.structuralRules ?? ""}
          onChange={(e) => setVoice({ ...voice, structuralRules: e.target.value })}
          className="w-full rounded-lg border border-neutral-300 p-3 text-sm"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5">
          <label className="block text-sm font-semibold text-emerald-800 mb-1">
            ✓ Frases preferidas
          </label>
          <p className="text-xs text-emerald-700 mb-2">Una por línea. El bot las usará naturalmente.</p>
          <textarea
            value={allowedInput}
            onChange={(e) => setAllowedInput(e.target.value)}
            className="w-full rounded-lg border border-emerald-300 bg-white p-3 text-sm"
            rows={6}
            placeholder="te confirmo
claro que sí
va!"
          />
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50/30 p-5">
          <label className="block text-sm font-semibold text-red-800 mb-1">
            ✗ Frases prohibidas
          </label>
          <p className="text-xs text-red-700 mb-2">Una por línea. El bot NUNCA las dirá.</p>
          <textarea
            value={forbiddenInput}
            onChange={(e) => setForbiddenInput(e.target.value)}
            className="w-full rounded-lg border border-red-300 bg-white p-3 text-sm"
            rows={6}
            placeholder="Espero que te encuentres bien
Cordialmente
Estimado cliente"
          />
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <label className="block text-sm font-semibold text-neutral-900 mb-1">
          😀 Emojis permitidos
        </label>
        <p className="text-xs text-neutral-600 mb-2">
          Separados por espacio. Máx 4-5. Ej: "🐺 🔥 ✅ 📦"
        </p>
        <input
          value={emojisInput}
          onChange={(e) => setEmojisInput(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 p-2 text-sm font-mono"
          placeholder="🐺 🔥 ✅ 📦"
        />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <label className="block text-sm font-semibold text-neutral-900 mb-1">
          📝 Notas adicionales (opcional)
        </label>
        <p className="text-xs text-neutral-600 mb-2">
          Cualquier otra instrucción de estilo. Ej: "Cuando hables de precio, siempre menciona valor antes."
        </p>
        <textarea
          value={voice.extraNotes ?? ""}
          onChange={(e) => setVoice({ ...voice, extraNotes: e.target.value })}
          className="w-full rounded-lg border border-neutral-300 p-3 text-sm"
          rows={3}
        />
      </div>

      <div className="flex gap-3 sticky bottom-4 bg-white p-4 rounded-xl border border-neutral-300 shadow-lg">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "💾 Guardar voz de marca"}
        </button>
        <button
          onClick={resetDefaults}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          ↻ Restablecer defaults
        </button>
      </div>

      {original && (
        <details className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
          <summary className="cursor-pointer font-medium text-neutral-700">
            👁 Vista previa del bloque que verá el bot
          </summary>
          <pre className="mt-3 whitespace-pre-wrap text-xs text-neutral-700">
{generatePreview({
  tone: voice.tone,
  signature: voice.signature,
  structuralRules: voice.structuralRules,
  extraNotes: voice.extraNotes,
  allowedPhrases: allowedInput.split("\n").map((s) => s.trim()).filter(Boolean),
  forbiddenPhrases: forbiddenInput.split("\n").map((s) => s.trim()).filter(Boolean),
  emojis: emojisInput.split(/\s+/).map((s) => s.trim()).filter(Boolean),
})}
          </pre>
        </details>
      )}
    </div>
  );
}

function generatePreview(v: BrandVoice): string {
  const parts: string[] = [];
  parts.push("═══════════════════════════════════════════");
  parts.push("VOZ DE MARCA COYOTE — Reglas editadas por el equipo");
  parts.push("═══════════════════════════════════════════");
  if (v.tone) parts.push(`TONO: ${v.tone}`);
  if (v.signature) parts.push(`FIRMA: Hablas como "${v.signature}" cuando aplique.`);
  if (v.structuralRules) parts.push(`REGLAS ESTRUCTURALES:\n${v.structuralRules}`);
  if (v.allowedPhrases && v.allowedPhrases.length > 0) {
    parts.push("FRASES PREFERIDAS:");
    v.allowedPhrases.forEach((p) => parts.push(`  ✓ "${p}"`));
  }
  if (v.forbiddenPhrases && v.forbiddenPhrases.length > 0) {
    parts.push("FRASES PROHIBIDAS:");
    v.forbiddenPhrases.forEach((p) => parts.push(`  ✗ "${p}"`));
  }
  if (v.emojis && v.emojis.length > 0) {
    parts.push(`EMOJIS PERMITIDOS: ${v.emojis.join(" ")}`);
  }
  if (v.extraNotes) parts.push(`NOTAS:\n${v.extraNotes}`);
  parts.push("═══════════════════════════════════════════");
  return parts.join("\n");
}