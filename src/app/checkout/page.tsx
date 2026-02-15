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
  Landmark, Store, Banknote, Info, FileText, CheckCircle2, Factory, Calculator
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

// --- CONFIGURACIÓN ESTRICTA DE LOGÍSTICA COYOTE ---
const DIESEL_PRICE_PER_LITER = 35.00; // Precio real del Diésel
const LITERS_PER_100KM = 20.0;        // Rendimiento de la unidad (20 lts / 100km)
const OPERATIONAL_MARKUP = 4;         // Multiplicador del costo operativo (300% extra = x4)
const FIXED_SERVICE_FEE = 175;        // Tarifa fija de servicio administrativo
const MAX_ROLLS_PER_VEHICLE = 80;     // Capacidad máxima de carga por unidad Coyote

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1); 
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [deviceSessionId, setDeviceSessionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  
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

  // --- MÓDULOS DE CÁLCULO GEOGRÁFICO Y MAPEO SEPOMEX REAL ---
  const getLogisticsInfo = (zipCode: string) => {
    const cp = parseInt(zipCode, 10);
    if (isNaN(cp)) return { type: 'PENDING', distance: 0 };

    // ZONAS EXCLUSIVAS COYOTE (Rangos SEPOMEX reales)
    if (cp >= 1000 && cp <= 16999) return { type: 'COYOTE_LOCAL', distance: 35 };   // CDMX
    if (cp >= 50000 && cp <= 57999) return { type: 'COYOTE_LOCAL', distance: 65 };  // ESTADO DE MÉXICO
    if (cp >= 42000 && cp <= 43999) return { type: 'COYOTE_LOCAL', distance: 120 }; // HIDALGO
    if (cp >= 72000 && cp <= 75999) return { type: 'COYOTE_LOCAL', distance: 140 }; // PUEBLA
    if (cp >= 62000 && cp <= 62999) return { type: 'COYOTE_LOCAL', distance: 95 };  // MORELOS

    // SI ESTÁ FUERA DE ESTOS CÓDIGOS, SE VA POR SKYDROPX
    return { type: 'SKYDROPX_NACIONAL', distance: 0 };
  };

  // --- CÁLCULO PRINCIPAL ---
const { freightCost, shippingCost, logisticsType, vehiclesNeeded, serviceFee, taxIVA, total, totalWeight, totalRolls } = useMemo(() => {    let rollCount = 0;
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

    // 1. Maniobra Interna (Flete Base de Despacho)
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

    // 2. Envío (Logística Propia vs Skydropx)
    let envio = 0;
    let requiredVehicles = 1;
    const logistics = getLogisticsInfo(customerData.zip);

    if (customerData.zip && customerData.zip.length === 5) {
      if (logistics.type === 'COYOTE_LOCAL') {
        // Cálculo de unidades necesarias (Max 80 rollos por camioneta)
        requiredVehicles = Math.max(1, Math.ceil(rollCount / MAX_ROLLS_PER_VEHICLE));
        
        // Costo por 1 sola unidad
        const litersNeededPerVehicle = (logistics.distance / 100) * LITERS_PER_100KM;
        const fuelCostPerVehicle = litersNeededPerVehicle * DIESEL_PRICE_PER_LITER;
        const costPerVehicle = fuelCostPerVehicle * OPERATIONAL_MARKUP;

        // Total logístico multiplicando por las unidades requeridas
        envio = costPerVehicle * requiredVehicles;
      } else {
        // Red Nacional Skydropx
        const baseShipping = 180;
        const extraKgPrice = 12;
        envio = baseShipping;
        if (weight > 5) envio += (weight - 5) * extraKgPrice;
      }
    }

    // 3. Servicio & IVA
    const fee = FIXED_SERVICE_FEE; 
    const baseTotal = subtotal + flete + envio + fee;
    const iva = wantsInvoice ? baseTotal * 0.16 : 0;

return {
        freightCost: flete,
        shippingCost: envio,
        logisticsType: logistics.type,
        vehiclesNeeded: requiredVehicles,
        serviceFee: fee, // 👈 ¡ESTA ES LA LÍNEA QUE FALTABA!
        taxIVA: iva,
        total: baseTotal + iva,
        totalWeight: weight,
        totalRolls: rollCount
    };
  }, [items, subtotal, wantsInvoice, customerData.zip]);

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
             logistics_type: logisticsType,
             vehicles_used: vehiclesNeeded
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
        <div className="flex items-center gap-4 mb-8">
            <Link href="/" className="p-2 hover:bg-white rounded-full transition-colors text-neutral-500">
                <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-black uppercase text-black tracking-tight">Caja (Checkout)</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ================= COLUMNA IZQUIERDA (WIZARD) ================= */}
          <div className="lg:col-span-7 space-y-4">
            
            <div className="flex justify-between items-center mb-6 px-2 relative">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex flex-col items-center gap-2 z-10 bg-neutral-50 px-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= s ? 'bg-black text-[#FDCB02]' : 'bg-neutral-200 text-neutral-400'}`}>
                    {step > s ? <CheckCircle2 size={16}/> : s}
                  </div>
                  <span className={`text-[9px] uppercase font-bold hidden sm:block ${step >= s ? 'text-black' : 'text-neutral-400'}`}>
                    {s === 1 ? 'Dirección' : s === 2 ? 'Logística' : s === 3 ? 'Factura' : 'Pago'}
                  </span>
                </div>
              ))}
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-neutral-200 z-0 hidden sm:block">
                <div className="h-full bg-black transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {/* PASO 1: DATOS DE ENVÍO */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200 shadow-sm">
                    <h2 className="text-lg font-bold uppercase text-black mb-6 flex items-center gap-2"><User className="text-[#FDCB02]" size={20}/> 1. Datos de Envío</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input placeholder="Nombre(s)" value={customerData.name} className="checkout-input" onChange={e => setCustomerData({...customerData, name: e.target.value})}/>
                        <input placeholder="Apellidos" value={customerData.lastName} className="checkout-input" onChange={e => setCustomerData({...customerData, lastName: e.target.value})}/>
                        <div className="relative md:col-span-1">
                            <Mail size={16} className="absolute left-3 top-3.5 text-neutral-400 z-10"/>
                            <input placeholder="Email" value={customerData.email} className="checkout-input with-icon" onChange={e => setCustomerData({...customerData, email: e.target.value})}/>
                        </div>
                        <div className="relative md:col-span-1">
                            <Phone size={16} className="absolute left-3 top-3.5 text-neutral-400 z-10"/>
                            <input placeholder="Teléfono" value={customerData.phone} className="checkout-input with-icon" onChange={e => setCustomerData({...customerData, phone: e.target.value})}/>
                        </div>
                        <div className="md:col-span-2 border-t border-neutral-100 mt-4 pt-4">
                            <p className="text-[10px] font-bold text-neutral-400 uppercase mb-3 flex items-center gap-1"><MapPin size={10}/> Dirección Exacta</p>
                        </div>
                        <input placeholder="Calle" value={customerData.street} className="checkout-input md:col-span-2" onChange={e => setCustomerData({...customerData, street: e.target.value})}/>
                        <div className="grid grid-cols-2 gap-4 md:col-span-2">
                            <input placeholder="No. Exterior" value={customerData.number} className="checkout-input" onChange={e => setCustomerData({...customerData, number: e.target.value})}/>
                            <input placeholder="No. Interior" value={customerData.unit} className="checkout-input" onChange={e => setCustomerData({...customerData, unit: e.target.value})}/>
                        </div>
                        <input placeholder="Colonia" value={customerData.neighborhood} className="checkout-input md:col-span-2" onChange={e => setCustomerData({...customerData, neighborhood: e.target.value})}/>
                        <input placeholder="Código Postal (Ej. 06000)" value={customerData.zip} maxLength={5} className="checkout-input bg-yellow-50 focus:bg-white border-yellow-200" onChange={e => setCustomerData({...customerData, zip: e.target.value})}/>
                        <input placeholder="Ciudad" value={customerData.city} className="checkout-input" onChange={e => setCustomerData({...customerData, city: e.target.value})}/>
                        <input placeholder="Estado" value={customerData.state} className="checkout-input md:col-span-2" onChange={e => setCustomerData({...customerData, state: e.target.value})}/>
                        <input placeholder="Referencias del Domicilio" value={customerData.reference} className="checkout-input md:col-span-2" onChange={e => setCustomerData({...customerData, reference: e.target.value})}/>
                    </div>
                    <button onClick={validateStep1} className="w-full mt-8 bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#FDCB02] hover:text-black transition-colors">
                      Guardar y Calcular Envío
                    </button>
                </motion.div>
              )}

              {/* PASO 2: LOGÍSTICA */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200 shadow-sm">
                    <h2 className="text-lg font-bold uppercase text-black mb-6 flex items-center gap-2"><Truck className="text-[#FDCB02]" size={20}/> 2. Confirmar Logística</h2>
                    
                    {logisticsType === 'COYOTE_LOCAL' ? (
                      <div className="bg-[#050505] text-white p-6 rounded-xl border border-white/10 relative overflow-hidden mb-8">
                        <div className="absolute right-0 top-0 opacity-10"><Factory size={120} className="translate-x-4 -translate-y-4"/></div>
                        <h3 className="text-[#FDCB02] font-black uppercase text-xl mb-1 italic tracking-tighter">Flotilla Coyote</h3>
                        <p className="text-xs text-neutral-400 font-medium uppercase tracking-widest mb-4">Cobertura Local Detectada</p>
                        <ul className="space-y-2 text-sm mb-6">
                          <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#FDCB02]"/> Despacho Directo de Almacén</li>
                          <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#FDCB02]"/> Capacidad maxíma: 80 rollos</li>
                          {vehiclesNeeded > 1 && (
                            <li className="flex items-center gap-2 text-[#FDCB02]"><Info size={14}/> <strong>Requiere {vehiclesNeeded} unidades de transporte</strong></li>
                          )}
                        </ul>
                        <div className="bg-white/10 p-3 rounded-lg flex justify-between items-center backdrop-blur-md">
                          <span className="text-xs font-bold uppercase tracking-widest text-neutral-300 flex items-center gap-2"><Calculator size={14}/> Costo de Envio </span>
                          <span className="text-lg font-black">${shippingCost.toLocaleString()} MXN</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-8">
                        <h3 className="text-blue-800 font-black uppercase text-xl mb-1">Red Nacional Skydropx</h3>
                        <p className="text-xs text-blue-600/70 font-bold uppercase tracking-widest mb-4">Envío Estándar</p>
                        <p className="text-sm text-blue-900 mb-6">Tu código postal se encuentra fuera de nuestra área de flotilla directa. Utilizaremos la red logística nacional tercerizada.</p>
                        <div className="bg-white p-3 rounded-lg flex justify-between items-center shadow-sm">
                          <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Tarifa Nacional ({totalWeight}kg)</span>
                          <span className="text-lg font-black text-blue-900">${shippingCost.toLocaleString()} MXN</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4">
                      <button onClick={() => setStep(1)} className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-widest hover:bg-neutral-100 rounded-xl transition-colors">Atrás</button>
                      <button onClick={() => setStep(3)} className="flex-1 bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#FDCB02] hover:text-black transition-colors">Confirmar Logística</button>
                    </div>
                </motion.div>
              )}

              {/* PASO 3: FACTURACIÓN */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6 border-b border-neutral-100 pb-6">
                      <h2 className="text-lg font-bold uppercase text-black flex items-center gap-2"><FileText className="text-[#FDCB02]" size={20}/> 3. Facturación (CFDI 4.0)</h2>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-black uppercase tracking-widest ${wantsInvoice ? 'text-black' : 'text-neutral-400'}`}>{wantsInvoice ? 'Sí, Facturar' : 'No requiero'}</span>
                        <button onClick={() => setWantsInvoice(!wantsInvoice)} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none ${wantsInvoice ? 'bg-[#FDCB02]' : 'bg-neutral-200'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${wantsInvoice ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {wantsInvoice ? (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input placeholder="RFC" value={fiscalData.rfc} className="checkout-input font-mono uppercase" onChange={e => setFiscalData({...fiscalData, rfc: e.target.value.toUpperCase()})}/>
                            <input placeholder="Razón Social (Sin SA de CV)" value={fiscalData.razonSocial} className="checkout-input uppercase" onChange={e => setFiscalData({...fiscalData, razonSocial: e.target.value.toUpperCase()})}/>
                            <select className="checkout-input text-neutral-600 uppercase text-xs font-bold" value={fiscalData.usoCFDI} onChange={e => setFiscalData({...fiscalData, usoCFDI: e.target.value})}>
                              <option value="">Uso de CFDI...</option>
                              <option value="G01">G01 - Adquisición de mercancias</option>
                              <option value="G03">G03 - Gastos en general</option>
                              <option value="P01">P01 - Por definir</option>
                            </select>
                            <select className="checkout-input text-neutral-600 uppercase text-xs font-bold" value={fiscalData.regimen} onChange={e => setFiscalData({...fiscalData, regimen: e.target.value})}>
                              <option value="">Régimen Fiscal...</option>
                              <option value="601">601 - General de Ley Personas Morales</option>
                              <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                              <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                            </select>
                            <input placeholder="C.P. Fiscal" value={fiscalData.cpFiscal} className="checkout-input md:col-span-2" onChange={e => setFiscalData({...fiscalData, cpFiscal: e.target.value})}/>
                            <p className="md:col-span-2 text-[10px] text-neutral-400 font-bold uppercase mt-2">* El 16% de IVA se agregará automáticamente al total.</p>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="mb-8 p-4 bg-neutral-50 rounded-lg text-sm text-neutral-500 font-medium">Se emitirá una nota de venta simplificada sin desglose de impuestos fiscales.</div>
                      )}
                    </AnimatePresence>

                    <div className="flex gap-4">
                      <button onClick={() => setStep(2)} className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-widest hover:bg-neutral-100 rounded-xl transition-colors">Atrás</button>
                      <button onClick={validateStep3} className="flex-1 bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#FDCB02] hover:text-black transition-colors">Ir al Pago</button>
                    </div>
                </motion.div>
              )}

              {/* PASO 4: PAGO */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
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
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 text-center py-4">
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Landmark size={32}/></div>
                                <h2 className="text-lg font-bold uppercase mb-2">Transferencia Bancaria (SPEI)</h2>
                                <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">Al confirmar, generaremos una <strong>CLABE única</strong> para tu transferencia.</p>
                            </div>
                        )}

                        {/* EFECTIVO */}
                        {paymentMethod === 'store' && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 text-center py-4">
                                  <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><Banknote size={32}/></div>
                                <h2 className="text-lg font-bold uppercase mb-4">Pago en Efectivo</h2>
                                <div className="flex justify-center gap-6 mb-8 opacity-80 grayscale hover:grayscale-0 transition-all">
                                    <img src={LOGOS.oxxo} alt="Oxxo" className="h-8 object-contain"/>
                                    <img src={LOGOS.seven} alt="7-Eleven" className="h-8 object-contain"/>
                                </div>
                            </div>
                        )}

                        <div className="pt-8 mt-4 border-t border-neutral-100 flex gap-4">
                            <button onClick={() => setStep(3)} className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-widest hover:bg-neutral-100 rounded-xl transition-colors">Atrás</button>
                            <button 
                                onClick={handleTransaction}
                                disabled={isProcessing || (paymentMethod === 'card' && !isSdkReady)}
                                className={`flex-1 font-black uppercase py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 ${isProcessing ? 'bg-neutral-800 text-neutral-400 cursor-wait' : 'bg-[#FDCB02] hover:bg-black hover:text-white text-black'}`}
                            >
                                {isProcessing ? 'Procesando...' : (
                                    <><span>{paymentMethod === 'card' ? 'Pagar Ahora' : 'Generar Ficha'}</span><span className="bg-black/10 px-2 py-0.5 rounded text-sm">${total.toLocaleString()}</span></>
                                )}
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-6 text-[10px] text-neutral-400 uppercase font-bold"><ShieldCheck size={12} className="text-green-500"/> Transacción Encriptada OpenPay</div>
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ================= COLUMNA DERECHA (RESUMEN) ================= */}
          <div className="lg:col-span-5">
             <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200 shadow-lg sticky top-28">
                <h3 className="text-lg font-black uppercase text-black mb-6 border-b border-neutral-100 pb-4">Resumen de Orden</h3>
                
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
                                    {item.meta?.color && <p className="text-[10px] text-neutral-500 uppercase">Color: <span className="font-bold text-black">{item.meta.color}</span></p>}
                                    <p className="text-[10px] text-neutral-500 uppercase">Peso: <span className="font-bold text-black">{item.quantity} kg</span></p>
                                </div>
                            </div>
                            <span className="font-bold text-sm text-black">${(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                    ))}
                </div>
                
                <div className="space-y-3 pt-4 border-t border-neutral-100 bg-neutral-50 p-4 rounded-lg">
                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Subtotal de Mercancía</span>
                        <span className="font-bold">${subtotal.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm text-neutral-600">
                        <span className="font-medium flex items-center gap-1"><Package size={14}/> Maniobra Consolidada <span className="text-[9px] bg-neutral-200 px-1 rounded uppercase">{totalRolls > 0 ? `${totalRolls} Bultos` : 'Minimo'}</span></span>
                        <span className="font-bold">${freightCost.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-sm text-blue-600">
                        <span className="font-medium flex items-center gap-1">
                          <Truck size={14}/> 
                          Envío {logisticsType === 'COYOTE_LOCAL' ? (vehiclesNeeded > 1 ? `Coyote (x${vehiclesNeeded} Unidades)` : 'Coyote') : 'Skydropx'}
                        </span>
                        <span className="font-bold">${shippingCost.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-sm text-neutral-500">
                        <span className="font-medium flex items-center gap-1"><Info size={14}/> Tarifa Fija de Servicio</span>
                        <span className="font-bold">${serviceFee.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>

                    {/* IVA DINÁMICO */}
                    <AnimatePresence>
                      {wantsInvoice && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex justify-between text-sm text-neutral-500 overflow-hidden pt-2 border-t border-neutral-200/50 border-dashed mt-2">
                            <span className="font-medium">IVA (16%)</span>
                            <span className="font-bold text-black">${taxIVA.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex justify-between items-end pt-4 border-t border-neutral-200 mt-2">
                        <span className="font-black uppercase text-xs text-neutral-400 tracking-widest">Total Final</span>
                        <span className="font-black text-3xl leading-none text-[#FDCB02] drop-shadow-sm">${total.toLocaleString()}</span>
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