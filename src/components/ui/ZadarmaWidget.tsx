"use client"

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, Delete, X, PhoneOff, Mic, MicOff, 
  Clock, Grid3X3, Pause, ArrowRightLeft, Power
} from 'lucide-react';

// SECUESTRO GLOBAL INMUNE A DOBLE RENDER
if (typeof window !== 'undefined' && !(window as any)._coyotePatched) {
  (window as any)._coyotePatched = true;
  const originalLog = console.log;
  console.log = function(...args) {
    originalLog.apply(console, args); 
    if (typeof (window as any)._coyoteHandler === 'function') {
      try { (window as any)._coyoteHandler(args); } catch (e) {}
    }
  };
}

const padButtons = [
  { num: '1', let: '' }, { num: '2', let: 'ABC' }, { num: '3', let: 'DEF' },
  { num: '4', let: 'GHI' }, { num: '5', let: 'JKL' }, { num: '6', let: 'MNO' },
  { num: '7', let: 'PQRS' }, { num: '8', let: 'TUV' }, { num: '9', let: 'WXYZ' },
  { num: '*', let: '' }, { num: '0', let: '+' }, { num: '#', let: '' }
];

export default function ZadarmaWidget() {
  const [webrtcKey, setWebrtcKey] = useState<string | null>(null);
  const [isPbxActive, setIsPbxActive] = useState(false); 
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'keypad' | 'history'>('keypad');
  const [dialNumber, setDialNumber] = useState("");
  const [callStatus, setCallStatus] = useState<'idle' | 'incoming' | 'calling' | 'connected'>('idle');
  
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);

  useEffect(() => {
    fetch('/api/zadarma-webrtc')
      .then(res => res.json())
      .then(data => { if (data.key) setWebrtcKey(data.key); })
      .catch(err => console.error("Error pidiendo llave:", err));
  }, []);

  // RECEPTOR DE ESTADOS
  useEffect(() => {
    (window as any)._coyoteHandler = (args: any[]) => {
      const eventName = args[0];
      const payload = args[1];

      if (typeof eventName === 'string') {
        const action = eventName.toLowerCase();
        if (action === 'incoming') {
          console.log("🐺 INCOMING ATRAPADO");
          setCallStatus('incoming');
          setIsOpen(true);
          setDialNumber(payload?.caller || payload?.calledDid || "Entrante");
        } 
        else if (action === 'answered' || action === 'connected') {
          setCallStatus(prev => (prev === 'incoming' || prev === 'calling') ? 'connected' : prev);
        } 
        else if (action === 'canceled' || action === 'hangup' || action === 'ended' || action === 'declined') {
          console.log("🐺 LLAMADA CERRADA");
          setCallStatus('idle');
          setDialNumber("");
          setIsMuted(false);
          setIsOnHold(false);
        }
      }
    };
    return () => { (window as any)._coyoteHandler = null; };
  }, []); 

  // INYECTOR CON ESCUDO ANTI-CLONES
  useEffect(() => {
    if (!webrtcKey || !isPbxActive) return;
    const w = window as any;
    
    // 👇 ESCUDO ABSOLUTO: Si ya se inyectó, abortamos cualquier segundo intento.
    if (w.__zadarmaInjected) return; 

    const initWidget = () => {
      if (w.zadarmaWidgetFn && w.zdrmWebrtcPhoneInterface) {
        w.__zadarmaInjected = true; // Cerramos la puerta
        console.log("🚀 CONECTANDO MOTOR ZADARMA (1 SOLA VEZ)");
        w.zadarmaWidgetFn(
          webrtcKey, '554386-100', 'square', 'es', true,
          { right: '-9999px', bottom: '-9999px', zIndex: '-9999' }
        );
      } else {
        setTimeout(initWidget, 300);
      }
    };
    initWidget();
  }, [webrtcKey, isPbxActive]);


  // --- DISPARADOR DE COMANDOS (NIVEL DIOS) ---
  const sendZadarmaCmd = (action: string, value?: string) => {
    console.log(`🚀 Ejecutando: ${action} ${value || ''}`);
    const w = window as any;
    
    // 1. Intentar por la API oficial
    try {
      if (w.zdrmWebrtcPhoneInterface) {
        if (action === 'call') w.zdrmWebrtcPhoneInterface.call(value);
        else if (action === 'answer') w.zdrmWebrtcPhoneInterface.answer();
        else if (action === 'hangup') w.zdrmWebrtcPhoneInterface.hangup();
        else if (action === 'hold') w.zdrmWebrtcPhoneInterface.hold();
        else if (action === 'unhold') w.zdrmWebrtcPhoneInterface.unhold();
        else if (action === 'mute') w.zdrmWebrtcPhoneInterface.mute();
        else if (action === 'unmute') w.zdrmWebrtcPhoneInterface.unmute();
        else if (action === 'transfer') w.zdrmWebrtcPhoneInterface.transfer(value);
        else if (action === 'sendDTMF') w.zdrmWebrtcPhoneInterface.sendDTMF(value);
      }
    } catch (e) { console.error(`API Error en ${action}:`, e); }

    // 2. Intentar por Inyección Directa (PostMessage) al Iframe
    try {
      const iframe = document.querySelector('iframe[src*="my.zadarma.com"]') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        const payload: any = { action: action };
        if (value && action === 'call') payload.phone = value;
        if (value && action === 'transfer') payload.phone = value;
        if (value && action === 'sendDTMF') payload.digit = value;
        iframe.contentWindow.postMessage(payload, '*');
      }
    } catch (e) {}
  };

  // --- CONTROLES DE UI ---
  const handlePadClick = (val: string) => {
    setDialNumber(prev => prev + val);
    if (callStatus === 'connected') sendZadarmaCmd('sendDTMF', val);
  };
  
  const handleDelete = () => setDialNumber(prev => prev.slice(0, -1));

  const handleCall = () => {
    if (!dialNumber) return;
    setCallStatus('calling'); 
    sendZadarmaCmd('call', dialNumber);
  };

  const handleAcceptIncoming = () => {
    console.log("🟢 CLICK EN ACEPTAR");
    sendZadarmaCmd('answer');
    setCallStatus('connected');
  };

  const handleHangup = () => {
    console.log("🔴 CLICK EN COLGAR");
    sendZadarmaCmd('hangup');
    setCallStatus('idle'); setDialNumber(""); setIsMuted(false); setIsOnHold(false);
  };

  const handleToggleMute = () => {
    sendZadarmaCmd(isMuted ? 'unmute' : 'mute');
    setIsMuted(!isMuted);
  };

  const handleToggleHold = () => {
    sendZadarmaCmd(isOnHold ? 'unhold' : 'hold');
    setIsOnHold(!isOnHold);
  };

  const handleTransfer = () => {
    const targetExt = prompt("Ingresa la extensión para transferir (ej. 101):");
    if (!targetExt) return;
    sendZadarmaCmd('transfer', targetExt);
    handleHangup();
  };

  if (!webrtcKey) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        iframe[src*="my.zadarma.com"], div[id*="zdrm"], div[class*="zdrm"],
        #zadarma-webphone-widget, .zadarma-widget-webrtc {
          position: fixed !important; top: -9999px !important; left: -9999px !important;
          opacity: 0 !important; pointer-events: none !important; z-index: -9999 !important;
        }
      `}} />

      {isPbxActive && (
        <>
          <Script src="https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1" strategy="afterInteractive" />
          <Script src="https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1" strategy="afterInteractive" />
        </>
      )}

      <div className="fixed bottom-6 right-6 z-[2147483647] flex flex-col items-end">
        <AnimatePresence>
          {isOpen && isPbxActive && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="bg-[#000000] border border-white/20 rounded-[40px] shadow-2xl overflow-hidden w-[320px] h-[650px] flex flex-col relative"
            >
              <div className="flex justify-between items-center px-6 pt-4 pb-2 z-10">
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Zadarma PBX
                </span>
                <button onClick={() => setIsOpen(false)} className="bg-white/10 p-1.5 rounded-full text-neutral-400 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>

              {callStatus !== 'idle' ? (
                <div className="flex-1 flex flex-col items-center justify-between pb-12 pt-8 px-6 bg-gradient-to-b from-[#1a1a1a] to-[#000000]">
                  <div className="text-center w-full">
                    <p className={`text-sm font-mono uppercase tracking-widest mb-1 ${callStatus === 'incoming' ? 'text-[#FDCB02] animate-pulse' : 'text-emerald-500'}`}>
                      {callStatus === 'incoming' ? 'Entrante...' : callStatus === 'calling' ? 'Conectando...' : 'En Llamada'}
                    </p>
                    <h2 className="text-white text-3xl font-light tracking-wider break-all leading-tight mt-2">
                      {dialNumber}
                    </h2>
                  </div>

                  {callStatus === 'incoming' ? (
                    <div className="flex justify-between w-full px-4 mb-4">
                      <div className="flex flex-col items-center gap-2">
                        <button onClick={handleHangup} className="w-16 h-16 bg-[#FF3B30] rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg shadow-red-500/20">
                          <PhoneOff size={28} />
                        </button>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <button onClick={handleAcceptIncoming} className="w-16 h-16 bg-[#34C759] rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg shadow-green-500/20 animate-bounce">
                          <Phone size={28} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col gap-10 items-center">
                      <div className="grid grid-cols-3 gap-x-6 gap-y-4 w-full px-2">
                        <button onClick={handleToggleMute} className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-white text-black' : 'bg-[#333333] text-white'}`}><MicOff size={24} /></button>
                        <button className="w-16 h-16 rounded-full bg-[#333333] flex items-center justify-center text-white"><Grid3X3 size={24} /></button>
                        <button onClick={handleToggleHold} className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isOnHold ? 'bg-[#FDCB02] text-black' : 'bg-[#333333] text-white'}`}><Pause size={24} /></button>
                      </div>
                      <button onClick={handleHangup} className="w-16 h-16 bg-[#FF3B30] rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg shadow-red-500/20">
                        <PhoneOff size={28} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
              <div className="flex-1 flex flex-col bg-[#000000]">
                {/* Las vistas de KEYPAD y HISTORY se mantienen igual de limpias */}
                {activeTab === 'keypad' && (
                  <div className="flex-1 flex flex-col pt-6">
                    <div className="h-20 flex items-center justify-center px-6 relative">
                      <span className="text-4xl font-light tracking-wider text-white truncate max-w-full">{dialNumber}</span>
                      {dialNumber && <button onClick={handleDelete} className="absolute right-6 text-neutral-400 hover:text-white"><Delete size={24} /></button>}
                    </div>
                    <div className="flex-1 px-8 pt-4">
                      <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                        {padButtons.map((btn) => (
                          <button key={btn.num} onClick={() => handlePadClick(btn.num)} className="bg-[#333333] rounded-full aspect-square flex flex-col items-center justify-center active:bg-[#555555]">
                            <span className="text-[32px] font-normal leading-none text-white">{btn.num}</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-center mt-6">
                        <button onClick={handleCall} className="w-[72px] h-[72px] bg-[#34C759] rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/20"><Phone size={36} fill="currentColor" /></button>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'history' && (
                  <div className="flex-1 flex flex-col bg-[#000000]">
                    <h2 className="text-3xl font-bold text-white px-6 py-4">Registro</h2>
                    <div className="flex-1 flex items-center justify-center px-6">
                      <p className="text-neutral-600 text-xs font-mono text-center">
                        Historial sincronizado con CRM de red.
                      </p>
                    </div>
                  </div>
                )}
                <div className="h-20 bg-[#111111]/90 backdrop-blur-xl border-t border-[#333333] flex justify-around items-center px-4 pb-4">
                  <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-[#FDCB02]' : 'text-neutral-500'}`}>
                    <Clock size={24} fill={activeTab === 'history' ? "currentColor" : "none"} />
                    <span className="text-[10px] font-medium">Historial</span>
                  </button>
                  <button onClick={() => setActiveTab('keypad')} className={`flex flex-col items-center gap-1 ${activeTab === 'keypad' ? 'text-[#FDCB02]' : 'text-neutral-500'}`}>
                    <Grid3X3 size={24} />
                    <span className="text-[10px] font-medium">Teclado</span>
                  </button>
                </div>
              </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!isOpen && (
          <motion.button 
            initial={{ scale: 0 }} animate={{ scale: 1 }} 
            onClick={() => { if (!isPbxActive) setIsPbxActive(true); setIsOpen(true); }}
            className={`flex items-center gap-3 px-4 h-14 border-2 rounded-full text-white transition-all shadow-xl font-bold uppercase tracking-widest text-xs
              ${isPbxActive 
                ? 'bg-[#111] border-[#030303] hover:border-[#FDCB02] hover:text-[#FDCB02] w-14 justify-center px-0' 
                : 'bg-[#FDCB02] border-[#FDCB02] text-black shadow-[0_0_20px_rgba(253,203,2,0.4)] animate-pulse'
              }
            `}
          >
            {isPbxActive ? <Phone size={24} /> : <><Power size={20} /> Conectar PBX</>}
          </motion.button>
        )}
      </div>
    </>
  );
}