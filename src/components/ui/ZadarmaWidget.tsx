"use client"

import Script from 'next/script';
import { useEffect } from 'react';

export default function ZadarmaWidget() {

  useEffect(() => {
    // Función que "vigila" hasta que Zadarma esté 100% listo en la ventana
    const initWidget = () => {
      const w = window as any;

      // Verificamos que AMBAS librerías maestras existan en el navegador
      if (w.zadarmaWidgetFn && w.zdrmWebrtcPhoneInterface) {
        console.log("✅ Motores de Zadarma listos. Inyectando teléfono...");
        w.zadarmaWidgetFn(
          'f388006ebe099c2ba400',  // Tu Key
          '267018-100',            // Tu SIP
          'square',
          'es',
          true,
          { right: '24px', bottom: '24px', zIndex: '9999' }
        );
      } else {
        // Si todavía no carga, vuelve a checar en 500 milisegundos (medio segundo)
        setTimeout(initWidget, 500);
      }
    };

    // Empezamos la vigilancia en cuanto el componente se monta
    initWidget();
  }, []);

  return (
    <>
      {/* Soltamos los scripts para que Next.js los descargue a su ritmo */}
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