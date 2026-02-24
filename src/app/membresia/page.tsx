'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Fingerprint, Shield, Zap, QrCode,
  Loader2, X, CreditCard, Building2, Store, Lock,
  ChevronRight, ChevronLeft, Check, Sparkles, Crown
} from 'lucide-react';
import Script from 'next/script';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIPOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
declare global { interface Window { OpenPay: any; } }

const fmx = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PLANES — cada uno tiene su propio ADN visual
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const PLANS = [
  {
    id: 0, key: 'BASE', name: 'Acceso Inicial', price: 0,
    planId: null,
    // Material: aluminio cepillado frío
    cardBg: 'linear-gradient(135deg, #e8e8e8 0%, #c8c8c8 40%, #a0a0a0 70%, #d4d4d4 100%)',
    cardSheen: 'linear-gradient(105deg, rgba(255,255,255,0.6) 0%, transparent 40%, rgba(255,255,255,0.2) 100%)',
    ambientColor: 'rgba(200,200,200,0.08)',
    numberColor: '#555',
    nameColor: '#333',
    tagColor: '#888',
    accentLine: '#aaa',
    tag: 'STANDARD',
    features: [
      '0.5 pts por cada $100 MXN',
      'Acceso a catálogo global',
      'Panel de historial básico',
      'Sin acceso a apartados',
    ],
  },
  {
    id: 1, key: 'GOLD', name: 'Socio Comercial', price: 499,
    planId: 'p83a2hxbhkfdqkpouz0h',
    recommended: true,
    // Material: oro 24k con reflejos cálidos
    cardBg: 'linear-gradient(135deg, #ffd700 0%, #fdcb02 25%, #e8a800 55%, #ffd000 75%, #c89000 100%)',
    cardSheen: 'linear-gradient(115deg, rgba(255,255,255,0.75) 0%, transparent 35%, rgba(255,220,50,0.35) 65%, transparent 100%)',
    ambientColor: 'rgba(253,203,2,0.15)',
    numberColor: '#5a3800',
    nameColor: '#3d2600',
    tagColor: '#7a5200',
    accentLine: 'rgba(255,200,0,0.6)',
    tag: 'PRIORITY',
    features: [
      '10% descuento en textiles',
      '7 días de apartado garantizado',
      '3 colocaciones sin costo/mes',
      '1 punto por cada $100 MXN',
    ],
  },
  {
    id: 2, key: 'BLACK', name: 'Socio Ejecutivo', price: 799,
    planId: 'pkkvsgtvhz2hk8xyqtnp',
    // Material: carbono tejido + titanio
    cardBg: 'linear-gradient(135deg, #2a2a2a 0%, #111 40%, #1e1e1e 70%, #0a0a0a 100%)',
    cardSheen: 'linear-gradient(110deg, rgba(255,255,255,0.12) 0%, transparent 40%, rgba(255,255,255,0.05) 100%)',
    ambientColor: 'rgba(255,255,255,0.05)',
    numberColor: '#888',
    nameColor: '#ccc',
    tagColor: '#666',
    accentLine: 'rgba(255,255,255,0.2)',
    tag: 'EXECUTIVE',
    features: [
      '15% descuento en textiles',
      '6 colocaciones sin costo/mes',
      '2 puntos por cada $100 MXN',
      'Prioridad en paquetería',
      'Muestrarios gratis',
    ],
  },
  {
    id: 3, key: 'ELITE', name: 'Master Partner', price: 1129,
    planId: 'phlugox3vwsbvbsi1nxf',
    // Material: cerámica con destellos iridiscentes
    cardBg: 'linear-gradient(135deg, #0d1b2a 0%, #1a3a5c 30%, #0d2137 60%, #071420 100%)',
    cardSheen: 'linear-gradient(115deg, rgba(100,220,255,0.25) 0%, transparent 30%, rgba(50,150,255,0.15) 60%, rgba(100,220,255,0.08) 100%)',
    ambientColor: 'rgba(50,180,255,0.10)',
    numberColor: '#4a9fd4',
    nameColor: '#8dd4f0',
    tagColor: '#2a7aaa',
    accentLine: 'rgba(80,180,255,0.4)',
    tag: 'ELITE',
    features: [
      '15% dto + envío local gratis',
      '15 días de apartado',
      '4 puntos por cada $100 MXN',
      'Acceso anticipado 30 días',
      'Gerente de cuenta dedicado',
    ],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TARJETA PREMIUM — con tilt 3D reactivo al cursor
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function PremiumCard({
  plan, isActive, offset, onClick, index,
}: {
  plan: typeof PLANS[0]; isActive: boolean; offset: number; onClick: () => void; index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], ['12deg', '-12deg']), { stiffness: 300, damping: 30 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], ['-12deg', '12deg']), { stiffness: 300, damping: 30 });
  const sheenX = useTransform(mx, [-0.5, 0.5], ['0%', '100%']);
  const sheenY = useTransform(my, [-0.5, 0.5], ['0%', '100%']);

  const handleMove = (e: React.MouseEvent) => {
    if (!isActive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleLeave = () => { mx.set(0); my.set(0); };

  const stackZ  = isActive ? 40 : 10 - Math.abs(offset);
  const stackX  = isActive ? 0 : offset * 55;
  const stackY  = isActive ? 0 : Math.abs(offset) * 30 + offset * 10;
  const stackRX = isActive ? 0 : 28 + Math.abs(offset) * 6;
  const sc      = isActive ? 1.08 : 0.80 - Math.abs(offset) * 0.05;
  const opac    = isActive ? 1 : 0.45 - Math.abs(offset) * 0.15;

  return (
    <motion.div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ zIndex: stackZ, rotateX: isActive ? rx : stackRX, rotateY: isActive ? ry : 0 }}
      animate={{ x: stackX, y: stackY, scale: sc, opacity: opac, filter: isActive ? 'brightness(1)' : 'brightness(0.4) blur(1.5px)' }}
      transition={{ type: 'spring', stiffness: 90, damping: 22 }}
      className="absolute cursor-pointer"
      whileHover={!isActive ? { scale: sc + 0.03, opacity: opac + 0.15 } : {}}
    >
      {/* Resplandor ambiental por debajo */}
      {isActive && (
        <motion.div
          className="absolute -inset-8 rounded-3xl blur-3xl pointer-events-none"
          style={{ background: plan.ambientColor }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* La tarjeta */}
      <div
        className="relative w-[300px] h-[188px] lg:w-[480px] lg:h-[300px] rounded-[20px] overflow-hidden"
        style={{
          background: plan.cardBg,
          boxShadow: isActive
            ? `0 50px 100px rgba(0,0,0,0.6), 0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)`
            : '0 20px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Sheen dinámico (sigue el cursor) */}
        {isActive && (
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-[20px]"
            style={{
              background: plan.cardSheen,
              backgroundPosition: `${sheenX}% ${sheenY}%`,
              backgroundSize: '200% 200%',
              mixBlendMode: 'overlay',
            }}
          />
        )}

        {/* Textura diagonal sutil */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 8px)' }}
        />

        {/* Contenido de la tarjeta */}
        <div className="relative h-full p-6 lg:p-9 flex flex-col justify-between">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2.5">
              {/* Logo holográfico */}
              <div className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center"
                style={{ background: `rgba(0,0,0,0.18)`, backdropFilter: 'blur(4px)', border: `1px solid ${plan.accentLine}` }}>
                <span className="font-black text-[11px] tracking-tighter" style={{ color: plan.nameColor }}>CY</span>
              </div>
              <span className="font-black text-[11px] lg:text-xs uppercase tracking-[0.18em]" style={{ color: plan.tagColor }}>COYOTE TEXTIL</span>
            </div>
            <div className="border rounded px-2 py-0.5 text-[7px] lg:text-[8px] font-black uppercase tracking-[0.2em]"
              style={{ borderColor: plan.accentLine, color: plan.tagColor }}>
              {plan.tag}
            </div>
          </div>

          {/* Key name enorme */}
          <div className="text-center">
            <span
              className="leading-none select-none"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 'clamp(56px, 10vw, 112px)',
                color: plan.nameColor,
                letterSpacing: '0.04em',
                textShadow: isActive ? `0 2px 20px ${plan.ambientColor}` : 'none',
              }}
            >
              {plan.key}
            </span>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[7px] lg:text-[8px] font-black uppercase tracking-[0.22em] mb-1" style={{ color: plan.tagColor }}>ACCESS ID</p>
              <div className="flex items-center gap-1.5">
                <Fingerprint size={10} style={{ color: plan.numberColor }} />
                <span className="font-mono text-[10px] lg:text-xs font-bold" style={{ color: plan.numberColor }}>
                  MX-{plan.id}9-2026
                </span>
              </div>
            </div>
            {/* Chip EMV realista */}
            <div className="w-10 h-8 lg:w-12 lg:h-9 rounded-md overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.2), rgba(0,0,0,0.1))', border: `1px solid ${plan.accentLine}` }}>
              <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-px p-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="rounded-[1px]" style={{ background: i % 2 === 0 ? plan.accentLine : 'transparent', opacity: 0.6 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODAL DE PAGO — vault de seguridad
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function PaymentVault({
  plan, price, billing, onClose, onProcess, loading, error, openPayReady,
}: {
  plan: typeof PLANS[0]; price: number; billing: string;
  onClose: () => void; onProcess: (method: string, card: any) => void;
  loading: boolean; error: string; openPayReady: boolean;
}) {
  const [method, setMethod]   = useState<'card' | 'spei' | 'store'>('card');
  const [card,   setCard]     = useState({ holder:'', number:'', expMonth:'', expYear:'', cvv:'' });
  const [flip,   setFlip]     = useState(false);

  const METHODS = [
    { id:'card',         label:'Tarjeta', icon:CreditCard },
    { id:'spei',         label:'SPEI',    icon:Building2 },
    { id:'store',        label:'Efectivo',icon:Store },
  ] as const;

  const formatCardNum = (v: string) => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(28px)' }}
    >
      {/* Halo del plan seleccionado */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <motion.div
          className="w-[800px] h-[800px] rounded-full blur-[200px] opacity-15"
          style={{ background: plan.ambientColor }}
          animate={{ scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        initial={{ scale: 0.88, y: 32, filter: 'blur(8px)' }}
        animate={{ scale: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ scale: 0.9, y: 16, filter: 'blur(4px)' }}
        transition={{ type: 'spring', damping: 26, stiffness: 200 }}
        className="relative w-full max-w-md z-10"
      >
        {/* Borde del plan */}
        <div className="absolute -inset-px rounded-[2rem] pointer-events-none" style={{ background: `linear-gradient(135deg, ${plan.accentLine}, transparent, ${plan.accentLine})`, opacity: 0.4 }} />

        <div className="bg-[#080808] rounded-[2rem] overflow-hidden border border-white/[0.07]">

          {/* Header vault */}
          <div className="px-7 pt-7 pb-5 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <Shield size={15} className="text-green-400" />
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Pago Seguro · OpenPay</p>
              </div>
              <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '26px', letterSpacing: '0.04em' }} className="text-white leading-none">
                Plan <span style={{ color: plan.nameColor === '#3d2600' ? '#FDCB02' : plan.nameColor }}>{plan.key}</span>
              </p>
              <p className="text-[11px] text-white/30 font-semibold mt-0.5">
                {fmx(price)} MXN · {billing === 'annual' ? 'anual' : 'mensual'}
              </p>
            </div>
            <button
              onClick={() => !loading && onClose()}
              className="w-10 h-10 rounded-full bg-white/[0.05] hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-7 space-y-5">
            {/* Selector de método */}
            <div className="grid grid-cols-3 gap-1.5 bg-white/[0.03] rounded-2xl p-1.5 border border-white/[0.05]">
              {METHODS.map(m => (
                <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                  className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${method === m.id
                    ? 'bg-white text-black shadow-lg'
                    : 'text-white/25 hover:text-white/60'
                  }`}
                >
                  <m.icon size={12} />{m.label}
                </button>
              ))}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
                  className="bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-[10px] font-bold uppercase tracking-wide flex items-center gap-2"
                >
                  <Zap size={12} />{error}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {method === 'card' && (
                <motion.div key="card" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} className="space-y-3">
                  {/* Mini preview de tarjeta */}
                  <div className="relative h-28 rounded-xl overflow-hidden mb-4" style={{ background: plan.cardBg }}>
                    <div className="absolute inset-0" style={{ background: plan.cardSheen, mixBlendMode: 'overlay' }} />
                    <div className="absolute inset-0 p-4 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <span className="font-black text-[10px] tracking-widest" style={{ color: plan.tagColor }}>COYOTE TEXTIL</span>
                        <CreditCard size={16} style={{ color: plan.numberColor }} />
                      </div>
                      <div>
                        <p className="font-mono text-sm tracking-[0.18em]" style={{ color: plan.nameColor, fontFamily: 'JetBrains Mono, monospace' }}>
                          {card.number || '•••• •••• •••• ••••'}
                        </p>
                        <div className="flex justify-between mt-1">
                          <p className="text-[10px] font-bold uppercase" style={{ color: plan.tagColor }}>
                            {card.holder || 'TITULAR'}
                          </p>
                          <p className="text-[10px] font-mono" style={{ color: plan.numberColor }}>
                            {card.expMonth || 'MM'}/{card.expYear || 'AA'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Campos */}
                  {[
                    { placeholder: 'NOMBRE DEL TITULAR', key: 'holder', type:'text', col: 'full', upper: true },
                  ].map(f => (
                    <input key={f.key} type={f.type} placeholder={f.placeholder}
                      value={(card as any)[f.key]}
                      onChange={e => setCard({ ...card, [f.key]: f.upper ? e.target.value.toUpperCase() : e.target.value })}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white font-bold text-sm uppercase placeholder:text-white/15 outline-none focus:border-white/30 transition-colors"
                    />
                  ))}
                  <input
                    placeholder="0000 0000 0000 0000"
                    value={card.number}
                    maxLength={19}
                    onChange={e => setCard({ ...card, number: formatCardNum(e.target.value) })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white font-mono text-lg tracking-widest placeholder:text-white/15 outline-none focus:border-white/30 transition-colors"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { placeholder:'MM', key:'expMonth', maxLength:2 },
                      { placeholder:'AA', key:'expYear', maxLength:2 },
                      { placeholder:'CVV', key:'cvv', maxLength:4, pass:true },
                    ].map(f => (
                      <div key={f.key} onFocus={() => f.pass && setFlip(true)} onBlur={() => f.pass && setFlip(false)}>
                        <input type={f.pass ? 'password' : 'text'} placeholder={f.placeholder} maxLength={f.maxLength}
                          value={(card as any)[f.key]}
                          onChange={e => setCard({ ...card, [f.key]: e.target.value })}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-3.5 text-white font-mono text-center text-base placeholder:text-white/15 outline-none focus:border-white/30 transition-colors"
                          style={{ fontFamily: 'JetBrains Mono, monospace' }}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {(method === 'spei' || method === 'store') && (
                <motion.div key={method} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
                  className="py-10 flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border"
                    style={{ background: plan.ambientColor, borderColor: plan.accentLine }}>
                    {method === 'spei' ? <Building2 size={26} style={{ color: plan.nameColor }} /> : <Store size={26} style={{ color: plan.nameColor }} />}
                  </div>
                  <p className="text-white/70 text-sm font-medium max-w-xs leading-relaxed">
                    {method === 'spei'
                      ? 'Generaremos una CLABE única. Tu membresía se activa automáticamente al confirmar el depósito.'
                      : 'Recibirás un código de barras válido por 72h para pagar en OXXO o 7-Eleven.'
                    }
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA de pago */}
            <motion.button
              whileHover={{ scale: 1.012 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => onProcess(method, card)}
              disabled={loading}
              className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.18em] text-sm flex items-center justify-center gap-2.5 transition-all duration-300 overflow-hidden relative"
              style={{
                background: loading ? 'rgba(255,255,255,0.08)' : plan.cardBg,
                color: plan.nameColor,
                boxShadow: loading ? 'none' : `0 8px 32px ${plan.ambientColor}`,
              }}
            >
              {!loading && <div className="absolute inset-0" style={{ background: plan.cardSheen, mixBlendMode:'overlay' }} />}
              <span className="relative flex items-center gap-2.5">
                {loading ? <><Loader2 size={16} className="animate-spin text-white/50" /><span className="text-white/40">Procesando…</span></> : (
                  <>{method === 'card' ? <Lock size={14} /> : <Zap size={14} />}
                  {method === 'card' ? `Pagar ${fmx(price)}` : 'Generar referencia'}</>
                )}
              </span>
            </motion.button>

            <p className="text-center text-[9px] text-white/15 font-black uppercase tracking-[0.22em] flex items-center justify-center gap-2">
              <Shield size={10} className="text-green-500/40" />PCI-DSS · TLS 1.3 · OpenPay
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENTE PRINCIPAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function MembershipStack() {
  const { data: session } = useSession();
  const router = useRouter();

  const [activeIdx,   setActiveIdx]   = useState(1);
  const [billing,     setBilling]     = useState<'monthly'|'annual'>('monthly');
  const [mounted,     setMounted]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [showVault,   setShowVault]   = useState(false);
  const [openpayOk,   setOpenpayOk]   = useState(false);
  const [payError,    setPayError]    = useState('');
  const [sdkStep,     setSdkStep]     = useState(0);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => {
      if (typeof window !== 'undefined' && window.OpenPay?.deviceData) {
        window.OpenPay.setId(process.env.NEXT_PUBLIC_OPENPAY_MERCHANT_ID);
        window.OpenPay.setApiKey(process.env.NEXT_PUBLIC_OPENPAY_PUBLIC_KEY);
        window.OpenPay.setSandboxMode(true);
        setOpenpayOk(true);
        setSdkStep(3);
        clearInterval(t);
      }
    }, 300);
    return () => clearInterval(t);
  }, []);

  const plan   = PLANS[activeIdx];
  const isAnn  = billing === 'annual';
  const price  = isAnn ? Math.round(plan.price * 12 * 0.90) : plan.price;
  const savings = Math.round((plan.price * 12) - price);

  const next = useCallback(() => setActiveIdx(p => (p + 1) % PLANS.length), []);
  const prev = useCallback(() => setActiveIdx(p => (p - 1 + PLANS.length) % PLANS.length), []);

  const handleBuy = () => {
    if (!session) { router.push('/cuenta?mode=register'); return; }
    if (plan.price === 0) processCheckout('free', null);
    else { setPayError(''); setShowVault(true); }
  };

  const processCheckout = async (method: string, cardData: any) => {
    setLoading(true); setPayError('');
    try {
      let tokenId    = null;
      let sessionId  = null;

      if (method === 'card') {
        if (!openpayOk) throw new Error('SDK bancario no disponible. Intenta en un momento.');
        sessionId = window.OpenPay.deviceData.setup();
        tokenId   = await new Promise<string>((res, rej) => {
          window.OpenPay.token.create({
            card_number:      cardData.number.replace(/\s/g,''),
            holder_name:      cardData.holder.toUpperCase(),
            expiration_year:  cardData.expYear,
            expiration_month: cardData.expMonth,
            cvv2:             cardData.cvv,
          }, (r: any) => res(r.data.id), (e: any) => rej(e));
        });
      }

      const res  = await fetch('/api/membership/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey: plan.key, price, billingCycle: billing, tokenId, deviceSessionId: sessionId, paymentMethod: method }),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.type === 'payment_reference' && data.payment_info?.url) window.open(data.payment_info.url, '_blank');
        setShowVault(false);
        router.push('/perfil?status=success');
      } else throw new Error(data.error || 'Error en el servidor.');
    } catch (e: any) {
      setPayError(e.data?.description || e.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  // Calcular stacks visibles
  const visiblePlans = PLANS.map((p, i) => {
    let off = i - activeIdx;
    if (off < -PLANS.length / 2) off += PLANS.length;
    if (off > PLANS.length / 2)  off -= PLANS.length;
    return { plan: p, index: i, offset: off };
  }).filter(({ offset }) => Math.abs(offset) <= 1);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;500;700&family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600;700;800&display=swap" />
      <Script src="https://js.openpay.mx/openpay.v1.min.js" strategy="afterInteractive" />
      <Script src="https://js.openpay.mx/openpay-data.v1.min.js" strategy="afterInteractive" />

      <div
        className="h-screen w-full overflow-hidden flex flex-col lg:flex-row select-none relative"
        style={{ background: '#030303', fontFamily: 'Instrument Sans, sans-serif' }}
      >

        {/* ── FONDO REACTIVO ───────────────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Ruido de grano */}
          <div className="absolute inset-0 opacity-[0.028]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: '180px' }}
          />
          {/* Grid de líneas tenues */}
          <div className="absolute inset-0 opacity-[0.022]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '64px 64px' }}
          />
          {/* Halo del plan activo */}
          <AnimatePresence>
            <motion.div
              key={activeIdx}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute top-1/2 left-[30%] -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[280px]"
              style={{ background: plan.ambientColor, mixBlendMode: 'screen' }}
            />
          </AnimatePresence>
        </div>

        {/* ── PANEL IZQUIERDO: STACK DE TARJETAS ───────────────── */}
        <div className="w-full lg:w-1/2 h-[48vh] lg:h-full flex items-center justify-center relative z-20"
          style={{ perspective: '2400px', perspectiveOrigin: '50% 50%' }}>

          {/* Botones nav */}
          {[
            { action: prev, dir: 'left', icon: ChevronLeft },
            { action: next, dir: 'right', icon: ChevronRight },
          ].map(({ action, dir, icon: Icon }) => (
            <button key={dir}
              onClick={action}
              className={`absolute ${dir === 'left' ? 'left-4 lg:left-8' : 'right-4 lg:right-8'} top-1/2 -translate-y-1/2 z-50 flex items-center justify-center transition-all duration-200 group`}
            >
              <div className="w-11 h-11 rounded-full bg-white/[0.05] border border-white/[0.09] flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all duration-200">
                <Icon size={20} className="text-white/50 group-hover:text-black transition-colors" />
              </div>
            </button>
          ))}

          {/* Las tarjetas */}
          <div className="relative w-full h-full flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
            <AnimatePresence initial={false} mode="popLayout">
              {visiblePlans.map(({ plan: p, index, offset }) => (
                <PremiumCard
                  key={p.key}
                  plan={p}
                  isActive={index === activeIdx}
                  offset={offset}
                  onClick={() => setActiveIdx(index)}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Indicadores de posición */}
          <div className="absolute bottom-6 lg:bottom-10 flex gap-2 z-30">
            {PLANS.map((_, i) => (
              <button key={i} onClick={() => setActiveIdx(i)}
                className="transition-all duration-300"
              >
                <motion.div
                  animate={{ width: i === activeIdx ? 28 : 6, opacity: i === activeIdx ? 1 : 0.25 }}
                  className="h-1.5 rounded-full"
                  style={{ background: i === activeIdx ? '#FDCB02' : 'white' }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* ── PANEL DERECHO: DETALLE Y COMPRA ──────────────────── */}
        <div className="w-full lg:w-1/2 h-[52vh] lg:h-full relative z-20 flex flex-col justify-center overflow-hidden">
          {/* Separador vertical */}
          <div className="hidden lg:block absolute left-0 top-12 bottom-12 w-px"
            style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.07), transparent)' }}
          />

          <div className="px-6 lg:px-16 xl:px-20 h-full flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIdx}
                initial={{ opacity: 0, x: 40, filter: 'blur(6px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -24, filter: 'blur(4px)' }}
                transition={{ type: 'spring', damping: 26, stiffness: 160 }}
                className="w-full max-w-xl"
              >
                {/* Nombre del tier */}
                <div className="mb-6 lg:mb-8">
                  <motion.div className="flex items-center gap-3 mb-2">
                    {plan.recommended && (
                      <motion.span
                        initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                        className="flex items-center gap-1.5 text-black text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-full"
                        style={{ background: '#FDCB02' }}
                      >
                        <Crown size={9} /> Best Value
                      </motion.span>
                    )}
                    <span className="text-[9px] font-black uppercase tracking-[0.28em] text-white/20">{plan.name}</span>
                  </motion.div>

                  <h1
                    className="leading-none text-white"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(52px, 9vw, 100px)', letterSpacing: '0.03em' }}
                  >
                    {plan.key}
                  </h1>
                </div>

                {/* Features — línea de tiempo vertical */}
                <div className="mb-7 lg:mb-10 relative">
                  <div className="absolute left-[5px] top-2 bottom-2 w-px"
                    style={{ background: `linear-gradient(to bottom, ${plan.accentLine}, transparent)`, opacity: 0.4 }}
                  />
                  {plan.features.map((feat, i) => (
                    <motion.div
                      key={feat}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07, type: 'spring', damping: 22, stiffness: 200 }}
                      className="flex items-center gap-4 py-2 pl-5"
                    >
                      <div className="absolute left-[2px] w-[7px] h-[7px] rounded-full border border-current"
                        style={{ color: plan.accentLine, background: 'transparent' }}
                      />
                      <span className="text-xs lg:text-sm font-semibold text-white/60 uppercase tracking-tight">{feat}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Precio y billing */}
                {plan.price > 0 ? (
                  <div className="space-y-5">
                    {/* Toggle mensual/anual */}
                    <div className="inline-flex items-center gap-1 bg-white/[0.04] rounded-xl p-1 border border-white/[0.07]">
                      {(['monthly', 'annual'] as const).map(b => (
                        <button key={b} onClick={() => setBilling(b)}
                          className={`relative px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${billing === b ? 'text-black' : 'text-white/25 hover:text-white/50'}`}
                        >
                          {billing === b && (
                            <motion.div layoutId="billing-bg" className="absolute inset-0 rounded-lg"
                              style={{ background: b === 'annual' ? '#FDCB02' : 'white' }}
                              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                            />
                          )}
                          <span className="relative flex items-center gap-1.5">
                            {b === 'monthly' ? 'Mensual' : <>Anual <span className={`px-1.5 py-0.5 rounded text-[8px] ${billing === 'annual' ? 'bg-black/15' : 'bg-white/10 text-white/30'}`}>−10%</span></>}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Precio grande */}
                    <div className="flex items-end gap-5">
                      <div>
                        <motion.p
                          key={price}
                          initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                          className="text-white leading-none"
                          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(40px, 7vw, 72px)', letterSpacing: '0.02em' }}
                        >
                          {fmx(price)}
                        </motion.p>
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">
                          MXN / {isAnn ? 'año' : 'mes'}
                        </p>
                        {isAnn && (
                          <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            className="text-[10px] font-mono font-bold mt-1 flex items-center gap-1.5"
                            style={{ color: '#FDCB02', fontFamily: 'JetBrains Mono, monospace' }}
                          >
                            <Zap size={10} fill="currentColor" /> + {fmx(savings)} de ahorro anual
                          </motion.p>
                        )}
                      </div>

                      {/* Botón de suscripción */}
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={handleBuy}
                        className="h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-[0.18em] flex items-center gap-2.5 relative overflow-hidden transition-shadow duration-300"
                        style={{
                          background: plan.cardBg,
                          color: plan.nameColor,
                          boxShadow: `0 8px 32px ${plan.ambientColor}, 0 2px 8px rgba(0,0,0,0.4)`,
                        }}
                      >
                        <div className="absolute inset-0" style={{ background: plan.cardSheen, mixBlendMode: 'overlay' }} />
                        <span className="relative">Suscribirme</span>
                        <ArrowRight size={15} className="relative" />
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end gap-5">
                    <div>
                      <p className="text-white leading-none"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(40px, 7vw, 72px)', letterSpacing: '0.02em' }}>
                        GRATIS
                      </p>
                      <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">Acceso de cortesía</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      onClick={handleBuy}
                      className="h-14 px-8 rounded-2xl bg-white text-black font-black uppercase text-xs tracking-[0.18em] hover:bg-[#FDCB02] transition-colors flex items-center gap-2"
                    >
                      Empezar <ArrowRight size={15} />
                    </motion.button>
                  </div>
                )}

                {/* Indicadores de seguridad */}
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="flex items-center gap-4 mt-7 pt-6 border-t border-white/[0.06]"
                >
                  {[
                    { icon: Shield, label: 'PCI-DSS' },
                    { icon: Lock,   label: 'Encriptado' },
                    { icon: Zap,    label: 'Activación inmediata' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <Icon size={11} className="text-white/15" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-white/15">{label}</span>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── MODAL VAULT ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showVault && (
          <PaymentVault
            plan={plan}
            price={price}
            billing={billing}
            onClose={() => setShowVault(false)}
            onProcess={processCheckout}
            loading={loading}
            error={payError}
            openPayReady={openpayOk}
          />
        )}
      </AnimatePresence>

      <style jsx global>{`
        * { box-sizing: border-box; }
        input::placeholder { opacity: 0.3; }
        input:focus { outline: none; }
      `}</style>
    </>
  );
}