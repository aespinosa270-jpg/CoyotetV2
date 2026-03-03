"use client"

import Script from 'next/script';
import { useEffect, useState } from 'react';

export default function ZadarmaWidget() {
  const [webrtcKey, setWebrtcKey] = useState<string | null>(null);

  // 1. Pedir la llave
  useEffect(() => {
    fetch('/api/zadarma-webrtc')
      .then(res => res.json())
      .then(data => { if (data.key) setWebrtcKey(data.key); })
      .catch(err => console.error("Error pidiendo llave:", err));
  }, []);

  // 2. Inyectar Zadarma Native
  useEffect(() => {
    if (!webrtcKey) return;
    
    const initWidget = () => {
      const w = window as any;
      if (w.zadarmaWidgetFn && w.zdrmWebrtcPhoneInterface) {
        w.zadarmaWidgetFn(
          webrtcKey, '554386-100', 'square', 'es', true,
          // Lo posicionamos flotando abajo a la derecha, muy B2B
          { right: '24px', bottom: '24px', zIndex: '2147483647' }
        );
      } else {
        setTimeout(initWidget, 300);
      }
    };
    initWidget();
  }, [webrtcKey]);

  if (!webrtcKey) return null;

  return (
    <>
      {/* 🐺 ESTILO COYOTE: Rediseño por Fuerza Bruta CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Contenedor principal oscuro */
        #zadarma-webphone-widget, .zdrm-webrtc-widget-wrap {
          background-color: #050505 !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 16px !important;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8) !important;
          font-family: ui-sans-serif, system-ui, sans-serif !important;
          color: white !important;
        }

        /* --- PANTALLA Y TEXTOS --- */
        .zdrm-webrtc-widget-input-wrap {
          background-color: #111 !important;
          border-bottom: 1px solid rgba(253,203,2,0.3) !important;
        }
        
        .zdrm-webrtc-widget-input-wrap input {
          color: #FDCB02 !important; /* Amarillo Coyote */
          font-weight: 900 !important;
          font-size: 1.5rem !important;
          background: transparent !important;
          text-align: center !important;
        }

        .zdrm-webrtc-widget-status, .zdrm-webrtc-widget-info {
          color: #a3a3a3 !important;
          font-size: 10px !important;
          text-transform: uppercase !important;
          letter-spacing: 1.5px !important;
          font-weight: bold !important;
        }

        /* --- TECLADO NUMÉRICO --- */
        .zdrm-webrtc-widget-numpad-btn {
          background-color: #1a1a1a !important;
          border: 1px solid rgba(255,255,255,0.05) !important;
          color: white !important;
          border-radius: 12px !important; /* Un poco cuadrados, estilo brutalista */
          transition: all 0.2s !important;
          font-weight: bold !important;
        }
        
        .zdrm-webrtc-widget-numpad-btn:hover {
          background-color: #333 !important;
          border-color: #FDCB02 !important;
          color: #FDCB02 !important;
        }

        /* --- BOTONES PRINCIPALES (Llamar / Colgar) --- */
        .zdrm-webrtc-widget-call-btn, .zdrm-webrtc-widget-answer-btn {
          background-color: #34C759 !important; /* Verde iOS */
          color: white !important;
          border-radius: 50px !important;
          box-shadow: 0 4px 20px rgba(52, 199, 89, 0.3) !important;
        }

        .zdrm-webrtc-widget-hangup-btn, .zdrm-webrtc-widget-decline-btn {
          background-color: #FF3B30 !important; /* Rojo iOS */
          color: white !important;
          border-radius: 50px !important;
          box-shadow: 0 4px 20px rgba(255, 59, 48, 0.3) !important;
        }

        /* --- CONTROLES DE LLAMADA ACTIVA (HOLD Y TRANSFER) --- */
        /* Zadarma renderiza estos botones solo durante la llamada */
        .zdrm-webrtc-widget-action-btn, 
        .zdrm-webrtc-widget-controls button,
        .zdrm-webrtc-widget-transfer-btn,
        .zdrm-webrtc-widget-hold-btn {
          background-color: #222 !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: white !important;
          border-radius: 50% !important; /* Circulares para parecerse al iPhone */
          transition: all 0.3s ease !important;
        }

        /* Hover de los controles */
        .zdrm-webrtc-widget-action-btn:hover,
        .zdrm-webrtc-widget-controls button:hover {
          background-color: #FDCB02 !important;
          color: black !important;
          transform: scale(1.05) !important;
        }

        /* Estado "Activo" (ej. cuando picaste Hold y está parpadeando) */
        .zdrm-webrtc-widget-action-btn.active,
        .zdrm-webrtc-widget-hold-btn.active {
          background-color: #FDCB02 !important;
          color: black !important;
          box-shadow: 0 0 15px rgba(253,203,2,0.5) !important;
          animation: pulse-coyote 2s infinite !important;
        }

        @keyframes pulse-coyote {
          0% { box-shadow: 0 0 0 0 rgba(253,203,2, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(253,203,2, 0); }
          100% { box-shadow: 0 0 0 0 rgba(253,203,2, 0); }
        }
      `}} />

      {/* Motores nativos de Zadarma */}
      <Script src="https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1" strategy="afterInteractive" />
      <Script src="https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1" strategy="afterInteractive" />
    </>
  );
}