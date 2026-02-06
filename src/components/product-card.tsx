"use client"

import Image from "next/image"
import Link from "next/link" // <--- IMPORTANTE: Importamos Link
import { ShoppingCart, Crown, Check } from "lucide-react"
import { useCart } from "@/lib/context/cart-context"
import { useB2BPrice } from "@/hooks/use-b2b-price" 
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface ProductProps {
  id: string
  title: string
  price: number // Precio Base (Público)
  image: string
  sku?: string
  category?: string
}

export default function ProductCard({ id, title, price, image, sku, category }: ProductProps) {
  const { addItem } = useCart()
  const [isHovered, setIsHovered] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  
  // 1. LÓGICA DE PRECIOS SEGÚN NIVEL
  const { price: finalPrice, label, discount, role } = useB2BPrice(price)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Evita que el Link se active si el botón está dentro
    e.stopPropagation();
    
    addItem({ 
      // @ts-ignore
      id, 
      title, 
      price: finalPrice, 
      image 
    })
    
    // Feedback visual
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 2000)
  }

  // Color del Badge según nivel
  const getBadgeColor = () => {
    if (role === 'black') return 'bg-white text-black' 
    if (role === 'gold') return 'bg-[#FDCB02] text-black'
    return 'bg-neutral-800 text-neutral-400' 
  }

  return (
    <div 
      className="group relative bg-[#0a0a0a] border border-white/10 hover:border-[#FDCB02] transition-all duration-300 rounded-sm overflow-hidden flex flex-col h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      
      {/* --- BADGE DE NIVEL --- */}
      {discount > 0 && (
        <div className={`absolute top-0 left-0 z-20 px-3 py-1.5 uppercase tracking-widest flex items-center gap-1.5 shadow-lg ${getBadgeColor()}`}>
          <Crown size={10} strokeWidth={3} /> 
          <span className="text-[9px] font-[900]">{label} -{discount}%</span>
        </div>
      )}

      {/* --- ZONA DE IMAGEN (CLICKEABLE) --- */}
      <Link href={`/products/${id}`} className="block relative aspect-[4/5] w-full bg-[#111] overflow-hidden cursor-pointer">
        <Image 
          src={image} 
          alt={title} 
          fill 
          className={`object-cover transition-transform duration-700 ease-out ${isHovered ? 'scale-110' : 'scale-100'}`}
        />
        
        {/* Overlay oscuro al hover */}
        <div className={`absolute inset-0 bg-black/20 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
        
        {/* Botón Flotante Rápido (Desktop) */}
        <AnimatePresence>
          {isHovered && !justAdded && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={handleAddToCart}
              className="absolute bottom-4 right-4 bg-white text-black p-3 rounded-full shadow-lg hover:bg-[#FDCB02] transition-colors z-30 hidden lg:flex items-center justify-center"
            >
              <ShoppingCart size={18} />
            </motion.button>
          )}
        </AnimatePresence>
      </Link>

      {/* --- ZONA DE DATOS --- */}
      <div className="p-5 flex flex-col flex-1 bg-[#0a0a0a] relative z-10">
        
        {/* Metadatos */}
        <div className="flex justify-between items-start mb-2 opacity-60">
            <span className="text-[9px] font-mono uppercase tracking-wider border border-white/20 px-1.5 rounded text-neutral-400">
                {category || "TEXTIL"}
            </span>
            {sku && <span className="text-[9px] font-mono text-neutral-500">REF: {sku}</span>}
        </div>

        {/* Título (CLICKEABLE) */}
        <Link href={`/products/${id}`} className="block">
            <h3 className="text-white font-[800] uppercase text-sm leading-tight mb-4 line-clamp-2 group-hover:text-[#FDCB02] transition-colors cursor-pointer">
                {title}
            </h3>
        </Link>
        
        <div className="mt-auto space-y-4">
            {/* Bloque de Precio */}
            <div className="flex flex-col border-t border-white/5 pt-3">
                
                {/* Precio de Lista */}
                {discount > 0 && (
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-neutral-600 line-through text-[10px] font-mono">
                            ${price.toLocaleString()} MXN
                        </span>
                        <span className="text-[9px] text-neutral-500 uppercase font-bold">P. Público</span>
                    </div>
                )}
                
                {/* Precio Final */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className={`text-xl font-[1000] tracking-tight ${discount > 0 ? 'text-[#FDCB02]' : 'text-white'}`}>
                            ${finalPrice.toLocaleString()} 
                            <span className="text-[10px] text-neutral-500 font-normal ml-1">MXN</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* --- BARRA DE ACCIÓN --- */}
            <button 
              onClick={handleAddToCart}
              disabled={justAdded}
              className={`
                w-full py-3 font-[900] uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all duration-300 rounded-sm relative overflow-hidden border
                ${justAdded 
                    ? 'bg-green-600 border-green-600 text-white cursor-default' 
                    : 'bg-[#1a1a1a] border-white/10 text-white hover:bg-[#FDCB02] hover:text-black hover:border-[#FDCB02]'
                }
              `}
            >
                {justAdded ? (
                    <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                        <Check size={14} strokeWidth={4} /> AGREGADO
                    </motion.div>
                ) : (
                    <>
                        <ShoppingCart size={14} strokeWidth={2.5} /> 
                        {discount > 0 ? 'AÑADIR AL PEDIDO' : 'AGREGAR'}
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  )
}