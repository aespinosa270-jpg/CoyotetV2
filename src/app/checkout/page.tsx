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

declare global {
  interface Window {
    OpenPay: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  
  // Estados de proceso
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false); // Controla si OpenPay ya cargó
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

  const shippingCost = 250; 
  const total = subtotal + shippingCost;

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- FUNCIÓN DE INICIALIZACIÓN SEGURA ---
  const setupOpenPay = () => {
    console.log("🔄 Intentando inicializar OpenPay...");
    
    if (typeof window !== 'undefined' && window.OpenPay && window.OpenPay.deviceData) {
      try {
        window.OpenPay.setId(process.env.NEXT_PUBLIC_OPENPAY_MERCHANT_ID);
        window.OpenPay.setApiKey(process.env.NEXT_PUBLIC_OPENPAY_PUBLIC_KEY);
        window.OpenPay.setSandboxMode(process.env.NODE_ENV !== 'production');
        
        const deviceId = window.OpenPay.deviceData.setup();
        setDeviceSessionId(deviceId);
        setIsSdkReady(true); // ¡LISTO! Activamos el botón
        console.log("✅ OpenPay Inicializado. Device ID:", deviceId);
      } catch (error) {
        console.error("❌ Error iniciando OpenPay:", error);
        alert("Error de conexión con el banco. Por favor desactiva AdBlock si lo tienes activo.");
      }
    } else {
      console.warn("⏳ OpenPay aún no carga completos sus módulos.");
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Doble verificación de seguridad
      if (!isSdkReady || !window.OpenPay) {
        throw new Error("El sistema bancario no ha cargado. Verifica tu conexión o desactiva AdBlock.");
      }

      // Aseguramos Device ID (Redundancia de seguridad)
      let finalDeviceId = deviceSessionId;
      if (!finalDeviceId) {
          console.log("⚠️ ID vacío, regenerando al vuelo...");
          window.OpenPay.setId(process.env.NEXT_PUBLIC_OPENPAY_MERCHANT_ID);
          window.OpenPay.setApiKey(process.env.NEXT_PUBLIC_OPENPAY_PUBLIC_KEY);
          window.OpenPay.setSandboxMode(process.env.NODE_ENV !== 'production');
          finalDeviceId = window.OpenPay.deviceData.setup();
      }

      if (!finalDeviceId) throw new Error("No se pudo generar la firma digital del dispositivo.");

      // Validaciones
      if (!cardData.number || !cardData.cvv || !cardData.holder || !customerData.email) {
        throw new Error("Por favor completa todos los campos del formulario.");
      }

      // 1. Tokenizar
      console.log("💳 Tokenizando tarjeta...");
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

      console.log("🎫 Token obtenido:", token);

      // 2. Procesar en Backend
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          deviceSessionId: finalDeviceId,
          amount: total,
          description: `Pedido Web Coyote - ${items.length} items`,
          items: items, 
          customer: {
            name: customerData.name,
            lastName: customerData.lastName,
            phone: customerData.phone,
            email: customerData.email,
            address: `${customerData.address}, ${customerData.city}, CP ${customerData.zip}`
          }
        })
      });

      const data = await res.json();

      if (data.success) {
        clearCart(); 
        // ✅ AQUÍ ESTÁ EL CAMBIO: Redirigimos al ticket digital
        router.push(`/checkout/success?orderId=${data.orderId}`); 
      } else {
        throw new Error(data.error || "El pago fue rechazado.");
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
        <div className="min-h-screen bg-white flex flex-col items-center justify-center pt-20">
            <ShoppingBag size={48} className="text-neutral-300 mb-4" />
            <h1 className="text-2xl font-bold uppercase mb-4">Carrito vacío</h1>
            <Link href="/" className="text-[#FDCB02] font-bold underline">Volver al catálogo</Link>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-20 px-4 font-sans selection:bg-[#FDCB02] selection:text-black">
      
      {/* Scripts OpenPay */}
      <Script 
        src="https://js.openpay.mx/openpay.v1.min.js" 
        strategy="afterInteractive" 
        onError={() => alert("Error cargando OpenPay. Desactiva tu AdBlock.")}
      />
      <Script 
        src="https://js.openpay.mx/openpay-data.v1.min.js" 
        strategy="afterInteractive" 
        onLoad={setupOpenPay}
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
          
          {/* --- COLUMNA IZQUIERDA --- */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Datos de Envío */}
            <div className="bg-white p-6 md:p-8 rounded-lg border border-neutral-200 shadow-sm">
                <h2 className="text-lg font-bold uppercase text-black mb-6 flex items-center gap-2">
                    <User className="text-[#FDCB02]" size={20}/> Datos de Envío
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                        placeholder="Nombre(s)" 
                        className="bg-neutral-50 border p-3 rounded text-sm focus:border-[#FDCB02] outline-none"
                        onChange={e => setCustomerData({...customerData, name: e.target.value})}
                    />
                    <input 
                        placeholder="Apellidos" 
                        className="bg-neutral-50 border p-3 rounded text-sm focus:border-[#FDCB02] outline-none"
                        onChange={e => setCustomerData({...customerData, lastName: e.target.value})}
                    />
                    <div className="relative md:col-span-2">
                        <Mail size={16} className="absolute left-3 top-3.5 text-neutral-400"/>
                        <input 
                            placeholder="Correo Electrónico" 
                            className="w-full bg-neutral-50 border p-3 pl-10 rounded text-sm focus:border-[#FDCB02] outline-none"
                            onChange={e => setCustomerData({...customerData, email: e.target.value})}
                        />
                    </div>
                    <div className="relative md:col-span-2">
                        <Phone size={16} className="absolute left-3 top-3.5 text-neutral-400"/>
                        <input 
                            placeholder="Teléfono" 
                            className="w-full bg-neutral-50 border p-3 pl-10 rounded text-sm focus:border-[#FDCB02] outline-none"
                            onChange={e => setCustomerData({...customerData, phone: e.target.value})}
                        />
                    </div>
                     <div className="relative md:col-span-2">
                        <MapPin size={16} className="absolute left-3 top-3.5 text-neutral-400"/>
                        <input 
                            placeholder="Dirección Completa" 
                            className="w-full bg-neutral-50 border p-3 pl-10 rounded text-sm focus:border-[#FDCB02] outline-none"
                            onChange={e => setCustomerData({...customerData, address: e.target.value})}
                        />
                    </div>
                    <input 
                        placeholder="Ciudad" 
                        className="bg-neutral-50 border p-3 rounded text-sm focus:border-[#FDCB02] outline-none"
                        onChange={e => setCustomerData({...customerData, city: e.target.value})}
                    />
                    <input 
                        placeholder="Código Postal" 
                        className="bg-neutral-50 border p-3 rounded text-sm focus:border-[#FDCB02] outline-none"
                        onChange={e => setCustomerData({...customerData, zip: e.target.value})}
                    />
                </div>
            </div>

            {/* Formulario de Tarjeta */}
            <div className="bg-white p-6 md:p-8 rounded-lg border border-neutral-200 shadow-sm">
                <h2 className="text-lg font-bold uppercase text-black mb-6 flex items-center gap-2">
                    <CreditCard className="text-[#FDCB02]" size={20}/> Pago con Tarjeta
                </h2>
                
                <form onSubmit={handlePayment} className="space-y-5">
                    <div>
                        <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1 block">Titular</label>
                        <input 
                            placeholder="COMO APARECE EN LA TARJETA" 
                            className="w-full bg-neutral-50 border p-3 rounded text-sm font-bold uppercase focus:border-[#FDCB02] outline-none"
                            onChange={e => setCardData({...cardData, holder: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1 block">Número</label>
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
                            <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1 block">Mes</label>
                            <input 
                                placeholder="MM" maxLength={2} 
                                className="w-full bg-neutral-50 border p-3 rounded text-center text-sm focus:border-[#FDCB02] outline-none"
                                onChange={e => setCardData({...cardData, expMonth: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-neutral-500 mb-1 block">Año</label>
                            <input 
                                placeholder="AA" maxLength={2} 
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
                            disabled={isProcessing || !isSdkReady}
                            className={`w-full font-black uppercase py-4 rounded-lg transition-all shadow-md flex items-center justify-center gap-2 
                                ${!isSdkReady || isProcessing 
                                    ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed' 
                                    : 'bg-[#FDCB02] hover:bg-black hover:text-white text-black'
                                }`}
                        >
                            {!isSdkReady 
                                ? 'CARGANDO SISTEMA DE PAGOS...' 
                                : isProcessing 
                                    ? 'PROCESANDO PAGO...' 
                                    : `PAGAR $${total.toLocaleString()} MXN`
                            }
                        </button>
                    </div>
                </form>
            </div>
          </div>

          {/* --- COLUMNA DERECHA: RESUMEN (Sin cambios) --- */}
          <div className="lg:col-span-5">
             <div className="bg-white p-6 md:p-8 rounded-lg border border-neutral-200 shadow-lg sticky top-28">
                <h3 className="text-lg font-black uppercase text-black mb-6 border-b border-neutral-100 pb-4">
                    Resumen del Pedido
                </h3>
                
                <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
                    {items.map((item) => (
                        <div key={item.id} className="flex gap-4 items-start border-b border-neutral-50 pb-4 last:border-0">
                             <div className="relative w-16 h-16 bg-neutral-100 rounded-md overflow-hidden shrink-0 flex items-center justify-center">
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

                <div className="space-y-3 pt-4 border-t border-neutral-100 bg-neutral-50 p-4 rounded-md">
                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-600 font-medium">Subtotal</span>
                        <span className="font-bold text-black">${subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-600 font-medium">Envío</span>
                        <span className="font-bold text-black">${shippingCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-end pt-3 border-t border-neutral-200 mt-2">
                        <span className="font-black uppercase text-base">Total</span>
                        <span className="font-black text-2xl text-black">
                            ${total.toLocaleString()}
                        </span>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}