'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Scale, AlertCircle, Truck, CreditCard } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-neutral-800">
      
      {/* Header Simple */}
      <div className="bg-black text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-4 text-[#FDCB02]">
            Términos y Condiciones
          </h1>
          <p className="text-neutral-400 text-lg">
            Última actualización: Febrero 2026
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl py-12 px-4 space-y-12">

        {/* 1. Introducción */}
        <section>
          <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2">
            1. Introducción
          </h2>
          <p className="leading-relaxed text-neutral-600">
            Bienvenido a <strong>Coyote Textil</strong>. Al acceder y realizar compras en nuestro sitio web (coyotetextil.com), aceptas los siguientes términos y condiciones. Nos reservamos el derecho de modificar estas políticas en cualquier momento sin previo aviso. Te recomendamos revisarlas periódicamente.
          </p>
        </section>

        {/* 2. Productos y Especificaciones (TUS REGLAS DE PESO) */}
        <section className="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
          <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2 text-black">
            <Scale className="text-[#FDCB02]" /> 2. Especificaciones de Producto
          </h2>
          <p className="leading-relaxed text-neutral-600 mb-4">
            En Coyote Textil nos esforzamos por mostrar con la mayor precisión posible los colores y características de nuestros productos. Sin embargo:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-neutral-600">
            <li>
              <strong>Pesos Aproximados:</strong> Los pesos indicados en los rollos de tela (kg) son <strong>aproximados y pueden variar</strong> debido a factores de fabricación, humedad y calibración. No garantizamos un peso exacto al gramo.
            </li>
            <li>
              <strong>Colores:</strong> La visualización de los colores puede variar dependiendo del monitor de tu dispositivo. No garantizamos que el color mostrado en pantalla sea idéntico al producto físico.
            </li>
            <li>
              <strong>Disponibilidad:</strong> Todos los pedidos están sujetos a la disponibilidad del producto. Si un artículo se agota después de tu pedido, te contactaremos para ofrecerte un reembolso o un cambio.
            </li>
          </ul>
        </section>

        {/* 3. Política de Devoluciones (TU REGLA DE 15 DÍAS) */}
        <section className="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
          <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2 text-black">
            <AlertCircle className="text-[#FDCB02]" /> 3. Cambios y Devoluciones
          </h2>
          <p className="leading-relaxed text-neutral-600 mb-4">
            Nuestra política de devoluciones es estricta para garantizar la calidad e higiene de nuestros textiles:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-neutral-600">
            <li>
              Solo aceptamos cambios o devoluciones dentro de los primeros <strong>15 días naturales</strong> posteriores a la recepción de tu pedido.
            </li>
            <li>
              <strong>Causa Única:</strong> Los cambios aplican <strong>exclusivamente por DEFECTOS DE FÁBRICA</strong> (roturas, manchas de origen, fallas en el tejido). No aceptamos devoluciones por cambios de opinión, error al elegir el color o porque el peso varió dentro de los rangos tolerables.
            </li>
            <li>
              <strong>Condición:</strong> El producto debe estar intacto, sin cortes, sin haber sido lavado y en su empaque original. Rollos cortados o procesados pierden automáticamente la garantía.
            </li>
          </ul>
        </section>

        {/* 4. Envíos y Entregas */}
        <section>
          <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2">
            <Truck className="text-neutral-400" /> 4. Envíos
          </h2>
          <p className="leading-relaxed text-neutral-600">
            Los tiempos de entrega son estimados (generalmente de 3 a 5 días hábiles). Coyote Textil no se hace responsable por retrasos causados por la paquetería externa, desastres naturales o situaciones de fuerza mayor. Una vez que el paquete sale de nuestra bodega, la responsabilidad del traslado recae en la empresa de logística, aunque te asistiremos en el seguimiento.
          </p>
        </section>

        {/* 5. Pagos y Facturación */}
        <section>
          <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2">
            <CreditCard className="text-neutral-400" /> 5. Pagos y Facturación
          </h2>
          <p className="leading-relaxed text-neutral-600 mb-4">
            Aceptamos pagos mediante tarjetas de crédito/débito (Visa, Mastercard, Amex) procesados de forma segura a través de <strong>OpenPay</strong>. 
          </p>
          <p className="leading-relaxed text-neutral-600">
            Si requieres factura, deberás solicitarla dentro del mismo mes calendario de tu compra enviando tus datos fiscales a facturacion@coyotetextil.com.
          </p>
        </section>

        {/* 6. Seguridad */}
        <section>
          <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2">
            <ShieldCheck className="text-neutral-400" /> 6. Seguridad
          </h2>
          <p className="leading-relaxed text-neutral-600">
            Tus datos de pago son procesados bajo estándares de seguridad bancaria (PCI DSS). Coyote Textil no almacena ni tiene acceso a los números completos de tus tarjetas.
          </p>
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