// src/components/admin/RadarSonoro.tsx
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { VolumeX, Volume2 } from "lucide-react";

interface Props {
  hayAlertas: boolean;
}

export default function RadarSonoro({ hayAlertas }: Props) {
  const audioCtx = useRef<AudioContext | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [silenciado, setSilenciado] = useState(false);
  const [iniciado, setIniciado] = useState(false); // solo suena tras interacción

  const beep = useCallback((freq: number, dur: number, vol = 0.35) => {
    if (silenciado) return;
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur);
    } catch { /* AudioContext bloqueado por navegador */ }
  }, [silenciado]);

  const alertaSecuencia = useCallback(() => {
    beep(880, 0.15, 0.4);
    setTimeout(() => beep(660, 0.2, 0.4), 200);
  }, [beep]);

  // Arrancar/detener el intervalo según alertas Y silencio
  useEffect(() => {
    if (interval.current) {
      clearInterval(interval.current);
      interval.current = null;
    }

    if (hayAlertas && !silenciado && iniciado) {
      alertaSecuencia(); // primer beep inmediato
      interval.current = setInterval(alertaSecuencia, 8000);
    }

    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, [hayAlertas, silenciado, iniciado, alertaSecuencia]);

  // Si no hay alertas, re-habilitar el sonido automáticamente
  useEffect(() => {
    if (!hayAlertas) setSilenciado(false);
  }, [hayAlertas]);

  // No mostrar nada si no hay alertas
  if (!hayAlertas) return null;

  return (
    <button
      onClick={() => {
        setIniciado(true);       // habilita AudioContext tras interacción
        setSilenciado(s => !s);
      }}
      className={`fixed bottom-6 right-6 z-[999] flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 ${
        silenciado
          ? "bg-neutral-800 text-neutral-400 border-neutral-700"
          : "bg-red-600 text-white border-red-700 animate-pulse"
      }`}
    >
      {silenciado
        ? <><VolumeX size={16} /> Alarma Silenciada</>
        : <><Volume2 size={16} /> Silenciar Alarma</>
      }
    </button>
  );
}