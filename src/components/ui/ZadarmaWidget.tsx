"use client"

import Script from 'next/script';
import { useState } from 'react';

export default function ZadarmaWidget() {
  // Estado para saber cuándo la librería base ya está lista
  const [isLibLoaded, setIsLibLoaded] = useState(false);

  return (
    <>
      {/* 1. Cargamos la librería base de Zadarma primero */}
      <Script 
        src="https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1" 
        strategy="afterInteractive"
        onLoad={() => {
          console.log("☎️ Zadarma Lib cargada. Arrancando funciones...");
          setIsLibLoaded(true); // Autorizamos que cargue el segundo script
        }}
      />

      {/* 2. Este script SOLO se inyecta cuando el primero ya terminó (isLibLoaded === true) */}
      {isLibLoaded && (
        <Script 
          src="https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1" 
          strategy="afterInteractive"
          onLoad={() => {
            if (typeof window !== 'undefined' && (window as any).zadarmaWidgetFn) {
              (window as any).zadarmaWidgetFn(
                'YOUR_KEY',  // 👈 PEGA TU LLAVE AQUÍ
                'YOUR_SIP',  // 👈 PEGA TU EXTENSIÓN SIP AQUÍ (Ej: '123456-100')
                'square',    
                'es',        
                true,        
                { right: '24px', bottom: '24px', zIndex: '9999' } // Agregué un zIndex por si algo del CRM lo tapa
              );
              console.log("✅ Teléfono Zadarma inicializado con éxito.");
            }
          }}
        />
      )}
    </>
  );
}