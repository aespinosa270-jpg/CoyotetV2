// src/app/hilos/page.tsx
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, PackageSearch, Scissors, Box, Zap } from "lucide-react"
import { products } from "@/lib/products" // 🔥 Tu catálogo en vivo

export default function HilosPage() {
  // 🐺 Filtramos tu archivo products.ts buscando la categoría "Hilos"
  const hilos = products.filter(p => 
    p.category?.toLowerCase().includes('hilo')
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pt-24 pb-20 selection:bg-[#FDCB02] selection:text-black">
      
      {/* HEADER HERO */}
      <div className="container mx-auto max-w-[1200px] px-4 sm:px-6 mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#FDCB02] rounded-xl flex items-center justify-center text-black">
            <Scissors size={20} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl md:text-5xl font-[1000] uppercase tracking-tighter text-white">
            Hilos y Avíos
          </h1>
        </div>
        <p className="text-neutral-400 max-w-2xl font-medium text-lg leading-relaxed">
          Resistencia industrial y colores precisos. Suministro de alta velocidad para producción textil B2B. 
          <span className="text-[#FDCB02] block mt-1 font-black uppercase text-sm tracking-widest">
            Venta por Pieza y Caja Industrial (120 PZS)
          </span>
        </p>
      </div>

      {/* GRID DE PRODUCTOS */}
      <div className="container mx-auto max-w-[1200px] px-4 sm:px-6">
        {hilos.length === 0 ? (
          <div className="bg-[#111] border border-white/5 rounded-3xl p-16 text-center flex flex-col items-center">
            <PackageSearch size={64} className="text-neutral-600 mb-6" />
            <h3 className="text-2xl font-[1000] uppercase tracking-tight mb-2">Catálogo en preparación</h3>
            <p className="text-neutral-500 max-w-md">
              Aún no hemos agregado los hilos a tu archivo products.ts. Estarán disponibles muy pronto.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {hilos.map((hilo) => (
              <Link href={`/producto/${hilo.id}`} key={hilo.id} className="group flex flex-col bg-[#050505] rounded-2xl border border-white/10 overflow-hidden hover:border-[#FDCB02]/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(253,203,2,0.15)]">
                
                {/* IMAGEN DEL HILO CON BADGE DE CAJA */}
                <div className="relative w-full aspect-square bg-neutral-900 overflow-hidden border-b border-white/5">
                  <Image 
                    src={hilo.thumbnail || "/placeholder.jpg"} 
                    alt={hilo.title} 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                  />
                  
                  {/* Badge de Caja Industrial */}
                  <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md border border-[#FDCB02]/30 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-2xl">
                    <Box size={12} className="text-[#FDCB02]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">
                      Caja 120 PZS
                    </span>
                  </div>

                  <div className="absolute bottom-4 right-4 bg-[#FDCB02] text-black px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-tighter">
                    Kingtex Original
                  </div>
                </div>

                {/* INFO DEL HILO */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">En Stock</span>
                  </div>

                  <h3 className="text-xl font-[1000] uppercase text-white tracking-tight line-clamp-1 group-hover:text-[#FDCB02] transition-colors mb-1">
                    {hilo.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                      Calibre {hilo.gramaje || "40/2"}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                      {hilo.rendimiento?.toLocaleString()}m
                    </span>
                  </div>
                  
                  <div className="mt-auto pt-5 border-t border-white/10 flex items-end justify-between">
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest text-[#FDCB02] font-black mb-1">
                        Precio por Pieza
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-[1000] text-white">
                          ${hilo.prices?.mayoreo?.toFixed(0)}
                        </span>
                        <span className="text-sm font-bold text-neutral-500">.00</span>
                        <span className="text-[10px] font-bold text-neutral-600 ml-2 uppercase">MXN</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-[#111] group-hover:bg-[#FDCB02] border border-white/5 group-hover:border-[#FDCB02] rounded-xl flex items-center justify-center transition-all duration-300 group-hover:-rotate-45">
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