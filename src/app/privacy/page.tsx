'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Eye, FileText, Shield, UserCheck, Cookie } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-neutral-800">
      
      {/* Header */}
      <div className="bg-black text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-4 text-[#FDCB02]">
            Aviso de Privacidad
          </h1>
          <p className="text-neutral-400 text-lg">
            Coyote Textil • Cumplimiento LFPDPPP
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl py-12 px-4 space-y-12">

        {/* 1. Responsable */}
        <section>
          <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2">
            1. Identidad del Responsable
          </h2>
          <p className="leading-relaxed text-neutral-600">
            <strong>Coyote Textil</strong> (en adelante "El Responsable"), con domicilio fiscal en Nuevo León, México, y portal de internet <strong>coyotetextil.com</strong>, es el responsable del uso y protección de sus datos personales, y al respecto le informamos lo siguiente:
          </p>
        </section>

        {/* 2. Datos Recabados */}
        <section className="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
          <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2 text-black">
            <Eye className="text-[#FDCB02]" /> 2. Datos Personales Recabados
          </h2>
          <p className="leading-relaxed text-neutral-600 mb-4">
            Para llevar a cabo las finalidades descritas en el presente aviso de privacidad, utilizaremos los siguientes datos personales:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-neutral-600">
            <li>Datos de identificación (Nombre completo).</li>
            <li>Datos de contacto (Teléfono, Correo electrónico, Dirección de envío y facturación).</li>
            <li>Datos fiscales (RFC, Razón Social) para facturación.</li>
            <li>
              <strong>Datos patrimoniales o financieros:</strong> Se recaban datos tokenizados de tarjetas bancarias exclusivamente para procesar pagos a través de la pasarela segura OpenPay. Coyote Textil <strong>NO almacena</strong> códigos de seguridad (CVV) ni números completos de tarjetas en sus servidores.
            </li>
          </ul>
        </section>

        {/* 3. Finalidades */}
        <section>
          <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2">
            <FileText className="text-neutral-400" /> 3. Finalidades del Tratamiento
          </h2>
          <p className="leading-relaxed text-neutral-600 mb-4">
            Sus datos personales serán utilizados para las siguientes finalidades necesarias para el servicio solicitado:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-neutral-600">
            <li>Procesamiento, seguimiento y envío de pedidos de telas y textiles.</li>
            <li>Facturación y cobranza.</li>
            <li>Detección y prevención de fraudes en transacciones electrónicas (vía OpenPay).</li>
            <li>Atención al cliente y seguimiento post-venta (garantías y devoluciones).</li>
          </ul>
        </section>

        {/* 4. Transferencias (OpenPay) */}
        <section className="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
          <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2 text-black">
            <Shield className="text-[#FDCB02]" /> 4. Transferencia de Datos
          </h2>
          <p className="leading-relaxed text-neutral-600">
            Le informamos que sus datos personales son compartidos dentro y fuera del país con las siguientes personas, empresas, organizaciones o autoridades distintas a nosotros, para los siguientes fines:
          </p>
          <ul className="mt-4 list-disc pl-6 space-y-2 text-neutral-600">
            <li>
              <strong>OpenPay S.A. de C.V.:</strong> Con la finalidad de procesar los pagos electrónicos y realizar validaciones de seguridad antifraude.
            </li>
            <li>
              <strong>Proveedores de Logística (Paqueterías):</strong> Con la finalidad de realizar la entrega física de los productos adquiridos.
            </li>
          </ul>
        </section>

        {/* 5. Derechos ARCO */}
        <section>
          <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2">
            <UserCheck className="text-neutral-400" /> 5. Derechos ARCO
          </h2>
          <p className="leading-relaxed text-neutral-600 mb-4">
            Usted tiene derecho a conocer qué datos personales tenemos de usted, para qué los utilizamos y las condiciones del uso que les damos (Acceso). Asimismo, es su derecho solicitar la corrección de su información personal en caso de que esté desactualizada, sea inexacta o incompleta (Rectificación); que la eliminemos de nuestros registros o bases de datos cuando considere que la misma no está siendo utilizada adecuadamente (Cancelación); así como oponerse al uso de sus datos personales para fines específicos (Oposición).
          </p>
          <p className="leading-relaxed text-neutral-600">
            Para el ejercicio de cualquiera de los derechos ARCO, usted deberá presentar la solicitud respectiva enviando un correo electrónico a: <strong>privacidad@coyotetextil.com</strong>.
          </p>
        </section>

        {/* 6. Cookies */}
        <section>
          <h2 className="text-2xl font-bold uppercase mb-4 flex items-center gap-2">
            <Cookie className="text-neutral-400" /> 6. Uso de Tecnologías de Rastreo
          </h2>
          <p className="leading-relaxed text-neutral-600">
            Le informamos que en nuestra página de internet utilizamos cookies y otras tecnologías, a través de las cuales es posible monitorear su comportamiento como usuario de internet, así como brindarle un mejor servicio y experiencia al navegar en nuestra página. Los datos personales que recabamos a través de estas tecnologías, los utilizaremos para: Mantener su sesión activa, recordar los artículos en su carrito de compras y fines estadísticos.
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