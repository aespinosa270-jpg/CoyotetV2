'use client';

import React from 'react';
import Link from 'next/link';
import { Cookie, ShieldAlert, Settings, Info, Server } from 'lucide-react';

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-neutral-800">
      
      {/* Header */}
      <div className="bg-black text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-4 text-[#FDCB02]">
            Política de Cookies
          </h1>
          <p className="text-neutral-400 text-lg">
            Transparencia en el uso de datos de navegación
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl py-12 px-4 space-y-12">

        {/* 1. ¿Qué son? */}
        <section>
          <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2">
            <Info className="text-neutral-400" /> 1. ¿Qué son las Cookies?
          </h2>
          <p className="leading-relaxed text-neutral-600">
            Una cookie es un pequeño archivo de texto que se almacena en tu navegador cuando visitas casi cualquier página web. Su utilidad es que la web sea capaz de recordar tu visita cuando vuelvas a navegar por esa página. Las cookies suelen almacenar información de carácter técnico, preferencias personales, personalización de contenidos, estadísticas de uso, enlaces a redes sociales, acceso a cuentas de usuario, etc.
          </p>
        </section>

        {/* 2. Cookies que usamos */}
        <section className="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
          <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2 text-black">
            <Cookie className="text-[#FDCB02]" /> 2. Cookies Utilizadas en este Sitio
          </h2>
          <p className="leading-relaxed text-neutral-600 mb-6">
            En <strong>Coyote Textil</strong> utilizamos cookies propias y de terceros para conseguir que tengas una mejor experiencia de navegación, puedas compartir contenido en redes sociales y para obtener estadísticas de nuestros usuarios.
          </p>
          
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="bg-white p-2 rounded-full border border-neutral-200 shrink-0">
                <Server size={20} className="text-black"/>
              </div>
              <div>
                <h3 className="font-bold text-black uppercase text-sm">Cookies Técnicas (Necesarias)</h3>
                <p className="text-sm text-neutral-500 mt-1">
                  Son aquellas indispensables para el funcionamiento del sitio web. Nos permiten recordar qué artículos has añadido a tu carrito de compras ("CoyoteCart"), mantener tu sesión activa y garantizar la seguridad de la conexión.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="bg-white p-2 rounded-full border border-neutral-200 shrink-0">
                <ShieldAlert size={20} className="text-red-600"/>
              </div>
              <div>
                <h3 className="font-bold text-black uppercase text-sm">Cookies de Seguridad y Antifraude (OpenPay)</h3>
                <p className="text-sm text-neutral-500 mt-1">
                  Utilizamos cookies de terceros proporcionadas por <strong>OpenPay S.A. de C.V.</strong> para generar un identificador de dispositivo (Device ID). Este dato es obligatorio para procesar pagos y ayuda a los bancos a detectar y prevenir transacciones fraudulentas o uso indebido de tarjetas. <strong className="text-black">Estas cookies no almacenan datos personales sensibles.</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Administración */}
        <section>
          <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2">
            <Settings className="text-neutral-400" /> 3. ¿Cómo desactivar las Cookies?
          </h2>
          <p className="leading-relaxed text-neutral-600 mb-4">
            Usted puede permitir, bloquear o eliminar las cookies instaladas en su equipo mediante la configuración de las opciones del navegador instalado en su ordenador. Sin embargo, tenga en cuenta que si desactiva las cookies técnicas, es posible que no pueda completar sus compras en nuestra tienda, ya que el carrito de compras dejará de funcionar.
          </p>
          <ul className="list-disc pl-6 space-y-2 text-neutral-600 text-sm">
            <li><strong>Chrome:</strong> Configuración - Privacidad y seguridad - Cookies y otros datos de sitios.</li>
            <li><strong>Safari:</strong> Preferencias - Privacidad.</li>
            <li><strong>Firefox:</strong> Ajustes - Privacidad y seguridad.</li>
            <li><strong>Edge:</strong> Configuración - Cookies y permisos del sitio.</li>
          </ul>
        </section>

        <div className="pt-12 border-t border-neutral-200">
          <Link href="/" className="text-[#FDCB02] font-bold hover:text-black transition-colors uppercase text-sm">
            &larr; Volver a la tienda
          </Link>
        </div>

      </div>
    </div>
  );
}