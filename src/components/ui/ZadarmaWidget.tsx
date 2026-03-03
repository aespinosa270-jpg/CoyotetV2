"use client"

import Script from 'next/script';
import { useEffect, useState } from 'react';

export default function ZadarmaWidget() {
  const [webrtcKey, setWebrtcKey] = useState<string | null>(null);

  useEffect(() => {
    // 1. Pedimos la llave segura a nuestro servidor interno
    fetch('/api/zadarma-webrtc')
      .then(res => res.json())
      .then(data => {
        if (data.key) {
          setWebrtcKey(data.key);
        } else {
          console.error("Zadarma rebotó la petición de la llave:", data);
        }
      })
      .catch(err => console.error("Error pidiendo llave:", err));
  }, []);

  useEffect(() => {
    if (!webrtcKey) return; // No intentamos cargar nada si no hay llave

    // 2. Vigilamos que los scripts de Zadarma estén listos en el navegador
    const initWidget = () => {
      const w = window as any;
      if (w.zadarmaWidgetFn && w.zdrmWebrtcPhoneInterface) {
        console.log("✅ Llave dinámica obtenida. Inyectando teléfono...");
        w.zadarmaWidgetFn(
          webrtcKey,      // 👈 Se inyecta la llave dinámica generada
          '267018-100',   // 👈 Tu SIP con extensión
          'square',
          'es',
          true,
          { right: '24px', bottom: '24px', zIndex: '9999' }
        );
      } else {
        setTimeout(initWidget, 500);
      }
    };

    initWidget();
  }, [webrtcKey]);

  // Mientras no tengamos la llave, no cargamos ni los scripts visuales
  if (!webrtcKey) return null;

  return (
    <>
      <Script src="https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-lib.js?sub_v=1" strategy="afterInteractive" />
      <Script src="https://my.zadarma.com/webphoneWebRTCWidget/v9/js/loader-phone-fn.js?sub_v=1" strategy="afterInteractive" />
    </>
  );
}