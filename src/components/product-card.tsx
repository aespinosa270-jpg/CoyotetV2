"use client"

import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Crown, Check, ArrowRight } from "lucide-react"
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
  
  // Lógica de Precios según nivel de socio
  const { price: finalPrice, label, discount, role } = useB2BPrice(price)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    
    // 👇 REPARACIÓN PARA EL BUILD: Agregamos los campos obligatorios
    addItem({ 
      id: `${id}-kilo`, // ID único para variante
      productId: id,    // ID base del producto
      title, 
      price: finalPrice, 
      image,
      quantity: 1,      // Cantidad inicial
      unit: "Kg",       // Unidad por defecto
      meta: { mode: "kilo" }
    })
    
    // Feedback visual
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 2000)
  }

  // Color del Badge según nivel de cliente
  const getBadgeColor = () => {
    if (role === 'black') return 'bg-black text-white' 
    if (role === 'gold') return 'bg-[#FDCB02] text-black'
    return 'bg-neutral-100 text-neutral-600' 
  }

  return (
    <div 
      className="group relative bg-white border border-neutral-200 hover:border-[#FDCB02] transition-all duration-300 rounded-lg overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      
      {/* --- ETIQUETA DE DESCUENTO SOCIO --- */}
      {discount > 0 && (
        <div className={`absolute top-3 left-0 z-20 px-3 py-1 uppercase tracking-widest flex items-center gap-1.5 shadow-sm rounded-r-md ${getBadgeColor()}`}>
          <Crown size={10} strokeWidth={3} /> 
          <span className="text-[9px] font-[900]">{label} -{discount}%</span>
        </div>
      )}

      {/* --- IMAGEN DEL PRODUCTO --- */}
      <Link href={`/products/${id}`} className="block relative aspect-[4/5] w-full bg-neutral-100 overflow-hidden cursor-pointer">
        <Image 
          src={image} 
          alt={title} 
          fill 
          className={`object-cover transition-transform duration-700 ease-out ${isHovered ? 'scale-105' : 'scale-100'}`}
        />
        
        {/* Botón de compra rápida al pasar el mouse (Desktop) */}
        <AnimatePresence>
          {isHovered && !justAdded && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={handleAddToCart}
              className="absolute bottom-4 right-4 bg-white text-black p-3 rounded-full shadow-xl hover:bg-[#FDCB02] transition-colors z-30 hidden lg:flex items-center justify-center border border-neutral-100"
            >
              <ShoppingCart size={18} />
            </motion.button>
          )}
        </AnimatePresence>
      </Link>

      {/* --- DATOS DEL PRODUCTO --- */}
      <div className="p-4 flex flex-col flex-1 bg-white relative z-10">
        
        {/* Categoría y Referencia */}
        <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                {category || "Textiles Coyote"}
            </span>
            {sku && <span className="text-[9px] font-mono text-neutral-300">REF: {sku}</span>}
        </div>

        {/* Título */}
        <Link href={`/products/${id}`} className="block">
            <h3 className="text-black font-bold uppercase text-xs leading-tight mb-4 line-clamp-2 group-hover:text-[#FDCB02] transition-colors cursor-pointer tracking-tight">
                {title}
            </h3>
        </Link>
        
        <div className="mt-auto space-y-3">
            {/* Precios */}
            <div className="flex flex-col border-t border-neutral-100 pt-3">
                
                {discount > 0 && (
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-neutral-400 line-through text-[10px] font-medium">
                            ${price.toLocaleString()}
                        </span>
                        <span className="text-[8px] text-neutral-400 uppercase font-bold">P. Lista</span>
                    </div>
                )}
                
                <div className="flex items-end justify-between">
                    <div className="flex flex-col">
                        <span className={`text-lg font-black tracking-tighter ${discount > 0 ? 'text-black' : 'text-black'}`}>
                            ${finalPrice.toLocaleString()} 
                            <span className="text-[10px] text-neutral-400 font-normal ml-1">MXN / KG</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* --- BOTÓN DE ACCIÓN --- */}
            <button 
              onClick={handleAddToCart}
              disabled={justAdded}
              className={`
                w-full py-2.5 font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all duration-300 rounded-md relative overflow-hidden border
                ${justAdded 
                    ? 'bg-green-600 border-green-600 text-white cursor-default' 
                    : 'bg-neutral-50 border-neutral-200 text-black hover:bg-[#FDCB02] hover:border-[#FDCB02] hover:shadow-md'
                }
              `}
            >
                {justAdded ? (
                    <div className="flex items-center gap-2">
                        <Check size={14} strokeWidth={3} /> AGREGADO
                    </div>
                ) : (
                    <>
                        <ShoppingCart size={14} strokeWidth={2} /> 
                        Añadir
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  )
}