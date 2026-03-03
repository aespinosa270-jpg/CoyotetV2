"use client"

import Script from 'next/script';
import { useEffect, useState, useRef } from 'react';

// --- EL ESPÍA COYOTE (Para guardar las llamadas en tu base de datos) ---
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

export default function ZadarmaWidget() {
  const [webrtcKey, setWebrtcKey] = useState<string | null>(null);
  const widgetInjected = useRef(false);

  // 1. Pedir la llave segura a tu backend
  useEffect(() => {
    fetch('/api/zadarma-webrtc')
      .then(res => res.json())
      .then(data => { if (data.key) setWebrtcKey(data.key); })
      .catch(err => console.error("Error pidiendo llave:", err));
  }, []);

  // 2. Interceptar los eventos del Widget para tu CRM
  useEffect(() => {
    (window as any)._coyoteHandler = (args: any[]) => {
      const eventName = args[0];
      const payload = args[1];

      if (typeof eventName === 'string') {
        const action = eventName.toLowerCase();
        if (action === 'incoming') {
          console.log("🐺 CRM NOTA: Entrando llamada de", payload?.caller || "Desconocido");
        } 
        else if (action === 'answered' || action === 'connected') {
          console.log("🐺 CRM NOTA: Agente contestó la llamada");
        } 
        else if (action === 'canceled' || action === 'hangup' || action === 'ended') {
          console.log("🐺 CRM NOTA: Llamada finalizada. Listo para registrar en BD.");
        }
      }
    };
    return () => { (window as any)._coyoteHandler = null; };
  }, []);

  // 3. INYECTAR EL CÓDIGO EXACTO DE ZADARMA (Adaptado a React)
  useEffect(() => {
    if (!webrtcKey) return;
    const w = window as any;
    
    // Evitar que React Strict Mode lo cargue 2 veces
    if (widgetInjected.current) return; 

    const initWidget = () => {
      // Verificamos si los scripts de Zadarma ya se descargaron
      if (w.zadarmaWidgetFn) {
        widgetInjected.current = true;
        
        // 👉 AQUÍ ESTÁ TU CÓDIGO EXACTO TRADUCIDO
        w.zadarmaWidgetFn(
          webrtcKey,              // 'YOUR_KEY'
          '554386-100',           // 'YOUR_SIP' (Tu extensión)
          'rounded',              // 'rounded' (Como lo tienes en tu snippet)
          'es',                   // 'es'
          true,                   // true
          { right: '10px', bottom: '5px', zIndex: '2147483647' } 
        );
      } else {
        // Si la librería no ha cargado, esperamos 300ms y volvemos a intentar
        setTimeout(initWidget, 300);
      }
    };
    
    initWidget();
  }, [webrtcKey]);

  if (!webrtcKey) return null;

  return (
    <>
      {/* Forzamos que el widget original se adapte al modo oscuro si no lo hiciste en el panel */}
      <style dangerouslySetInnerHTML={{__html: `
        .zdrm-webrtc-widget-wrap {
          box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
      `}} />

      {/* Cargamos las librerías oficiales del snippet que me pasaste */}
      <Script 
        src="https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1" 
        strategy="afterInteractive" 
      />
      <Script 
        src="https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1" 
        strategy="afterInteractive" 
      />
    </>
  );
}