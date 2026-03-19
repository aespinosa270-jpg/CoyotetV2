// src/app/elasticos/page.tsx
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, PackageSearch, Ruler } from "lucide-react"

import { elasticos } from "@/lib/elasticos"
import { Product } from "@/lib/products"

export default function ElasticosPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pt-24 pb-20 selection:bg-[#FDCB02] selection:text-black">

      {/* HEADER HERO */}
      <div className="container mx-auto max-w-[1200px] px-4 sm:px-6 mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#FDCB02] rounded-xl flex items-center justify-center text-black shadow-[0_0_15px_rgba(253,203,2,0.2)]">
            <Ruler size={20} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-[1000] uppercase tracking-tighter text-white">
            Elásticos y Avíos
          </h1>
        </div>
        <p className="text-neutral-400 max-w-2xl font-medium text-lg leading-relaxed">
          Surtido completo para confección industrial y doméstica.
          <span className="text-[#FDCB02] block mt-1 font-black uppercase text-sm tracking-widest">
            Beisbolero · Ligas · Jareta — Blanco y Negro
          </span>
        </p>
      </div>

      {/* GRID DE PRODUCTOS */}
      <div className="container mx-auto max-w-[1200px] px-4 sm:px-6">
        {elasticos.length === 0 ? (
          <div className="bg-[#111] border border-white/5 rounded-3xl p-16 text-center flex flex-col items-center">
            <PackageSearch size={64} className="text-neutral-600 mb-6" />
            <h3 className="text-2xl font-[1000] uppercase tracking-tight mb-2">Catálogo vacío</h3>
            <p className="text-neutral-500 max-w-md">No se encontraron productos en lib/elasticos.ts</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {elasticos.map((elastico: Product) => (
              <Link
                key={elastico.id}
                href={`/products/${elastico.id}`}
                className="group flex flex-col bg-[#050505] rounded-2xl border border-white/10 overflow-hidden hover:border-[#FDCB02]/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(253,203,2,0.15)]"
              >
                {/* IMAGEN */}
                <div className="relative w-full aspect-square bg-neutral-900 overflow-hidden border-b border-white/5">
                  <Image
                    src={elastico.thumbnail || "/placeholder.jpg"}
                    alt={elastico.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                  />

                  {/* Badge ancho */}
                  <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md border border-[#FDCB02]/30 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-2xl z-10">
                    <Ruler size={12} className="text-[#FDCB02]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">
                      {elastico.gramaje}
                    </span>
                  </div>

                  {/* Badge unidad */}
                  <div className="absolute bottom-4 right-4 bg-[#FDCB02] text-black px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-tighter z-10">
                    {elastico.unit}
                  </div>

                  {/* Chips de color */}
                  {elastico.colors && elastico.colors.length > 0 && (
                    <div className="absolute bottom-4 left-4 flex gap-1.5 z-10">
                      {elastico.colors.map((c, i) => (
                        <div
                          key={i}
                          title={c.name}
                          className="w-4 h-4 rounded-full border border-white/30 shadow"
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* INFO */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">En Stock</span>
                  </div>

                  <h3 className="text-xl font-[1000] uppercase text-white tracking-tight line-clamp-2 group-hover:text-[#FDCB02] transition-colors mb-4 leading-tight">
                    {elastico.title}
                  </h3>

                  <div className="mt-auto pt-5 border-t border-white/10 flex items-end justify-between">
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest text-neutral-500 font-black mb-1">
                        Precio por {elastico.unit}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-[1000] text-white">
                          ${elastico.prices.menudeo.toFixed(0)}
                        </span>
                        <span className="text-sm font-bold text-neutral-500">.00</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-[#111] group-hover:bg-[#FDCB02] rounded-xl flex items-center justify-center transition-all duration-300 group-hover:-rotate-45">
                      <ArrowRight size={18} className="text-white group-hover:text-black transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}