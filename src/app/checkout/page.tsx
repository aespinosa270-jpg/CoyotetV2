'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/context/cart-context';
import { 
  ShieldCheck, Lock, CreditCard, User, MapPin, 
  Phone, Mail, ArrowLeft, ShoppingBag, Truck, Package 
} from 'lucide-react';

// Declaración de tipos para OpenPay
declare global {
  interface Window {
    OpenPay: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [deviceSessionId, setDeviceSessionId] = useState('');
  const [mounted, setMounted] = useState(false);

  // Estados del Formulario
  const [customerData, setCustomerData] = useState({ 
    name: '', lastName: '', email: '', phone: '', 
    address: '', city: '', zip: '' 
  });
  
  const [cardData, setCardData] = useState({ 
    holder: '', number: '', expYear: '', expMonth: '', cvv: '' 
  });

  // --- LÓGICA DE COSTOS ---
  const shippingCost = 250; 
  const total = subtotal + shippingCost;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Configurar OpenPay
  const setupOpenPay = () => {
    if (window.OpenPay) {
      window.OpenPay.setId(process.env.NEXT_PUBLIC_OPENPAY_MERCHANT_ID);
      window.OpenPay.setApiKey(process.env.NEXT_PUBLIC_OPENPAY_PUBLIC_KEY);
      window.OpenPay.setSandboxMode(process.env.NODE_ENV !== 'production');
      
      const deviceId = window.OpenPay.deviceData.setup();
      setDeviceSessionId(deviceId);
      console.log("🔒 Sistema de seguridad OpenPay activo:", deviceId);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      if (!window.OpenPay) throw new Error("El sistema de pagos no se cargó correctamente. Refresca la página.");

      // Validaciones básicas
      if (!cardData.number || !cardData.cvv || !cardData.holder) {
        throw new Error("Por favor completa los datos de la tarjeta.");
      }

      // 1. Tokenizar Tarjeta
      const token = await new Promise<string>((resolve, reject) => {
        window.OpenPay.token.create(
          {
            "card_number": cardData.number.replace(/\s/g, ''),
            "holder_name": cardData.holder,
            "expiration_year": cardData.expYear,
            "expiration_month": cardData.expMonth,
            "cvv2": cardData.cvv,
          },
          (response: any) => resolve(response.data.id),
          (error: any) => reject(error)
        );
      });

      console.log("🎫 Token generado:", token);

      // 2. Procesar Cargo
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          deviceSessionId,
          amount: total,
          description: `Pedido Web Coyote - ${items.length} items`,
          customer: {
            name: customerData.name,
            lastName: customerData.lastName,
            phone: customerData.phone,
            email: customerData.email
          }
        })
      });

      const data = await res.json();

      if (data.success) {
        clearCart();
        alert(`✅ ¡Pago Aprobado! ID: ${data.charge.id}`);
        router.push('/'); 
      } else {
        throw new Error(data.error || "El pago fue rechazado por el banco.");
      }

    } catch (error: any) {
      console.error(error);
      const msg = error.data ? error.data.description : error.message;
      alert(`❌ Error: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted) return null;

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
    <div className="min-h-screen bg-neutral-50 pt-24 pb-20 px-4 font-sans selection:bg-[#FDCB02] selection:text-black">
      
      <Script 
        src="https://js.openpay.mx/openpay.v1.min.js" 
        strategy="lazyOnload" 
        onLoad={setupOpenPay}
      />
      <Script 
        src="https://js.openpay.mx/openpay-data.v1.min.js" 
        strategy="lazyOnload" 
      />

      <div className="container mx-auto max-w-[1200px]">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <Link href="/" className="p-2 hover:bg-white rounded-full transition-colors text-neutral-500">
                <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-black uppercase text-black tracking-tight">Finalizar Compra</h1>
            <div className="ml-auto flex items-center gap-2 text-[10px] font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full uppercase">
                <Lock size={12} /> Pagos Seguros SSL
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* --- COLUMNA IZQUIERDA: FORMULARIOS --- */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Datos de Contacto y Envío */}
            <div className="bg-white p-6 md:p-8 rounded-lg border border-neutral-200 shadow-sm">
                <h2 className="text-lg font-bold uppercase text-black mb-6 flex items-center gap-2">
                    <User className="text-[#FDCB02]" size={20}/> Datos de Envío
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                        placeholder="Nombre(s)" 
                        className="bg-neutral-50 border p-3 rounded text-sm focus:border-[#FDCB02] outline-none transition-colors"
                        onChange={e => setCustomerData({...customerData, name: e.target.value})}
                    />
                    <input 
                        placeholder="Apellidos" 
                        className="bg-neutral-50 border p-3 rounded text-sm focus:border-[#FDCB02] outline-none transition-colors"
                        onChange={e => setCustomerData({...customerData, lastName: e.target.value})}
                    />
                    <div className="relative md:col-span-2">
                        <Mail size={16} className="absolute left-3 top-3.5 text-neutral-400"/>
                        <input 
                            placeholder="Correo Electrónico" 
                            className="w-full bg-neutral-50 border p-3 pl-10 rounded text-sm focus:border-[#FDCB02] outline-none transition-colors"
                            onChange={e => setCustomerData({...customerData, email: e.target.value})}
                        />
                    </div>
                    <div className="relative md:col-span-2">
                        <Phone size={16} className="absolute left-3 top-3.5 text-neutral-400"/>
                        <input 
                            placeholder="Teléfono (10 dígitos)" 
                            className="w-full bg-neutral-50 border p-3 pl-10 rounded text-sm focus:border-[#FDCB02] outline-none transition-colors"
                            onChange={e => setCustomerData({...customerData, phone: e.target.value})}
                        />
                    </div>
                     <div className="relative md:col-span-2">
                        <MapPin size={16} className="absolute left-3 top-3.5 text-neutral-400"/>
                        <input 
                            placeholder="Calle y Número, Colonia, Ciudad" 
                            className="w-full bg-neutral-50 border p-3 pl-10 rounded text-sm focus:border-[#FDCB02] outline-none transition-colors"
                            onChange={e => setCustomerData({...customerData, address: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            {/* 2. Formulario de Tarjeta */}
            <div className="bg-white p-6 md:p-8 rounded-lg border border-neutral-200 shadow-sm">
                <h2 className="text-lg font-bold uppercase text-black mb-6 flex items-center gap-2">
                    <CreditCard className="text-[#FDCB02]" size={20}/> Pago con Tarjeta
                </h2>
                
                <form onSubmit={handlePayment} className="space-y-5">
                    <div>
                        <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1 block">Titular de la Tarjeta</label>
                        <input 
                            placeholder="COMO APARECE EN EL PLÁSTICO" 
                            className="w-full bg-neutral-50 border p-3 rounded text-sm font-bold uppercase focus:border-[#FDCB02] outline-none"
                            onChange={e => setCardData({...cardData, holder: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1 block">Número de Tarjeta</label>
                        <div className="relative">
                            <input 
                                placeholder="0000 0000 0000 0000" 
                                maxLength={16}
                                className="w-full bg-neutral-50 border p-3 rounded text-sm font-mono text-lg focus:border-[#FDCB02] outline-none"
                                onChange={e => setCardData({...cardData, number: e.target.value})}
                            />
                            <Lock size={16} className="absolute right-3 top-3.5 text-neutral-400"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1 block">Mes (MM)</label>
                            <input 
                                placeholder="01" maxLength={2} 
                                className="w-full bg-neutral-50 border p-3 rounded text-center text-sm focus:border-[#FDCB02] outline-none"
                                onChange={e => setCardData({...cardData, expMonth: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1 block">Año (AA)</label>
                            <input 
                                placeholder="26" maxLength={2} 
                                className="w-full bg-neutral-50 border p-3 rounded text-center text-sm focus:border-[#FDCB02] outline-none"
                                onChange={e => setCardData({...cardData, expYear: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1 block">CVV</label>
                            <input 
                                placeholder="123" type="password" maxLength={4} 
                                className="w-full bg-neutral-50 border p-3 rounded text-center text-sm focus:border-[#FDCB02] outline-none"
                                onChange={e => setCardData({...cardData, cvv: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                         <div className="flex items-center gap-2 bg-blue-50 text-blue-800 p-3 rounded text-xs mb-4 border border-blue-100">
                            <ShieldCheck size={16} />
                            <span>Transacción protegida por OpenPay y 3D Secure.</span>
                        </div>
                        
                        <button 
                            disabled={isProcessing}
                            className="w-full bg-[#FDCB02] hover:bg-black hover:text-white text-black font-black uppercase py-4 rounded-lg transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Procesando Pago...' : `Pagar $${total.toLocaleString()} MXN`}
                        </button>
                    </div>
                </form>
            </div>
          </div>

          {/* --- COLUMNA DERECHA: RESUMEN --- */}
          <div className="lg:col-span-5">
             <div className="bg-white p-6 md:p-8 rounded-lg border border-neutral-200 shadow-lg sticky top-28">
                <h3 className="text-lg font-black uppercase text-black mb-6 border-b border-neutral-100 pb-4">
                    Resumen del Pedido
                </h3>
                
                {/* Lista de Productos CON PROTECCIÓN DE IMAGEN */}
                <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-200">
                    {items.map((item) => (
                        <div key={item.id} className="flex gap-4 items-start border-b border-neutral-50 pb-4 last:border-0">
                            <div className="relative w-16 h-16 bg-neutral-100 rounded-md overflow-hidden shrink-0 border border-neutral-100 flex items-center justify-center">
                                {item.image ? (
                                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                                ) : (
                                    <Package size={24} className="text-neutral-300" />
                                )}
                                <div className="absolute top-0 right-0 bg-[#FDCB02] text-black text-[9px] font-bold px-1.5 py-0.5 rounded-bl">
                                    x{item.quantity}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-black leading-tight truncate">{item.title}</h4>
                                <p className="text-[10px] text-neutral-500 font-bold uppercase mt-1">
                                    {item.unit} • ${item.price.toLocaleString()}
                                </p>
                            </div>
                            <span className="font-bold text-sm text-black">
                                ${(item.price * item.quantity).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Totales */}
                <div className="space-y-3 pt-4 border-t border-neutral-100 bg-neutral-50 p-4 rounded-md">
                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-600 font-medium">Subtotal</span>
                        <span className="font-bold text-black">${subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-600 font-medium">Costo de Envío</span>
                        <span className="font-bold text-black">
                            ${shippingCost.toLocaleString()}
                        </span>
                    </div>

                    <div className="flex justify-between items-end pt-3 border-t border-neutral-200 mt-2">
                        <span className="font-black uppercase text-base">Total a Pagar</span>
                        <span className="font-black text-2xl text-black">
                            ${total.toLocaleString()} <span className="text-xs font-normal text-neutral-400">MXN</span>
                        </span>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-center gap-6 text-neutral-400">
                    <div className="flex flex-col items-center gap-1">
                        <ShieldCheck size={18} />
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