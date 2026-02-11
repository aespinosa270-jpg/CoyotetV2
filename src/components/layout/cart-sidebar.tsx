'use client';

import { X, Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link'; // ✅ Importación correcta
import { useCart } from '@/lib/context/cart-context';
import { useEffect, useState } from 'react';

export default function CartSidebar() {
  const { isCartOpen, closeCart, items, removeItem, subtotal } = useCart();
  
  // Evitar errores de hidratación
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <>
      {/* 1. Fondo Oscuro (Overlay) */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeCart}
      />

      {/* 2. Panel Deslizante */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-out flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-white">
            <h2 className="text-lg font-[900] uppercase flex items-center gap-2">
                <ShoppingCart size={20} className="text-[#FDCB02]"/> Tu Pedido
            </h2>
            <button onClick={closeCart} className="p-2 hover:bg-neutral-100 rounded-full text-neutral-500 hover:text-black transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Lista de Productos */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-neutral-200">
            {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                    <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
                        <ShoppingCart size={32} />
                    </div>
                    <p className="font-bold text-neutral-400">Tu carrito está vacío</p>
                    <button onClick={closeCart} className="text-sm font-bold text-[#FDCB02] hover:underline">
                        Volver al Catálogo
                    </button>
                </div>
            ) : (
                items.map((item) => (
                    <div key={item.id} className="flex gap-4 animate-in fade-in slide-in-from-right-4 border-b border-neutral-50 pb-4 last:border-0">
                        {/* Imagen Miniatura */}
                        <div className="relative w-20 h-20 bg-neutral-100 rounded-md overflow-hidden shrink-0 border border-neutral-200 flex items-center justify-center">
                            {item.image ? (
                                <Image src={item.image} alt={item.title} fill className="object-cover" />
                            ) : (
                                <span className="text-2xl">📦</span> 
                            )}
                        </div>
                        
                        {/* Info del Producto */}
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-sm text-black line-clamp-2 leading-tight uppercase">{item.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600 font-bold uppercase">
                                        {item.unit}
                                    </span>
                                    {/* Si es rollo, mostramos etiqueta especial */}
                                    {(item.unit.includes('Rollo') || item.meta?.mode === 'rollo') && (
                                        <span className="text-[10px] bg-[#FDCB02]/20 text-black px-1.5 py-0.5 rounded font-bold uppercase">
                                            Rollo
                                        </span>
                                    )}
                                    {/* Si tiene color seleccionado, lo mostramos */}
                                    {item.meta?.color && (
                                        <span className="text-[10px] border border-neutral-200 px-1.5 py-0.5 rounded text-neutral-500 font-bold uppercase">
                                            {item.meta.color}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-end mt-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-neutral-400 font-mono">
                                        {item.quantity} kg x ${item.price.toLocaleString()}
                                    </span>
                                    <span className="text-sm font-bold text-black">
                                        ${(item.price * item.quantity).toLocaleString()}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => removeItem(item.id)} 
                                    className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    title="Eliminar del carrito"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Footer del Carrito */}
        {items.length > 0 && (
            <div className="p-6 border-t border-neutral-100 bg-neutral-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-end mb-4">
                    <span className="text-xs font-bold text-neutral-500 uppercase">Subtotal Estimado</span>
                    <span className="text-2xl font-[1000] text-black tracking-tight">
                        ${subtotal.toLocaleString()} <span className="text-xs font-normal text-neutral-400">MXN</span>
                    </span>
                </div>
                
                <Link 
                    href="/checkout" 
                    onClick={closeCart} 
                    className="w-full bg-[#FDCB02] hover:bg-black hover:text-white text-black py-4 rounded-lg font-[900] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                    Finalizar Compra <ArrowRight size={18}/>
                </Link>

                <p className="text-[10px] text-center text-neutral-400 mt-3 font-medium">
                    Impuestos y envío calculados en el siguiente paso.
                </p>
            </div>
        )}
      </div>
    </>
  );
}