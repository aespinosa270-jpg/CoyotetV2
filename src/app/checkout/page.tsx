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
  Landmark, Store, Banknote, Info, FileText, CheckCircle2, Factory, Calculator, Map, ChevronRight, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
type LogisticsMethod = 'coyote' | 'skydropx';

// --- CONFIGURACIÓN ESTRICTA DE LOGÍSTICA COYOTE ---
const DIESEL_PRICE_PER_LITER = 27.00; 
const LITERS_PER_100KM = 20.0;        
const OPERATIONAL_MARKUP = 4;         
const FIXED_SERVICE_FEE = 175;        
const MAX_ROLLS_PER_VEHICLE = 80;     

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1); 
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [deviceSessionId, setDeviceSessionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  
  const [selectedLogistics, setSelectedLogistics] = useState<LogisticsMethod>('coyote');
  const [coyoteDistanceKm, setCoyoteDistanceKm] = useState<number>(0); 
  const [isLocalZone, setIsLocalZone] = useState(false); 
  
  const [wantsInvoice, setWantsInvoice] = useState(false);

  const [customerData, setCustomerData] = useState({ 
    name: '', lastName: '', email: '', phone: '', 
    street: '', number: '', unit: '', neighborhood: '', 
    city: '', state: '', zip: '', reference: ''
  });

  const [fiscalData, setFiscalData] = useState({
    rfc: '', razonSocial: '', regimen: '', usoCFDI: '', cpFiscal: ''
  });
  
  const [cardData, setCardData] = useState({ 
    holder: '', number: '', expYear: '', expMonth: '', cvv: '' 
  });

  useEffect(() => { setMounted(true); }, []);

  // --- ALGORITMO RADIAL DE DISTANCIAS POR CÓDIGO POSTAL ---
  const getLogisticsInfo = (zipCode: string) => {
    const cp = parseInt(zipCode, 10);
    if (isNaN(cp) || zipCode.length < 5) return { type: 'PENDING', distance: 0 };

    const prefix2 = Math.floor(cp / 1000); 

    // 1. CDMX
    if (prefix2 >= 1 && prefix2 <= 16) {
        let dist = 15; 
        if ([15, 6, 8].includes(prefix2)) dist = 5;       
        if ([7, 9, 3].includes(prefix2)) dist = 12;       
        if ([2, 4, 11].includes(prefix2)) dist = 18;      
        if ([1, 5, 10, 12, 13, 14, 16].includes(prefix2)) dist = 28; 
        return { type: 'COYOTE_LOCAL', distance: dist };
    }

    // 2. EDOMEX
    if (prefix2 >= 50 && prefix2 <= 57) {
        let dist = 40; 
        if (prefix2 === 57) dist = 10;                     
        if (prefix2 === 55) dist = 20;                     
        if (prefix2 === 53 || prefix2 === 54) dist = 25;   
        if (prefix2 === 56) dist = 35;                     
        if (prefix2 === 52) dist = 55;                     
        if (prefix2 === 50 || prefix2 === 51) dist = 70;   
        return { type: 'COYOTE_LOCAL', distance: dist };
    }

    // 3. ESTADOS COLINDANTES
    if (prefix2 === 42 || prefix2 === 43) return { type: 'COYOTE_LOCAL', distance: 100 }; 
    if (prefix2 >= 72 && prefix2 <= 75) return { type: 'COYOTE_LOCAL', distance: 130 };   
    if (prefix2 === 62) return { type: 'COYOTE_LOCAL', distance: 90 };                    

    // 4. RESTO DE LA REPÚBLICA
    return { type: 'SKYDROPX_NACIONAL', distance: 0 };
  };

  // --- CÁLCULO PRINCIPAL Y REACTIVO ---
  const { freightCost, shippingCost, vehiclesNeeded, serviceFee, taxIVA, total, totalWeight, totalRolls } = useMemo(() => {
    let rollCount = 0;
    let weight = 0;

    items.forEach(item => {
        weight += item.quantity;
        const isRollo = item.unit.toLowerCase().includes('rollo') || item.meta?.mode === 'rollo';
        if (isRollo) {
            rollCount += item.meta?.packages || Math.ceil(item.quantity / 25) || 1; 
        } else if (item.quantity >= 25) {
             rollCount += Math.ceil(item.quantity / 25);
        }
    });

    let flete = 0;
    if (weight < 10 && rollCount === 0) flete = 150;
    else {
        const bultos = Math.max(1, rollCount);
        if (bultos === 1) flete = 200;
        else if (bultos <= 4) flete = 250;
        else if (bultos <= 10) flete = 300;
        else if (bultos <= 15) flete = 400;
        else if (bultos <= 20) flete = 500;
        else flete = 1000;
    }

    let envio = 0;
    let requiredVehicles = 1;

    if (selectedLogistics === 'coyote') {
        requiredVehicles = Math.max(1, Math.ceil(rollCount / MAX_ROLLS_PER_VEHICLE));
        const totalDistanceRoundTrip = coyoteDistanceKm * 2;
        const litersNeededPerVehicle = (totalDistanceRoundTrip / 100) * LITERS_PER_100KM;
        const fuelCostPerVehicle = litersNeededPerVehicle * DIESEL_PRICE_PER_LITER;
        const costPerVehicle = fuelCostPerVehicle * OPERATIONAL_MARKUP;

        envio = costPerVehicle * requiredVehicles;
    } else {
        const baseShipping = 180;
        const extraKgPrice = 12;
        envio = baseShipping;
        if (weight > 5) envio += (weight - 5) * extraKgPrice;
    }

    const fee = FIXED_SERVICE_FEE; 
    const baseTotal = subtotal + flete + envio + fee;
    const iva = wantsInvoice ? baseTotal * 0.16 : 0;

    return {
        freightCost: flete,
        shippingCost: envio,
        vehiclesNeeded: requiredVehicles,
        serviceFee: fee,
        taxIVA: iva,
        total: baseTotal + iva,
        totalWeight: weight,
        totalRolls: rollCount
    };
  }, [items, subtotal, wantsInvoice, selectedLogistics, coyoteDistanceKm]); 

  // --- SDK Y PAGOS ---
  const setupOpenPay = () => {
    if (typeof window !== 'undefined' && window.OpenPay && window.OpenPay.deviceData) {
      try {
        window.OpenPay.setId(process.env.NEXT_PUBLIC_OPENPAY_MERCHANT_ID);
        window.OpenPay.setApiKey(process.env.NEXT_PUBLIC_OPENPAY_PUBLIC_KEY);
        window.OpenPay.setSandboxMode(process.env.NODE_ENV !== 'production');
        setDeviceSessionId(window.OpenPay.deviceData.setup());
        setIsSdkReady(true);
      } catch (error) { console.error("Error OpenPay:", error); }
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      if (!isSdkReady && paymentMethod === 'card') throw new Error("Cargando túnel de seguridad...");
      
      let token = null;
      if (paymentMethod === 'card') {
        token = await new Promise<string>((resolve, reject) => {
          window.OpenPay.token.create({
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
          deviceSessionId: deviceSessionId || window.OpenPay?.deviceData?.setup(),
          amount: total, 
          description: `Pedido Coyote - ${totalWeight}kg ${wantsInvoice ? '(Con Factura)' : ''}`,
          items,
          customer: customerData,
          metadata: {
             weight_kg: totalWeight,
             freight_cost: freightCost,
             shipping_cost: shippingCost,
             service_fee: FIXED_SERVICE_FEE,
             tax_iva: taxIVA,
             req_invoice: wantsInvoice ? 'YES' : 'NO',
             fiscal_data: wantsInvoice ? fiscalData : null,
             logistics_type: selectedLogistics,
             vehicles_used: vehiclesNeeded,
             distance_km: selectedLogistics === 'coyote' ? coyoteDistanceKm : 0
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
      alert(`⚠️ ${error.data?.description || error.message || "Error desconocido"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const validateStep1 = () => {
    if (!customerData.name || !customerData.email || !customerData.street || customerData.zip.length < 5) {
      alert("Por favor completa los campos principales y un Código Postal válido a 5 dígitos.");
      return;
    }
    
    const logistics = getLogisticsInfo(customerData.zip);
    if(logistics.type === 'COYOTE_LOCAL') {
        setCoyoteDistanceKm(logistics.distance);
        setSelectedLogistics('coyote');
        setIsLocalZone(true); 
    } else {
        setSelectedLogistics('skydropx');
        setIsLocalZone(false); 
    }
    
    setStep(2);
  };

  const validateStep3 = () => {
    if (wantsInvoice && (!fiscalData.rfc || !fiscalData.razonSocial || !fiscalData.cpFiscal)) {
      alert("Por favor completa los datos fiscales obligatorios para la factura.");
      return;
    }
    setStep(4);
  };

  if (!mounted) return null;

  if (items.length === 0) {
    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-3xl shadow-xl flex flex-col items-center text-center max-w-sm">
              <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                <ShoppingBag size={40} className="text-neutral-300" />
              </div>
              <h1 className="text-2xl font-black uppercase text-black tracking-tight mb-2">Caja vacía</h1>
              <p className="text-neutral-500 text-sm mb-8">Aún no has agregado tela a tu pedido. Explora el catálogo para comenzar.</p>
              <Link href="/" className="w-full bg-[#FDCB02] hover:bg-black hover:text-white text-black font-black uppercase text-xs tracking-widest py-4 rounded-xl transition-all">
                Ir al catálogo
              </Link>
            </motion.div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] pt-24 pb-20 px-4 sm:px-6 font-sans selection:bg-[#FDCB02] selection:text-black">
      
      <Script src="https://js.openpay.mx/openpay.v1.min.js" strategy="afterInteractive" />
      <Script src="https://js.openpay.mx/openpay-data.v1.min.js" strategy="afterInteractive" onLoad={setupOpenPay}/>

      <div className="container mx-auto max-w-[1100px]">
        {/* HEADER LIMPIO */}
        <div className="flex items-center gap-4 mb-8">
            <Link href="/" className="w-10 h-10 bg-white hover:bg-neutral-200 rounded-full flex items-center justify-center transition-colors text-black shadow-sm">
                <ArrowLeft size={18} />
            </Link>
            <h1 className="text-3xl font-[1000] uppercase text-black tracking-tighter">Finalizar Pedido</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          
          {/* ================= COLUMNA IZQUIERDA (WIZARD DE ALTA CONVERSIÓN) ================= */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* WIZARD TRACKER PREMIUM */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 mb-2">
              <div className="flex justify-between items-center relative z-10">
                {[
                  { num: 1, label: 'Destino', icon: MapPin },
                  { num: 2, label: 'Logística', icon: Truck },
                  { num: 3, label: 'Factura', icon: FileText },
                  { num: 4, label: 'Pago', icon: CreditCard }
                ].map((s) => (
                  <div key={s.num} className="flex flex-col items-center gap-3 bg-white px-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500 ${step === s.num ? 'bg-black text-[#FDCB02] shadow-lg scale-110' : step > s.num ? 'bg-[#FDCB02] text-black' : 'bg-neutral-100 text-neutral-400'}`}>
                      {step > s.num ? <CheckCircle2 size={18}/> : <s.icon size={16}/>}
                    </div>
                    <span className={`text-[10px] uppercase font-bold hidden sm:block tracking-wider ${step >= s.num ? 'text-black' : 'text-neutral-400'}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
                {/* LÍNEA DE PROGRESO DE FONDO */}
                <div className="absolute top-5 left-8 right-8 h-1 bg-neutral-100 -z-10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FDCB02] transition-all duration-700 ease-in-out" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {/* --- PASO 1: DATOS DE ENVÍO --- */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-8 h-8 bg-[#FDCB02] rounded-lg flex items-center justify-center text-black"><User size={16} strokeWidth={2.5}/></div>
                      <h2 className="text-xl font-[1000] uppercase tracking-tight text-black">Datos de Contacto</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input placeholder="Nombre(s)" value={customerData.name} className="checkout-input-premium" onChange={e => setCustomerData({...customerData, name: e.target.value})}/>
                        <input placeholder="Apellidos" value={customerData.lastName} className="checkout-input-premium" onChange={e => setCustomerData({...customerData, lastName: e.target.value})}/>
                        <div className="relative md:col-span-1">
                            <Mail size={18} className="absolute left-4 top-4 text-neutral-400 z-10"/>
                            <input placeholder="Correo Electrónico" type="email" value={customerData.email} className="checkout-input-premium pl-12" onChange={e => setCustomerData({...customerData, email: e.target.value})}/>
                        </div>
                        <div className="relative md:col-span-1">
                            <Phone size={18} className="absolute left-4 top-4 text-neutral-400 z-10"/>
                            <input placeholder="Teléfono a 10 dígitos" type="tel" value={customerData.phone} className="checkout-input-premium pl-12" onChange={e => setCustomerData({...customerData, phone: e.target.value})}/>
                        </div>
                        
                        <div className="md:col-span-2 mt-4 mb-2 flex items-center gap-3">
                            <div className="h-px bg-neutral-200 flex-1"></div>
                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1"><MapPin size={12}/> Dirección de Entrega</span>
                            <div className="h-px bg-neutral-200 flex-1"></div>
                        </div>

                        <input placeholder="Calle" value={customerData.street} className="checkout-input-premium md:col-span-2" onChange={e => setCustomerData({...customerData, street: e.target.value})}/>
                        <div className="grid grid-cols-2 gap-4 md:col-span-2">
                            <input placeholder="No. Exterior" value={customerData.number} className="checkout-input-premium" onChange={e => setCustomerData({...customerData, number: e.target.value})}/>
                            <input placeholder="No. Interior (Opcional)" value={customerData.unit} className="checkout-input-premium" onChange={e => setCustomerData({...customerData, unit: e.target.value})}/>
                        </div>
                        <input placeholder="Colonia" value={customerData.neighborhood} className="checkout-input-premium md:col-span-2" onChange={e => setCustomerData({...customerData, neighborhood: e.target.value})}/>
                        <input placeholder="Código Postal (Ej. 06000)" value={customerData.zip} maxLength={5} className="checkout-input-premium bg-[#FDCB02]/10 focus:bg-white border-[#FDCB02]/30 text-black font-bold placeholder:text-neutral-500" onChange={e => setCustomerData({...customerData, zip: e.target.value})}/>
                        <input placeholder="Ciudad" value={customerData.city} className="checkout-input-premium" onChange={e => setCustomerData({...customerData, city: e.target.value})}/>
                        <input placeholder="Estado" value={customerData.state} className="checkout-input-premium md:col-span-2" onChange={e => setCustomerData({...customerData, state: e.target.value})}/>
                        <input placeholder="Referencias (Ej. Portón negro, frente a parque)" value={customerData.reference} className="checkout-input-premium md:col-span-2" onChange={e => setCustomerData({...customerData, reference: e.target.value})}/>
                    </div>
                    <button onClick={validateStep1} className="w-full mt-8 bg-black hover:bg-[#FDCB02] text-white hover:text-black h-16 rounded-2xl font-[1000] uppercase text-sm tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 group shadow-xl hover:shadow-yellow-500/20">
                      Configurar Envío <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                    </button>
                </motion.div>
              )}

              {/* --- PASO 2: LOGÍSTICA (DISEÑO PREMIUM) --- */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-8 h-8 bg-[#FDCB02] rounded-lg flex items-center justify-center text-black"><Truck size={16} strokeWidth={2.5}/></div>
                      <h2 className="text-xl font-[1000] uppercase tracking-tight text-black">Logística y Despacho</h2>
                    </div>

                    {isLocalZone && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                        {/* TARJETA COYOTE (PREMIUM DARK) */}
                        <button onClick={() => setSelectedLogistics('coyote')} className={`relative text-left p-6 rounded-3xl border-2 transition-all duration-300 overflow-hidden group ${selectedLogistics === 'coyote' ? 'border-black bg-black shadow-2xl scale-[1.02]' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}>
                          {selectedLogistics === 'coyote' && <div className="absolute top-0 right-0 bg-[#FDCB02] text-black text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl">Recomendado</div>}
                          
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${selectedLogistics === 'coyote' ? 'bg-[#FDCB02]' : 'bg-neutral-100'}`}>
                            <Factory size={20} className={selectedLogistics === 'coyote' ? 'text-black' : 'text-neutral-400'}/>
                          </div>
                          
                          <h4 className={`font-[1000] uppercase text-lg mb-1 ${selectedLogistics === 'coyote' ? 'text-white' : 'text-black'}`}>Flotilla Coyote</h4>
                          <p className={`text-[11px] font-bold uppercase tracking-widest mb-4 ${selectedLogistics === 'coyote' ? 'text-[#FDCB02]' : 'text-neutral-400'}`}>Viaje Directo Dedicado</p>
                          
                          <div className={`text-xs space-y-2 font-medium ${selectedLogistics === 'coyote' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                            <p className="flex items-center gap-2"><CheckCircle2 size={14} className={selectedLogistics === 'coyote' ? 'text-[#FDCB02]' : 'text-neutral-300'}/> Carga de hasta 80 rollos</p>
                            <p className="flex items-center gap-2"><CheckCircle2 size={14} className={selectedLogistics === 'coyote' ? 'text-[#FDCB02]' : 'text-neutral-300'}/> Cobro exacto por KM</p>
                          </div>
                        </button>

                        {/* TARJETA SKYDROPX (CLEAN WHITE) */}
                        <button onClick={() => setSelectedLogistics('skydropx')} className={`relative text-left p-6 rounded-3xl border-2 transition-all duration-300 overflow-hidden group ${selectedLogistics === 'skydropx' ? 'border-blue-600 bg-blue-50 shadow-xl scale-[1.02]' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${selectedLogistics === 'skydropx' ? 'bg-blue-600' : 'bg-neutral-100'}`}>
                            <Map size={20} className={selectedLogistics === 'skydropx' ? 'text-white' : 'text-neutral-400'}/>
                          </div>
                          
                          <h4 className={`font-[1000] uppercase text-lg mb-1 ${selectedLogistics === 'skydropx' ? 'text-blue-900' : 'text-black'}`}>Red Skydropx</h4>
                          <p className={`text-[11px] font-bold uppercase tracking-widest mb-4 ${selectedLogistics === 'skydropx' ? 'text-blue-500' : 'text-neutral-400'}`}>Paquetería Nacional</p>
                          
                          <div className={`text-xs space-y-2 font-medium ${selectedLogistics === 'skydropx' ? 'text-blue-800' : 'text-neutral-500'}`}>
                            <p className="flex items-center gap-2"><CheckCircle2 size={14} className={selectedLogistics === 'skydropx' ? 'text-blue-500' : 'text-neutral-300'}/> Múltiples transportistas</p>
                            <p className="flex items-center gap-2"><CheckCircle2 size={14} className={selectedLogistics === 'skydropx' ? 'text-blue-500' : 'text-neutral-300'}/> Cobro por Peso ({totalWeight}kg)</p>
                          </div>
                        </button>
                      </div>
                    )}

                    <AnimatePresence mode="wait">
                      {selectedLogistics === 'coyote' ? (
                        <motion.div key="coyote-calc" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h5 className="font-[1000] text-black uppercase tracking-tight">Algoritmo de Ruta</h5>
                              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Destino: CP {customerData.zip}</p>
                            </div>
                            <span className="bg-[#FDCB02]/20 text-yellow-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Zona Local</span>
                          </div>
                          
                          {/* DASHBOARD DE KILOMETRAJE */}
                          <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <label className="block text-[10px] uppercase tracking-widest font-black text-neutral-400 mb-2">Ajustar Distancia (Ida)</label>
                              <div className="flex items-center gap-3">
                                <input type="number" value={coyoteDistanceKm} onChange={(e) => setCoyoteDistanceKm(Number(e.target.value))} className="w-24 h-12 bg-neutral-100 rounded-xl text-center font-mono text-xl font-bold text-black focus:ring-2 focus:ring-[#FDCB02] focus:bg-white outline-none transition-all"/>
                                <span className="text-sm font-bold text-neutral-400">KM</span>
                              </div>
                            </div>
                            <div className="w-px h-12 bg-neutral-100 hidden md:block"></div>
                            <div className="flex-1 text-right">
                                <span className="block text-[10px] uppercase tracking-widest font-black text-neutral-400 mb-1">Inversión Logística</span>
                                <span className="text-2xl font-[1000] text-black tracking-tighter">${shippingCost.toLocaleString()}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-neutral-400 mt-4 leading-relaxed font-medium">
                            <strong className="text-black">Fórmula Operativa:</strong> El sistema calcula el Diésel a $27.00 x 20L/100km considerando el viaje redondo ({(coyoteDistanceKm * 2)} km totales).
                          </p>

                          {vehiclesNeeded > 1 && (
                            <div className="mt-4 p-4 bg-black rounded-xl flex items-center gap-4 text-white">
                              <div className="w-10 h-10 bg-[#FDCB02] rounded-lg flex items-center justify-center text-black shrink-0"><Truck size={20} strokeWidth={2.5}/></div>
                              <div>
                                <p className="text-xs font-bold text-[#FDCB02] uppercase tracking-widest mb-0.5">Alerta de Carga Pesada</p>
                                <p className="text-xs text-neutral-300">Tu pedido excede la capacidad de 80 bultos por unidad. Requerimos <strong>{vehiclesNeeded} camionetas</strong> de la flotilla.</p>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div key="skydropx-calc" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                           <div className="flex items-center justify-between mb-4">
                            <div>
                              <h5 className="font-[1000] text-blue-900 uppercase tracking-tight">Tarificador Nacional</h5>
                              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">Destino: CP {customerData.zip}</p>
                            </div>
                            {!isLocalZone && <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">Zona Foránea</span>}
                          </div>
                          <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-50 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] uppercase tracking-widest font-black text-neutral-400 mb-1">Peso Bruto</p>
                              <p className="text-lg font-bold text-black">{totalWeight} <span className="text-sm text-neutral-400">KG</span></p>
                            </div>
                            <div className="text-right">
                                <span className="block text-[10px] uppercase tracking-widest font-black text-neutral-400 mb-1">Costo de Guía</span>
                                <span className="text-2xl font-[1000] text-blue-600 tracking-tighter">${shippingCost.toLocaleString()}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex gap-4 mt-8">
                      <button onClick={() => setStep(1)} className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-widest hover:bg-neutral-100 rounded-2xl transition-colors">Volver</button>
                       <button onClick={() => setStep(3)} className="flex-1 bg-black text-white py-4 rounded-2xl font-[1000] text-sm uppercase tracking-widest hover:bg-[#FDCB02] hover:text-black transition-all shadow-lg hover:shadow-yellow-500/20">Guardar Logística</button>                    </div>
                </motion.div>
              )}

              {/* --- PASO 3: FACTURACIÓN --- */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-[#FDCB02] rounded-lg flex items-center justify-center text-black"><FileText size={16} strokeWidth={2.5}/></div>
                      <h2 className="text-xl font-[1000] uppercase tracking-tight text-black">Facturación</h2>
                    </div>

                    <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 mb-8 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-black text-sm">¿Requieres Comprobante Fiscal (CFDI)?</h4>
                        <p className="text-xs text-neutral-500 mt-1">El IVA (16%) se agregará automáticamente al total.</p>
                      </div>
                      
                      {/* TOGGLE SWITCH PREMIUM */}
                      <button onClick={() => setWantsInvoice(!wantsInvoice)} className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 focus:outline-none shadow-inner ${wantsInvoice ? 'bg-[#FDCB02]' : 'bg-neutral-300'}`}>
                          <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${wantsInvoice ? 'translate-x-6' : 'translate-x-0'}`}>
                            {wantsInvoice && <div className="w-2 h-2 bg-black rounded-full"></div>}
                          </div>
                      </button>
                    </div>

                    <AnimatePresence>
                      {wantsInvoice && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
                            <input placeholder="RFC" value={fiscalData.rfc} className="checkout-input-premium font-mono uppercase text-lg" onChange={e => setFiscalData({...fiscalData, rfc: e.target.value.toUpperCase()})}/>
                            <input placeholder="Razón Social (Sin SA de CV)" value={fiscalData.razonSocial} className="checkout-input-premium uppercase" onChange={e => setFiscalData({...fiscalData, razonSocial: e.target.value.toUpperCase()})}/>
                            <select className="checkout-input-premium text-neutral-600 uppercase text-xs font-bold" value={fiscalData.usoCFDI} onChange={e => setFiscalData({...fiscalData, usoCFDI: e.target.value})}>
                              <option value="">Uso de CFDI...</option>
                              <option value="G01">G01 - Adquisición de mercancias</option>
                              <option value="G03">G03 - Gastos en general</option>
                              <option value="P01">P01 - Por definir</option>
                            </select>
                            <select className="checkout-input-premium text-neutral-600 uppercase text-xs font-bold" value={fiscalData.regimen} onChange={e => setFiscalData({...fiscalData, regimen: e.target.value})}>
                              <option value="">Régimen Fiscal...</option>
                              <option value="601">601 - General de Ley Personas Morales</option>
                              <option value="612">612 - P. Físicas con Actividades Empresariales</option>
                              <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                            </select>
                            <input placeholder="C.P. Fiscal" value={fiscalData.cpFiscal} className="checkout-input-premium md:col-span-2" onChange={e => setFiscalData({...fiscalData, cpFiscal: e.target.value})}/>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex gap-4">
                      <button onClick={() => setStep(2)} className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-widest hover:bg-neutral-100 rounded-2xl transition-colors">Volver</button>
                      <button onClick={validateStep3} className="flex-1 bg-black text-white py-4 rounded-2xl font-[1000] text-sm uppercase tracking-widest hover:bg-[#FDCB02] hover:text-black transition-all shadow-lg hover:shadow-yellow-500/20">Ir a la Bóveda de Pago</button>
                    </div>
                </motion.div>
              )}

              {/* --- PASO 4: PAGO --- */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
                    {/* TABS DE PAGO TIPO FINTECH */}
                    <div className="flex bg-neutral-50 p-2 border-b border-neutral-100">
                        <button onClick={() => setPaymentMethod('card')} className={`flex-1 py-4 px-2 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${paymentMethod === 'card' ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-neutral-400 hover:text-black hover:bg-neutral-100'}`}><CreditCard size={16}/> Tarjeta</button>
                        <button onClick={() => setPaymentMethod('bank_account')} className={`flex-1 py-4 px-2 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${paymentMethod === 'bank_account' ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-neutral-400 hover:text-black hover:bg-neutral-100'}`}><Landmark size={16}/> SPEI</button>
                        <button onClick={() => setPaymentMethod('store')} className={`flex-1 py-4 px-2 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${paymentMethod === 'store' ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-neutral-400 hover:text-black hover:bg-neutral-100'}`}><Store size={16}/> OXXO</button>
                    </div>

                    <div className="p-8">
                        {/* TARJETA */}
                        {paymentMethod === 'card' && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-xl font-[1000] uppercase text-black">Tarjeta de Crédito / Débito</h2>
                                    <div className="flex gap-3 opacity-60">
                                        <img src={LOGOS.visa} alt="Visa" className="h-5"/>
                                        <img src={LOGOS.mastercard} alt="MC" className="h-5"/>
                                        <img src={LOGOS.amex} alt="Amex" className="h-5"/>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <input placeholder="NOMBRE DEL TITULAR" className="checkout-input-premium font-bold uppercase" onChange={e => setCardData({...cardData, holder: e.target.value})}/>
                                    <div className="relative">
                                        <input placeholder="0000 0000 0000 0000" maxLength={16} className="checkout-input-premium font-mono text-xl tracking-widest" onChange={e => setCardData({...cardData, number: e.target.value})}/>
                                        <Lock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-300"/>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <input placeholder="MM" maxLength={2} className="checkout-input-premium text-center font-mono" onChange={e => setCardData({...cardData, expMonth: e.target.value})}/>
                                        <input placeholder="AA" maxLength={2} className="checkout-input-premium text-center font-mono" onChange={e => setCardData({...cardData, expYear: e.target.value})}/>
                                        <input placeholder="CVV" type="password" maxLength={4} className="checkout-input-premium text-center font-mono tracking-widest" onChange={e => setCardData({...cardData, cvv: e.target.value})}/>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SPEI */}
                        {paymentMethod === 'bank_account' && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 text-center py-6">
                                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><Landmark size={36}/></div>
                                <h2 className="text-xl font-[1000] uppercase mb-2">Transferencia Electrónica</h2>
                                <p className="text-sm text-neutral-500 mb-8 max-w-sm mx-auto leading-relaxed">Al procesar el pedido, el sistema de OpenPay generará una <strong>CLABE interbancaria única y segura</strong> para tu empresa.</p>
                            </div>
                        )}

                        {/* EFECTIVO */}
                        {paymentMethod === 'store' && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 text-center py-6">
                                  <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"><Banknote size={36}/></div>
                                <h2 className="text-xl font-[1000] uppercase mb-4">Efectivo en Tiendas</h2>
                                <div className="flex justify-center gap-8 mb-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                                    <img src={LOGOS.oxxo} alt="Oxxo" className="h-8 object-contain"/>
                                    <img src={LOGOS.seven} alt="7-Eleven" className="h-8 object-contain"/>
                                </div>
                                <p className="text-sm text-neutral-500 max-w-sm mx-auto">Generaremos un código de barras para pago en ventanilla.</p>
                            </div>
                        )}

                        <div className="pt-8 mt-4 border-t border-neutral-100 flex gap-4">
                            <button onClick={() => setStep(3)} className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-widest hover:bg-neutral-100 rounded-2xl transition-colors">Volver</button>
                            <button 
                                onClick={handleTransaction}
                                disabled={isProcessing || (paymentMethod === 'card' && !isSdkReady)}
                                className={`flex-1 font-[1000] uppercase py-4 rounded-2xl text-sm tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${isProcessing ? 'bg-neutral-800 text-neutral-400 cursor-wait' : 'bg-[#FDCB02] hover:bg-black hover:text-white text-black hover:shadow-yellow-500/20'}`}
                            >
                                {isProcessing ? (
                                  <>Procesando... <Loader2 size={18} className="animate-spin"/></>
                                ) : (
                                  <><span>{paymentMethod === 'card' ? 'Pagar de forma segura' : 'Generar Ficha'}</span></>
                                )}
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-6 text-[10px] text-neutral-400 uppercase font-black tracking-widest"><ShieldCheck size={14} className="text-green-500"/> Túnel encriptado OpenPay PCI-DSS</div>
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ================= COLUMNA DERECHA (RESUMEN PREMIUM DARK) ================= */}
          <div className="lg:col-span-5">
             <div className="bg-[#0a0a0a] text-white p-8 rounded-3xl shadow-2xl sticky top-28 border border-white/10">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                  <h3 className="text-xl font-[1000] uppercase tracking-tighter">Resumen de Orden</h3>
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><ShoppingBag size={18} className="text-[#FDCB02]"/></div>
                </div>
                
                {/* ITEMS */}
                <div className="space-y-5 mb-8 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar-dark">
                    {items.map((item) => (
                        <div key={item.id} className="flex gap-4 items-start">
                             <div className="relative w-16 h-16 bg-neutral-900 rounded-xl overflow-hidden shrink-0 border border-white/5">
                                <Image src={item.image || "/placeholder.jpg"} alt={item.title} fill className="object-cover opacity-80" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-white truncate">{item.title}</h4>
                                <div className="flex flex-col gap-1 mt-1">
                                    <span className="text-[10px] text-[#FDCB02] font-black uppercase tracking-widest">{item.unit}</span>
                                    {item.meta?.color && <p className="text-[10px] text-neutral-400 uppercase">Color: <span className="text-white">{item.meta.color}</span></p>}
                                    <p className="text-[10px] text-neutral-400 uppercase">Volumen: <span className="text-white">{item.quantity} kg</span></p>
                                </div>
                            </div>
                            <span className="font-bold text-sm text-white">${(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                    ))}
                </div>
                
                {/* DESGLOSE */}
                <div className="space-y-4 pt-6 border-t border-white/10">
                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Subtotal Mercancía</span>
                        <span className="font-bold text-white">${subtotal.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-400 flex items-center gap-2"><Package size={14} className="text-neutral-500"/> Tarifa de Colocación</span>
                        <span className="font-bold text-white">${freightCost.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-400 flex items-center gap-2">
                          {selectedLogistics === 'coyote' ? <Factory size={14} className="text-[#FDCB02]"/> : <Map size={14} className="text-blue-400"/>}
                          Logística {selectedLogistics === 'coyote' ? 'Coyote' : 'Skydropx'}
                        </span>
                        <span className="font-bold text-white">${shippingCost.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-400 flex items-center gap-2"><Info size={14} className="text-neutral-500"/> Tarifa De Servicio Fija</span>
                        <span className="font-bold text-white">${serviceFee.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>

                    <AnimatePresence>
                      {wantsInvoice && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex justify-between text-sm overflow-hidden pt-3 border-t border-white/5 border-dashed mt-3">
                            <span className="text-neutral-400">IVA (16%)</span>
                            <span className="font-bold text-[#FDCB02]">${taxIVA.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* TOTAL FINAL */}
                    <div className="flex justify-between items-end pt-6 border-t border-white/10 mt-4">
                        <div>
                          <span className="font-black uppercase text-[10px] text-neutral-500 tracking-widest block mb-1">Monto a Pagar</span>
                          <span className="text-xs text-neutral-400">MXN</span>
                        </div>
                        <span className="font-[1000] text-4xl leading-none text-[#FDCB02] drop-shadow-[0_0_15px_rgba(253,203,2,0.2)]">${total.toLocaleString()}</span>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* CUSTOM UI CLASSES */
        .checkout-input-premium { 
          width: 100%; 
          background-color: #f3f4f6; 
          border: 2px solid transparent; 
          padding: 1rem 1.25rem; 
          border-radius: 1rem; 
          font-size: 0.875rem; 
          font-weight: 600;
          color: #000;
          outline: none; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
        }
        .checkout-input-premium::placeholder { color: #9ca3af; font-weight: 500; }
        .checkout-input-premium:focus { 
          border-color: #FDCB02; 
          background-color: #fff; 
          box-shadow: 0 0 0 4px rgba(253,203,2,0.15); 
        }
        
        /* DARK SCROLLBAR FOR SUMMARY */
        .custom-scrollbar-dark::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background: #555; }
      `}</style>
    </div>
  );
}