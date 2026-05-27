"use client";

/**
 * Modal wrapper para SimuladorPrenda.
 *
 * - Lazy-load via dynamic import (ssr: false) para no inflar el bundle inicial
 * - El simulador 3D solo se descarga cuando el usuario clickea "Ver en 3D"
 * - Selector de tipo de prenda en vivo
 */

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { TipoPrenda } from "./SimuladorPrenda";

const SimuladorPrenda = dynamic(() => import("./SimuladorPrenda"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-slate-900 text-white rounded-2xl">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto"></div>
        <p className="mt-4 text-sm">Cargando simulador 3D...</p>
      </div>
    </div>
  ),
});

interface Props {
  open: boolean;
  onClose: () => void;
  texturaUrl: string;
  nombreTela: string;
  prendaInicial?: TipoPrenda;
}

const PRENDAS: Array<{ value: TipoPrenda; label: string; emoji: string }> = [
  { value: "playera", label: "Playera", emoji: "👕" },
  { value: "leggings", label: "Leggings", emoji: "🧘" },
  { value: "hoodie", label: "Sudadera", emoji: "🧥" },
  { value: "pantalon", label: "Pantalón", emoji: "👖" },
  { value: "uniforme", label: "Uniforme", emoji: "🎓" },
];

export default function SimuladorModal({
  open,
  onClose,
  texturaUrl,
  nombreTela,
  prendaInicial = "playera",
}: Props) {
  const [prenda, setPrenda] = useState<TipoPrenda>(prendaInicial);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
              Simulador 3D · Coyote Textil
            </p>
            <h2 className="text-xl font-bold text-white mt-0.5">{nombreTela}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl px-3"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Selector de prenda */}
        <div className="flex gap-2 p-4 overflow-x-auto border-b border-white/10">
          {PRENDAS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPrenda(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                prenda === p.value
                  ? "bg-amber-400 text-black"
                  : "bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>

        {/* Simulador */}
        <div className="h-[600px]">
          <SimuladorPrenda
            texturaUrl={texturaUrl}
            nombreTela={nombreTela}
            tipoPrenda={prenda}
          />
        </div>
      </div>
    </div>
  );
}