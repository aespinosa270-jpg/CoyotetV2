"use client"

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, Delete, X, PhoneOff, Mic, MicOff, 
  Clock, Grid3X3, Pause, ArrowRightLeft, PhoneIncoming 
} from 'lucide-react';

// --- DATA MOCK (Historial) ---
const mockHistory = [
  { id: 1, number: '+52 55 1234 5678', type: 'missed', time: '10:45', date: 'Hoy' },
  { id: 2, number: '+52 81 4455 6677', type: 'outgoing', time: '09:15', date: 'Hoy' },
  { id: 3, number: '+52 33 9876 5432', type: 'incoming', time: 'Ayer', date: 'Ayer' },
];

const padButtons = [
  { num: '1', let: '' }, { num: '2', let: 'ABC' }, { num: '3', let: 'DEF' },
  { num: '4', let: 'GHI' }, { num: '5', let: 'JKL' }, { num: '6', let: 'MNO' },
  { num: '7', let: 'PQRS' }, { num: '8', let: 'TUV' }, { num: '9', let: 'WXYZ' },
  { num: '*', let: '' }, { num: '0', let: '+' }, { num: '#', let: '' }
];

export default function ZadarmaWidget() {
  const [webrtcKey, setWebrtcKey] = useState<string | null>(null);
  
  // --- Estados de nuestro iPhone Dialer ---
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'keypad' | 'history'>('keypad');
  const [dialNumber, setDialNumber] = useState("");
  const [callStatus, setCallStatus] = useState<'idle' | 'incoming' | 'calling' | 'connected'>('idle');
  
  // Estados de la llamada en curso
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);

  // 1. Pedimos llave segura
  useEffect(() => {
    fetch('/api/zadarma-webrtc')
      .then(res => res.json())
      .then(data => { if (data.key) setWebrtcKey(data.key); })
      .catch(err => console.error("Error pidiendo llave:", err));
  }, []);

  // 2. Inyectamos Zadarma Oculto
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
  }, [webrtcKey]);

  // --- LÓGICA DEL TELÉFONO ---
  const handlePadClick = (val: string) => setDialNumber(prev => prev + val);
  const handleDelete = () => setDialNumber(prev => prev.slice(0, -1));

  const handleCall = () => {
    if (!dialNumber) return;
    setCallStatus('calling');
    const w = window as any;
    if (w.zdrmWebrtcPhoneInterface) {
      try { w.zdrmWebrtcPhoneInterface.call(dialNumber); } catch (e) {}
    }
    setTimeout(() => setCallStatus('connected'), 2000); // Simulación de conexión
  };

  const handleHangup = () => {
    const w = window as any;
    if (w.zdrmWebrtcPhoneInterface) {
      try { w.zdrmWebrtcPhoneInterface.hangup(); } catch (e) {}
    }
    setCallStatus('idle');
    setDialNumber("");
    setIsMuted(false);
    setIsOnHold(false);
  };

  const handleAcceptIncoming = () => {
    // Aquí iría zdrmWebrtcPhoneInterface.answer()
    setCallStatus('connected');
  };

  const handleTransfer = () => {
    const ext = prompt("Ingresa la extensión para transferir:");
    if (ext) {
      console.log(`Transfiriendo a la extensión ${ext}...`);
      // Lógica de transferencia API Zadarma
      alert(`Llamada transferida a la extensión ${ext}`);
      handleHangup();
    }
  };

  // Simular una llamada entrante (Solo para que veas el diseño, luego lo conectamos al evento real de Zadarma)
  const simulateIncoming = () => {
    setDialNumber("+52 55 9988 7766");
    setCallStatus('incoming');
    setIsOpen(true);
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

      {/* BOTÓN TEST: Llamada Entrante (Bórralo en producción) */}
      <button onClick={simulateIncoming} className="fixed bottom-24 right-6 bg-white/10 text-white px-4 py-2 rounded-full text-xs z-50">
        Simular Entrante
      </button>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="fixed bottom-6 right-6 z-[2147483647] flex flex-col items-end">
        
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              // Proporciones tipo iPhone
              className="bg-[#000000] border border-white/20 rounded-[40px] shadow-2xl overflow-hidden w-[320px] h-[650px] flex flex-col relative"
            >
              {/* Header Top (Status Bar Fake) */}
              <div className="flex justify-between items-center px-6 pt-4 pb-2 z-10">
                <span className="text-[10px] font-bold text-white">Zadarma</span>
                <button onClick={() => setIsOpen(false)} className="bg-white/10 p-1.5 rounded-full text-neutral-400 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>

              {/* --- VISTA: LLAMADA ACTIVA / ENTRANTE --- */}
              {callStatus !== 'idle' ? (
                <div className="flex-1 flex flex-col items-center justify-between pb-12 pt-8 px-6 bg-gradient-to-b from-[#1a1a1a] to-[#000000]">
                  <div className="text-center w-full">
                    <p className="text-neutral-400 text-lg mb-1">
                      {callStatus === 'incoming' ? 'Llamada Entrante...' : callStatus === 'calling' ? 'Llamando...' : '00:14'}
                    </p>
                    <h2 className="text-white text-3xl font-light tracking-wider break-all leading-tight">
                      {dialNumber}
                    </h2>
                  </div>

                  {callStatus === 'incoming' ? (
                    // Botones iOS Incoming
                    <div className="flex justify-between w-full px-4 mb-4">
                      <div className="flex flex-col items-center gap-2">
                        <button onClick={handleHangup} className="w-16 h-16 bg-[#FF3B30] rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg shadow-red-500/20">
                          <PhoneOff size={28} />
                        </button>
                        <span className="text-white text-xs">Rechazar</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <button onClick={handleAcceptIncoming} className="w-16 h-16 bg-[#34C759] rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg shadow-green-500/20 animate-bounce">
                          <Phone size={28} fill="currentColor" />
                        </button>
                        <span className="text-white text-xs">Aceptar</span>
                      </div>
                    </div>
                  ) : (
                    // Grid de Opciones iOS Active Call
                    <div className="w-full flex flex-col gap-10 items-center">
                      <div className="grid grid-cols-3 gap-x-6 gap-y-4 w-full px-2">
                        {/* Mute */}
                        <div className="flex flex-col items-center gap-2">
                          <button onClick={() => setIsMuted(!isMuted)} className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-white text-black' : 'bg-[#333333] text-white'}`}>
                            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                          </button>
                          <span className="text-white text-[10px]">Silenciar</span>
                        </div>
                        {/* Teclado */}
                        <div className="flex flex-col items-center gap-2">
                          <button className="w-16 h-16 rounded-full bg-[#333333] flex items-center justify-center text-white">
                            <Grid3X3 size={24} />
                          </button>
                          <span className="text-white text-[10px]">Teclado</span>
                        </div>
                        {/* Hold (Pausa) */}
                        <div className="flex flex-col items-center gap-2">
                          <button onClick={() => setIsOnHold(!isOnHold)} className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isOnHold ? 'bg-[#FDCB02] text-black' : 'bg-[#333333] text-white'}`}>
                            <Pause size={24} fill={isOnHold ? "currentColor" : "none"} />
                          </button>
                          <span className="text-white text-[10px]">Retener</span>
                        </div>
                        {/* Transferir */}
                        <div className="flex flex-col items-center gap-2 col-start-2">
                          <button onClick={handleTransfer} className="w-16 h-16 rounded-full bg-[#333333] flex items-center justify-center text-white active:bg-white/30">
                            <ArrowRightLeft size={24} />
                          </button>
                          <span className="text-white text-[10px]">Transferir</span>
                        </div>
                      </div>

                      {/* Hangup Red Button */}
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
                    {/* Display de Números */}
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

                    {/* Pad iOS */}
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
                    <h2 className="text-3xl font-bold text-white px-6 py-4">Recientes</h2>
                    <div className="flex-1 overflow-y-auto px-6 space-y-4">
                      {mockHistory.map((call) => (
                        <div key={call.id} className="flex justify-between items-center border-b border-[#333] pb-3">
                          <div className="flex items-center gap-3">
                            {call.type === 'missed' ? <PhoneIncoming size={14} className="text-[#FF3B30]" /> : <Phone size={14} className="text-neutral-500" />}
                            <div className="flex flex-col">
                              <span className={`font-medium ${call.type === 'missed' ? 'text-[#FF3B30]' : 'text-white'}`}>{call.number}</span>
                              <span className="text-xs text-neutral-500">Teléfono • {call.date}</span>
                            </div>
                          </div>
                          <span className="text-xs text-neutral-500">{call.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* iOS Bottom Navigation Bar */}
                <div className="h-20 bg-[#111111]/90 backdrop-blur-xl border-t border-[#333333] flex justify-around items-center px-4 pb-4">
                  <button 
                    onClick={() => setActiveTab('history')} 
                    className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-[#FDCB02]' : 'text-neutral-500'}`}
                  >
                    <Clock size={24} fill={activeTab === 'history' ? "currentColor" : "none"} />
                    <span className="text-[10px] font-medium">Historial</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('keypad')} 
                    className={`flex flex-col items-center gap-1 ${activeTab === 'keypad' ? 'text-[#FDCB02]' : 'text-neutral-500'}`}
                  >
                    <Grid3X3 size={24} />
                    <span className="text-[10px] font-medium">Teclado</span>
                  </button>
                </div>
              </div>

              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botón Flotante Master */}
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