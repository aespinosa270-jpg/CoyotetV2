"use client";

/**
 * Pagina de prueba del simulador 3D.
 *
 * Visita: http://localhost:3000/simulador-test
 *
 * Permite probar diferentes texturas reales del catalogo con
 * diferentes prendas. Util para validar antes de integrar al storefront.
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import type { TipoPrenda } from "@/components/simulador-3d/SimuladorPrenda";

const SimuladorPrenda = dynamic(
  () => import("@/components/simulador-3d/SimuladorPrenda"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] flex items-center justify-center bg-slate-900 text-white rounded-2xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto"></div>
          <p className="mt-4 text-sm">Cargando simulador...</p>
        </div>
      </div>
    ),
  }
);

// Telas de prueba (rutas reales en /public)
const TELAS_PRUEBA = [
  { url: "/assets/products/112.jpg", nombre: "Tela 112" },
  { url: "/assets/products/113.jpg", nombre: "Tela 113" },
  { url: "/assets/products/114.jpg", nombre: "Tela 114" },
  { url: "/assets/products/115.jpg", nombre: "Tela 115" },
  { url: "/assets/products/116.jpg", nombre: "Tela 116" },
  { url: "/assets/products/117.jpg", nombre: "Tela 117" },
];

const PRENDAS: Array<{ value: TipoPrenda; label: string; emoji: string }> = [
  { value: "playera", label: "Playera", emoji: "👕" },
  { value: "leggings", label: "Leggings", emoji: "🧘" },
  { value: "hoodie", label: "Sudadera", emoji: "🧥" },
  { value: "pantalon", label: "Pantalón", emoji: "👖" },
  { value: "uniforme", label: "Uniforme", emoji: "🎓" },
];

export default function SimuladorTestPage() {
  const [tela, setTela] = useState(TELAS_PRUEBA[0]);
  const [prenda, setPrenda] = useState<TipoPrenda>("playera");
  const [colorBase, setColorBase] = useState<string>("#ffffff");

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-black uppercase">
            Simulador 3D · <span className="text-amber-500">Pruebas</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Prueba diferentes telas y prendas. Arrastra para rotar el modelo.
          </p>
        </header>

        {/* Controles */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Telas */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase text-slate-600 mb-3">
              Textura
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {TELAS_PRUEBA.map((t) => (
                <button
                  key={t.url}
                  onClick={() => setTela(t)}
                  className={`relative rounded-lg overflow-hidden border-2 transition ${
                    tela.url === t.url
                      ? "border-amber-500 ring-2 ring-amber-300"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.url} alt={t.nombre} className="w-full h-16 object-cover" />
                </button>
              ))}
            </div>
          </section>

          {/* Prendas */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase text-slate-600 mb-3">
              Prenda
            </h2>
            <div className="flex flex-wrap gap-2">
              {PRENDAS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPrenda(p.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    prenda === p.value
                      ? "bg-amber-400 text-black"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </section>

          {/* Color tinte */}
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase text-slate-600 mb-3">
              Tinte base
            </h2>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={colorBase}
                onChange={(e) => setColorBase(e.target.value)}
                className="w-16 h-16 rounded cursor-pointer"
              />
              <div className="text-xs text-slate-600">
                <p>Mezcla con la textura</p>
                <p className="font-mono mt-1">{colorBase}</p>
                <button
                  onClick={() => setColorBase("#ffffff")}
                  className="text-amber-600 hover:underline mt-1"
                >
                  Resetear a blanco
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Simulador */}
        <div className="h-[600px]">
          <SimuladorPrenda
            texturaUrl={tela.url}
            nombreTela={tela.nombre}
            tipoPrenda={prenda}
            colorBase={colorBase === "#ffffff" ? undefined : colorBase}
          />
        </div>

        {/* Notas */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
          <p className="font-bold mb-1">📌 Notas del V1:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Geometria simplificada (no es photoreal aun)</li>
            <li>V2 con modelos GLB realistas: ~$20-100 USD por modelo</li>
            <li>V3 con IA Replicate: tela sobre persona real</li>
            <li>Si los clientes lo usan en analytics, justificamos V2</li>
          </ul>
        </div>
      </div>
    </div>
  );
}