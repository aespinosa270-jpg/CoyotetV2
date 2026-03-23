'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { X, ArrowUp, RotateCcw, Copy, Check, Phone, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  ts?: string;
};

const QUICK_CHIPS: { label: string; text: string }[] = [
  { label: '🧵 Pixel 25kg',     text: 'Necesito cotizar 25 kilos de Pixel para sublimacion' },
  { label: '🌊 Alaska rollo',   text: 'Cuanto cuesta un rollo completo de Alaska?' },
  { label: '💪 Licra 20kg',     text: 'Precio de 20 kilos de licra playera en negro y blanco' },
  { label: '🧸 Felpa China',    text: 'Quiero saber precio de Felpa China por kilo' },
  { label: '📏 Metros→kilos',   text: 'Como calculo metros a kilos?' },
  { label: '🚚 Envío foráneo',  text: 'Hacen envios fuera de CDMX?' },
];

function getTime() {
  return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

const INITIAL_MESSAGE: Message = {
  id: 'init',
  role: 'assistant',
  ts: getTime(),
  content: 'Qué onda! Soy El Coyote 🐺\n\nSoy el asistente de *coyotetextil.com* — dime qué tela necesitas, en qué cantidad y para qué uso, y te armo la cotización al instante con precios reales de stock.\n\n¿En qué andamos?',
};

function formatMessage(text: string): React.ReactNode {
  // Bold: *texto* o **texto**
  const lines = text.split('\n');
  return lines.map((line, li) => {
    const parts = line.split(/(\*{1,2}[^*]+\*{1,2})/g);
    return (
      <span key={li}>
        {parts.map((part, i) => {
          if (/^\*{1,2}[^*]+\*{1,2}$/.test(part)) {
            return <strong key={i} className="font-bold">{part.replace(/\*/g, '')}</strong>;
          }
          return <span key={i}>{part}</span>;
        })}
        {li < lines.length - 1 && <br />}
      </span>
    );
  });
}

// ── BANNER FLOTANTE (antes de abrir el chat) ──────────────────────────────
function ChatBanner({ onOpen }: { onOpen: () => void }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDismissed(false), 0);
    return () => clearTimeout(t);
  }, []);

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 1.2 }}
      className="fixed bottom-28 right-6 z-40 w-72"
    >
      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-zinc-700 hover:bg-zinc-600 rounded-full flex items-center justify-center z-10 transition-colors"
      >
        <X size={11} className="text-white" />
      </button>

      {/* Card */}
      <button
        onClick={onOpen}
        className="w-full text-left rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.35)] border border-white/10 group"
      >
        {/* Top — amarillo Coyote */}
        <div className="bg-[#FDCB02] px-4 pt-3 pb-2 relative overflow-hidden">
          {/* Decoración fondo */}
          <div className="absolute right-0 top-0 w-24 h-24 bg-black/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute right-8 top-2 w-12 h-12 bg-black/5 rounded-full" />

          <div className="relative flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center text-base shrink-0 shadow">
              🐺
            </div>
            <div>
              <p className="text-black font-black text-sm leading-none">El Coyote</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                <span className="text-[10px] text-black/60 font-bold uppercase tracking-wide">En línea ahora</span>
              </div>
            </div>
          </div>

          <p className="text-black font-black text-[15px] leading-tight relative">
            ¿Cuánto te cuesta<br/>tu tela hoy? 💰
          </p>
          <p className="text-black/60 text-[11px] font-semibold mt-1 relative">
            Cotización en segundos · Stock real
          </p>
        </div>

        {/* Bottom — oscuro */}
        <div className="bg-[#111] px-4 py-3 flex items-center justify-between group-hover:bg-[#1a1a1a] transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#FDCB02] rounded-full animate-pulse" />
            <span className="text-white text-[11px] font-black uppercase tracking-widest">
              COTIZAR AHORA
            </span>
          </div>
          <div className="w-7 h-7 bg-[#FDCB02] rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
            <ArrowUp size={14} className="text-black -rotate-45" strokeWidth={3} />
          </div>
        </div>
      </button>
    </motion.div>
  );
}

// ── BURBUJA DE MENSAJE ────────────────────────────────────────────────────
function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`flex items-end gap-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar asistente */}
      {!isUser && (
        <div className="w-6 h-6 bg-[#FDCB02] rounded-full flex items-center justify-center text-xs shrink-0 mb-1 shadow-sm">
          🐺
        </div>
      )}

      <div className={`relative max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Burbuja */}
        <div
          className={`px-3.5 py-2.5 text-[13.5px] leading-[1.55] shadow-sm relative ${
            isUser
              ? 'bg-[#DCF8C6] text-zinc-900 rounded-[18px] rounded-br-[4px]'
              : 'bg-white text-zinc-900 rounded-[18px] rounded-bl-[4px]'
          }`}
          style={{ wordBreak: 'break-word' }}
        >
          {formatMessage(msg.content)}

          {/* Timestamp + doble check (usuario) */}
          <span className={`flex items-center gap-1 justify-end mt-1 ${isUser ? 'ml-4' : ''}`}>
            <span className="text-[10px] text-zinc-400 leading-none">{msg.ts ?? ''}</span>
            {isUser && (
              <svg width="15" height="11" viewBox="0 0 15 11" className="shrink-0">
                <path d="M1 5.5L4.5 9L9 1" stroke="#53BDEB" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 5.5L8.5 9L13 1" stroke="#53BDEB" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>

          {/* Punta de burbuja */}
          {isUser ? (
            <svg className="absolute -right-[7px] bottom-[8px]" width="9" height="12" viewBox="0 0 9 12">
              <path d="M0 0 Q9 6 0 12 L0 0Z" fill="#DCF8C6"/>
            </svg>
          ) : (
            <svg className="absolute -left-[7px] bottom-[8px]" width="9" height="12" viewBox="0 0 9 12">
              <path d="M9 0 Q0 6 9 12 L9 0Z" fill="white"/>
            </svg>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────
export default function CoyoteChat() {
  const pathname = usePathname();
  const [isOpen,     setIsOpen]     = useState(false);
  const [input,      setInput]      = useState('');
  const [isLoading,  setIsLoading]  = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [unread,     setUnread]     = useState(0);
  const [messages,   setMessages]   = useState<Message[]>([INITIAL_MESSAGE]);
  const [showBanner, setShowBanner] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Mostrar banner tras 3s en primera visita
  useEffect(() => {
    const seen = sessionStorage.getItem('coyote-banner-seen');
    if (!seen) {
      const t = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      setShowBanner(false);
      sessionStorage.setItem('coyote-banner-seen', '1');
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText !== undefined ? overrideText : input).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      role: 'user',
      ts: getTime(),
      content: text,
    };
    const nextMessages = [...messages, userMsg];
    setInput('');
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });
      if (!res.ok) throw new Error('HTTP ' + String(res.status));
      const data = await res.json() as { content?: string };
      const content = data.content || 'No te entendí bien patrón, ¿me repites?';
      setMessages(prev => [
        ...prev,
        { id: String(Date.now()) + '-a', role: 'assistant', ts: getTime(), content },
      ]);
      if (!isOpen) setUnread(n => n + 1);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now()) + '-err',
          role: 'assistant',
          ts: getTime(),
          content: 'Se me atoro la carreta. ¿Me repites o mandamos directo al WhatsApp?',
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, isLoading, messages, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
    setInput('');
    setUnread(0);
  };

  const handleCopy = () => {
    const text = messages.map(m => (m.role === 'user' ? 'Tú: ' : 'Coyote: ') + m.content).join('\n\n');
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const enviarWhatsApp = () => {
    let texto = 'COTIZACIÓN — coyotetextil.com\n\n';
    messages.forEach(m => {
      texto += (m.role === 'user' ? 'Cliente: ' : 'Coyote: ') + m.content + '\n';
    });
    texto += '\nEnviado desde coyotetextil.com';
    window.open('https://wa.me/525531314617?text=' + encodeURIComponent(texto), '_blank');
  };

  if (pathname?.startsWith('/flotilla')) return null;

  const fabTransition: Transition = isOpen
    ? { duration: 0.2 }
    : { repeat: Infinity, repeatType: 'loop', duration: 2.8, ease: 'easeInOut' };

  return (
    <>
      {/* BANNER */}
      <AnimatePresence>
        {showBanner && !isOpen && (
          <ChatBanner onOpen={() => { setIsOpen(true); setShowBanner(false); }} />
        )}
      </AnimatePresence>

      {/* FAB */}
      <button
        onClick={() => setIsOpen(o => !o)}
        aria-label={isOpen ? 'Cerrar chat' : 'Cotizar ahora'}
        className="fixed bottom-6 right-6 z-50 group"
      >
        <motion.div
          animate={isOpen ? { scale: 1 } : { scale: [1, 1.07, 1] }}
          transition={fabTransition}
          className="relative flex items-center gap-0 overflow-hidden rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)] group-hover:shadow-[0_8px_40px_rgba(253,203,2,0.4)] transition-shadow"
        >
          {/* Label "Cotizar" visible en desktop cuando está cerrado */}
          <AnimatePresence>
            {!isOpen && (
              <motion.span
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="hidden sm:flex items-center bg-[#FDCB02] text-black font-black text-[11px] uppercase tracking-widest pl-5 pr-3 h-14 whitespace-nowrap overflow-hidden"
              >
                Cotizar ahora
              </motion.span>
            )}
          </AnimatePresence>

          {/* Círculo principal */}
          <div className="w-14 h-14 bg-[#FDCB02] flex items-center justify-center shrink-0">
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                  <X className="w-6 h-6 text-black" strokeWidth={3} />
                </motion.div>
              ) : (
                <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
                  <span className="text-2xl">🐺</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Badge unread */}
          <AnimatePresence>
            {!isOpen && unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white"
              >
                {unread}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </button>

      {/* CHAT PANEL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] rounded-2xl overflow-hidden flex flex-col"
            style={{
              height: 580,
              boxShadow: '0 24px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
            }}
          >

            {/* ── HEADER estilo WhatsApp oscuro ── */}
            <div
              className="shrink-0 flex items-center gap-3 px-4 py-3"
              style={{ background: '#1F2C34' }}
            >
              {/* Avatar + info */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 bg-[#FDCB02] rounded-full flex items-center justify-center text-lg shadow">
                  🐺
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1F2C34]" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-none mb-0.5">El Coyote</p>
                <p className="text-[#8696A0] text-[11px] font-medium truncate">
                  coyotetextil.com · En línea
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <a
                  href="tel:5596023567"
                  className="w-8 h-8 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                  title="Llamar"
                >
                  <Phone size={15} className="text-[#8696A0]" />
                </a>
                <button
                  onClick={handleCopy}
                  className="w-8 h-8 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                  title="Copiar chat"
                >
                  {copied
                    ? <Check size={15} className="text-green-400" />
                    : <Copy size={15} className="text-[#8696A0]" />}
                </button>
                <button
                  onClick={handleReset}
                  className="w-8 h-8 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                  title="Reiniciar"
                >
                  <RotateCcw size={15} className="text-[#8696A0]" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                  title="Minimizar"
                >
                  <ChevronDown size={18} className="text-[#8696A0]" />
                </button>
              </div>
            </div>

            {/* ── MESSAGES — fondo papel WhatsApp ── */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5"
              style={{
                background: '#0B141A',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
              }}
            >
              {/* Fecha */}
              <div className="flex justify-center mb-3">
                <span className="bg-[#182229] text-[#8696A0] text-[11px] font-medium px-3 py-1 rounded-full">
                  Hoy
                </span>
              </div>

              {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}

              {/* Typing indicator */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-end gap-1.5"
                  >
                    <div className="w-6 h-6 bg-[#FDCB02] rounded-full flex items-center justify-center text-xs shrink-0 mb-1">
                      🐺
                    </div>
                    <div className="bg-white px-4 py-3 rounded-[18px] rounded-bl-[4px] shadow-sm flex gap-1 items-center"
                      style={{ position: 'relative' }}>
                      {[0, 1, 2].map(i => (
                        <motion.span
                          key={i}
                          className="w-2 h-2 bg-zinc-400 rounded-full block"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                        />
                      ))}
                      <svg className="absolute -left-[7px] bottom-[8px]" width="9" height="12" viewBox="0 0 9 12">
                        <path d="M9 0 Q0 6 9 12 L9 0Z" fill="white"/>
                      </svg>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="h-1" />
            </div>

            {/* ── QUICK CHIPS ── */}
            <AnimatePresence>
              {messages.length <= 2 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="shrink-0 overflow-hidden"
                  style={{ background: '#0B141A', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="px-3 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
                    {QUICK_CHIPS.map((chip, i) => (
                      <button
                        key={i}
                        onClick={() => void sendMessage(chip.text)}
                        disabled={isLoading}
                        className="shrink-0 text-[11px] font-semibold bg-[#1F2C34] hover:bg-[#2A3942] border border-white/10 hover:border-[#FDCB02]/50 text-[#E9EDEF] hover:text-[#FDCB02] px-3 py-1.5 rounded-full transition-all disabled:opacity-40 whitespace-nowrap"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── INPUT BAR estilo WhatsApp ── */}
            <div
              className="shrink-0 px-3 py-2.5 flex items-end gap-2"
              style={{ background: '#1F2C34' }}
            >
              <div
                className="flex-1 flex items-end gap-2 rounded-2xl px-4 py-2.5 min-h-[44px]"
                style={{ background: '#2A3942' }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje..."
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 bg-transparent text-[13.5px] text-[#E9EDEF] placeholder-[#8696A0] focus:outline-none resize-none max-h-28 leading-relaxed disabled:opacity-50"
                  style={{ fontFamily: 'inherit' }}
                />
              </div>

              <button
                onClick={() => void sendMessage()}
                disabled={!input.trim() || isLoading}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 shrink-0"
                style={{
                  background: input.trim() && !isLoading ? '#00A884' : '#2A3942',
                }}
              >
                <ArrowUp
                  size={20}
                  strokeWidth={2.5}
                  className={input.trim() && !isLoading ? 'text-white' : 'text-[#8696A0]'}
                />
              </button>
            </div>

            {/* ── FOOTER: Enviar a WhatsApp ── */}
            <button
              onClick={enviarWhatsApp}
              className="shrink-0 flex items-center justify-center gap-2.5 py-3 font-black text-[11px] uppercase tracking-widest transition-colors"
              style={{ background: '#075E54', color: '#fff' }}
            >
              {/* WhatsApp icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.12.554 4.11 1.522 5.833L.054 23.5l5.824-1.528A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.031-1.388l-.36-.214-3.732.979.995-3.638-.235-.374A9.786 9.786 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
              </svg>
              <span>Enviar cotización al equipo · +52 55 3131 4617</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}