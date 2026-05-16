/**
 * TakeOverPanel — UI para control humano de la conversación.
 *
 * Estados:
 *  - Bot activo: muestra botón "Tomar control"
 *  - Bot pausado: muestra banner amarillo + tiempo restante + textarea para
 *    enviar mensajes + botón "Liberar control"
 *
 * Server-side data (initialState) viene del page.tsx; el cliente refresca al
 * actuar sobre los botones.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface PauseState {
  pausedAt: string;
  pausedBy: string;
  lastAgentMessageAt: string;
}

interface Props {
  phone: string;
  initialPaused: boolean;
  initialState: PauseState | null;
  initialTTLSeconds: number;
}

export default function TakeOverPanel({
  phone,
  initialPaused,
  initialState,
  initialTTLSeconds,
}: Props) {
  const router = useRouter();
  const [paused, setPaused] = useState(initialPaused);
  const [state, setState] = useState<PauseState | null>(initialState);
  const [ttlSeconds, setTtlSeconds] = useState(initialTTLSeconds);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Countdown del TTL en tiempo real
  useEffect(() => {
    if (!paused || ttlSeconds <= 0) return;
    const interval = setInterval(() => {
      setTtlSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [paused, ttlSeconds]);

  async function handleTakeOver() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/take-over`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al tomar control");
      setPaused(true);
      setState(data.state);
      setTtlSeconds(60 * 60 * 23);
      setSuccess("Control tomado. Cliente notificado.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease() {
    if (busy) return;
    if (!confirm("¿Liberar control y reanudar el bot? Se le avisará al cliente."))
      return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/release`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al liberar control");
      setPaused(false);
      setState(null);
      setTtlSeconds(0);
      setSuccess("Bot reanudado. Cliente notificado.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/admin/bot/conversaciones/${encodeURIComponent(phone)}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.trim() }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar mensaje");
      setText("");
      setTtlSeconds(60 * 60 * 23); // El backend renueva, replicamos en UI
      setSuccess("Mensaje enviado al cliente.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!paused) {
    return (
      <div className="bg-white border border-slate-200 rounded-md p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500 tracking-wide font-semibold">
              Control de la conversación
            </p>
            <p className="text-sm text-slate-700">
              🟢 Bot atendiendo automáticamente
            </p>
          </div>
          <button
            onClick={handleTakeOver}
            disabled={busy}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white text-sm font-bold rounded shadow"
          >
            {busy ? "..." : "✋ Tomar control"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-emerald-600">{success}</p>}
      </div>
    );
  }

  // Estado: BOT PAUSADO
  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs uppercase text-amber-700 tracking-wide font-bold">
            🟡 BOT PAUSADO — Control humano activo
          </p>
          {state && (
            <p className="text-xs text-amber-900 mt-1">
              Tomado por <strong>{state.pausedBy}</strong> el{" "}
              {new Date(state.pausedAt).toLocaleString("es-MX", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          <p className="text-xs text-amber-700 mt-0.5">
            Bot regresa automáticamente en{" "}
            <strong>{formatTTL(ttlSeconds)}</strong>
          </p>
        </div>
        <button
          onClick={handleRelease}
          disabled={busy}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold rounded shadow"
        >
          🔓 Liberar control
        </button>
      </div>

      {/* Form de envío */}
      <div className="bg-white border border-amber-300 rounded p-3 space-y-2">
        <p className="text-xs text-slate-600 font-medium">
          Responder como asesor (se envía con el número del bot):
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe tu mensaje al cliente..."
          rows={3}
          disabled={busy}
          className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400">
            {text.length}/4000 caracteres · Ctrl+Enter para enviar
          </span>
          <button
            onClick={handleSend}
            disabled={busy || !text.trim()}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-bold rounded shadow"
          >
            {busy ? "Enviando..." : "📤 Enviar"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      {success && <p className="text-xs text-emerald-600 font-medium">{success}</p>}
    </div>
  );
}

function formatTTL(seconds: number): string {
  if (seconds <= 0) return "0min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}
