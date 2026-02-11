'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/context/cart-context';
import { 
  ShieldCheck, Lock, CreditCard, User, MapPin, 
  Phone, Mail, ArrowLeft, ShoppingBag, Truck, Package, 
  Landmark, Store, Banknote, Info, FileText // 👈 Agregamos icono de Factura
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
  
  // 👇 NUEVO ESTADO: Controla si el usuario quiere factura
  const [wantsInvoice, setWantsInvoice] = useState(false);

  const [customerData, setCustomerData] = useState({ 
    name: '', lastName: '', email: '', phone: '', 
    street: '', number: '', unit: '', neighborhood: '', 
    city: '', state: '', zip: '', reference: ''
  });
  
  const [cardData, setCardData] = useState({ 
    holder: '', number: '', expYear: '', expMonth: '', cvv: '' 
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- 1. LÓGICA DE CÁLCULO (Flete + Envío + Servicio + IVA) ---
  const { freightCost, shippingCost, serviceFee, taxIVA, total, totalWeight, totalRolls } = useMemo(() => {
    let rollCount = 0;
    let weight = 0;

    items.forEach(item => {
        const itemWeight = item.quantity;
        weight += itemWeight;

        const isRollo = item.unit.toLowerCase().includes('rollo') || item.meta?.mode === 'rollo';
        if (isRollo) {
            const packs = item.meta?.packages || Math.ceil(item.quantity / 25) || 1; 
            rollCount += packs;
        } else if (itemWeight >= 25) {
             rollCount += Math.ceil(itemWeight / 25);
        }
    });

    // Flete (Tabla Interna)
    let flete = 0;
    if (weight < 10 && rollCount === 0) {
        flete = 150;
    } else {
        const bultos = Math.max(1, rollCount);
        if (bultos === 1) flete = 200;
        else if (bultos <= 4) flete = 250;
        else if (bultos <= 10) flete = 300;
        else if (bultos <= 15) flete = 400;
        else if (bultos <= 20) flete = 500;
        else flete = 1000;
    }

    // Envío (Skydropx Simulado)
    const baseShipping = 180;
    const extraKgPrice = 12;
    let envio = baseShipping;
    if (weight > 5) {
        envio += (weight - 5) * extraKgPrice;
    }

    // Servicio (5%)
    const fee = subtotal * 0.05;

    // 👇 CÁLCULO DE IVA (16%)
    const baseTotal = subtotal + flete + envio + fee;
    const iva = wantsInvoice ? baseTotal * 0.16 : 0;

    return {
        freightCost: flete,
        shippingCost: envio,
        serviceFee: fee,
        taxIVA: iva, // IVA Calculado
        total: baseTotal + iva, // Total Final
        totalWeight: weight,
        totalRolls: rollCount
    };
  }, [items, subtotal, wantsInvoice]); // Agregamos wantsInvoice a las dependencias

  // --- SDK Y PAGOS ---
  const setupOpenPay = () => {
    if (typeof window !== 'undefined' && window.OpenPay && window.OpenPay.deviceData) {
      try {
        window.OpenPay.setId(process.env.NEXT_PUBLIC_OPENPAY_MERCHANT_ID);
        window.OpenPay.setApiKey(process.env.NEXT_PUBLIC_OPENPAY_PUBLIC_KEY);
        window.OpenPay.setSandboxMode(process.env.NODE_ENV !== 'production');
        
        const deviceId = window.OpenPay.deviceData.setup();
        setDeviceSessionId(deviceId);
        setIsSdkReady(true);
        console.log("✅ OpenPay Ready");
      } catch (error) {
        console.error("Error OpenPay:", error);
      }
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      if (!isSdkReady && paymentMethod === 'card') throw new Error("Cargando seguridad bancaria...");
      
      if (!customerData.street || !customerData.zip || !customerData.email) {
        throw new Error("Completa la dirección para cotizar el envío exacto.");
      }

      const finalDeviceId = deviceSessionId || window.OpenPay?.deviceData?.setup();
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
          description: `Pedido Coyote - ${totalWeight}kg ${wantsInvoice ? '(Con Factura)' : ''}`,
          items,
          customer: customerData,
          metadata: {
             weight_kg: totalWeight,
             freight_cost: freightCost,
             shipping_cost: shippingCost,
             service_fee: serviceFee,
             tax_iva: taxIVA, // Enviamos el monto de IVA
             req_invoice: wantsInvoice ? 'YES' : 'NO' // Bandera para saber si facturar
          }
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
                <Truck size={12} /> Logística Coyote
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUMNA IZQUIERDA (Datos y Pagos) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. DATOS DE ENVÍO */}
            <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200 shadow-sm">
                <h2 className="text-lg font-bold uppercase text-black mb-6 flex items-center gap-2">
                    <User className="text-[#FDCB02]" size={20}/> Datos de Envío
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input placeholder="Nombre(s)" className="checkout-input" onChange={e => setCustomerData({...customerData, name: e.target.value})}/>
                    <input placeholder="Apellidos" className="checkout-input" onChange={e => setCustomerData({...customerData, lastName: e.target.value})}/>
                    <div className="relative md:col-span-1">
                        <Mail size={16} className="absolute left-3 top-3.5 text-neutral-400 z-10"/>
                        <input placeholder="Email" className="checkout-input with-icon" onChange={e => setCustomerData({...customerData, email: e.target.value})}/>
                    </div>
                    <div className="relative md:col-span-1">
                        <Phone size={16} className="absolute left-3 top-3.5 text-neutral-400 z-10"/>
                        <input placeholder="Teléfono" className="checkout-input with-icon" onChange={e => setCustomerData({...customerData, phone: e.target.value})}/>
                    </div>
                    <div className="md:col-span-2 border-t border-neutral-100 mt-4 pt-4">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase mb-3 flex items-center gap-1">
                            <MapPin size={10}/> Dirección Exacta
                        </p>
                    </div>
                    <input placeholder="Calle" className="checkout-input md:col-span-2" onChange={e => setCustomerData({...customerData, street: e.target.value})}/>
                    <div className="grid grid-cols-2 gap-4 md:col-span-2">
                        <input placeholder="No. Exterior" className="checkout-input" onChange={e => setCustomerData({...customerData, number: e.target.value})}/>
                        <input placeholder="No. Interior" className="checkout-input" onChange={e => setCustomerData({...customerData, unit: e.target.value})}/>
                    </div>
                    <input placeholder="Colonia" className="checkout-input md:col-span-2" onChange={e => setCustomerData({...customerData, neighborhood: e.target.value})}/>
                    <input placeholder="CP" className="checkout-input" onChange={e => setCustomerData({...customerData, zip: e.target.value})}/>
                    <input placeholder="Ciudad" className="checkout-input" onChange={e => setCustomerData({...customerData, city: e.target.value})}/>
                    <input placeholder="Estado" className="checkout-input md:col-span-2" onChange={e => setCustomerData({...customerData, state: e.target.value})}/>
                    <input placeholder="Referencias" className="checkout-input md:col-span-2" onChange={e => setCustomerData({...customerData, reference: e.target.value})}/>
                </div>
            </div>

            {/* 2. MÉTODO DE PAGO (SIN CAMBIOS) */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="bg-neutral-50 border-b border-neutral-200 p-2 flex gap-2">
                    <button onClick={() => setPaymentMethod('card')} className={`flex-1 py-3 px-4 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${paymentMethod === 'card' ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-neutral-500 hover:text-black'}`}><CreditCard size={16}/> Tarjeta</button>
                    <button onClick={() => setPaymentMethod('bank_account')} className={`flex-1 py-3 px-4 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${paymentMethod === 'bank_account' ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-neutral-500 hover:text-black'}`}><Landmark size={16}/> Transferencia</button>
                    <button onClick={() => setPaymentMethod('store')} className={`flex-1 py-3 px-4 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${paymentMethod === 'store' ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-neutral-500 hover:text-black'}`}><Store size={16}/> Efectivo</button>
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
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Landmark size={32}/></div>
                            <h2 className="text-lg font-bold uppercase mb-2">Transferencia Bancaria (SPEI)</h2>
                            <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">Al confirmar, generaremos una <strong>CLABE única</strong> para tu transferencia.</p>
                            <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 inline-block">
                                <p className="text-[10px] font-bold uppercase text-neutral-400 mb-1">Total a Transferir</p>
                                <p className="text-2xl font-black text-black">${total.toLocaleString()} MXN</p>
                            </div>
                        </div>
                    )}

                    {/* EFECTIVO */}
                    {paymentMethod === 'store' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 text-center">
                             <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><Banknote size={32}/></div>
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
                            className={`w-full font-black uppercase py-4 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 ${isProcessing ? 'bg-neutral-800 text-neutral-400 cursor-wait' : 'bg-[#FDCB02] hover:bg-black hover:text-white text-black'}`}
                        >
                            {isProcessing ? 'Procesando...' : (
                                <><span>{paymentMethod === 'card' ? 'Pagar Ahora' : 'Generar Ficha de Pago'}</span><span className="bg-black/10 px-2 py-0.5 rounded text-sm">${total.toLocaleString()}</span></>
                            )}
                        </button>
                        <div className="flex items-center justify-center gap-2 mt-4 text-[10px] text-neutral-400 uppercase font-bold"><ShieldCheck size={12} className="text-green-500"/> Transacción Encriptada 256-bits</div>
                    </div>

                </div>
            </div>
          </div>

          {/* COLUMNA DERECHA (Resumen) */}
          <div className="lg:col-span-5">
             <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200 shadow-lg sticky top-28">
                <h3 className="text-lg font-black uppercase text-black mb-6 border-b border-neutral-100 pb-4">Resumen</h3>
                
                <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {items.map((item) => (
                        <div key={item.id} className="flex gap-4 items-start border-b border-neutral-50 pb-4 last:border-0">
                             <div className="relative w-16 h-16 bg-neutral-100 rounded-md overflow-hidden shrink-0 border border-neutral-100">
                                <Image src={item.image || "/placeholder.jpg"} alt={item.title} fill className="object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-black truncate">{item.title}</h4>
                                <div className="flex flex-col gap-0.5 mt-1">
                                    <span className="text-[10px] text-neutral-500 font-bold uppercase">{item.unit}</span>
                                    {item.meta?.color && (
                                        <p className="text-[10px] text-neutral-500 uppercase flex gap-1">
                                            Color: <span className="font-bold text-black">{item.meta.color}</span>
                                        </p>
                                    )}
                                    <p className="text-[10px] text-neutral-500 uppercase flex gap-1">
                                        Peso: <span className="font-bold text-black">{item.quantity} kg</span>
                                    </p>
                                </div>
                            </div>
                            <span className="font-bold text-sm text-black">${(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                    ))}
                </div>
                
                <div className="space-y-3 pt-4 border-t border-neutral-100 bg-neutral-50 p-4 rounded-lg">
                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Subtotal</span>
                        <span className="font-bold">${subtotal.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm text-neutral-600">
                        <span className="font-medium flex items-center gap-1"><Package size={14}/> Flete Consolidado <span className="text-[9px] bg-neutral-200 px-1 rounded uppercase">{totalRolls > 0 ? `${totalRolls} Bultos` : 'Minimo'}</span></span>
                        <span className="font-bold">${freightCost.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-sm text-blue-600">
                        <span className="font-medium flex items-center gap-1"><Truck size={14}/> Envío Skydropx <span className="text-[9px] bg-blue-100 px-1 rounded uppercase">{totalWeight} kg</span></span>
                        <span className="font-bold">${shippingCost.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-sm text-neutral-500">
                        <span className="font-medium flex items-center gap-1"><Info size={14}/> Tarifa de Servicio</span>
                        <span className="font-bold">${serviceFee.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>

                    {/* 👇 SECCIÓN DE FACTURACIÓN (AGREGADA AQUÍ) */}
                    <div className="border-t border-dashed border-neutral-200 pt-3 mt-1">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-black uppercase flex items-center gap-2">
                                <FileText size={14} className="text-[#FDCB02]"/> ¿Desea Facturar?
                            </span>
                            {/* Toggle Switch */}
                            <button 
                                onClick={() => setWantsInvoice(!wantsInvoice)}
                                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none ${wantsInvoice ? 'bg-[#FDCB02]' : 'bg-neutral-200'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${wantsInvoice ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        
                        {/* Línea de IVA (Visible solo si activa switch) */}
                        <div className={`flex justify-between text-sm text-neutral-500 transition-all duration-300 overflow-hidden ${wantsInvoice ? 'max-h-10 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                            <span className="font-medium">IVA (16%)</span>
                            <span className="font-bold text-black">${taxIVA.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-end pt-4 border-t border-neutral-200 mt-2">
                        <span className="font-black uppercase">Total</span>
                        <span className="font-black text-2xl">${total.toLocaleString()}</span>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .checkout-input { width: 100%; background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; outline: none; transition: all 0.2s; }
        .checkout-input.with-icon { padding-left: 2.75rem !important; }
        .checkout-input:focus { border-color: #FDCB02; background-color: #fff; box-shadow: 0 0 0 1px #FDCB02; }
      `}</style>
    </div>
  );
}