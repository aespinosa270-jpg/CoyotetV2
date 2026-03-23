'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCart } from '@/lib/context/cart-context';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements, PaymentElement, LinkAuthenticationElement,
  useStripe, useElements,
} from '@stripe/react-stripe-js';
import {
  User, MapPin, Phone, Mail, ArrowLeft, ShoppingBag, Truck, Package,
  Info, FileText, CheckCircle2, Factory, Map, ChevronRight, Loader2, Crown, ShieldCheck,
  Sparkles, Landmark, ChevronDown, ExternalLink, Calendar,
  Zap, Copy, Clock, Smartphone, AlertCircle, CreditCard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PointsPanel, { calcularPuntosGanados, calcularDescuentoPuntos } from '@/components/checkout/points-panel';

// ─── Stripe ─────────────────────────────────────────────────────────────────
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ─── Types ───────────────────────────────────────────────────────────────────
type LogisticsMethod   = 'coyote' | 'skydropx';
type PaymentStage      = 'select' | 'stripe' | 'financing';
type FinancingProvider = 'aplazo' | 'kapital' | null;
type MembershipTier    = 'NONE' | 'GOLD' | 'BLACK' | 'ELITE';

interface SessionUserExtended {
  name?:           string | null;
  email?:          string | null;
  image?:          string | null;
  membershipTier?: MembershipTier;
  points?:         number;
}

// ─── Logistics constants ─────────────────────────────────────────────────────
const DIESEL_PRICE_PER_LITER = 27.00;
const LITERS_PER_100KM       = 20.0;
const OPERATIONAL_MARKUP     = 4;
const FIXED_SERVICE_FEE      = 175;
const MAX_ROLLS_PER_VEHICLE  = 80;

// ─── Financing providers ─────────────────────────────────────────────────────
const FINANCING_PROVIDERS = [
  {
    id:            'aplazo' as const,
    name:          'Aplazo',
    tagline:       'Paga en mensualidades sin intereses',
    color:         '#059669',
    accentColor:   '#34D399',
    bgGradient:    'from-[#059669]/10 to-[#064E3B]/5',
    borderColor:   'border-emerald-500/30',
    activeBorder:  'border-emerald-500',
    activeBg:      'bg-emerald-950/30',
    icon:          '💚',
    maxInstallments: 24,
    minAmount:     500,
    perks:         ['0% de interés disponible', 'Meses sin intereses', 'Hasta 24 MSI'],
    badge:         'MSI',
    badgeColor:    'bg-emerald-500',
  },
  {
    id:            'kapital' as const,
    name:          'Kapital Bank',
    tagline:       'Crédito empresarial flexible',
    color:         '#D97706',
    accentColor:   '#FBBF24',
    bgGradient:    'from-[#D97706]/10 to-[#78350F]/5',
    borderColor:   'border-amber-500/30',
    activeBorder:  'border-amber-500',
    activeBg:      'bg-amber-950/30',
    icon:          '🏦',
    maxInstallments: 36,
    minAmount:     5000,
    perks:         ['Para empresas y negocios', 'Línea de crédito revolvente', 'Hasta 36 meses'],
    badge:         'Empresas',
    badgeColor:    'bg-amber-600',
  },
];

// ─── OXXO Voucher ─────────────────────────────────────────────────────────────
function OxxoVoucher({ voucher, amount, expiresAt }: { voucher: string; amount: number; expiresAt: number }) {
  const [copied, setCopied] = useState(false);
  const expDate = new Date(expiresAt * 1000).toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const handleCopy = () => {
    void navigator.clipboard.writeText(voucher);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-[#fff9e6] border-2 border-[#FDCB02] rounded-3xl overflow-hidden">
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
          <button onClick={handleCopy}
            className="w-10 h-10 bg-[#FDCB02] hover:bg-black hover:text-[#FDCB02] text-black rounded-xl flex items-center justify-center transition-all shrink-0">
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
          <p className="text-xs text-orange-700 font-bold">
            Válido hasta el <span className="capitalize">{expDate}</span>. Pasada esa fecha la referencia expira.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── SPEI instructions ────────────────────────────────────────────────────────
function SpeiInstructions({ clabe, bankName, amount }: { clabe: string; bankName: string; amount: number }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard.writeText(clabe);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-blue-950 to-blue-900 border border-blue-700 rounded-3xl overflow-hidden">
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
          <button onClick={handleCopy}
            className="w-10 h-10 bg-blue-600 hover:bg-[#FDCB02] hover:text-black text-white rounded-xl flex items-center justify-center transition-all shrink-0">
            {copied ? <CheckCircle2 size={18}/> : <Copy size={18}/>}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {([['Banco', bankName], ['Moneda', 'MXN - Pesos'], ['Concepto', 'Pedido Coyote'], ['Tiempo', '24-48 hrs hábiles']] as [string,string][]).map(([label, value]) => (
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

// ─── Financing section ────────────────────────────────────────────────────────
function FinancingSection({
  total, orderId, selectedProvider, onSelectProvider,
}: {
  total: number; orderId: string;
  selectedProvider: FinancingProvider;
  onSelectProvider: (id: FinancingProvider) => void;
}) {
  const [expandedProvider, setExpandedProvider] = useState<FinancingProvider>(null);
  const [isRedirecting, setIsRedirecting]       = useState(false);
  const [redirectError, setRedirectError]       = useState<string | null>(null);

  const provider = FINANCING_PROVIDERS.find(p => p.id === selectedProvider) ?? null;

  const handleFinancingRedirect = async () => {
    if (!provider || !orderId) return;
    setIsRedirecting(true);
    setRedirectError(null);
    try {
      const res = await fetch('/api/financing/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, provider: provider.id, amount: total }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { checkoutUrl?: string; error?: string };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.error ?? 'No se obtuvo URL de financiamiento.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el financiador.';
      setRedirectError(msg);
      setIsRedirecting(false);
    }
  };

  const getInstallmentPreview = (p: typeof FINANCING_PROVIDERS[0]) =>
    [3, 6, 12].filter(m => m <= p.maxInstallments).map(months => ({
      months, amount: Math.ceil(total / months),
    }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-[#FDCB02]"/>
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
            <div key={p.id}
              onClick={() => { onSelectProvider(p.id); setExpandedProvider(isExpanded ? null : p.id); }}
              className={'rounded-2xl border-2 transition-all duration-300 overflow-hidden cursor-pointer ' +
                (isSelected ? p.activeBorder + ' ' + p.activeBg : p.borderColor + ' bg-white/5 hover:bg-white/10')}
            >
              <div className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 transition-all"
                  style={{ backgroundColor: isSelected ? p.color : '#1a1a1a' }}>
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-[1000] text-white text-sm uppercase tracking-tight">{p.name}</span>
                    <span className={'text-[9px] font-black uppercase tracking-widest text-white px-2 py-0.5 rounded-full ' + p.badgeColor}>
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 truncate">{p.tagline}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {installments.slice(0, 2).map(({ months, amount }) => (
                      <span key={months} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: isSelected ? `${p.color}30` : '#ffffff10', color: isSelected ? p.accentColor : '#9ca3af' }}>
                        {months}x ${amount.toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: p.color }}>
                      <CheckCircle2 size={12} className="text-white"/>
                    </div>
                  )}
                  <ChevronDown size={16} className={'text-neutral-500 transition-transform duration-300 ' + (isExpanded ? 'rotate-180' : '')}/>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }} className="overflow-hidden">
                    <div className="px-4 pb-4 pt-1 border-t border-white/5">
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
                      <div className="space-y-1.5 mt-3">
                        {p.perks.map(perk => (
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

      {redirectError && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="text-red-400 shrink-0"/>
          <p className="text-xs text-red-400 font-bold">{redirectError}</p>
        </div>
      )}

      <AnimatePresence>
        {selectedProvider && provider && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <button
              onClick={() => void handleFinancingRedirect()}
              disabled={isRedirecting || !orderId}
              className="w-full h-16 rounded-2xl font-[1000] uppercase text-sm tracking-[0.15em] transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 text-white"
              style={{ backgroundColor: provider.color }}
            >
              {isRedirecting ? (
                <>Conectando con {provider.name}... <Loader2 size={18} className="animate-spin"/></>
              ) : (
                <><span>{provider.icon}</span>Continuar con {provider.name}<ExternalLink size={16}/></>
              )}
            </button>
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

// ─── Stripe checkout form ─────────────────────────────────────────────────────
type AsyncPaymentState =
  | { type: 'idle' }
  | { type: 'oxxo';    voucher: string; amount: number; expiresAt: number }
  | { type: 'spei';    clabe: string;   bankName: string; amount: number }
  | { type: 'success' };

function StripeCheckoutForm({ amount, orderId, clearCart }: { amount: number; orderId: string; clearCart: () => void }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [asyncState, setAsyncState]     = useState<AsyncPaymentState>({ type: 'idle' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMessage(submitError.message ?? 'Error al validar el formulario.');
      setIsProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout/success?orderId=${orderId}` },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message ?? 'Ocurrió un error al procesar el pago.');
      setIsProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      clearCart();
      setAsyncState({ type: 'success' });
    } else if (paymentIntent?.status === 'requires_action') {
      const action = paymentIntent.next_action;
      if (action?.type === 'oxxo_display_details') {
        const d = (action as unknown as { oxxo_display_details: { number: string; expires_after: number } }).oxxo_display_details;
        clearCart();
        setAsyncState({ type: 'oxxo', voucher: d.number, amount, expiresAt: d.expires_after });
      } else if (action?.type === 'display_bank_transfer_instructions') {
        type BT = { reference?: string; financial_addresses?: Array<{ spei?: { clabe: string; bank_name?: string } }> };
        const bt = (action as unknown as { display_bank_transfer_instructions: BT }).display_bank_transfer_instructions;
        const mx = bt?.financial_addresses?.[0]?.spei ?? null;
        clearCart();
        setAsyncState({ type: 'spei', clabe: mx?.clabe ?? bt?.reference ?? '-', bankName: mx?.bank_name ?? 'STP', amount });
      } else {
        setErrorMessage('Se requiere una acción adicional. Por favor sigue las instrucciones.');
      }
    }

    setIsProcessing(false);
  };

  if (asyncState.type === 'success') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center py-6">
        <div className="w-20 h-20 bg-[#FDCB02] rounded-full flex items-center justify-center mb-4 shadow-xl shadow-yellow-500/30">
          <CheckCircle2 size={40} className="text-black"/>
        </div>
        <h3 className="text-2xl font-[1000] uppercase text-white tracking-tight mb-2">Pago Confirmado</h3>
        <p className="text-neutral-400 text-sm mb-6">
          Tu pedido <span className="text-[#FDCB02] font-bold">{orderId.slice(-8).toUpperCase()}</span> está en proceso.
        </p>
        <Link href="/" className="bg-[#FDCB02] text-black font-[1000] uppercase text-xs tracking-widest px-8 py-4 rounded-2xl hover:bg-white transition-all">
          Volver al catálogo
        </Link>
      </motion.div>
    );
  }

  if (asyncState.type === 'oxxo') return <OxxoVoucher {...asyncState}/>;
  if (asyncState.type === 'spei') return <SpeiInstructions {...asyncState}/>;

  return (
    <form onSubmit={e => void handleSubmit(e)}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-[1000] uppercase text-white tracking-tighter flex items-center gap-2">
          <ShieldCheck size={22} className="text-[#FDCB02]"/> Bóveda Segura
        </h2>
        {/* Payment method badges */}
        <div className="flex items-center gap-1.5">
          {/* Visa */}
          <div className="w-10 h-6 bg-white rounded-md flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 50 16" className="w-8" fill="none">
              <text x="1" y="13" fontFamily="Arial" fontWeight="900" fontSize="14" fill="#1A1F71" letterSpacing="-0.5">VISA</text>
            </svg>
          </div>
          {/* Mastercard */}
          <div className="w-10 h-6 bg-[#252525] rounded-md flex items-center justify-center shadow-sm overflow-hidden">
            <svg viewBox="0 0 32 20" className="w-8">
              <circle cx="12" cy="10" r="7" fill="#EB001B"/>
              <circle cx="20" cy="10" r="7" fill="#F79E1B"/>
              <path d="M16 4.5a7 7 0 000 11A7 7 0 0016 4.5z" fill="#FF5F00"/>
            </svg>
          </div>
          {/* Amex */}
          <div className="w-10 h-6 bg-[#2557D6] rounded-md flex items-center justify-center shadow-sm">
            <span className="text-white font-black tracking-tight" style={{ fontSize: '9px' }}>AMEX</span>
          </div>
          {/* OXXO */}
          <div className="w-10 h-6 bg-[#DA0000] rounded-md flex items-center justify-center shadow-sm">
            <span className="text-white font-black tracking-tight" style={{ fontSize: '8px' }}>OXXO</span>
          </div>
          {/* SPEI */}
          <div className="w-10 h-6 bg-[#005A30] rounded-md flex items-center justify-center shadow-sm">
            <span className="text-white font-black tracking-tight" style={{ fontSize: '8px' }}>SPEI</span>
          </div>
        </div>
      </div>
      <div className="mb-3 bg-[#0a0a0a] rounded-xl p-1">
        <LinkAuthenticationElement options={{ defaultValues: { email: '' } }}/>
      </div>
      <div className="bg-[#0a0a0a] p-1 rounded-xl">
        <PaymentElement options={{ layout: { type: 'tabs', defaultCollapsed: false, radios: false, spacedAccordionItems: false }, wallets: { applePay: 'auto', googlePay: 'auto' } }}/>
      </div>
      {errorMessage && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider text-center flex items-center gap-2 justify-center">
          <AlertCircle size={14}/> {errorMessage}
        </div>
      )}
      <button disabled={isProcessing || !stripe}
        className="w-full mt-6 bg-[#FDCB02] hover:bg-white text-black h-16 rounded-2xl font-[1000] uppercase text-sm tracking-[0.2em] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
        {isProcessing ? (<>Procesando... <Loader2 size={18} className="animate-spin"/></>) : (`Pagar $${amount.toLocaleString()} MXN`)}
      </button>
      <p className="text-center text-[9px] text-neutral-600 mt-3 uppercase tracking-wider font-bold">
        Cifrado TLS 1.3 - PCI-DSS Nivel 1
      </p>
    </form>
  );
}

// ─── Logistics helper ─────────────────────────────────────────────────────────
function getLogisticsInfo(zipCode: string): { type: 'PENDING' | 'COYOTE_LOCAL' | 'SKYDROPX_NACIONAL'; distance: number } {
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
  if (prefix2 >= 72 && prefix2 <= 75)   return { type: 'COYOTE_LOCAL', distance: 130 };
  if (prefix2 === 62)                    return { type: 'COYOTE_LOCAL', distance: 90 };

  return { type: 'SKYDROPX_NACIONAL', distance: 0 };
}

// ─── Main checkout page ───────────────────────────────────────────────────────
export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { data: session } = useSession();

  const sessionUser       = session?.user as SessionUserExtended | undefined;
  const tier              = sessionUser?.membershipTier ?? 'NONE';
  const puntosDisponibles = sessionUser?.points ?? 0;

  const [mounted, setMounted] = useState(false);
  const [step, setStep]       = useState(1);

  // Payment state
  const [paymentStage, setPaymentStage]                         = useState<PaymentStage>('select');
  const [clientSecret, setClientSecret]                         = useState('');
  const [currentOrderId, setCurrentOrderId]                     = useState('');
  const [selectedFinancingProvider, setSelectedFinancingProvider] = useState<FinancingProvider>(null);

  // Loading
  const [isQuoting, setIsQuoting]           = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Logistics
  const [selectedLogistics, setSelectedLogistics] = useState<LogisticsMethod>('coyote');
  const [coyoteDistanceKm, setCoyoteDistanceKm]   = useState(0);
  const [isLocalZone, setIsLocalZone]             = useState(false);
  const [skydropxRate, setSkydropxRate]           = useState(0);
  const [skydropxCarrier, setSkydropxCarrier]     = useState('Paquetería');
  const [skydropxDays, setSkydropxDays]           = useState(3);

  // Points
  const [puntosUsados, setPuntosUsados] = useState(0);
  const handleTogglePuntos = (usar: boolean, cantidad: number) => setPuntosUsados(usar ? cantidad : 0);

  // Invoice
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [customerData, setCustomerData] = useState({
    name: '', lastName: '', email: '', phone: '',
    street: '', number: '', unit: '', neighborhood: '',
    city: '', state: '', zip: '', reference: '',
  });
  const [fiscalData, setFiscalData] = useState({
    rfc: '', razonSocial: '', regimen: '', usoCFDI: '', cpFiscal: '',
  });

  useEffect(() => { setMounted(true); }, []);

  // ─── Cost calculations ────────────────────────────────────────────────────
  const { freightCost, shippingCost, originalShippingCost, isFreeShipping, vehiclesNeeded, serviceFee, taxIVA, total, totalWeight, totalRolls } =
    useMemo(() => {
      let rollCount = 0;
      let weight = 0;
      items.forEach(item => {
        weight += item.quantity;
        const isRollo = item.unit.toLowerCase().includes('rollo') || item.meta?.mode === 'rollo';
        if (isRollo) rollCount += item.meta?.packages ?? Math.ceil(item.quantity / 25);
        else if (item.quantity >= 25) rollCount += Math.ceil(item.quantity / 25);
      });

      let flete = 0;
      if (weight < 10 && rollCount === 0) flete = 150;
      else {
        const bultos = Math.max(1, rollCount);
        if      (bultos === 1)  flete = 200;
        else if (bultos <= 4)   flete = 250;
        else if (bultos <= 10)  flete = 300;
        else if (bultos <= 15)  flete = 400;
        else if (bultos <= 20)  flete = 500;
        else                    flete = 1000;
      }

      let originalEnvio = 0;
      let requiredVehicles = 1;
      if (selectedLogistics === 'coyote') {
        requiredVehicles = Math.max(1, Math.ceil(rollCount / MAX_ROLLS_PER_VEHICLE));
        const fuelCostPerVehicle = (coyoteDistanceKm * 2 / 100) * LITERS_PER_100KM * DIESEL_PRICE_PER_LITER;
        originalEnvio = fuelCostPerVehicle * OPERATIONAL_MARKUP * requiredVehicles;
      } else {
        originalEnvio = skydropxRate;
      }

      const isFree  = tier === 'ELITE';
      const envio   = isFree ? 0 : originalEnvio;
      const fee     = FIXED_SERVICE_FEE;
      const base    = subtotal + flete + envio + fee;
      const iva     = base * 0.16;

      return {
        freightCost: flete, shippingCost: envio, originalShippingCost: originalEnvio,
        isFreeShipping: isFree, vehiclesNeeded: requiredVehicles, serviceFee: fee,
        taxIVA: iva, total: base + iva, totalWeight: weight, totalRolls: rollCount,
      };
    }, [items, subtotal, selectedLogistics, coyoteDistanceKm, skydropxRate, tier]);

  const descuentoPuntosMXN    = Math.floor(puntosUsados * 0.50);
  const totalConPuntos        = Math.max(0, total - descuentoPuntosMXN);
  const puntosGanadosEnCompra = calcularPuntosGanados(subtotal, tier);

  // ─── Step 1 → 2: validate address + quote shipping ───────────────────────
  const validateStep1 = async () => {
    const { name, email, street, state, city, neighborhood, zip } = customerData;
    if (!name || !email || !street || !state || !city || !neighborhood || zip.length < 5) {
      alert('Por favor completa todos los campos obligatorios.');
      return;
    }
    setIsQuoting(true);
    try {
      const res = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zip_to: zip, state_to: state, city_to: city,
          neighborhood_to: neighborhood, weight: totalWeight, cartItems: items,
        }),
      });
      const data = await res.json() as { success?: boolean; bestQuote?: { amount: number; carrier: string; days: number }; error?: string };

      if (data.success && data.bestQuote && data.bestQuote.amount > 0) {
        setSkydropxRate(data.bestQuote.amount);
        setSkydropxCarrier(data.bestQuote.carrier);
        setSkydropxDays(data.bestQuote.days);
      }

      const logistics = getLogisticsInfo(zip);
      if (logistics.type === 'COYOTE_LOCAL') {
        setCoyoteDistanceKm(logistics.distance);
        setSelectedLogistics('coyote');
        setIsLocalZone(true);
      } else {
        if (!data.success || !data.bestQuote || data.bestQuote.amount <= 0) {
          alert(`No se pudo cotizar el envío para tu zona. ${data.error ?? ''}`);
          setIsQuoting(false);
          return;
        }
        setIsLocalZone(false);
        setSelectedLogistics('skydropx');
      }
      setStep(2);
    } catch {
      alert('Error al calcular el envío. Por favor intenta de nuevo.');
    } finally {
      setIsQuoting(false);
    }
  };

  // ─── Step 3 → 4 ──────────────────────────────────────────────────────────
  const createOrderAndIntent = async () => {
    if (wantsInvoice && (!fiscalData.rfc || !fiscalData.razonSocial || !fiscalData.cpFiscal)) {
      alert('Por favor completa los datos fiscales obligatorios.');
      return;
    }
    setIsCreatingOrder(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount:      totalConPuntos,
          description: `Pedido Coyote - ${totalWeight}kg`,
          items,
          customer:    customerData,
          puntosUsados,
          metadata: {
            freight_cost:    freightCost,
            shipping_cost:   shippingCost,
            service_fee:     FIXED_SERVICE_FEE,
            tax_iva:         taxIVA,
            req_invoice:     wantsInvoice ? 'YES' : 'NO',
            fiscal_data:     wantsInvoice ? JSON.stringify(fiscalData) : null,
            logistics_type:  selectedLogistics,
            vehicles_used:   vehiclesNeeded,
          },
        }),
      });

      const data = await res.json() as {
        success?:      boolean;
        clientSecret?: string;
        orderId?:      string;
        error?:        string;
      };

      if (!data.success || !data.orderId || !data.clientSecret) {
        throw new Error(data.error ?? 'No se pudo preparar el pago.');
      }

      setCurrentOrderId(data.orderId);
      setClientSecret(data.clientSecret);
      setPaymentStage('select');
      setStep(4);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al preparar el pedido.';
      alert(msg);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-[#0a0a0a] border border-white/10 p-12 rounded-3xl flex flex-col items-center text-center max-w-sm">
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
            <ShoppingBag size={40} className="text-neutral-300"/>
          </div>
          <h1 className="text-2xl font-black uppercase text-white tracking-tight mb-2">Caja vacía</h1>
          <p className="text-neutral-400 text-sm mb-8">
            Aún no has agregado productos a tu pedido. Explora el catálogo para comenzar.
          </p>
          <Link href="/" className="w-full bg-[#FDCB02] hover:bg-white text-black font-black uppercase text-xs tracking-widest py-4 rounded-xl transition-all">
            Ir al catálogo
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] pt-24 pb-20 px-4 sm:px-6 font-sans selection:bg-[#FDCB02] selection:text-black">
      <div className="container mx-auto max-w-[1100px]">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="w-10 h-10 bg-white hover:bg-neutral-200 rounded-full flex items-center justify-center transition-colors text-black shadow-sm">
            <ArrowLeft size={18}/>
          </Link>
          <h1 className="text-3xl font-[1000] uppercase text-black tracking-tighter">Finalizar Pedido</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-7 space-y-6">

            {/* Progress bar */}
            <div className="bg-[#0a0a0a] p-6 rounded-3xl border border-white/10">
              <div className="flex justify-between items-center relative z-10">
                {[
                  { num: 1, label: 'Destino',   icon: MapPin },
                  { num: 2, label: 'Logística', icon: Truck },
                  { num: 3, label: 'Factura',   icon: FileText },
                  { num: 4, label: 'Pago',      icon: ShieldCheck },
                ].map(s => (
                  <div key={s.num} className="flex flex-col items-center gap-3 bg-[#0a0a0a] px-2">
                    <div className={'w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500 ' +
                      (step === s.num ? 'bg-black text-[#FDCB02] shadow-lg scale-110' : step > s.num ? 'bg-[#FDCB02] text-black' : 'bg-white/5 text-neutral-600')}>
                      {step > s.num ? <CheckCircle2 size={18}/> : <s.icon size={16}/>}
                    </div>
                    <span className={'text-[10px] uppercase font-bold hidden sm:block tracking-wider ' + (step >= s.num ? 'text-white' : 'text-neutral-600')}>
                      {s.label}
                    </span>
                  </div>
                ))}
                <div className="absolute top-5 left-8 right-8 h-1 bg-white/10 -z-10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FDCB02] transition-all duration-700 ease-in-out"
                    style={{ width: `${((step - 1) / 3) * 100}%` }}/>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">

              {/* ── STEP 1: Contact + Address ── */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="bg-[#0a0a0a] p-8 rounded-3xl border border-white/10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-8 h-8 bg-[#FDCB02] rounded-lg flex items-center justify-center text-black"><User size={16}/></div>
                    <h2 className="text-xl font-[1000] uppercase tracking-tight text-white">Datos de Contacto</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input placeholder="Nombre(s)" maxLength={40} value={customerData.name} className="checkout-input" onChange={e => setCustomerData({ ...customerData, name: e.target.value })}/>
                    <input placeholder="Apellidos" maxLength={40} value={customerData.lastName} className="checkout-input" onChange={e => setCustomerData({ ...customerData, lastName: e.target.value })}/>
                    <div className="relative">
                      <Mail size={18} className="absolute left-4 top-4 text-neutral-400"/>
                      <input placeholder="Correo electrónico" type="email" value={customerData.email} className="checkout-input pl-12" onChange={e => setCustomerData({ ...customerData, email: e.target.value })}/>
                    </div>
                    <div className="relative">
                      <Phone size={18} className="absolute left-4 top-4 text-neutral-400"/>
                      <input placeholder="Teléfono (10 dígitos)" maxLength={10} type="tel" value={customerData.phone} className="checkout-input pl-12" onChange={e => setCustomerData({ ...customerData, phone: e.target.value })}/>
                    </div>
                    <div className="md:col-span-2 mt-4 mb-2 flex items-center gap-3">
                      <div className="h-px bg-white/10 flex-1"/>
                      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1"><MapPin size={12}/> Dirección de Entrega</span>
                      <div className="h-px bg-white/10 flex-1"/>
                    </div>
                    <input placeholder="Calle" maxLength={60} value={customerData.street} className="checkout-input md:col-span-2" onChange={e => setCustomerData({ ...customerData, street: e.target.value })}/>
                    <input placeholder="No. Exterior" maxLength={10} value={customerData.number} className="checkout-input" onChange={e => setCustomerData({ ...customerData, number: e.target.value })}/>
                    <input placeholder="No. Interior (Opcional)" maxLength={10} value={customerData.unit} className="checkout-input" onChange={e => setCustomerData({ ...customerData, unit: e.target.value })}/>
                    <input placeholder="Colonia" value={customerData.neighborhood} className="checkout-input md:col-span-2" onChange={e => setCustomerData({ ...customerData, neighborhood: e.target.value })}/>
                    <input placeholder="Código Postal" value={customerData.zip} maxLength={5} className="checkout-input bg-[#FDCB02]/10 border-[#FDCB02]/30 font-bold" onChange={e => setCustomerData({ ...customerData, zip: e.target.value })}/>
                    <input placeholder="Ciudad" value={customerData.city} className="checkout-input" onChange={e => setCustomerData({ ...customerData, city: e.target.value })}/>
                    <input placeholder="Estado" value={customerData.state} className="checkout-input md:col-span-2" onChange={e => setCustomerData({ ...customerData, state: e.target.value })}/>
                    <input placeholder="Referencias" maxLength={60} value={customerData.reference} className="checkout-input md:col-span-2" onChange={e => setCustomerData({ ...customerData, reference: e.target.value })}/>
                  </div>
                  <button onClick={() => void validateStep1()} disabled={isQuoting}
                    className="w-full mt-8 bg-[#FDCB02] hover:bg-white text-black h-16 rounded-2xl font-[1000] uppercase text-sm tracking-[0.2em] transition-all shadow-xl disabled:opacity-70 flex justify-center items-center gap-2 group">
                    {isQuoting
                      ? (<>Cotizando envío... <Loader2 size={18} className="animate-spin"/></>)
                      : (<>Configurar Envío <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/></>)}
                  </button>
                </motion.div>
              )}

              {/* ── STEP 2: Logistics ── */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="bg-[#0a0a0a] p-8 rounded-3xl border border-white/10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-8 h-8 bg-[#FDCB02] rounded-lg flex items-center justify-center text-black"><Truck size={16}/></div>
                    <h2 className="text-xl font-[1000] uppercase tracking-tight text-white">Logística y Despacho</h2>
                  </div>

                  {isLocalZone && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                      <button onClick={() => setSelectedLogistics('coyote')}
                        className={'relative text-left p-6 rounded-3xl border-2 transition-all duration-300 group ' +
                          (selectedLogistics === 'coyote' ? 'border-[#FDCB02] bg-[#FDCB02]/5 shadow-2xl scale-[1.02]' : 'border-white/10 bg-[#111] hover:border-white/20')}>
                        {selectedLogistics === 'coyote' && (
                          <div className="absolute top-0 right-0 bg-[#FDCB02] text-black text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl">Recomendado</div>
                        )}
                        <div className={'w-12 h-12 rounded-full flex items-center justify-center mb-4 ' + (selectedLogistics === 'coyote' ? 'bg-[#FDCB02]' : 'bg-white/5')}>
                          <Factory size={20} className={selectedLogistics === 'coyote' ? 'text-black' : 'text-neutral-400'}/>
                        </div>
                        <h4 className={'font-[1000] uppercase text-lg mb-1 ' + (selectedLogistics === 'coyote' ? 'text-white' : 'text-black')}>Flotilla Coyote</h4>
                        <p className={'text-xs font-medium flex items-center gap-2 ' + (selectedLogistics === 'coyote' ? 'text-[#FDCB02]' : 'text-neutral-500')}>
                          <CheckCircle2 size={14} className={selectedLogistics === 'coyote' ? 'text-[#FDCB02]' : 'text-neutral-600'}/> Carga de hasta 80 rollos
                        </p>
                      </button>

                      <button onClick={() => setSelectedLogistics('skydropx')}
                        className={'relative text-left p-6 rounded-3xl border-2 transition-all duration-300 ' +
                          (selectedLogistics === 'skydropx' ? 'border-blue-500 bg-blue-950/30 shadow-xl scale-[1.02]' : 'border-white/10 bg-[#111] hover:border-white/20')}>
                        <div className={'w-12 h-12 rounded-full flex items-center justify-center mb-4 ' + (selectedLogistics === 'skydropx' ? 'bg-blue-600' : 'bg-white/5')}>
                          <Map size={20} className={selectedLogistics === 'skydropx' ? 'text-white' : 'text-neutral-400'}/>
                        </div>
                        <h4 className={'font-[1000] uppercase text-lg mb-1 ' + (selectedLogistics === 'skydropx' ? 'text-blue-300' : 'text-white')}>{skydropxCarrier}</h4>
                        <p className={'text-xs font-medium flex items-center gap-2 ' + (selectedLogistics === 'skydropx' ? 'text-blue-400' : 'text-neutral-500')}>
                          <CheckCircle2 size={14} className={selectedLogistics === 'skydropx' ? 'text-blue-400' : 'text-neutral-700'}/> Entrega est. {skydropxDays} días hábiles
                        </p>
                      </button>
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {selectedLogistics === 'coyote' ? (
                      <motion.div key="coyote" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="bg-[#111] rounded-2xl p-6 border border-white/10">
                        <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 flex items-center justify-between gap-4">
                          <div>
                            <label className="block text-[10px] uppercase tracking-widest font-black text-neutral-500 mb-2">Distancia (Ida)</label>
                            <div className="flex items-baseline gap-1">
                              <span className="font-mono text-3xl font-[1000] text-white tracking-tighter">{coyoteDistanceKm}</span>
                              <span className="text-sm font-bold text-neutral-500">KM</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] uppercase tracking-widest font-black text-neutral-500 mb-1">Costo Logístico</span>
                            {isFreeShipping ? (
                              <div className="flex flex-col items-end">
                                <span className="text-sm line-through text-neutral-400 font-bold">${originalShippingCost.toLocaleString()}</span>
                                <span className="text-green-600 font-[1000] text-xl flex items-center gap-1"><Crown size={16}/> GRATIS</span>
                              </div>
                            ) : (
                              <span className="text-2xl font-[1000] text-[#FDCB02] tracking-tighter">${shippingCost.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="sky" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="bg-[#0d1520] rounded-2xl p-6 border border-blue-900/40">
                        <div className="bg-[#0d1520] rounded-2xl p-5 border border-blue-900/20 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest font-black text-neutral-500 mb-1">Peso Bruto</p>
                            <p className="text-lg font-bold text-white">{totalWeight} <span className="text-sm text-neutral-500">KG</span></p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest font-black text-neutral-500 mb-1">Tarifa: {skydropxCarrier}</p>
                            {isFreeShipping ? (
                              <div className="flex flex-col items-end">
                                <span className="text-sm line-through text-blue-400 font-bold">${originalShippingCost.toLocaleString()}</span>
                                <span className="text-green-600 font-[1000] text-xl flex items-center gap-1"><Crown size={16}/> GRATIS</span>
                              </div>
                            ) : (
                              <span className="text-2xl font-[1000] text-blue-400 tracking-tighter">${shippingCost.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-4 mt-8">
                    <button onClick={() => setStep(1)} className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-widest hover:bg-white/5 rounded-2xl transition-colors">
                      Volver
                    </button>
                    <button onClick={() => setStep(3)}
                      className="flex-1 bg-[#FDCB02] text-black py-4 rounded-2xl font-[1000] text-sm uppercase tracking-widest hover:bg-white transition-all shadow-lg">
                      Guardar Logística
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 3: Invoice ── */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="bg-[#0a0a0a] p-8 rounded-3xl border border-white/10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-[#FDCB02] rounded-lg flex items-center justify-center text-black"><FileText size={16}/></div>
                    <h2 className="text-xl font-[1000] uppercase tracking-tight text-white">Facturación</h2>
                  </div>
                  <div className="bg-[#111] p-6 rounded-2xl border border-white/10 mb-8 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">¿Requieres Comprobante Fiscal (CFDI)?</h4>
                      <p className="text-xs text-neutral-400 mt-1">El 16% de IVA se incluye en el total desglosado.</p>
                    </div>
                    <button onClick={() => setWantsInvoice(v => !v)}
                      className={'w-14 h-8 rounded-full p-1 transition-colors duration-300 shadow-inner ' + (wantsInvoice ? 'bg-[#FDCB02]' : 'bg-white/10')}>
                      <div className={'w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ' + (wantsInvoice ? 'translate-x-6' : 'translate-x-0')}/>
                    </button>
                  </div>
                  <AnimatePresence>
                    {wantsInvoice && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
                          <input placeholder="RFC" value={fiscalData.rfc} className="checkout-input font-mono uppercase text-lg" onChange={e => setFiscalData({ ...fiscalData, rfc: e.target.value.toUpperCase() })}/>
                          <input placeholder="Razón Social" value={fiscalData.razonSocial} className="checkout-input uppercase" onChange={e => setFiscalData({ ...fiscalData, razonSocial: e.target.value.toUpperCase() })}/>
                          <select className="checkout-input text-neutral-600 uppercase text-xs font-bold" value={fiscalData.usoCFDI} onChange={e => setFiscalData({ ...fiscalData, usoCFDI: e.target.value })}>
                            <option value="">Uso de CFDI...</option>
                            <option value="G01">G01 - Adquisición de mercancias</option>
                            <option value="G03">G03 - Gastos en general</option>
                          </select>
                          <select className="checkout-input text-neutral-600 uppercase text-xs font-bold" value={fiscalData.regimen} onChange={e => setFiscalData({ ...fiscalData, regimen: e.target.value })}>
                            <option value="">Régimen Fiscal...</option>
                            <option value="601">601 - General de Ley Personas Morales</option>
                            <option value="612">612 - P. Físicas con Actividades</option>
                          </select>
                          <input placeholder="C.P. Fiscal" value={fiscalData.cpFiscal} className="checkout-input md:col-span-2" onChange={e => setFiscalData({ ...fiscalData, cpFiscal: e.target.value })}/>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex gap-4">
                    <button onClick={() => setStep(2)} className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-widest hover:bg-white/5 rounded-2xl transition-colors">
                      Volver
                    </button>
                    <button onClick={() => void createOrderAndIntent()} disabled={isCreatingOrder}
                      className="flex-1 bg-[#FDCB02] text-black py-4 rounded-2xl font-[1000] text-sm uppercase tracking-widest hover:bg-white transition-all shadow-lg disabled:opacity-50 flex justify-center items-center gap-2">
                      {isCreatingOrder
                        ? (<>Preparando pago... <Loader2 size={18} className="animate-spin"/></>)
                        : 'Seleccionar Método de Pago'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 4: Payment ── */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                  {/* Select method */}
                  {paymentStage === 'select' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="bg-[#0a0a0a] p-8 rounded-3xl border border-white/10 space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-[#FDCB02] rounded-lg flex items-center justify-center text-black"><ShieldCheck size={16}/></div>
                        <h2 className="text-xl font-[1000] uppercase tracking-tight text-white">Método de Pago</h2>
                      </div>

                      <button onClick={() => setPaymentStage('stripe')}
                        className="w-full p-6 rounded-2xl border-2 border-white/10 hover:border-[#FDCB02] hover:bg-[#FDCB02]/5 text-white transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/5 text-[#FDCB02] group-hover:bg-[#FDCB02] group-hover:text-black flex items-center justify-center transition-all">
                            <CreditCard size={22}/>
                          </div>
                          <div className="text-left">
                            <p className="font-[1000] uppercase tracking-tight text-sm text-white">Tarjeta / OXXO / SPEI</p>
                            <p className="text-[11px] text-neutral-500 group-hover:text-neutral-300">Apple Pay · Google Pay · OXXO · Transferencia</p>
                          </div>
                        </div>
                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                      </button>

                      <button onClick={() => setPaymentStage('financing')}
                        className="w-full p-6 rounded-2xl border-2 border-white/10 hover:border-[#FDCB02] hover:bg-[#FDCB02]/5 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-xl transition-all group-hover:bg-[#FDCB02]/20">
                            <Sparkles size={22} className="text-[#FDCB02]"/>
                          </div>
                          <div className="text-left">
                            <p className="font-[1000] uppercase tracking-tight text-sm text-white">Financiamiento</p>
                            <p className="text-[11px] text-neutral-500">Aplazo · Kapital Bank · MSI disponibles</p>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-neutral-600 group-hover:text-[#FDCB02] group-hover:translate-x-1 transition-all"/>
                      </button>
                    </motion.div>
                  )}

                  {paymentStage === 'stripe' && clientSecret && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="bg-[#111] p-8 rounded-3xl border border-neutral-800 shadow-2xl">
                      <button onClick={() => setPaymentStage('select')}
                        className="flex items-center gap-2 text-neutral-500 hover:text-white text-xs font-bold uppercase tracking-widest mb-6 transition-colors">
                        <ArrowLeft size={14}/> Cambiar método
                      </button>
                      <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#FDCB02', colorBackground: '#050505', colorText: '#ffffff' } } }}>
                        <StripeCheckoutForm amount={totalConPuntos} orderId={currentOrderId} clearCart={clearCart}/>
                      </Elements>
                    </motion.div>
                  )}

                  {paymentStage === 'financing' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="bg-gradient-to-br from-[#0a0a0a] to-[#111827] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                      <div className="p-6">
                        <button onClick={() => setPaymentStage('select')}
                          className="flex items-center gap-2 text-neutral-500 hover:text-white text-xs font-bold uppercase tracking-widest mb-6 transition-colors">
                          <ArrowLeft size={14}/> Cambiar método
                        </button>
                        <FinancingSection
                          total={totalConPuntos}
                          orderId={currentOrderId}
                          selectedProvider={selectedFinancingProvider}
                          onSelectProvider={setSelectedFinancingProvider}
                        />
                      </div>
                    </motion.div>
                  )}

                  <button onClick={() => setStep(3)}
                    className="text-neutral-500 text-sm font-bold uppercase tracking-widest hover:text-black transition-colors flex items-center gap-2 pt-2">
                    <ArrowLeft size={14}/> Modificar factura
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── RIGHT COLUMN: Order summary ── */}
          <div className="lg:col-span-5">
            <div className="bg-[#0a0a0a] text-white p-8 rounded-3xl shadow-2xl sticky top-28 border border-white/10">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                <h3 className="text-xl font-[1000] uppercase tracking-tighter">Resumen de Orden</h3>
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                  <ShoppingBag size={18} className="text-[#FDCB02]"/>
                </div>
              </div>

              <div className="space-y-5 mb-8 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar-dark">
                {items.map(item => (
                  <div key={item.id} className="flex gap-4 items-start">
                    <div className="relative w-16 h-16 bg-neutral-900 rounded-xl overflow-hidden shrink-0 border border-white/5">
                      <Image src={item.image ?? '/placeholder.jpg'} alt={item.title} fill className="object-cover opacity-80"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">{item.title}</h4>
                      <span className="text-[10px] text-[#FDCB02] font-black uppercase tracking-widest block mt-1">{item.unit}</span>
                      <p className="text-[10px] text-neutral-400 uppercase">Volumen: <span className="text-white">{item.quantity} kg</span></p>
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
                  {isFreeShipping && originalShippingCost > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500 line-through">${originalShippingCost.toLocaleString()}</span>
                      <span className="font-bold text-black bg-[#FDCB02] px-2 py-0.5 rounded uppercase tracking-widest text-[9px]">Elite</span>
                    </div>
                  ) : (
                    <span className="font-bold text-white">${shippingCost.toLocaleString()}</span>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400 flex items-center gap-2"><Info size={14} className="text-neutral-500"/> Tarifa Servicio</span>
                  <span className="font-bold text-white">${serviceFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400 flex items-center gap-2"><Landmark size={14} className="text-neutral-500"/> I.V.A. (16%)</span>
                  <span className="font-bold text-white">${taxIVA.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {session && (
                  <div className="pt-2">
                    <PointsPanel
                      tier={tier}
                      puntosDisponibles={puntosDisponibles}
                      subtotal={subtotal}
                      total={total}
                      puntosUsados={puntosUsados}
                      onToggle={handleTogglePuntos}
                    />
                  </div>
                )}

                <AnimatePresence>
                  {puntosUsados > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="flex justify-between text-sm items-center bg-[#FDCB02]/10 border border-[#FDCB02]/30 rounded-xl px-3 py-2">
                      <span className="text-[#FDCB02] font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Zap size={12} fill="currentColor"/> Descuento {puntosUsados} pts
                      </span>
                      <span className="font-[1000] text-[#FDCB02]">-${descuentoPuntosMXN.toLocaleString()}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-between items-end pt-6 border-t border-white/10 mt-4">
                  <div>
                    <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-black mb-1">Total a Pagar</p>
                    <AnimatePresence mode="wait">
                      <motion.span key={totalConPuntos} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 6, opacity: 0 }}
                        className="font-[1000] text-4xl text-[#FDCB02] block">
                        ${totalConPuntos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  {session && (
                    <div className="text-right">
                      <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-black mb-1">Ganarás</p>
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-lg font-[1000] text-[#FDCB02]">+{puntosGanadosEnCompra}</span>
                        <span className="text-[10px] text-neutral-500 font-bold">pts</span>
                      </div>
                      <p className="text-[9px] text-neutral-600">${calcularDescuentoPuntos(puntosGanadosEnCompra)} MXN futuros</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        .checkout-input {
          width: 100%;
          background-color: #111111;
          border: 2px solid rgba(255,255,255,0.08);
          padding: 1rem 1.25rem;
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #ffffff;
          outline: none;
          transition: all 0.3s ease;
        }
        .checkout-input::placeholder {
          color: #444444;
        }
        .checkout-input:focus {
          border-color: #FDCB02;
          background-color: #1a1a1a;
        }
        .checkout-input option {
          background-color: #111111;
          color: #ffffff;
        }
      `}</style>
    </div>
  );
}