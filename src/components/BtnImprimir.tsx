// src/components/BtnImprimir.tsx
"use client";

import { FileDown } from "lucide-react";

export default function BtnImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-black text-[#FDCB02] px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-neutral-800 transition-all active:scale-95"
    >
      <FileDown size={16} /> Descargar Reporte PDF
    </button>
  );
}