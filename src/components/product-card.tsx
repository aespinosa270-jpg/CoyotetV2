"use client"

import Image from "next/image"
import { ShoppingCart, Crown, Check, Tag } from "lucide-react"
import { useCart } from "@/lib/context/cart-context"
import { useB2BPrice } from "@/hooks/use-b2b-price" 
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface ProductProps {
  id: string
  title: string
  price: number // Precio Base (Nivel Básica / Silver)
  image: string
  sku?: string
  category?: string
}

export default function ProductCard({ id, title, price, image, sku, category }: ProductProps) {
  const { addItem } = useCart()
  const [isHovered, setIsHovered] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  
  // 1. LÓGICA DE PRECIOS SEGÚN SUSCRIPCIÓN (Básica, Corporativa, Elite)
  const { price: finalPrice, label, discount, role } = useB2BPrice(price)

  const handleAddToCart = () => {
    addItem({ 
      // @ts-ignore
      id, 
      title, 
      price: finalPrice, // Se agrega con el precio correspondiente a su nivel
      image 
    })
    
    // Feedback visual de agregado
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 2000)
  }

  // Determinamos el color del Badge según el nivel
  const getBadgeColor = () => {
    if (role === 'black') return 'bg-white text-black' // Elite
    if (role === 'gold') return 'bg-[#FDCB02] text-black' // Corporativa
    return 'bg-neutral-800 text-neutral-400' // Básica / Guest
  }

  return (
    <div 
      className="group relative bg-[#0a0a0a] border border-white/10 hover:border-[#FDCB02] transition-all duration-300 rounded-sm overflow-hidden flex flex-col h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      
      {/* --- BADGE DE MEMBRESÍA --- */}
      {/* Solo mostramos badge si hay un beneficio activo (Gold/Elite) o si queremos destacar el nivel */}
      {discount > 0 && (
        <div className={`absolute top-0 left-0 z-20 px-3 py-1.5 uppercase tracking-widest flex items-center gap-1.5 shadow-lg ${getBadgeColor()}`}>
          <Crown size={10} strokeWidth={3} /> 
          <span className="text-[9px] font-[900]">{role === 'black' ? 'ELITE' : 'CORPORATIVA'} -{discount}%</span>
        </div>
      )}

      {/* --- IMAGEN DEL PRODUCTO --- */}
      <div className="relative aspect-[4/5] w-full bg-[#111] overflow-hidden">
        <Image 
          src={image} 
          alt={title} 
          fill 
          className={`object-cover transition-transform duration-700 ease-out ${isHovered ? 'scale-110' : 'scale-100'}`}
        />
        {/* Overlay oscuro al hacer hover */}
        <div className={`absolute inset-0 bg-black/20 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
        
        {/* Botón rápido (aparece en hover) */}
        <AnimatePresence>
          {isHovered && !justAdded && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={handleAddToCart}
              className="absolute bottom-4 right-4 bg-white text-black p-3 rounded-full shadow-lg hover:bg-[#FDCB02] transition-colors z-30 hidden lg:flex"
            >
              <ShoppingCart size={18} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* --- INFO DEL PRODUCTO --- */}
      <div className="p-5 flex flex-col flex-1 bg-[#0a0a0a] relative z-10">
        
        <div className="flex justify-between items-start mb-2 opacity-60">
            <span className="text-[9px] font-mono uppercase tracking-wider border border-white/20 px-1.5 rounded text-neutral-400">
                {category || "TEXTIL"}
            </span>
            {sku && <span className="text-[9px] font-mono text-neutral-500">REF: {sku}</span>}
        </div>

        <h3 className="text-white font-[800] uppercase text-sm leading-tight mb-4 line-clamp-2 group-hover:text-[#FDCB02] transition-colors">
            {title}
        </h3>
        
        <div className="mt-auto space-y-3">
            {/* Lógica Visual de Precios */}
            <div className="flex flex-col border-t border-white/5 pt-3">
                
                {/* Precio Anterior (Solo si es Gold o Elite) */}
                {discount > 0 && (
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-neutral-600 line-through text-[10px] font-mono">
                            ${price.toLocaleString()} MXN
                        </span>
                        <span className="text-[9px] text-neutral-500 uppercase font-bold">Lista</span>
                    </div>
                )}
                
                {/* Precio Final */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${discount > 0 ? 'text-[#FDCB02]' : 'text-neutral-500'}`}>
                            {label}
                        </span>
                        <span className={`text-xl font-[1000] tracking-tight ${discount > 0 ? 'text-white' : 'text-neutral-200'}`}>
                            ${finalPrice.toLocaleString()} <span className="text-[10px] text-neutral-500 font-normal">MXN</span>
                        </span>
                    </div>
                </div>
            </div>

            <button 
              onClick={handleAddToCart}
              disabled={justAdded}
              className={`
                w-full py-3 font-[900] uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all duration-300 rounded-sm relative overflow-hidden border border-transparent
                ${justAdded 
                    ? 'bg-green-600 text-white cursor-default' 
                    : 'bg-[#1a1a1a] text-white hover:bg-[#FDCB02] hover:text-black hover:border-[#FDCB02]'
                }
              `}
            >
                {justAdded ? (
                    <>
                        <Check size={14} strokeWidth={3} /> AGREGADO
                    </>
                ) : (
                    <>
                        <ShoppingCart size={14} strokeWidth={2.5} /> 
                        {discount > 0 ? 'AÑADIR CON DESC.' : 'AGREGAR AL PEDIDO'}
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  )
}