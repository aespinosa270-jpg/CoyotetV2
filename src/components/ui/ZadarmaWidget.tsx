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
                'f388006ebe099c2ba400',  // 👈 Tu Llave (Key)
                '267018-100',            // 👈 Tu extensión SIP de la centralita
                'square',                // Diseño del widget
                'es',                    // Idioma
                true,                    // Habilitar llamadas desde el navegador
                { right: '24px', bottom: '24px', zIndex: '9999' } // Ajustes visuales
              );
              console.log("✅ Teléfono Zadarma inicializado con éxito.");
            }
          }}
        />
      )}
    </>
  );
}