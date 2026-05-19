"use client";

import type { CallState } from "./useZadarmaCall";

interface Props {
  toNumber: string;
  state: CallState;
  duration: number;
  error: string | null;
  isMuted: boolean;
  onHangup: () => void;
  onToggleMute: () => void;
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const STATE_LABELS: Record<CallState, string> = {
  idle: "—",
  connecting: "Conectando...",
  ringing: "Sonando...",
  connected: "En llamada",
  ended: "Llamada terminada",
  error: "Error",
};

const STATE_COLORS: Record<CallState, string> = {
  idle: "bg-slate-100",
  connecting: "bg-amber-100 border-amber-400",
  ringing: "bg-blue-100 border-blue-400",
  connected: "bg-emerald-100 border-emerald-400",
  ended: "bg-slate-200 border-slate-400",
  error: "bg-red-100 border-red-400",
};

/**
 * Widget flotante de llamada en curso (esquina inferior derecha).
 * Solo se renderiza cuando state !== "idle".
 */
export default function CallWidget({
  toNumber,
  state,
  duration,
  error,
  isMuted,
  onHangup,
  onToggleMute,
}: Props) {
  if (state === "idle") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72">
      <div className={`${STATE_COLORS[state]} border-2 rounded-lg shadow-xl p-4 space-y-3`}>
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-600 font-semibold">
              {STATE_LABELS[state]}
            </p>
            <p className="font-mono text-sm font-bold text-slate-900 mt-1">
              📞 {toNumber}
            </p>
          </div>
          {state === "connected" && (
            <p className="text-2xl font-mono font-bold text-emerald-700">
              {fmtDuration(duration)}
            </p>
          )}
        </div>

        {/* Error */}
        {error && state === "error" && (
          <p className="text-xs text-red-800 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </p>
        )}

        {/* Acciones */}
        {(state === "connecting" || state === "ringing" || state === "connected") && (
          <div className="flex gap-2">
            {state === "connected" && (
              <button
                type="button"
                onClick={onToggleMute}
                className={`flex-1 px-3 py-2 text-xs font-semibold rounded border transition ${
                  isMuted
                    ? "bg-slate-700 text-white border-slate-700"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {isMuted ? "🔇 Mic OFF" : "🎙️ Mic ON"}
              </button>
            )}
            <button
              type="button"
              onClick={onHangup}
              className="flex-1 px-3 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded transition"
            >
              📴 Colgar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}