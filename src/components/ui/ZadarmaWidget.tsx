"use client"

import Script from 'next/script';
import { useEffect, useState } from 'react';

export default function ZadarmaWidget() {
  const [webrtcKey, setWebrtcKey] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/zadarma-webrtc')
      .then(res => res.json())
      .then(data => {
        if (data.key) setWebrtcKey(data.key);
      })
      .catch(err => console.error("Error pidiendo llave:", err));
  }, []);

  useEffect(() => {
    if (!webrtcKey) return;

    const initWidget = () => {
      const w = window as any;
      if (w.zadarmaWidgetFn && w.zdrmWebrtcPhoneInterface) {
        w.zadarmaWidgetFn(
          webrtcKey,      
          '554386-100',   
          'square',
          'es',
          true,
          // 👇 Aquí aplicamos la fuerza bruta: el z-index máximo posible en la web
          { right: '24px', bottom: '24px', zIndex: '2147483647' }
        );
      } else {
        setTimeout(initWidget, 500);
      }
    };

    initWidget();
  }, [webrtcKey]);

  if (!webrtcKey) return null;

  return (
    <>
      {/* Forzamos por CSS que el contenedor de Zadarma acepte clics sí o sí */}
      <style dangerouslySetInnerHTML={{__html: `
        #zadarma-webphone-widget, 
        .zadarma-widget-webrtc {
          pointer-events: auto !important;
          z-index: 2147483647 !important;
        }
      `}} />

      <Script src="https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1" strategy="afterInteractive" />
      <Script src="https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1" strategy="afterInteractive" />
    </>
  );
}