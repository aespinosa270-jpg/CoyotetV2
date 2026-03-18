// src/app/hilos/page.tsx
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, PackageSearch, Scissors } from "lucide-react"
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
          <h1 className="text-4xl md:text-5xl font-[1000] uppercase tracking-tighter">
            Hilos y Avíos
          </h1>
        </div>
        <p className="text-neutral-400 max-w-2xl font-medium text-lg">
          Resistencia industrial y colores precisos. El complemento perfecto para tu producción textil B2B con la calidad Coyote.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {hilos.map((hilo) => (
              <Link href={`/producto/${hilo.id}`} key={hilo.id} className="group flex flex-col bg-[#111] rounded-2xl border border-white/5 overflow-hidden hover:border-[#FDCB02]/50 transition-all hover:shadow-[0_0_30px_rgba(253,203,2,0.1)]">
                {/* IMAGEN DEL HILO */}
                <div className="relative w-full aspect-square bg-neutral-900 overflow-hidden">
                  <Image 
                    src={hilo.thumbnail || "/placeholder.jpg"} 
                    alt={hilo.title} 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FDCB02]">
                      Stock Disponible
                    </span>
                  </div>
                </div>

                {/* INFO DEL HILO */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg font-[1000] uppercase tracking-tight line-clamp-2 mb-1 group-hover:text-[#FDCB02] transition-colors">
                    {hilo.title}
                  </h3>
                  <p className="text-xs text-neutral-500 font-bold uppercase mb-4">
                    {hilo.category || "Insumo Industrial"}
                  </p>
                  
                  <div className="mt-auto pt-4 border-t border-white/5 flex items-end justify-between">
                    <div>
                      <span className="block text-[9px] uppercase tracking-widest text-neutral-500 font-black mb-1">
                        Precio Mayoreo
                      </span>
                      <span className="text-xl font-[1000] text-white">
                        {/* 🔥 AQUÍ ESTÁ LA MAGIA: Jalamos el precio de mayoreo */}
                        ${hilo.prices?.mayoreo?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="w-8 h-8 bg-white/5 group-hover:bg-[#FDCB02] rounded-full flex items-center justify-center transition-colors">
                      <ArrowRight size={14} className="text-white group-hover:text-black" />
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