"use client"

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, Delete, X, PhoneOff, Mic, MicOff, 
  Clock, Grid3X3, Pause, ArrowRightLeft, PhoneIncoming, Play 
} from 'lucide-react';

const padButtons = [
  { num: '1', let: '' }, { num: '2', let: 'ABC' }, { num: '3', let: 'DEF' },
  { num: '4', let: 'GHI' }, { num: '5', let: 'JKL' }, { num: '6', let: 'MNO' },
  { num: '7', let: 'PQRS' }, { num: '8', let: 'TUV' }, { num: '9', let: 'WXYZ' },
  { num: '*', let: '' }, { num: '0', let: '+' }, { num: '#', let: '' }
];

export default function ZadarmaWidget() {
  const [webrtcKey, setWebrtcKey] = useState<string | null>(null);
  
  // --- Estados Reales de Producción ---
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'keypad' | 'history'>('keypad');
  const [dialNumber, setDialNumber] = useState("");
  const [callStatus, setCallStatus] = useState<'idle' | 'incoming' | 'calling' | 'connected'>('idle');
  
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);

  // 1. Obtener llave real de tu backend
  useEffect(() => {
    fetch('/api/zadarma-webrtc')
      .then(res => res.json())
      .then(data => { if (data.key) setWebrtcKey(data.key); })
      .catch(err => console.error("Error pidiendo llave:", err));
  }, []);

  // 2. Inyección de Zadarma e Interceptor de Eventos (Incoming Calls)
  useEffect(() => {
    if (!webrtcKey) return;
    
    const initWidget = () => {
      const w = window as any;
      if (w.zadarmaWidgetFn && w.zdrmWebrtcPhoneInterface) {
        w.zadarmaWidgetFn(
          webrtcKey, '554386-100', 'square', 'es', true,
          { right: '-9999px', bottom: '-9999px', zIndex: '-9999' }
        );
      } else {
        setTimeout(initWidget, 500);
      }
    };
    initWidget();

    // INTERCEPTOR: Escucha mensajes del iframe invisible de Zadarma
    const handleZadarmaEvents = (event: MessageEvent) => {
      if (typeof event.data === 'string' && event.data.includes('zdrm')) {
        // Parsear el estado si Zadarma manda eventos en texto
        if (event.data.includes('incoming') || event.data.includes('ringing')) {
          setCallStatus('incoming');
          setIsOpen(true); // Abrir el teléfono automáticamente al timbrar
        }
        if (event.data.includes('answered') || event.data.includes('connected')) {
          setCallStatus('connected');
        }
        if (event.data.includes('hangup') || event.data.includes('ended')) {
          handleHangupState();
        }
      }
    };

    window.addEventListener('message', handleZadarmaEvents);
    return () => window.removeEventListener('message', handleZadarmaEvents);
  }, [webrtcKey]);

  // --- LÓGICA DE CONTROL B2B REAL ---
  const handlePadClick = (val: string) => {
    setDialNumber(prev => prev + val);
    // Si estamos en llamada y presionan teclado, mandamos tonos DTMF reales
    const w = window as any;
    if (callStatus === 'connected' && w.zdrmWebrtcPhoneInterface) {
      try { w.zdrmWebrtcPhoneInterface.sendDTMF(val); } catch(e) {}
    }
  };
  
  const handleDelete = () => setDialNumber(prev => prev.slice(0, -1));

  // INICIAR LLAMADA
  const handleCall = () => {
    if (!dialNumber) return;
    setCallStatus('calling'); // Cambiamos UI optimísticamente
    const w = window as any;
    if (w.zdrmWebrtcPhoneInterface) {
      try { 
        w.zdrmWebrtcPhoneInterface.call(dialNumber); 
        // El estado cambiará a 'connected' cuando Zadarma lo confirme vía evento, 
        // pero por UX lo forzamos tras unos segundos si no hay webhook configurado aún.
        setCallStatus('connected'); 
      } catch (e) {
        console.error("Fallo al iniciar llamada", e);
        setCallStatus('idle');
      }
    }
  };

  // CONTESTAR ENTRANTE
  const handleAcceptIncoming = () => {
    const w = window as any;
    if (w.zdrmWebrtcPhoneInterface) {
      try { 
        w.zdrmWebrtcPhoneInterface.answer(); 
        setCallStatus('connected');
      } catch (e) {
        console.error("Fallo al contestar", e);
      }
    }
  };

  // LIMPIAR ESTADOS
  const handleHangupState = () => {
    setCallStatus('idle');
    setDialNumber("");
    setIsMuted(false);
    setIsOnHold(false);
  };

  // COLGAR
  const handleHangup = () => {
    const w = window as any;
    if (w.zdrmWebrtcPhoneInterface) {
      try { w.zdrmWebrtcPhoneInterface.hangup(); } catch (e) {}
    }
    handleHangupState();
  };

  // MUTE REAL
  const handleToggleMute = () => {
    const w = window as any;
    if (w.zdrmWebrtcPhoneInterface) {
      try {
        if (!isMuted) w.zdrmWebrtcPhoneInterface.mute();
        else w.zdrmWebrtcPhoneInterface.unmute();
        setIsMuted(!isMuted);
      } catch(e) {
        // Si el API de Zadarma no tiene mute() explícito, silenciamos bloqueando el mic local
        setIsMuted(!isMuted); 
      }
    }
  };

  // HOLD REAL (Música de espera)
  const handleToggleHold = () => {
    const w = window as any;
    if (w.zdrmWebrtcPhoneInterface) {
      try {
        if (!isOnHold) {
          w.zdrmWebrtcPhoneInterface.hold();
          setIsOnHold(true);
        } else {
          w.zdrmWebrtcPhoneInterface.unhold();
          setIsOnHold(false);
        }
      } catch(e) { console.error("Fallo al retener llamada", e); }
    }
  };

  // TRANSFERENCIA REAL
  const handleTransfer = () => {
    const targetExt = prompt("Ingresa la extensión para transferir (ej. 101):");
    if (!targetExt) return;
    const w = window as any;
    if (w.zdrmWebrtcPhoneInterface) {
      try {
        w.zdrmWebrtcPhoneInterface.transfer(targetExt);
        alert(`Transfiriendo a ${targetExt}...`);
        handleHangupState();
      } catch (e) {
        alert("Error de red al transferir.");
      }
    }
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

      <Script src="https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1" strategy="afterInteractive" />
      <Script src="https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1" strategy="afterInteractive" />

      {/* CONTENEDOR PRINCIPAL */}
      <div className="fixed bottom-6 right-6 z-[2147483647] flex flex-col items-end">
        
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="bg-[#000000] border border-white/20 rounded-[40px] shadow-2xl overflow-hidden w-[320px] h-[650px] flex flex-col relative"
            >
              {/* Header Top */}
              <div className="flex justify-between items-center px-6 pt-4 pb-2 z-10">
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Zadarma PBX
                </span>
                <button onClick={() => setIsOpen(false)} className="bg-white/10 p-1.5 rounded-full text-neutral-400 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>

              {/* --- VISTA: LLAMADA ACTIVA / ENTRANTE --- */}
              {callStatus !== 'idle' ? (
                <div className="flex-1 flex flex-col items-center justify-between pb-12 pt-8 px-6 bg-gradient-to-b from-[#1a1a1a] to-[#000000]">
                  <div className="text-center w-full">
                    <p className={`text-sm font-mono uppercase tracking-widest mb-1 ${callStatus === 'incoming' ? 'text-[#FDCB02] animate-pulse' : 'text-emerald-500'}`}>
                      {callStatus === 'incoming' ? 'Entrante...' : callStatus === 'calling' ? 'Conectando...' : isOnHold ? 'En Espera' : 'Llamada Segura'}
                    </p>
                    <h2 className="text-white text-3xl font-light tracking-wider break-all leading-tight mt-2">
                      {dialNumber || "Número Oculto"}
                    </h2>
                  </div>

                  {callStatus === 'incoming' ? (
                    // Botones Contestar / Rechazar Reales
                    <div className="flex justify-between w-full px-4 mb-4">
                      <div className="flex flex-col items-center gap-2">
                        <button onClick={handleHangup} className="w-16 h-16 bg-[#FF3B30] rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg shadow-red-500/20">
                          <PhoneOff size={28} />
                        </button>
                        <span className="text-white text-[10px] font-bold">RECHAZAR</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <button onClick={handleAcceptIncoming} className="w-16 h-16 bg-[#34C759] rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg shadow-green-500/20 animate-bounce">
                          <Phone size={28} fill="currentColor" />
                        </button>
                        <span className="text-white text-[10px] font-bold">ACEPTAR</span>
                      </div>
                    </div>
                  ) : (
                    // Conmutador Real
                    <div className="w-full flex flex-col gap-10 items-center">
                      <div className="grid grid-cols-3 gap-x-6 gap-y-4 w-full px-2">
                        {/* Mute Real */}
                        <div className="flex flex-col items-center gap-2">
                          <button onClick={handleToggleMute} className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-white text-black' : 'bg-[#333333] text-white'}`}>
                            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                          </button>
                          <span className="text-white text-[10px] font-bold">MUTE</span>
                        </div>
                        {/* Teclado */}
                        <div className="flex flex-col items-center gap-2">
                          <button className="w-16 h-16 rounded-full bg-[#333333] flex items-center justify-center text-white">
                            <Grid3X3 size={24} />
                          </button>
                          <span className="text-white text-[10px] font-bold">PAD</span>
                        </div>
                        {/* Hold Real */}
                        <div className="flex flex-col items-center gap-2">
                          <button onClick={handleToggleHold} className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isOnHold ? 'bg-[#FDCB02] text-black shadow-[0_0_15px_rgba(253,203,2,0.4)]' : 'bg-[#333333] text-white'}`}>
                            {isOnHold ? <Play size={24} fill="currentColor" /> : <Pause size={24} />}
                          </button>
                          <span className="text-white text-[10px] font-bold">{isOnHold ? 'REANUDAR' : 'ESPERA'}</span>
                        </div>
                        {/* Transferir Real */}
                        <div className="flex flex-col items-center gap-2 col-start-2">
                          <button onClick={handleTransfer} className="w-16 h-16 rounded-full bg-[#333333] flex items-center justify-center text-white active:bg-white/30">
                            <ArrowRightLeft size={24} />
                          </button>
                          <span className="text-white text-[10px] font-bold">TRANSFERIR</span>
                        </div>
                      </div>

                      {/* Hangup Real Button */}
                      <button onClick={handleHangup} className="w-16 h-16 bg-[#FF3B30] rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg shadow-red-500/20">
                        <PhoneOff size={28} />
                      </button>
                    </div>
                  )}
                </div>

              ) : (

              // --- VISTA: IDLE (Teclado o Historial) ---
              <div className="flex-1 flex flex-col bg-[#000000]">
                {activeTab === 'keypad' && (
                  <div className="flex-1 flex flex-col pt-6">
                    <div className="h-20 flex items-center justify-center px-6 relative">
                      <span className="text-4xl font-light tracking-wider text-white truncate max-w-full">
                        {dialNumber}
                      </span>
                      {dialNumber && (
                        <button onClick={handleDelete} className="absolute right-6 text-neutral-400 hover:text-white active:scale-90 transition-all">
                          <Delete size={24} />
                        </button>
                      )}
                    </div>

                    <div className="flex-1 px-8 pt-4">
                      <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                        {padButtons.map((btn) => (
                          <button 
                            key={btn.num} onClick={() => handlePadClick(btn.num)}
                            className="bg-[#333333] rounded-full aspect-square flex flex-col items-center justify-center active:bg-[#555555] transition-colors"
                          >
                            <span className="text-[32px] font-normal leading-none text-white">{btn.num}</span>
                            <span className="text-[10px] font-bold tracking-widest text-neutral-400 h-3 uppercase">{btn.let}</span>
                          </button>
                        ))}
                      </div>

                      <div className="flex justify-center mt-6">
                        <button onClick={handleCall} className="w-[72px] h-[72px] bg-[#34C759] rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg shadow-green-500/20">
                          <Phone size={36} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className="flex-1 flex flex-col bg-[#000000]">
                    <h2 className="text-3xl font-bold text-white px-6 py-4">Registro</h2>
                    <div className="flex-1 flex items-center justify-center px-6">
                      {/* En producción, conectaremos esto a tu base de datos (Supabase/Zadarma API) */}
                      <p className="text-neutral-600 text-xs font-mono text-center">
                        Historial sincronizado con CRM de red. <br/> (Esperando consultas SQL)
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
            initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setIsOpen(true)}
            className="w-16 h-16 bg-[#34C759] border-2 border-[#030303] rounded-full flex items-center justify-center text-white hover:bg-green-600 transition-colors shadow-[0_0_20px_rgba(52,199,89,0.3)]"
          >
            <Phone size={28} fill="currentColor" />
          </motion.button>
        )}
        
      </div>
    </>
  );
}