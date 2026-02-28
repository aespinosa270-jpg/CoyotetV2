"use client"

import Script from 'next/script';

export default function ZadarmaWidget() {
  return (
    <>
      {/* 1. Cargamos la librería base de Zadarma */}
      <Script 
        src="https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1" 
        strategy="afterInteractive" 
      />

      {/* 2. Cargamos las funciones y arrancamos el teléfono en cuanto termine de cargar */}
      <Script 
        src="https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1" 
        strategy="afterInteractive"
        onLoad={() => {
          // Esta es la traducción exacta de tu código JS a React
          if (typeof window !== 'undefined' && (window as any).zadarmaWidgetFn) {
            (window as any).zadarmaWidgetFn(
              'YOUR_KEY',  // 👈 1. PEGA TU LLAVE AQUÍ (Mantén las comillas simples)
              'YOUR_SIP',  // 👈 2. PEGA TU EXTENSIÓN SIP AQUÍ (Ej: '123456-100')
              'square',    // Diseño cuadrado (puedes cambiar a 'rounded')
              'es',        // Idioma español
              true,        // Habilitar llamadas desde el navegador
              { right: '24px', bottom: '24px' } // Lo moví un poco para que no quede pegado al borde
            );
          }
        }}
      />
    </>
  );
}