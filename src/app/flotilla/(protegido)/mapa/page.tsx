// src/app/flotilla/mapa/page.tsx
"use client";

import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const MapaRuta = dynamic(() => import("./MapaRuta"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[80vh] bg-[#0a0a0a] rounded-[2rem] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#FDCB02] border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.25em]">
          Inicializando Mapa...
        </p>
      </div>
    </div>
  ),
});

export default function MapaPage() {
  return (
    <div className="min-h-screen bg-[#F4F5F7] p-5 font-sans">
      <div className="flex items-center gap-4 mb-5">
        <Link
          href="/flotilla"
          className="w-10 h-10 bg-white border border-neutral-200 rounded-xl flex items-center justify-center text-black hover:bg-black hover:text-[#FDCB02] transition-colors shadow-sm"
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
        </Link>
        <div>
          <h1 className="text-xl font-[900] text-black uppercase tracking-tighter leading-none">
            Mapa de Ruta
          </h1>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
            Telemetría en tiempo real · Actualiza cada 15s
          </p>
        </div>
      </div>

      <MapaRuta />
    </div>
  );
}