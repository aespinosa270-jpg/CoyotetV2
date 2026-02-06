"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useCart } from "@/lib/context/cart-context"
import { ShoppingCart, Trash2, CreditCard, Lock } from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation" // 1. Importamos el Router

export default function CartSidebar() {
  const { cart, removeItem, isCartOpen, toggleCart, subTotal, serviceFee, grandTotal } = useCart()
  const router = useRouter() // 2. Inicializamos el router

  // 3. Función para manejar la navegación
  const handleCheckout = () => {
    toggleCart() // Cierra el sidebar para que no estorbe
    router.push('/checkout') // Redirige a la página de pago
  }

  return (
    <Sheet open={isCartOpen} onOpenChange={toggleCart}>
      <SheetContent className="w-full sm:max-w-md flex flex-col bg-[#f9f9f9] border-l-black/10 p-0 z-[100]">
        
        {/* Header */}
        <SheetHeader className="p-6 bg-white border-b border-black/5">
          <SheetTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            Tu Bolsa <span className="text-[#FDCB02]">●</span>
          </SheetTitle>
        </SheetHeader>

        {/* Lista de Productos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 space-y-4">
              <ShoppingCart size={48} />
              <p className="font-bold uppercase tracking-widest text-xs">Tu bolsa está vacía</p>
            </div>
          ) : (
            <AnimatePresence>
              {cart.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="bg-white p-3 rounded-none border border-black/5 flex gap-3 items-start relative group"
                >
                  {/* Miniatura */}
                  <div className="relative w-16 h-20 bg-gray-100 flex-shrink-0">
                    {item.thumbnail && (
                        <Image src={item.thumbnail} alt={item.title} fill className="object-cover" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pr-6">
                    <h4 className="font-bold text-xs uppercase leading-tight mb-1">{item.title}</h4>
                    <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 font-mono uppercase mb-2">
                        <span className="bg-gray-100 px-1">
                            {item.variantId === 'mayoreo' ? '📦 Rollo' : `✂️ Corte`}
                        </span>
                        <span>Unidad: {item.unit}</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-bold">Cant: {item.quantity}</span>
                        <span className="font-mono font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Borrar */}
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Resumen Financiero */}
        {cart.length > 0 && (
            <div className="p-6 bg-white border-t border-black/5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="space-y-2 mb-6 font-mono text-xs text-gray-500">
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">Cargo por Servicio <span className="bg-gray-100 text-[9px] px-1 rounded">4.99%</span></span>
                    <span>${serviceFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-black/10 my-2"></div>
                <div className="flex justify-between text-base font-black text-black tracking-tighter">
                    <span>TOTAL</span>
                    <span>${grandTotal.toFixed(2)}</span>
                </div>
            </div>
            
            {/* 4. Botón actualizado con el evento correcto */}
            <button 
                className="w-full bg-black text-white py-4 font-bold uppercase tracking-widest hover:bg-[#FDCB02] hover:text-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCheckout} 
            >
                <Lock size={16} />
                Proceder al Pago
            </button>
            <div className="text-center mt-3 flex justify-center gap-2 text-gray-300">
                <CreditCard size={18} />
                <span className="text-[10px] font-bold uppercase">Pagos Seguros Encriptados</span>
            </div>
            </div>
        )}

      </SheetContent>
    </Sheet>
  )
}