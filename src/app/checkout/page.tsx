'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/context/cart-context';
import { 
  ShieldCheck, Lock, CreditCard, User, MapPin, 
  Phone, Mail, ArrowLeft, ShoppingBag, Truck, Package, Home, 
  Landmark, Store, Banknote
} from 'lucide-react';

declare global {
  interface Window {
    OpenPay: any;
  }
}

const LOGOS = {
  visa: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg",
  mastercard: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg",
  amex: "https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg",
  oxxo: "https://upload.wikimedia.org/wikipedia/commons/6/66/Oxxo_Logo.svg",
  seven: "https://upload.wikimedia.org/wikipedia/commons/4/40/7-eleven_logo.svg"
};

type PaymentMethod = 'card' | 'bank_account' | 'store';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [deviceSessionId, setDeviceSessionId] = useState('');
  const [mounted, setMounted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  const [customerData, setCustomerData] = useState({ 
    name: '', lastName: '', email: '', phone: '', 
    street: '', number: '', unit: '', neighborhood: '', 
    city: '', state: '', zip: '', reference: ''
  });
  
  const [cardData, setCardData] = useState({ 
    holder: '', number: '', expYear: '', expMonth: '', cvv: '' 
  });

  const shippingCost = 250; 
  const total = subtotal + shippingCost;

  useEffect(() => {
    setMounted(true);
  }, []);

  const setupOpenPay = () => {
    if (typeof window !== 'undefined' && window.OpenPay && window.OpenPay.deviceData) {
      try {
        window.OpenPay.setId(process.env.NEXT_PUBLIC_OPENPAY_MERCHANT_ID);
        window.OpenPay.setApiKey(process.env.NEXT_PUBLIC_OPENPAY_PUBLIC_KEY);
        window.OpenPay.setSandboxMode(process.env.NODE_ENV !== 'production');
        
        const deviceId = window.OpenPay.deviceData.setup();
        setDeviceSessionId(deviceId);
        setIsSdkReady(true);
        console.log("✅ OpenPay Ready. Device:", deviceId);
      } catch (error) {
        console.error("Error OpenPay:", error);
      }
    }
  };

  const prepareShipmentData = () => {
    const weight = items.reduce((acc, item) => acc + (item.quantity * 1), 0);
    return {
      weight,
      height: 15, width: 30, length: 30,
      address_to: {
        name: `${customerData.name} ${customerData.lastName}`,
        email: customerData.email,
        phone: customerData.phone,
        street1: `${customerData.street} ${customerData.number}`,
        street2: customerData.unit,
        city: customerData.city,
        province: customerData.state,
        zip: customerData.zip,
        country: 'MX',
        reference: `${customerData.neighborhood}. ${customerData.reference}`
      }
    };
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      if (!isSdkReady && paymentMethod === 'card') throw new Error("Cargando seguridad bancaria...");

      const finalDeviceId = deviceSessionId || window.OpenPay?.deviceData?.setup();
      
      if (!customerData.street || !customerData.zip || !customerData.email) {
        throw new Error("Completa la dirección para generar la guía de envío.");
      }

      let token = null;

      if (paymentMethod === 'card') {
        token = await new Promise<string>((resolve, reject) => {
          window.OpenPay.token.create(
            {
              "card_number": cardData.number.replace(/\s/g, ''),
              "holder_name": cardData.holder,
              "expiration_year": cardData.expYear,
              "expiration_month": cardData.expMonth,
              "cvv2": cardData.cvv,
            },
            (res: any) => resolve(res.data.id),
            (err: any) => reject(err)
          );
        });
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: paymentMethod,
          token,
          deviceSessionId: finalDeviceId,
          amount: total,
          description: `Pedido Coyote Textil - ${items.length} items`,
          items,
          customer: customerData,
          shipping: prepareShipmentData()
        })
      });

      const data = await res.json();

      if (data.success) {
        clearCart();
        router.push(`/checkout/success?orderId=${data.orderId}&method=${paymentMethod}`);
      } else {
        throw new Error(data.error || "No se pudo procesar el pedido.");
      }

    } catch (error: any) {
      console.error(error);
      const msg = error.data?.description || error.message || "Error desconocido";
      alert(`⚠️ ${msg}`);
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
      
      <Script src="https://js.openpay.mx/openpay.v1.min.js" strategy="afterInteractive" />
      <Script src="https://js.openpay.mx/openpay-data.v1.min.js" strategy="afterInteractive" onLoad={setupOpenPay}/>

      <div className="container mx-auto max-w-[1200px]">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <Link href="/" className="p-2 hover:bg-white rounded-full transition-colors text-neutral-500">
                <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-black uppercase text-black tracking-tight">Finalizar Compra</h1>
            <div className="ml-auto flex items-center gap-2 text-[10px] font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full uppercase">
                <Truck size={12} /> Logística Skydropx Integrada
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. DATOS DE ENVÍO */}
            <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200 shadow-sm">
                <h2 className="text-lg font-bold uppercase text-black mb-6 flex items-center gap-2">
                    <User className="text-[#FDCB02]" size={20}/> Datos de Envío
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input placeholder="Nombre(s)" className="checkout-input" onChange={e => setCustomerData({...customerData, name: e.target.value})}/>
                    <input placeholder="Apellidos" className="checkout-input" onChange={e => setCustomerData({...customerData, lastName: e.target.value})}/>
                    
                    {/* 👇 CORRECCIÓN AQUÍ: Agregamos la clase 'with-icon' */}
                    <div className="relative md:col-span-1">
                        <Mail size={16} className="absolute left-3 top-3.5 text-neutral-400 z-10"/>
                        <input 
                            placeholder="Email (Para confirmación)" 
                            className="checkout-input with-icon" 
                            onChange={e => setCustomerData({...customerData, email: e.target.value})}
                        />
                    </div>
                    
                    {/* 👇 CORRECCIÓN AQUÍ: Agregamos la clase 'with-icon' */}
                    <div className="relative md:col-span-1">
                        <Phone size={16} className="absolute left-3 top-3.5 text-neutral-400 z-10"/>
                        <input 
                            placeholder="Teléfono Móvil" 
                            className="checkout-input with-icon" 
                            onChange={e => setCustomerData({...customerData, phone: e.target.value})}
                        />
                    </div>
                    
                    <div className="md:col-span-2 border-t border-neutral-100 mt-4 pt-4">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase mb-3 flex items-center gap-1">
                            <MapPin size={10}/> Dirección Exacta (Requerido por Paquetería)
                        </p>
                    </div>

                    <input placeholder="Calle" className="checkout-input md:col-span-2" onChange={e => setCustomerData({...customerData, street: e.target.value})}/>
                    
                    <div className="grid grid-cols-2 gap-4 md:col-span-2">
                        <input placeholder="No. Exterior" className="checkout-input" onChange={e => setCustomerData({...customerData, number: e.target.value})}/>
                        <input placeholder="No. Interior (Opcional)" className="checkout-input" onChange={e => setCustomerData({...customerData, unit: e.target.value})}/>
                    </div>

                    <input placeholder="Colonia / Asentamiento" className="checkout-input md:col-span-2" onChange={e => setCustomerData({...customerData, neighborhood: e.target.value})}/>
                    
                    <input placeholder="Código Postal" className="checkout-input" onChange={e => setCustomerData({...customerData, zip: e.target.value})}/>
                    <input placeholder="Ciudad / Municipio" className="checkout-input" onChange={e => setCustomerData({...customerData, city: e.target.value})}/>
                    
                    <input placeholder="Estado" className="checkout-input md:col-span-2" onChange={e => setCustomerData({...customerData, state: e.target.value})}/>
                    
                    <input placeholder="Referencias (Ej. Portón negro)" className="checkout-input md:col-span-2" onChange={e => setCustomerData({...customerData, reference: e.target.value})}/>
                </div>
            </div>

            {/* 2. MÉTODO DE PAGO */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="bg-neutral-50 border-b border-neutral-200 p-2 flex gap-2">
                    <button 
                        onClick={() => setPaymentMethod('card')}
                        className={`flex-1 py-3 px-4 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${paymentMethod === 'card' ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-neutral-500 hover:text-black'}`}
                    >
                        <CreditCard size={16}/> Tarjeta
                    </button>
                    <button 
                        onClick={() => setPaymentMethod('bank_account')}
                        className={`flex-1 py-3 px-4 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${paymentMethod === 'bank_account' ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-neutral-500 hover:text-black'}`}
                    >
                        <Landmark size={16}/> Transferencia
                    </button>
                    <button 
                        onClick={() => setPaymentMethod('store')}
                        className={`flex-1 py-3 px-4 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${paymentMethod === 'store' ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-neutral-500 hover:text-black'}`}
                    >
                        <Store size={16}/> Efectivo
                    </button>
                </div>

                <div className="p-6 md:p-8">
                    
                    {/* TARJETA */}
                    {paymentMethod === 'card' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold uppercase text-black">Pago con Tarjeta</h2>
                                <div className="flex gap-2 opacity-70">
                                    <img src={LOGOS.visa} alt="Visa" className="h-6"/>
                                    <img src={LOGOS.mastercard} alt="MC" className="h-6"/>
                                    <img src={LOGOS.amex} alt="Amex" className="h-6"/>
                                </div>
                            </div>
                            
                            <div className="space-y-5">
                                <input placeholder="NOMBRE DEL TITULAR" className="checkout-input font-bold uppercase" onChange={e => setCardData({...cardData, holder: e.target.value})}/>
                                
                                <div className="relative">
                                    <input placeholder="0000 0000 0000 0000" maxLength={16} className="checkout-input font-mono text-lg" onChange={e => setCardData({...cardData, number: e.target.value})}/>
                                    <Lock size={16} className="absolute right-3 top-3.5 text-neutral-400"/>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <input placeholder="MM" maxLength={2} className="checkout-input text-center" onChange={e => setCardData({...cardData, expMonth: e.target.value})}/>
                                    <input placeholder="AA" maxLength={2} className="checkout-input text-center" onChange={e => setCardData({...cardData, expYear: e.target.value})}/>
                                    <input placeholder="CVV" type="password" maxLength={4} className="checkout-input text-center" onChange={e => setCardData({...cardData, cvv: e.target.value})}/>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SPEI */}
                    {paymentMethod === 'bank_account' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 text-center">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Landmark size={32}/>
                            </div>
                            <h2 className="text-lg font-bold uppercase mb-2">Transferencia Bancaria (SPEI)</h2>
                            <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">
                                Al confirmar, generaremos una <strong>CLABE única</strong> para tu transferencia.
                            </p>
                            <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 inline-block">
                                <p className="text-[10px] font-bold uppercase text-neutral-400 mb-1">Total a Transferir</p>
                                <p className="text-2xl font-black text-black">${total.toLocaleString()} MXN</p>
                            </div>
                        </div>
                    )}

                    {/* EFECTIVO */}
                    {paymentMethod === 'store' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 text-center">
                             <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Banknote size={32}/>
                            </div>
                            <h2 className="text-lg font-bold uppercase mb-4">Pago en Efectivo</h2>
                            <div className="flex justify-center gap-6 mb-8 opacity-80 grayscale hover:grayscale-0 transition-all">
                                <img src={LOGOS.oxxo} alt="Oxxo" className="h-8 object-contain"/>
                                <img src={LOGOS.seven} alt="7-Eleven" className="h-8 object-contain"/>
                                <div className="h-8 flex items-center text-xs font-bold bg-neutral-100 px-2 rounded text-neutral-500">+15 Tiendas</div>
                            </div>
                        </div>
                    )}

                    <div className="pt-8 mt-4 border-t border-neutral-100">
                        <button 
                            onClick={handleTransaction}
                            disabled={isProcessing || (paymentMethod === 'card' && !isSdkReady)}
                            className={`w-full font-black uppercase py-4 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 
                                ${isProcessing 
                                    ? 'bg-neutral-800 text-neutral-400 cursor-wait' 
                                    : 'bg-[#FDCB02] hover:bg-black hover:text-white text-black'
                                }`}
                        >
                            {isProcessing ? 'Procesando...' : (
                                <>
                                    <span>
                                        {paymentMethod === 'card' ? 'Pagar Ahora' : 'Generar Ficha de Pago'}
                                    </span>
                                    <span className="bg-black/10 px-2 py-0.5 rounded text-sm">
                                        ${total.toLocaleString()}
                                    </span>
                                </>
                            )}
                        </button>
                        
                        <div className="flex items-center justify-center gap-2 mt-4 text-[10px] text-neutral-400 uppercase font-bold">
                            <ShieldCheck size={12} className="text-green-500"/>
                            Transacción Encriptada 256-bits
                        </div>
                    </div>

                </div>
            </div>
          </div>

          <div className="lg:col-span-5">
             <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200 shadow-lg sticky top-28">
                <h3 className="text-lg font-black uppercase text-black mb-6 border-b border-neutral-100 pb-4">Resumen</h3>
                <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {items.map((item) => (
                        <div key={item.id} className="flex gap-4 items-start border-b border-neutral-50 pb-4 last:border-0">
                             <div className="relative w-16 h-16 bg-neutral-100 rounded-md overflow-hidden shrink-0">
                                <Image src={item.image || "/placeholder.jpg"} alt={item.title} fill className="object-cover" />
                                <div className="absolute top-0 right-0 bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl">x{item.quantity}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-black truncate">{item.title}</h4>
                                <p className="text-[10px] text-neutral-500 font-bold uppercase mt-1">{item.unit}</p>
                            </div>
                            <span className="font-bold text-sm text-black">${(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                    ))}
                </div>
                <div className="space-y-3 pt-4 border-t border-neutral-100 bg-neutral-50 p-4 rounded-lg">
                    <div className="flex justify-between text-sm"><span className="text-neutral-600">Subtotal</span><span className="font-bold">${subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-neutral-600">Envío Estándar</span><span className="font-bold">${shippingCost.toLocaleString()}</span></div>
                    <div className="flex justify-between items-end pt-3 border-t border-neutral-200 mt-2">
                        <span className="font-black uppercase">Total</span>
                        <span className="font-black text-2xl">${total.toLocaleString()}</span>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* ESTILOS CSS CORREGIDOS */}
      <style jsx>{`
        .checkout-input {
          width: 100%;
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.2s;
        }
        
        /* 👇 AQUÍ ESTÁ LA MAGIA: Clase específica para inputs con ícono */
        .checkout-input.with-icon {
            padding-left: 2.75rem !important; /* Fuerza el espacio izquierdo */
        }

        .checkout-input:focus {
          border-color: #FDCB02;
          background-color: #fff;
          box-shadow: 0 0 0 1px #FDCB02;
        }
      `}</style>
    </div>
  );
}