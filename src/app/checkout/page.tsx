'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/context/cart-context';
import { 
  ArrowLeft, CreditCard, MapPin, Shield, Truck, 
  CheckCircle, Activity, Lock, ShoppingBag, 
  Trash2, Plus, Minus, AlertCircle
} from 'lucide-react';

export default function CheckoutPage() {
  // 1. TRAEMOS LAS FUNCIONES DE CONTROL (updateQuantity, removeItem)
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: '', email: '', telefono: '', direccion: '', ciudad: '', cp: ''
  });

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  // Lógica de Envío
  const costoEnvio = subtotal > 5000 ? 0 : 250;
  const totalPagar = subtotal + costoEnvio;
  
  // --- CARRITO VACÍO ---
  if (items.length === 0) {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center text-neutral-900 space-y-6 pt-20">
            <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 mb-2">
                <ShoppingBag size={48} />
            </div>
            <h1 className="text-2xl font-black uppercase">Tu pedido está vacío</h1>
            <p className="text-neutral-500 max-w-md text-center px-4">
                Regresa al catálogo para agregar productos antes de finalizar.
            </p>
            <Link 
                href="/" 
                className="bg-[#FDCB02] hover:bg-black hover:text-white text-black px-8 py-3 rounded-lg font-bold uppercase tracking-widest transition-all"
            >
                Volver al Catálogo
            </Link>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 font-sans pt-24 pb-20 selection:bg-[#FDCB02] selection:text-black">
      
      <div className="container mx-auto px-4 lg:px-8 max-w-[1200px]">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <Link href="/" className="p-2 hover:bg-white rounded-full transition-colors text-neutral-500">
                <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-black uppercase text-black tracking-tight">Finalizar Compra</h1>
            <div className="ml-auto flex items-center gap-2 text-[10px] font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full uppercase">
                <Lock size={12} /> Sitio Seguro SSL
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* --- COLUMNA IZQUIERDA: DATOS --- */}
            <div className="lg:col-span-7 space-y-6">
                
                {/* 1. Dirección */}
                <div className="bg-white p-6 md:p-8 rounded-lg border border-neutral-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-neutral-100 pb-4">
                        <div className="w-8 h-8 bg-[#FDCB02] rounded-full flex items-center justify-center font-bold text-sm text-black">1</div>
                        <h2 className="text-lg font-bold uppercase text-black">Dirección de Envío</h2>
                    </div>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase mb-1 block">Nombre Completo</label>
                            <input type="text" className="w-full bg-neutral-50 border border-neutral-200 rounded p-3 text-sm font-medium focus:outline-none focus:border-[#FDCB02] transition-all" placeholder="Nombre y Apellido" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-neutral-500 uppercase mb-1 block">Teléfono</label>
                            <input type="tel" className="w-full bg-neutral-50 border border-neutral-200 rounded p-3 text-sm font-medium focus:outline-none focus:border-[#FDCB02] transition-all" placeholder="10 dígitos" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-neutral-500 uppercase mb-1 block">Email</label>
                            <input type="email" className="w-full bg-neutral-50 border border-neutral-200 rounded p-3 text-sm font-medium focus:outline-none focus:border-[#FDCB02] transition-all" placeholder="contacto@ejemplo.com" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase mb-1 block">Dirección</label>
                            <input type="text" className="w-full bg-neutral-50 border border-neutral-200 rounded p-3 text-sm font-medium focus:outline-none focus:border-[#FDCB02] transition-all" placeholder="Calle y Número" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-neutral-500 uppercase mb-1 block">Ciudad</label>
                            <input type="text" className="w-full bg-neutral-50 border border-neutral-200 rounded p-3 text-sm font-medium focus:outline-none focus:border-[#FDCB02] transition-all" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-neutral-500 uppercase mb-1 block">CP</label>
                            <input type="text" className="w-full bg-neutral-50 border border-neutral-200 rounded p-3 text-sm font-medium focus:outline-none focus:border-[#FDCB02] transition-all" />
                        </div>
                    </form>
                </div>

                {/* 2. Pago */}
                <div className="bg-white p-6 md:p-8 rounded-lg border border-neutral-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-neutral-100 pb-4">
                        <div className="w-8 h-8 bg-neutral-200 text-neutral-600 rounded-full flex items-center justify-center font-bold text-sm">2</div>
                        <h2 className="text-lg font-bold uppercase text-black">Forma de Pago</h2>
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center justify-between p-4 border border-[#FDCB02] bg-[#FDCB02]/5 rounded-lg cursor-pointer transition-all">
                            <div className="flex items-center gap-3">
                                <input type="radio" name="payment" defaultChecked className="accent-black w-4 h-4" />
                                <span className="font-bold text-sm text-black">Tarjeta de Crédito / Débito</span>
                            </div>
                            <CreditCard size={20} className="text-neutral-400"/>
                        </label>
                        <label className="flex items-center justify-between p-4 border border-neutral-200 hover:border-neutral-300 rounded-lg cursor-pointer transition-all">
                            <div className="flex items-center gap-3">
                                <input type="radio" name="payment" className="accent-black w-4 h-4" />
                                <div>
                                    <span className="font-bold text-sm text-black block">Transferencia SPEI</span>
                                </div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* --- COLUMNA DERECHA: RESUMEN INTERACTIVO --- */}
            <div className="lg:col-span-5">
                <div className="bg-white p-6 md:p-8 rounded-lg border border-neutral-200 shadow-lg sticky top-28">
                    <h3 className="text-lg font-black uppercase text-black mb-6 border-b border-neutral-100 pb-4 flex justify-between items-center">
                        Tu Pedido 
                        <span className="text-xs font-normal text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">{items.length} Artículos</span>
                    </h3>
                    
                    {/* LISTA DE PRODUCTOS EDITABLE */}
                    <div className="space-y-6 mb-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-200">
                        {items.map((item) => (
                            <div key={item.id} className="flex gap-4 items-start border-b border-neutral-50 pb-6 last:border-0 last:pb-0 group">
                                
                                {/* Imagen */}
                                <div className="relative w-20 h-20 bg-neutral-100 rounded-md overflow-hidden shrink-0 border border-neutral-200">
                                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                                </div>
                                
                                {/* Controles e Info */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-sm text-black leading-tight truncate max-w-[150px]">{item.title}</h4>
                                            <p className="text-[10px] text-neutral-500 font-bold uppercase mt-0.5">
                                                {item.unit} • ${item.price.toLocaleString()} c/u
                                            </p>
                                        </div>
                                        {/* Botón Eliminar */}
                                        <button 
                                            onClick={() => removeItem(item.id)}
                                            className="text-neutral-300 hover:text-red-500 transition-colors p-1"
                                            title="Eliminar producto"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-end mt-3">
                                        {/* Controlador de Cantidad */}
                                        <div className="flex items-center border border-neutral-300 rounded bg-white h-8">
                                            <button 
                                                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                                className="px-2 h-full hover:bg-neutral-100 text-neutral-600 transition-colors"
                                                disabled={item.quantity <= 1}
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className="w-8 text-center text-xs font-bold text-black">{item.quantity}</span>
                                            <button 
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="px-2 h-full hover:bg-neutral-100 text-neutral-600 transition-colors"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>

                                        {/* Subtotal Línea */}
                                        <span className="font-bold text-sm text-black">
                                            ${(item.price * item.quantity).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* TOTALES */}
                    <div className="space-y-3 pt-6 border-t border-neutral-200 bg-neutral-50 p-4 rounded-md">
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-600 font-medium">Subtotal</span>
                            <span className="font-bold text-black">${subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-600 font-medium">Costo de Envío</span>
                            <span className={`font-bold ${costoEnvio === 0 ? 'text-green-600' : 'text-black'}`}>
                                {costoEnvio === 0 ? 'GRATIS' : `$${costoEnvio.toLocaleString()}`}
                            </span>
                        </div>
                        
                        {costoEnvio > 0 && (
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500 bg-blue-50 p-2 rounded border border-blue-100">
                                <AlertCircle size={12} className="text-blue-500"/>
                                Te faltan <span className="font-bold">${(5000 - subtotal).toLocaleString()}</span> para envío gratis.
                            </div>
                        )}

                        <div className="flex justify-between items-end pt-4 border-t border-neutral-200 mt-2">
                            <span className="font-black uppercase text-base">Total a Pagar</span>
                            <span className="font-black text-2xl text-black">
                                ${totalPagar.toLocaleString()} <span className="text-xs font-normal text-neutral-400">MXN</span>
                            </span>
                        </div>
                    </div>

                    {/* BOTÓN PAGAR */}
                    <button 
                        onClick={() => {
                            setIsProcessing(true);
                            setTimeout(() => {
                                setIsProcessing(false);
                                alert("¡Pedido realizado con éxito!");
                            }, 2000);
                        }}
                        disabled={isProcessing}
                        className="w-full mt-6 bg-[#FDCB02] hover:bg-black hover:text-white text-black py-4 rounded-lg font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? (
                            <>
                                <Activity className="animate-spin" size={20} /> Procesando...
                            </>
                        ) : (
                            <>
                                Pagar Ahora <CheckCircle size={20} />
                            </>
                        )}
                    </button>

                    <div className="mt-6 flex items-center justify-center gap-6 text-neutral-400">
                        <div className="flex flex-col items-center gap-1">
                            <Shield size={18} />
                            <span className="text-[9px] uppercase font-bold">Compra Protegida</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <Truck size={18} />
                            <span className="text-[9px] uppercase font-bold">Envío Seguro</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}