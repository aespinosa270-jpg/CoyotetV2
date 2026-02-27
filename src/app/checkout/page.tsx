'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react'; 
import { useCart } from '@/lib/context/cart-context';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, LinkAuthenticationElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { 
  User, MapPin, Phone, Mail, ArrowLeft, ShoppingBag, Truck, Package, 
  Info, FileText, CheckCircle2, Factory, Map, ChevronRight, Loader2, Crown, ShieldCheck,
  CreditCard, Sparkles, BadgePercent, Landmark, ChevronDown, ExternalLink, Calendar,
  Zap, Copy, Clock, Smartphone, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 🐺 Inicializamos Stripe con tu llave pública
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type LogisticsMethod = 'coyote' | 'skydropx';
type PaymentMethod = 'stripe' | 'financing';
type FinancingProvider = 'kueski' | 'aplazo' | 'atrato' | 'kapital' | null;

// Configuración Coyote
const DIESEL_PRICE_PER_LITER = 27.00; 
const LITERS_PER_100KM = 20.0;        
const OPERATIONAL_MARKUP = 4;         
const FIXED_SERVICE_FEE = 175;        
const MAX_ROLLS_PER_VEHICLE = 80;     

// ============================================================================
// 💳 CONFIGURACIÓN DE PROVEEDORES DE FINANCIAMIENTO
// ============================================================================
const FINANCING_PROVIDERS = [
  {
    id: 'kueski' as FinancingProvider,
    name: 'Kueski Pay',
    tagline: 'Compra ahora, paga después',
    color: '#7C3AED',
    accentColor: '#A78BFA',
    bgGradient: 'from-[#7C3AED]/10 to-[#4C1D95]/5',
    borderColor: 'border-purple-500/30',
    activeBorder: 'border-purple-500',
    activeBg: 'bg-purple-950/30',
    icon: '🦄',
    maxInstallments: 12,
    minAmount: 200,
    perks: ['Sin tarjeta de crédito', 'Aprobación instantánea', 'Hasta 12 quincenas'],
    badge: 'Popular',
    badgeColor: 'bg-purple-500',
    checkoutUrl: (amount: number, orderId: string) =>
      `https://checkout.kueskipay.com/checkout?amount=${amount}&order_id=${orderId}&merchant_id=${process.env.NEXT_PUBLIC_KUESKI_MERCHANT_ID}`,
  },
  {
    id: 'aplazo' as FinancingProvider,
    name: 'Aplazo',
    tagline: 'Paga en mensualidades sin intereses',
    color: '#059669',
    accentColor: '#34D399',
    bgGradient: 'from-[#059669]/10 to-[#064E3B]/5',
    borderColor: 'border-emerald-500/30',
    activeBorder: 'border-emerald-500',
    activeBg: 'bg-emerald-950/30',
    icon: '💚',
    maxInstallments: 24,
    minAmount: 500,
    perks: ['0% de interés disponible', 'Meses sin intereses', 'Hasta 24 MSI'],
    badge: 'MSI',
    badgeColor: 'bg-emerald-500',
    checkoutUrl: (amount: number, orderId: string) =>
      `https://checkout.aplazo.mx/checkout?total=${amount}&order_id=${orderId}&api_key=${process.env.NEXT_PUBLIC_APLAZO_API_KEY}`,
  },
  {
    id: 'atrato' as FinancingProvider,
    name: 'Atrato',
    tagline: 'Financia tus compras a tu ritmo',
    color: '#0284C7',
    accentColor: '#38BDF8',
    bgGradient: 'from-[#0284C7]/10 to-[#0C4A6E]/5',
    borderColor: 'border-sky-500/30',
    activeBorder: 'border-sky-500',
    activeBg: 'bg-sky-950/30',
    icon: '🔵',
    maxInstallments: 18,
    minAmount: 300,
    perks: ['Proceso 100% digital', 'Sin aval ni fiador', 'Hasta 18 meses'],
    badge: 'Digital',
    badgeColor: 'bg-sky-500',
    checkoutUrl: (amount: number, orderId: string) =>
      `https://checkout.atrato.com/v1/checkout?amount=${amount}&reference=${orderId}&public_key=${process.env.NEXT_PUBLIC_ATRATO_PUBLIC_KEY}`,
  },
  {
    id: 'kapital' as FinancingProvider,
    name: 'Kapital',
    tagline: 'Crédito empresarial flexible',
    color: '#D97706',
    accentColor: '#FBBF24',
    bgGradient: 'from-[#D97706]/10 to-[#78350F]/5',
    borderColor: 'border-amber-500/30',
    activeBorder: 'border-amber-500',
    activeBg: 'bg-amber-950/30',
    icon: '🏦',
    maxInstallments: 36,
    minAmount: 5000,
    perks: ['Para empresas y negocios', 'Línea de crédito revolvente', 'Hasta 36 meses'],
    badge: 'Empresas',
    badgeColor: 'bg-amber-600',
    checkoutUrl: (amount: number, orderId: string) =>
      `https://app.kapital.mx/checkout?amount=${amount}&order_id=${orderId}&merchant=${process.env.NEXT_PUBLIC_KAPITAL_MERCHANT_ID}`,
  },
];

// ============================================================================
// 🏪 OXXO VOUCHER — pantalla inline (solo aparece cuando el usuario elige OXXO)
// ============================================================================
function OxxoVoucher({ voucher, amount, expiresAt }: { voucher: string; amount: number; expiresAt: number }) {
  const [copied, setCopied] = useState(false);
  const expDate = new Date(expiresAt * 1000).toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const handleCopy = () => {
    navigator.clipboard.writeText(voucher);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#fff9e6] border-2 border-[#FDCB02] rounded-3xl overflow-hidden">
      <div className="bg-[#FDCB02] px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏪</span>
          <div>
            <h3 className="font-[1000] text-black uppercase tracking-tight text-lg">Paga en OXXO</h3>
            <p className="text-[11px] text-black/60 font-bold uppercase tracking-widest">Referencia generada</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-black/50 font-bold uppercase tracking-widest">Total</p>
          <p className="text-2xl font-[1000] text-black">${amount.toLocaleString()}</p>
          <p className="text-[10px] text-black/50 font-bold">MXN</p>
        </div>
      </div>
      <div className="px-6 py-6">
        <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black mb-3">Número de referencia</p>
        <div className="flex items-center gap-3 bg-white rounded-2xl p-4 border-2 border-dashed border-[#FDCB02]">
          <span className="font-mono text-2xl font-[1000] text-black tracking-[0.15em] flex-1 text-center">{voucher}</span>
          <button onClick={handleCopy} className="w-10 h-10 bg-[#FDCB02] hover:bg-black hover:text-[#FDCB02] text-black rounded-xl flex items-center justify-center transition-all shrink-0">
            {copied ? <CheckCircle2 size={18}/> : <Copy size={18}/>}
          </button>
        </div>
        <div className="mt-6 space-y-3">
          {[
            'Ve a cualquier tienda OXXO',
            'Dile al cajero "Pago de servicios"',
            'Proporciona el número de referencia',
            `Paga $${amount.toLocaleString()} MXN en efectivo`,
            'Guarda tu ticket como comprobante',
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#FDCB02] flex items-center justify-center text-black text-xs font-[1000] shrink-0">{i + 1}</div>
              <span className="text-sm text-neutral-700 font-medium">{step}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <Clock size={16} className="text-orange-500 shrink-0"/>
          <p className="text-xs text-orange-700 font-bold">Válido hasta el <span className="capitalize">{expDate}</span>. Pasada esa fecha la referencia expira.</p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// 🏦 SPEI — CLABE interbancaria inline
// ============================================================================
function SpeiInstructions({ clabe, bankName, amount }: { clabe: string; bankName: string; amount: number }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(clabe);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-br from-blue-950 to-blue-900 border border-blue-700 rounded-3xl overflow-hidden">
      <div className="px-6 py-5 border-b border-blue-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center text-2xl">🏦</div>
          <div>
            <h3 className="font-[1000] text-white uppercase tracking-tight text-lg">Transferencia SPEI</h3>
            <p className="text-[11px] text-blue-300 font-bold uppercase tracking-widest">{bankName}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Monto exacto</p>
          <p className="text-2xl font-[1000] text-white">${amount.toLocaleString()}</p>
          <p className="text-[10px] text-blue-400 font-bold">MXN</p>
        </div>
      </div>
      <div className="px-6 py-6">
        <p className="text-[10px] text-blue-400 uppercase tracking-widest font-black mb-3">CLABE Interbancaria</p>
        <div className="flex items-center gap-3 bg-black/30 rounded-2xl p-4 border border-blue-700 mb-6">
          <span className="font-mono text-xl font-[1000] text-white tracking-[0.12em] flex-1 text-center">
            {clabe.replace(/(\d{4})/g, '$1 ').trim()}
          </span>
          <button onClick={handleCopy} className="w-10 h-10 bg-blue-600 hover:bg-[#FDCB02] hover:text-black text-white rounded-xl flex items-center justify-center transition-all shrink-0">
            {copied ? <CheckCircle2 size={18}/> : <Copy size={18}/>}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            ['Banco',    bankName],
            ['Moneda',   'MXN — Pesos Mexicanos'],
            ['Concepto', 'Pedido Coyote'],
            ['Tiempo',   '24–48 horas hábiles'],
          ].map(([label, value]) => (
            <div key={label} className="bg-black/20 rounded-xl p-3 border border-blue-800">
              <p className="text-[9px] text-blue-400 uppercase tracking-widest font-black mb-0.5">{label}</p>
              <p className="text-xs text-white font-bold">{value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <AlertCircle size={16} className="text-[#FDCB02] shrink-0 mt-0.5"/>
          <p className="text-xs text-yellow-200 font-medium">
            Transfiere el <strong>monto exacto</strong>. Cualquier diferencia puede retrasar la confirmación.
            Recibirás un correo cuando acreditemos el pago.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// 💳 COMPONENTE: SECCIÓN DE FINANCIAMIENTO
// ============================================================================
function FinancingSection({ 
  total, 
  orderId, 
  selectedProvider, 
  onSelectProvider 
}: { 
  total: number; 
  orderId: string; 
  selectedProvider: FinancingProvider; 
  onSelectProvider: (id: FinancingProvider) => void; 
}) {
  const [expandedProvider, setExpandedProvider] = useState<FinancingProvider>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const provider = FINANCING_PROVIDERS.find(p => p.id === selectedProvider);

  const handleFinancingRedirect = async () => {
    if (!provider || !orderId) return;
    setIsRedirecting(true);
    try {
      await fetch('/api/financing/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, provider: provider.id, amount: total })
      });
      window.location.href = provider.checkoutUrl(total, orderId);
    } catch (error) {
      console.error('Error al iniciar financiamiento:', error);
      setIsRedirecting(false);
    }
  };

  const getInstallmentPreview = (providerData: typeof FINANCING_PROVIDERS[0]) => {
    const options = [3, 6, 12].filter(m => m <= providerData.maxInstallments);
    return options.map(months => ({
      months,
      amount: Math.ceil(total / months),
    }));
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-[#FDCB02]" />
          <h3 className="text-base font-[1000] uppercase tracking-tight text-white">Elige tu Financiador</h3>
        </div>
        <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
          {FINANCING_PROVIDERS.length} opciones disponibles
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {FINANCING_PROVIDERS.map((p) => {
          const isSelected = selectedProvider === p.id;
          const isExpanded = expandedProvider === p.id;
          const installments = getInstallmentPreview(p);

          return (
            <div
              key={p.id}
              className={`rounded-2xl border-2 transition-all duration-300 overflow-hidden cursor-pointer
                ${isSelected 
                  ? `${p.activeBorder} ${p.activeBg}` 
                  : `${p.borderColor} bg-white/5 hover:bg-white/8`
                }`}
              onClick={() => {
                onSelectProvider(p.id);
                setExpandedProvider(isExpanded ? null : p.id);
              }}
            >
              <div className="p-4 flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 font-bold transition-all"
                  style={{ backgroundColor: isSelected ? p.color : '#1a1a1a' }}
                >
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-[1000] text-white text-sm uppercase tracking-tight">{p.name}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest text-white px-2 py-0.5 rounded-full ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 truncate">{p.tagline}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {installments.slice(0, 2).map(({ months, amount }) => (
                      <span 
                        key={months} 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ 
                          backgroundColor: isSelected ? `${p.color}30` : '#ffffff10',
                          color: isSelected ? p.accentColor : '#9ca3af'
                        }}
                      >
                        {months}x ${amount.toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: p.color }}>
                      <CheckCircle2 size={12} className="text-white" />
                    </div>
                  )}
                  <ChevronDown size={16} className={`text-neutral-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}/>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 border-t border-white/5">
                      <div className="mb-4">
                        <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-black mb-2">Tabla de pagos</p>
                        <div className="grid grid-cols-3 gap-2">
                          {getInstallmentPreview(p).concat(
                            p.maxInstallments > 12 
                              ? [{ months: p.maxInstallments, amount: Math.ceil(total / p.maxInstallments) }] 
                              : []
                          ).map(({ months, amount }) => (
                            <div key={months} className="rounded-xl p-3 text-center" style={{ backgroundColor: `${p.color}20` }}>
                              <div className="text-lg font-[1000] leading-none" style={{ color: p.accentColor }}>{months}</div>
                              <div className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5">cuotas</div>
                              <div className="text-white text-xs font-bold mt-1">${amount.toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[9px] text-neutral-600 text-center mt-2">
                          * Sujeto a aprobación. Los intereses varían según el plan seleccionado.
                        </p>
                      </div>
                      <div className="space-y-1.5 mb-4">
                        {p.perks.map((perk) => (
                          <div key={perk} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.accentColor }}/>
                            <span className="text-[11px] text-neutral-300">{perk}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedProvider && provider && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <button
              onClick={handleFinancingRedirect}
              disabled={isRedirecting || !orderId}
              className="w-full h-16 rounded-2xl font-[1000] uppercase text-sm tracking-[0.15em] transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
              style={{ backgroundColor: provider.color, color: 'white' }}
            >
              {isRedirecting ? (
                <>Conectando con {provider.name}... <Loader2 size={18} className="animate-spin"/></>
              ) : (
                <><span>{provider.icon}</span>Continuar con {provider.name}<ExternalLink size={16} /></>
              )}
            </button>
            {!orderId && (
              <p className="text-center text-[10px] text-neutral-500 mt-2 uppercase tracking-wider">
                Completa los pasos anteriores para activar el financiamiento
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-center gap-4 pt-2">
        <div className="flex items-center gap-1.5 text-neutral-600">
          <ShieldCheck size={12}/>
          <span className="text-[9px] uppercase tracking-widest font-bold">Transacción Segura</span>
        </div>
        <div className="w-1 h-1 bg-neutral-700 rounded-full"/>
        <div className="flex items-center gap-1.5 text-neutral-600">
          <Landmark size={12}/>
          <span className="text-[9px] uppercase tracking-widest font-bold">Regulado por CNBV</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 🐺 COMPONENTE HIJO: EL FORMULARIO SEGURO DE STRIPE
// ============================================================================
type AsyncPaymentState =
  | { type: 'idle' }
  | { type: 'oxxo';    voucher: string; amount: number; expiresAt: number }
  | { type: 'spei';    clabe: string;   bankName: string; amount: number }
  | { type: 'success' };

function StripeCheckoutForm({ amount, orderId, clearCart }: { amount: number, orderId: string, clearCart: () => void }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [asyncState,   setAsyncState]   = useState<AsyncPaymentState>({ type: 'idle' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMessage(submitError.message || 'Error al validar el formulario.');
      setIsProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?orderId=${orderId}`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'Ocurrió un error al procesar el pago.');
      setIsProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      clearCart();
      setAsyncState({ type: 'success' });
    } else if (paymentIntent?.status === 'requires_action') {
      const action = paymentIntent.next_action;

      if (action?.type === 'oxxo_display_details') {
        const oxxoDetails = (action as unknown as { oxxo_display_details: { number: string; expires_after: number } }).oxxo_display_details;
        clearCart();
        setAsyncState({
          type:      'oxxo',
          voucher:   oxxoDetails.number,
          amount,
          expiresAt: oxxoDetails.expires_after,
        });
      } else if (action?.type === 'display_bank_transfer_instructions') {
        type SpeiInstructions = { reference?: string; financial_addresses?: Array<{ spei?: { clabe: string; bank_name?: string } }> };
        const bt = (action as unknown as { display_bank_transfer_instructions: SpeiInstructions }).display_bank_transfer_instructions!;
        const mx = bt.financial_addresses?.[0]?.spei ?? null;
        clearCart();
        setAsyncState({
          type:     'spei',
          clabe:    mx?.clabe ?? bt.reference ?? '—',
          bankName: mx?.bank_name ?? 'STP',
          amount,
        });
      } else {
        setErrorMessage('Se requiere una acción adicional. Por favor sigue las instrucciones.');
      }
    } else if (paymentIntent?.status === 'processing') {
      clearCart();
      setAsyncState({ type: 'success' });
    }

    setIsProcessing(false);
  };

  // ── Pantalla de éxito ────────────────────────────────────────────────────
  if (asyncState.type === 'success') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-6">
        <div className="w-20 h-20 bg-[#FDCB02] rounded-full flex items-center justify-center mb-4 shadow-xl shadow-yellow-500/30">
          <CheckCircle2 size={40} className="text-black"/>
        </div>
        <h3 className="text-2xl font-[1000] uppercase text-white tracking-tight mb-2">¡Pago Confirmado!</h3>
        <p className="text-neutral-400 text-sm mb-6">
          Tu pedido <span className="text-[#FDCB02] font-bold">{orderId.slice(-8).toUpperCase()}</span> está en proceso.
        </p>
        <Link href="/" className="bg-[#FDCB02] text-black font-[1000] uppercase text-xs tracking-widest px-8 py-4 rounded-2xl hover:bg-white transition-all">
          Volver al catálogo
        </Link>
      </motion.div>
    );
  }

  // ── Voucher OXXO ─────────────────────────────────────────────────────────
  if (asyncState.type === 'oxxo') return <OxxoVoucher {...asyncState}/>;

  // ── CLABE SPEI ───────────────────────────────────────────────────────────
  if (asyncState.type === 'spei') return <SpeiInstructions {...asyncState}/>;

  // ── Formulario de pago ───────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-[1000] uppercase text-white tracking-tighter flex items-center gap-2">
          <ShieldCheck size={24} className="text-[#FDCB02]"/> Bóveda Segura
        </h2>
        {/* Badges de métodos aceptados */}
        <div className="flex items-center gap-1.5">
          {['💳', '🍎', '🔵', '🏪', '🏦', '🔗'].map((icon, i) => (
            <span key={i} title={['Tarjeta','Apple Pay','Google Pay','OXXO','SPEI','Link'][i]}
              className="text-base w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center">{icon}</span>
          ))}
        </div>
      </div>

      {/* Link Authentication — activa autocompletado de Stripe Link */}
      <div className="mb-3 bg-[#0a0a0a] rounded-xl p-1">
        <LinkAuthenticationElement options={{ defaultValues: { email: '' } }}/>
      </div>

      {/* Payment Element — Aquí es donde Stripe inyecta los verdaderos botones interactivos */}
      <div className="bg-[#0a0a0a] p-1 rounded-xl">
        <PaymentElement
          options={{
            layout: { type: 'tabs', defaultCollapsed: false, radios: false, spacedAccordionItems: false },
            wallets: {
              applePay:  'auto',
              googlePay: 'auto',
            },
          }}
        />
      </div>

      {/* 🐺 ELIMINAMOS EL CÓDIGO FALSO ("Info contextual") PARA QUE SOLO SE VEAN LAS PESTAÑAS REALES DE STRIPE ARRIBA */}

      {errorMessage && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider text-center flex items-center gap-2 justify-center">
          <AlertCircle size={14}/> {errorMessage}
        </div>
      )}

      <button 
        disabled={isProcessing || !stripe} 
        className="w-full mt-6 bg-[#FDCB02] hover:bg-white text-black h-16 rounded-2xl font-[1000] uppercase text-sm tracking-[0.2em] transition-all shadow-xl hover:shadow-yellow-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isProcessing ? (<>Procesando... <Loader2 size={18} className="animate-spin"/></>) : (`Pagar $${amount.toLocaleString()} MXN`)}
      </button>

      <p className="text-center text-[9px] text-neutral-600 mt-3 uppercase tracking-wider font-bold">
        Transacción cifrada TLS 1.3 · PCI-DSS Nivel 1
      </p>
    </form>
  );
}

// ============================================================================
// 🐺 PÁGINA PRINCIPAL DE CHECKOUT
// ============================================================================
export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { data: session } = useSession(); 
  
  const role = (session?.user as any)?.membershipTier || 'NONE';

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1); 
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 🐺 Variables para Stripe
  const [clientSecret, setClientSecret] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState('');

  // 💳 Variables para Financiamiento
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe');
  const [selectedFinancingProvider, setSelectedFinancingProvider] = useState<FinancingProvider>(null);

  const [selectedLogistics, setSelectedLogistics] = useState<LogisticsMethod>('coyote');
  const [coyoteDistanceKm, setCoyoteDistanceKm] = useState<number>(0); 
  const [isLocalZone, setIsLocalZone] = useState(false); 
  
  const [isQuoting, setIsQuoting] = useState(false);
  const [skydropxRate, setSkydropxRate] = useState<number>(0);
  const [skydropxCarrier, setSkydropxCarrier] = useState<string>('Paquetería');
  const [skydropxDays, setSkydropxDays] = useState<number>(3);

  const [wantsInvoice, setWantsInvoice] = useState(false);

  const [customerData, setCustomerData] = useState({ 
    name: '', lastName: '', email: '', phone: '', 
    street: '', number: '', unit: '', neighborhood: '', 
    city: '', state: '', zip: '', reference: ''
  });

  const [fiscalData, setFiscalData] = useState({
    rfc: '', razonSocial: '', regimen: '', usoCFDI: '', cpFiscal: ''
  });

  useEffect(() => { setMounted(true); }, []);

  const getLogisticsInfo = (zipCode: string) => {
    const cp = parseInt(zipCode, 10);
    if (isNaN(cp) || zipCode.length < 5) return { type: 'PENDING', distance: 0 };
    const prefix2 = Math.floor(cp / 1000); 

    if (prefix2 >= 1 && prefix2 <= 16) {
        let dist = 15; 
        if ([15, 6, 8].includes(prefix2)) dist = 5;        
        if ([7, 9, 3].includes(prefix2)) dist = 12;        
        if ([2, 4, 11].includes(prefix2)) dist = 18;      
        if ([1, 5, 10, 12, 13, 14, 16].includes(prefix2)) dist = 28; 
        return { type: 'COYOTE_LOCAL', distance: dist };
    }

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

    if (prefix2 === 42 || prefix2 === 43) return { type: 'COYOTE_LOCAL', distance: 100 }; 
    if (prefix2 >= 72 && prefix2 <= 75) return { type: 'COYOTE_LOCAL', distance: 130 };   
    if (prefix2 === 62) return { type: 'COYOTE_LOCAL', distance: 90 };                    

    return { type: 'SKYDROPX_NACIONAL', distance: 0 };
  };

  const { freightCost, shippingCost, originalShippingCost, isFreeShipping, vehiclesNeeded, serviceFee, taxIVA, total, totalWeight, totalRolls } = useMemo(() => {
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

    let originalEnvio = 0;
    let requiredVehicles = 1;

    if (selectedLogistics === 'coyote') {
        requiredVehicles = Math.max(1, Math.ceil(rollCount / MAX_ROLLS_PER_VEHICLE));
        const totalDistanceRoundTrip = coyoteDistanceKm * 2;
        const litersNeededPerVehicle = (totalDistanceRoundTrip / 100) * LITERS_PER_100KM;
        const fuelCostPerVehicle = litersNeededPerVehicle * DIESEL_PRICE_PER_LITER;
        originalEnvio = fuelCostPerVehicle * OPERATIONAL_MARKUP * requiredVehicles;
    } else {
        originalEnvio = skydropxRate;
    }

    const isFreeShipping = role === 'ELITE';
    const envio = isFreeShipping ? 0 : originalEnvio;
    const fee = FIXED_SERVICE_FEE; 
    const baseTotal = subtotal + flete + envio + fee;
    const iva = wantsInvoice ? baseTotal * 0.16 : 0;

    return {
        freightCost: flete, shippingCost: envio, originalShippingCost: originalEnvio, 
        isFreeShipping, vehiclesNeeded: requiredVehicles, serviceFee: fee, 
        taxIVA: iva, total: baseTotal + iva, totalWeight: weight, totalRolls: rollCount
    };
  }, [items, subtotal, wantsInvoice, selectedLogistics, coyoteDistanceKm, skydropxRate, role]); 

  const validateStep1 = async () => {
    if (!customerData.name || !customerData.email || !customerData.street || !customerData.state || !customerData.city || !customerData.neighborhood || customerData.zip.length < 5) {
      alert("Por favor completa todos los campos de dirección.");
      return;
    }
    
    setIsQuoting(true); 
    
    try {
        const res = await fetch('/api/shipping/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                zip_to: customerData.zip, state_to: customerData.state, city_to: customerData.city,
                neighborhood_to: customerData.neighborhood, weight: totalWeight 
            })
        });
        const data = await res.json();
        
        if (data.success && data.bestQuote && data.bestQuote.amount > 0) {
            setSkydropxRate(data.bestQuote.amount);
            setSkydropxCarrier(data.bestQuote.carrier);
            setSkydropxDays(data.bestQuote.days);
        }

        const logistics = getLogisticsInfo(customerData.zip);
        
        if (logistics.type === 'COYOTE_LOCAL') {
            setCoyoteDistanceKm(logistics.distance);
            setSelectedLogistics('coyote');
            setIsLocalZone(true); 
            setStep(2);
        } else {
            if (!data.success || !data.bestQuote || data.bestQuote.amount === 0) {
                alert(`SkydropX no devolvió un costo válido para tu zona. (${data.error || '0 pesos'})`);
                setIsQuoting(false);
                return;
            }
            setIsLocalZone(false); 
            setSelectedLogistics('skydropx');
            setStep(2);
        }
    } catch (error) {
        alert("Hubo un error al calcular tu envío. Intenta más tarde.");
    } finally {
        setIsQuoting(false);
    }
  };

  // 🐺 CREA LA ORDEN EN EL BACKEND (sirve tanto para Stripe como para financiamiento)
  const preparePayment = async (method: PaymentMethod = 'stripe') => {
    if (wantsInvoice && (!fiscalData.rfc || !fiscalData.razonSocial || !fiscalData.cpFiscal)) {
      alert("Por favor completa los datos fiscales obligatorios para la factura.");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total, 
          description: `Pedido Coyote - ${totalWeight}kg ${wantsInvoice ? '(Con Factura)' : ''}`,
          items,
          customer: customerData,
          paymentMethod: method,
          metadata: {
             freight_cost: freightCost, shipping_cost: shippingCost, service_fee: FIXED_SERVICE_FEE, tax_iva: taxIVA,
             req_invoice: wantsInvoice ? 'YES' : 'NO', fiscal_data: wantsInvoice ? fiscalData : null, logistics_type: selectedLogistics,
             vehicles_used: vehiclesNeeded
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setCurrentOrderId(data.orderId);
        
        if (method === 'stripe' && data.clientSecret) {
          setClientSecret(data.clientSecret);
        }
        
        setPaymentMethod(method);
        setStep(4);
      } else {
        throw new Error(data.error || "No se pudo preparar el pago.");
      }
    } catch (error: any) {
      alert(`⚠️ ${error.message || "Error al conectar con la bóveda de pagos."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted) return null;

  if (items.length === 0) {
    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-3xl shadow-xl flex flex-col items-center text-center max-w-sm">
              <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-6"><ShoppingBag size={40} className="text-neutral-300" /></div>
              <h1 className="text-2xl font-black uppercase text-black tracking-tight mb-2">Caja vacía</h1>
              <p className="text-neutral-500 text-sm mb-8">Aún no has agregado tela a tu pedido. Explora el catálogo para comenzar.</p>
              <Link href="/" className="w-full bg-[#FDCB02] hover:bg-black hover:text-white text-black font-black uppercase text-xs tracking-widest py-4 rounded-xl transition-all">Ir al catálogo</Link>
            </motion.div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] pt-24 pb-20 px-4 sm:px-6 font-sans selection:bg-[#FDCB02] selection:text-black">
      <div className="container mx-auto max-w-[1100px]">
        <div className="flex items-center gap-4 mb-8">
            <Link href="/" className="w-10 h-10 bg-white hover:bg-neutral-200 rounded-full flex items-center justify-center transition-colors text-black shadow-sm"><ArrowLeft size={18} /></Link>
            <h1 className="text-3xl font-[1000] uppercase text-black tracking-tighter">Finalizar Pedido</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          
          <div className="lg:col-span-7 space-y-6">
            {/* Progress Bar */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 mb-2">
              <div className="flex justify-between items-center relative z-10">
                {[
                  { num: 1, label: 'Destino', icon: MapPin },
                  { num: 2, label: 'Logística', icon: Truck },
                  { num: 3, label: 'Factura', icon: FileText },
                  { num: 4, label: 'Pago', icon: ShieldCheck }
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
                <div className="absolute top-5 left-8 right-8 h-1 bg-neutral-100 -z-10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FDCB02] transition-all duration-700 ease-in-out" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {/* ── PASO 1: Datos de Contacto ── */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-8 h-8 bg-[#FDCB02] rounded-lg flex items-center justify-center text-black"><User size={16} strokeWidth={2.5}/></div>
                      <h2 className="text-xl font-[1000] uppercase tracking-tight text-black">Datos de Contacto</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input placeholder="Nombre(s)" maxLength={15} value={customerData.name} className="checkout-input-premium" onChange={e => setCustomerData({...customerData, name: e.target.value})}/>
                        <input placeholder="Apellidos" maxLength={15} value={customerData.lastName} className="checkout-input-premium" onChange={e => setCustomerData({...customerData, lastName: e.target.value})}/>
                        
                        <div className="relative md:col-span-1">
                            <Mail size={18} className="absolute left-4 top-4 text-neutral-400 z-10"/>
                            <input placeholder="Correo Electrónico" type="email" value={customerData.email} className="checkout-input-premium pl-12" onChange={e => setCustomerData({...customerData, email: e.target.value})}/>
                        </div>
                        <div className="relative md:col-span-1">
                            <Phone size={18} className="absolute left-4 top-4 text-neutral-400 z-10"/>
                            <input placeholder="Teléfono a 10 dígitos" maxLength={10} type="tel" value={customerData.phone} className="checkout-input-premium pl-12" onChange={e => setCustomerData({...customerData, phone: e.target.value})}/>
                        </div>
                        
                        <div className="md:col-span-2 mt-4 mb-2 flex items-center gap-3">
                            <div className="h-px bg-neutral-200 flex-1"></div>
                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1"><MapPin size={12}/> Dirección de Entrega</span>
                            <div className="h-px bg-neutral-200 flex-1"></div>
                        </div>

                        <input placeholder="Calle" maxLength={45} value={customerData.street} className="checkout-input-premium md:col-span-2" onChange={e => setCustomerData({...customerData, street: e.target.value})}/>
                        <div className="grid grid-cols-2 gap-4 md:col-span-2">
                            <input placeholder="No. Exterior" maxLength={10} value={customerData.number} className="checkout-input-premium" onChange={e => setCustomerData({...customerData, number: e.target.value})}/>
                            <input placeholder="No. Interior (Opcional)" maxLength={10} value={customerData.unit} className="checkout-input-premium" onChange={e => setCustomerData({...customerData, unit: e.target.value})}/>
                        </div>
                        <input placeholder="Colonia" value={customerData.neighborhood} className="checkout-input-premium md:col-span-2" onChange={e => setCustomerData({...customerData, neighborhood: e.target.value})}/>
                        <input placeholder="Código Postal (Ej. 06000)" value={customerData.zip} maxLength={5} className="checkout-input-premium bg-[#FDCB02]/10 focus:bg-white border-[#FDCB02]/30 text-black font-bold placeholder:text-neutral-500" onChange={e => setCustomerData({...customerData, zip: e.target.value})}/>
                        <input placeholder="Ciudad" value={customerData.city} className="checkout-input-premium" onChange={e => setCustomerData({...customerData, city: e.target.value})}/>
                        <input placeholder="Estado" value={customerData.state} className="checkout-input-premium md:col-span-2" onChange={e => setCustomerData({...customerData, state: e.target.value})}/>
                        <input placeholder="Referencias (Ej. Portón negro)" maxLength={30} value={customerData.reference} className="checkout-input-premium md:col-span-2" onChange={e => setCustomerData({...customerData, reference: e.target.value})}/>
                    </div>

                    <button 
                      onClick={validateStep1} disabled={isQuoting}
                      className="w-full mt-8 bg-black hover:bg-[#FDCB02] text-white hover:text-black h-16 rounded-2xl font-[1000] uppercase text-sm tracking-[0.2em] transition-all shadow-xl disabled:opacity-70 flex justify-center items-center gap-2 group"
                    >
                      {isQuoting ? (<>Cotizando en Vivo... <Loader2 size={18} className="animate-spin"/></>) : (<>Configurar Envío <ChevronRight size={18} className="group-hover:translate-x-1"/></>)}
                    </button>
                </motion.div>
              )}

              {/* ── PASO 2: Logística ── */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-8 h-8 bg-[#FDCB02] rounded-lg flex items-center justify-center text-black"><Truck size={16} strokeWidth={2.5}/></div>
                      <h2 className="text-xl font-[1000] uppercase tracking-tight text-black">Logística y Despacho</h2>
                    </div>

                    {isLocalZone && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
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

                        <button onClick={() => setSelectedLogistics('skydropx')} className={`relative text-left p-6 rounded-3xl border-2 transition-all duration-300 overflow-hidden group ${selectedLogistics === 'skydropx' ? 'border-blue-600 bg-blue-50 shadow-xl scale-[1.02]' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${selectedLogistics === 'skydropx' ? 'bg-blue-600' : 'bg-neutral-100'}`}>
                            <Map size={20} className={selectedLogistics === 'skydropx' ? 'text-white' : 'text-neutral-400'}/>
                          </div>
                          <h4 className={`font-[1000] uppercase text-lg mb-1 ${selectedLogistics === 'skydropx' ? 'text-blue-900' : 'text-black'}`}>{skydropxCarrier}</h4>
                          <p className={`text-[11px] font-bold uppercase tracking-widest mb-4 ${selectedLogistics === 'skydropx' ? 'text-blue-500' : 'text-neutral-400'}`}>Llega en {skydropxDays} días hábiles</p>
                          <div className={`text-xs space-y-2 font-medium ${selectedLogistics === 'skydropx' ? 'text-blue-800' : 'text-neutral-500'}`}>
                            <p className="flex items-center gap-2"><CheckCircle2 size={14} className={selectedLogistics === 'skydropx' ? 'text-blue-500' : 'text-neutral-300'}/> Guía Automatizada</p>
                            <p className="flex items-center gap-2"><CheckCircle2 size={14} className={selectedLogistics === 'skydropx' ? 'text-blue-500' : 'text-neutral-300'}/> Peso facturado ({totalWeight}kg)</p>
                          </div>
                        </button>
                      </div>
                    )}

                    <AnimatePresence mode="wait">
                      {selectedLogistics === 'coyote' ? (
                        <motion.div key="coyote-calc" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h5 className="font-[1000] text-black uppercase tracking-tight">Ruta Local Calculada</h5>
                              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Destino: CP {customerData.zip}</p>
                            </div>
                            <span className="bg-[#FDCB02]/20 text-yellow-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Zona Segura</span>
                          </div>
                          
                          <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <label className="block text-[10px] uppercase tracking-widest font-black text-neutral-400 mb-2">Distancia (Ida)</label>
                              <div className="flex items-baseline gap-1">
                                <span className="font-mono text-3xl font-[1000] text-black tracking-tighter">{coyoteDistanceKm}</span>
                                <span className="text-sm font-bold text-neutral-400">KM</span>
                              </div>
                            </div>
                            <div className="w-px h-12 bg-neutral-100 hidden md:block"></div>
                            
                            <div className="flex-1 text-right">
                                <span className="block text-[10px] uppercase tracking-widest font-black text-neutral-400 mb-1">Inversión Logística</span>
                                {isFreeShipping ? (
                                    <div className="flex flex-col items-end">
                                        <span className="text-sm line-through text-neutral-400 font-bold">${originalShippingCost.toLocaleString()}</span>
                                        <span className="text-green-600 font-[1000] text-xl flex items-center gap-1"><Crown size={16}/> GRATIS</span>
                                    </div>
                                ) : (
                                    <span className="text-2xl font-[1000] text-black tracking-tighter">${shippingCost.toLocaleString()}</span>
                                )}
                            </div>
                          </div>
                          
                          {vehiclesNeeded > 1 && (
                            <div className="mt-4 p-4 bg-black rounded-xl flex items-center gap-4 text-white">
                              <div className="w-10 h-10 bg-[#FDCB02] rounded-lg flex items-center justify-center text-black shrink-0"><Truck size={20} strokeWidth={2.5}/></div>
                              <div>
                                <p className="text-xs font-bold text-[#FDCB02] uppercase tracking-widest mb-0.5">Alerta de Carga Pesada</p>
                                <p className="text-xs text-neutral-300">Tu pedido excede la capacidad. Requerimos <strong>{vehiclesNeeded} camionetas</strong>.</p>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div key="skydropx-calc" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                           <div className="flex items-center justify-between mb-4">
                            <div>
                              <h5 className="font-[1000] text-blue-900 uppercase tracking-tight">Tarifa SkydropX Nacional</h5>
                              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">Destino: {customerData.city} ({customerData.zip})</p>
                            </div>
                            {!isLocalZone && <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">Zona Foránea</span>}
                          </div>
                          <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-50 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] uppercase tracking-widest font-black text-neutral-400 mb-1">Peso Bruto</p>
                              <p className="text-lg font-bold text-black">{totalWeight} <span className="text-sm text-neutral-400">KG</span></p>
                            </div>
                            <div className="text-right">
                                <span className="block text-[10px] uppercase tracking-widest font-black text-neutral-400 mb-1">Mejor Tarifa: {skydropxCarrier}</span>
                                {isFreeShipping ? (
                                    <div className="flex flex-col items-end">
                                        <span className="text-sm line-through text-blue-400 font-bold">${originalShippingCost.toLocaleString()}</span>
                                        <span className="text-green-600 font-[1000] text-xl flex items-center gap-1"><Crown size={16}/> GRATIS</span>
                                    </div>
                                ) : (
                                    <span className="text-2xl font-[1000] text-blue-600 tracking-tighter">${shippingCost.toLocaleString()}</span>
                                )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex gap-4 mt-8">
                      <button onClick={() => setStep(1)} className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-widest hover:bg-neutral-100 rounded-2xl transition-colors">Volver</button>
                      <button onClick={() => setStep(3)} className="flex-1 bg-black text-white py-4 rounded-2xl font-[1000] text-sm uppercase tracking-widest hover:bg-[#FDCB02] hover:text-black transition-all shadow-lg">Guardar Logística</button>
                    </div>
                </motion.div>
              )}

              {/* ── PASO 3: Facturación ── */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-[#FDCB02] rounded-lg flex items-center justify-center text-black"><FileText size={16} strokeWidth={2.5}/></div>
                      <h2 className="text-xl font-[1000] uppercase tracking-tight text-black">Facturación</h2>
                    </div>
                    <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 mb-8 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-black text-sm">¿Requieres Comprobante Fiscal (CFDI)?</h4>
                        <p className="text-xs text-neutral-500 mt-1">El IVA (16%) se agregará automáticamente al total.</p>
                      </div>
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
                      <button onClick={() => preparePayment('stripe')} disabled={isProcessing} className="flex-1 bg-black text-white py-4 rounded-2xl font-[1000] text-sm uppercase tracking-widest hover:bg-[#FDCB02] hover:text-black transition-all shadow-lg disabled:opacity-50 flex justify-center items-center gap-2">
                        {isProcessing ? (<>Conectando... <Loader2 size={18} className="animate-spin"/></>) : ("Ir a la Bóveda de Pago")}
                      </button>
                    </div>
                </motion.div>
              )}

              {/* ── PASO 4: PAGO (Stripe + Financiamiento) ── */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  
                  {/* ── SECCIÓN STRIPE ── */}
                  {clientSecret && (
                    <div className="bg-[#111] p-8 rounded-3xl border border-neutral-800 shadow-2xl">
                      <Elements 
                        stripe={stripePromise} 
                        options={{ 
                          clientSecret,
                          appearance: {
                            theme: 'night',
                            variables: {
                              colorPrimary: '#FDCB02',
                              colorBackground: '#050505',
                              colorText: '#ffffff',
                              colorDanger: '#ef4444',
                              fontFamily: 'system-ui, sans-serif',
                              borderRadius: '12px',
                            },
                            rules: {
                              '.Input': { border: '1px solid #333', boxShadow: 'none' },
                              '.Input:focus': { border: '1px solid #FDCB02' },
                              '.Label': { fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem', color: '#888' },
                              '.Tab': { border: '1px solid #333', backgroundColor: '#111' },
                              '.Tab:hover': { backgroundColor: '#1a1a1a' },
                              '.Tab--selected': { border: '1px solid #FDCB02', backgroundColor: '#1a1000' },
                            }
                          }
                        }}
                      >
                        <StripeCheckoutForm amount={total} orderId={currentOrderId} clearCart={clearCart} />
                      </Elements>
                    </div>
                  )}

                  {/* ══ SEPARADOR FINANCIAMIENTO ══ */}
                  <div className="relative flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-neutral-300"></div>
                    <div className="flex items-center gap-2 bg-white border-2 border-dashed border-neutral-300 rounded-full px-4 py-2 shrink-0">
                      <Zap size={14} className="text-[#FDCB02] fill-[#FDCB02]"/>
                      <span className="text-[11px] font-[1000] uppercase tracking-widest text-neutral-500">
                        O paga con financiamiento
                      </span>
                      <Zap size={14} className="text-[#FDCB02] fill-[#FDCB02]"/>
                    </div>
                    <div className="flex-1 h-px bg-neutral-300"></div>
                  </div>

                  {/* Financing Banner */}
                  <div className="bg-gradient-to-br from-[#0a0a0a] to-[#111827] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="p-6 pb-0">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <BadgePercent size={20} className="text-[#FDCB02]"/>
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FDCB02]">
                              Financiamiento Disponible
                            </span>
                          </div>
                          <h2 className="text-2xl font-[1000] uppercase text-white tracking-tighter leading-tight">
                            Divide tu pago<br/>
                            <span className="text-[#FDCB02]">hasta en 36 cuotas</span>
                          </h2>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-right shrink-0">
                          <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-1 justify-end">
                            <Calendar size={10}/> Desde
                          </p>
                          <p className="text-2xl font-[1000] text-white leading-none">
                            ${Math.ceil(total / 12).toLocaleString()}
                          </p>
                          <p className="text-[9px] text-neutral-400 mt-0.5">/ mes · 12 cuotas</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pb-5 border-b border-white/5">
                        {FINANCING_PROVIDERS.map(p => (
                          <div 
                            key={p.id}
                            className="flex-1 h-9 rounded-xl flex items-center justify-center text-xs font-black uppercase tracking-tight transition-all"
                            style={{ 
                              backgroundColor: selectedFinancingProvider === p.id ? p.color : '#1a1a1a',
                              color: selectedFinancingProvider === p.id ? 'white' : '#555'
                            }}
                          >
                            {p.icon} <span className="ml-1.5 hidden sm:inline">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-6">
                      <FinancingSection 
                        total={total}
                        orderId={currentOrderId}
                        selectedProvider={selectedFinancingProvider}
                        onSelectProvider={setSelectedFinancingProvider}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => setStep(3)} 
                    className="text-neutral-500 text-sm font-bold uppercase tracking-widest hover:text-black transition-colors flex items-center gap-2 pt-2"
                  >
                    <ArrowLeft size={14}/> Cambiar datos de factura
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── SIDEBAR: Resumen de Orden ── */}
          <div className="lg:col-span-5">
             <div className="bg-[#0a0a0a] text-white p-8 rounded-3xl shadow-2xl sticky top-28 border border-white/10">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                  <h3 className="text-xl font-[1000] uppercase tracking-tighter">Resumen de Orden</h3>
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><ShoppingBag size={18} className="text-[#FDCB02]"/></div>
                </div>
                
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
                
                <div className="space-y-4 pt-6 border-t border-white/10">
                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-400">Subtotal Mercancía</span>
                        <span className="font-bold text-white">${subtotal.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                        <span className="text-neutral-400 flex items-center gap-2"><Package size={14} className="text-neutral-500"/> Tarifa de Colocación</span>
                        <span className="font-bold text-white">${freightCost.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-sm items-center">
                        <span className="text-neutral-400 flex items-center gap-2">
                          {selectedLogistics === 'coyote' ? <Factory size={14} className="text-[#FDCB02]"/> : <Map size={14} className="text-blue-400"/>}
                          Logística {selectedLogistics === 'coyote' ? 'Coyote' : skydropxCarrier}
                        </span>
                        <div className="text-right flex items-center gap-2">
                            {isFreeShipping && originalShippingCost > 0 ? (
                                <>
                                    <span className="text-xs text-neutral-500 line-through">${originalShippingCost.toLocaleString()}</span>
                                    <span className="font-bold text-black bg-[#FDCB02] px-2 py-0.5 rounded uppercase tracking-widest text-[9px]">Socio Elite</span>
                                </>
                            ) : (
                                <span className="font-bold text-white">${shippingCost.toLocaleString()}</span>
                            )}
                        </div>
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

                    <div className="flex justify-between items-end pt-6 border-t border-white/10 mt-4">
                        <div>
                          <span className="font-black uppercase text-[10px] text-neutral-500 tracking-widest block mb-1">Monto a Pagar</span>
                          <span className="text-xs text-neutral-400">MXN</span>
                        </div>
                        <span className="font-[1000] text-4xl leading-none text-[#FDCB02] drop-shadow-[0_0_15px_rgba(253,203,2,0.2)]">${total.toLocaleString()}</span>
                    </div>

                    <AnimatePresence>
                      {step === 4 && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }} 
                          animate={{ opacity: 1, height: 'auto' }} 
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-4 border-t border-white/5"
                        >
                          <p className="text-[9px] text-neutral-600 uppercase tracking-widest font-black mb-3 flex items-center gap-1">
                            <Sparkles size={10} className="text-[#FDCB02]"/> Opciones de financiamiento
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {[3, 6, 12, 24].map(months => (
                              <div key={months} className="bg-white/5 rounded-xl px-3 py-2 text-center border border-white/5">
                                <div className="text-[#FDCB02] font-[1000] text-base leading-none">{months}x</div>
                                <div className="text-white text-xs font-bold mt-0.5">${Math.ceil(total / months).toLocaleString()}</div>
                                <div className="text-neutral-600 text-[9px] font-bold uppercase">mes</div>
                              </div>
                            ))}
                          </div>
                          <p className="text-[8px] text-neutral-700 text-center mt-2">Sujeto a aprobación. Términos según proveedor.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                </div>
             </div>
          </div>
        </div>
      </div>

      <style jsx>{`
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
        
        .custom-scrollbar-dark::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar-dark::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background: #555; }
      `}</style>
    </div>
  );
}