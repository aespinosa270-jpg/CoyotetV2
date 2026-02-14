"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { jsPDF } from "jspdf";
import { 
  Lock, Eye, FileText, Shield, UserCheck, Cookie, 
  Download, ChevronLeft, Loader2
} from 'lucide-react';

export default function PrivacyPage() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = () => {
    setIsDownloading(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const marginLeft = 20;
      let currentY = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxTextWidth = pageWidth - (marginLeft * 2);

      // --- ENCABEZADO ---
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, pageWidth, 30, 'F');
      
      doc.setFillColor(253, 203, 2); 
      doc.rect(0, 30, pageWidth, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(24);
      doc.text("COYOTE.", marginLeft, 20);

      currentY = 45;

      // --- TÍTULO PRINCIPAL ---
      doc.setTextColor(10, 10, 10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      const mainTitle = "AVISO DE PRIVACIDAD INTEGRAL Y TRATAMIENTO DE DATOS PERSONALES";
      doc.text(mainTitle, pageWidth / 2, currentY, { align: "center" });
      
      currentY += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Coyote Textil • Cumplimiento Normativo LFPDPPP", pageWidth / 2, currentY, { align: "center" });

      currentY += 15;

      const addText = (text: string, isBold: boolean = false, isTitle: boolean = false) => {
        if (isTitle) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          currentY += 5; 
        } else if (isBold) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
        }

        const lines = doc.splitTextToSize(text, maxTextWidth);
        
        if (currentY + (lines.length * 5) > 280) {
          doc.addPage();
          currentY = 20;
          
          doc.setFillColor(10, 10, 10);
          doc.rect(0, 0, pageWidth, 15, 'F');
          doc.setFillColor(253, 203, 2);
          doc.rect(0, 15, pageWidth, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bolditalic");
          doc.setFontSize(12);
          doc.text("COYOTE.", marginLeft, 10);
          
          currentY = 30; 
          
          if (isTitle) doc.setFont("helvetica", "bold");
          else if (isBold) doc.setFont("helvetica", "bold");
          else doc.setFont("helvetica", "normal");
          doc.setTextColor(10, 10, 10);
        }

        doc.text(lines, marginLeft, currentY);
        currentY += (lines.length * 5) + 2; 
      };

      // --- CONTENIDO LEGAL EXACTO ---
      
      addText("1. IDENTIDAD Y DOMICILIO DEL RESPONSABLE", false, true);
      addText("Coyote Textil (en adelante \"El Responsable\" o \"La Empresa\"), con domicilio físico y legal ubicado en Calle República de Guatemala No. 97, Local A, Colonia Centro (Área 1), Alcaldía Cuauhtémoc, C.P. 06000, Ciudad de México, y portal de internet oficial coyotetextil.com, es la entidad jurídica responsable de la obtención, uso, almacenamiento, protección y transferencia de sus datos personales (en adelante, \"El Tratamiento\"). Al ingresar sus datos en nuestro sitio, usted (en adelante \"El Titular\") acepta de manera expresa, informada e inequívoca los términos del presente Aviso de Privacidad.");

      addText("2. DATOS PERSONALES SOMETIDOS A TRATAMIENTO", false, true);
      addText("Para llevar a cabo las operaciones mercantiles, de logística y tecnológicas descritas en nuestros Términos y Condiciones, El Responsable recabará y tratará las siguientes categorías de datos personales:");
      addText("• Datos de Identificación: Nombre completo, denominación o razón social, firma autógrafa o electrónica.");
      addText("• Datos de Contacto: Teléfono fijo o celular, correo electrónico corporativo o personal, dirección física de envío, entrega y facturación.");
      addText("• Datos Fiscales y Patrimoniales: Registro Federal de Contribuyentes (RFC), Constancia de Situación Fiscal, uso de CFDI.");
      addText("• Datos Financieros: Se recaban datos tokenizados de tarjetas de crédito/débito exclusivamente para el procesamiento de pagos a través de la pasarela segura OpenPay (Certificación PCI DSS). Coyote Textil declara expresamente que NO almacena, no retiene y no tiene acceso a códigos de seguridad (CVV/CVC), NIPs, ni números de cuenta completos en sus servidores o bases de datos locales.");
      addText("• Datos Sensibles: El Responsable le informa que NO recaba ni trata datos personales sensibles (origen racial, estado de salud, creencias religiosas, etc.) bajo ninguna circunstancia.");

      addText("3. FINALIDADES DEL TRATAMIENTO (PRIMARIAS Y SECUNDARIAS)", false, true);
      addText("Los datos personales del Titular serán utilizados estrictamente para las siguientes finalidades:");
      addText("A. Finalidades Primarias (Necesarias para la relación jurídica y comercial):");
      addText("• Procesamiento, confirmación, seguimiento y envío logístico de los pedidos de rollos textiles adquiridos en la plataforma.");
      addText("• Emisión de comprobantes fiscales (CFDI 4.0) y gestión de cobranza.");
      addText("• Creación y administración del perfil de usuario (Membresías/Accesos B2B) en la plataforma.");
      addText("• Cumplimiento de obligaciones contractuales, gestión de garantías y devoluciones por defectos de fábrica.");
      addText("• Prevención y detección de fraudes electrónicos en coordinación con OpenPay y autoridades competentes.");
      addText("B. Finalidades Secundarias (Marketing, Publicidad y Prospección Comercial):");
      addText("Al aceptar el presente Aviso de Privacidad y/o al registrarse en nuestra plataforma, El Titular otorga su consentimiento expreso a Coyote Textil para conservar y utilizar sus datos de contacto con el fin de enviarle notificaciones, boletines, promociones exclusivas, ofertas comerciales, encuestas de calidad y material publicitario relacionado con nuestros productos y servicios.");
      addText("Cláusula de Negativa: En caso de que El Titular no desee que sus datos personales sean tratados para estas Finalidades Secundarias, cuenta con un plazo de 5 (cinco) días hábiles desde la aceptación de este aviso para enviar un correo a privacidad@coyotetextil.com manifestando su negativa. La negativa para el uso de sus datos con estos fines no será motivo para negarle la compra de productos o el acceso a la plataforma.");

      addText("4. TRANSFERENCIA DE DATOS A TERCEROS", false, true);
      addText("El Titular acepta y autoriza expresamente que Coyote Textil transfiera sus datos personales, dentro y fuera del país, exclusivamente a los siguientes terceros y para los fines jurídicamente justificados:");
      addText("• OpenPay S.A. de C.V. / Instituciones Bancarias: Con la finalidad de procesar transacciones financieras, ejecutar cobros recurrentes de membresías y realizar validaciones algorítmicas antifraude.");
      addText("• Proveedores de Logística y Paquetería: Con la finalidad exclusiva de documentar guías de envío y realizar la entrega física de la mercancía.");
      addText("• Autoridades Gubernamentales y Fiscales (SAT): Cuando sea requerido por mandato de ley o para el cumplimiento de obligaciones tributarias y prevención de lavado de dinero.");
      addText("Exención de Responsabilidad Cibernética: Coyote Textil exige a sus proveedores el cumplimiento de la LFPDPPP; sin embargo, La Empresa se deslinda de cualquier responsabilidad legal, civil o penal derivada de vulneraciones, hackeos o mal uso de datos que ocurran en los servidores de terceros (pasarelas de pago o paqueterías) una vez que la información ha sido transferida bajo los protocolos de seguridad correspondientes.");

      addText("5. EJERCICIO DE DERECHOS ARCO (Acceso, Rectificación, Cancelación y Oposición)", false, true);
      addText("El Titular tiene el derecho constitucional de conocer qué datos personales tenemos, para qué los utilizamos (Acceso); solicitar la corrección de su información si está desactualizada o inexacta (Rectificación); pedir que eliminemos su información de nuestras bases de datos si considera que no se utiliza adecuadamente (Cancelación); o negarse al uso de sus datos para fines específicos (Oposición).");
      addText("Para ejercer cualquier derecho ARCO, El Titular deberá enviar una solicitud formal al correo privacidad@coyotetextil.com, adjuntando:");
      addText("• Nombre completo del Titular y correo electrónico para recibir respuesta.");
      addText("• Copia digital de un documento de identidad oficial vigente (INE, Pasaporte, Cédula Profesional).");
      addText("• Descripción clara, precisa y detallada de los datos personales respecto de los que se busca ejercer el derecho.");
      addText("El Responsable emitirá una resolución vinculante en un plazo máximo de 20 (veinte) días hábiles contados a partir de la recepción de la solicitud completa.");

      addText("6. USO DE COOKIES, WEB BEACONS Y TECNOLOGÍAS DE RASTREO", false, true);
      addText("Coyote Textil emplea \"Cookies\", web beacons y tecnologías de rastreo automatizadas en coyotetextil.com. Estas herramientas recopilan datos como direcciones IP, tipo de navegador, sistema operativo y comportamiento de navegación (clics, tiempo en página, carrito de compras).");
      addText("Estos datos son de uso estrictamente técnico, estadístico y analítico para garantizar el correcto funcionamiento del ecosistema B2B, mantener la sesión del usuario activa y personalizar la experiencia del cliente. El Titular puede deshabilitar estas tecnologías directamente desde la configuración de su navegador web, bajo el entendimiento de que esto podría degradar drásticamente la funcionalidad del sitio o impedir la realización de compras.");

      addText("7. MODIFICACIONES AL AVISO DE PRIVACIDAD", false, true);
      addText("Coyote Textil se reserva el derecho absoluto de efectuar, en cualquier momento, modificaciones, adendas o actualizaciones al presente Aviso de Privacidad, para la atención de novedades legislativas, políticas internas o nuevos requerimientos operativos. Estas modificaciones estarán disponibles al público de manera inmediata a través de la actualización de este documento en la sección \"Aviso de Privacidad\" de la página web coyotetextil.com. Constituye una obligación ineludible del Titular revisar periódicamente este apartado.");

      doc.save(`Coyote_Textil_Aviso_Privacidad_${new Date().getFullYear()}.pdf`);

    } catch (error) {
      console.error("Error generando PDF de Privacidad", error);
      alert("Hubo un error al generar el documento legal.");
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-800 pb-24 selection:bg-[#FDCB02] selection:text-black">
      
      {/* Header Legal */}
      <div className="bg-[#050505] text-white py-16 px-4 relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="container mx-auto max-w-4xl relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-[#FDCB02] transition-colors text-[10px] font-black uppercase tracking-[0.2em] mb-8">
            <ChevronLeft size={14} /> Volver a la Tienda
          </Link>
          <h1 className="text-4xl md:text-5xl font-[1000] uppercase tracking-tighter mb-4 text-white italic">
            Aviso de <span className="text-[#FDCB02]">Privacidad</span>
          </h1>
          <p className="text-neutral-400 text-xs font-mono uppercase tracking-widest border border-white/10 inline-block px-3 py-1 rounded bg-black/50">
            Coyote Textil • Cumplimiento Normativo LFPDPPP
          </p>
        </div>
      </div>

      {/* Botón Flotante para Descargar PDF */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200 py-4 px-4 shadow-sm">
        <div className="container mx-auto max-w-4xl flex justify-between items-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hidden sm:block">
                Documento Legal Vinculante
            </p>
            <button 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="ml-auto flex items-center gap-2 bg-[#FDCB02] hover:bg-black text-black hover:text-white px-6 py-3 rounded text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg disabled:opacity-50"
            >
              {isDownloading ? (
                <><Loader2 size={14} className="animate-spin"/> Procesando Documento...</>
              ) : (
                <><Download size={14}/> Descargar PDF Oficial</>
              )}
            </button>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl py-12 px-4 space-y-16">

        {/* 1. IDENTIDAD Y DOMICILIO DEL RESPONSABLE */}
        <section>
          <h2 className="text-2xl font-[900] uppercase mb-6 flex items-center gap-3 text-black border-b-2 border-black pb-2">
            <span className="text-[#FDCB02]">1.</span> Identidad y Domicilio del Responsable
          </h2>
          <div className="space-y-4 text-sm text-neutral-600 leading-relaxed text-justify">
              <p>
                <strong>Coyote Textil</strong> (en adelante "El Responsable" o "La Empresa"), con domicilio físico y legal ubicado en Calle República de Guatemala No. 97, Local A, Colonia Centro (Área 1), Alcaldía Cuauhtémoc, C.P. 06000, Ciudad de México, y portal de internet oficial <strong>coyotetextil.com</strong>, es la entidad jurídica responsable de la obtención, uso, almacenamiento, protección y transferencia de sus datos personales (en adelante, "El Tratamiento"). Al ingresar sus datos en nuestro sitio, usted (en adelante "El Titular") acepta de manera expresa, informada e inequívoca los términos del presente Aviso de Privacidad.
              </p>
          </div>
        </section>

        {/* 2. DATOS PERSONALES SOMETIDOS A TRATAMIENTO */}
        <section className="bg-neutral-50 p-8 border border-neutral-200">
          <h2 className="text-xl font-[900] uppercase mb-6 flex items-center gap-3 text-black">
            <Eye className="text-[#FDCB02]" size={24} /> 
            <span className="text-[#FDCB02]">2.</span> Datos Personales Sometidos a Tratamiento
          </h2>
          <p className="text-sm text-neutral-600 mb-6 text-justify">
            Para llevar a cabo las operaciones mercantiles, de logística y tecnológicas descritas en nuestros Términos y Condiciones, El Responsable recabará y tratará las siguientes categorías de datos personales:
          </p>
          <ul className="space-y-4 text-sm text-neutral-600 text-justify">
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Datos de Identificación:</strong> Nombre completo, denominación o razón social, firma autógrafa o electrónica.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Datos de Contacto:</strong> Teléfono fijo o celular, correo electrónico corporativo o personal, dirección física de envío, entrega y facturación.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Datos Fiscales y Patrimoniales:</strong> Registro Federal de Contribuyentes (RFC), Constancia de Situación Fiscal, uso de CFDI.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Datos Financieros:</strong> Se recaban datos tokenizados de tarjetas de crédito/débito exclusivamente para el procesamiento de pagos a través de la pasarela segura OpenPay (Certificación PCI DSS). Coyote Textil declara expresamente que NO almacena, no retiene y no tiene acceso a códigos de seguridad (CVV/CVC), NIPs, ni números de cuenta completos en sus servidores o bases de datos locales.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Datos Sensibles:</strong> El Responsable le informa que NO recaba ni trata datos personales sensibles (origen racial, estado de salud, creencias religiosas, etc.) bajo ninguna circunstancia.</span>
            </li>
          </ul>
        </section>

        {/* 3. FINALIDADES DEL TRATAMIENTO */}
        <section>
          <h2 className="text-2xl font-[900] uppercase mb-6 flex items-center gap-3 text-black border-b-2 border-black pb-2">
            <span className="text-[#FDCB02]">3.</span> Finalidades del Tratamiento (Primarias y Secundarias)
          </h2>
          <p className="text-sm text-neutral-600 mb-6 text-justify">
            Los datos personales del Titular serán utilizados estrictamente para las siguientes finalidades:
          </p>
          
          <h3 className="text-lg font-bold text-black mb-4">A. Finalidades Primarias (Necesarias para la relación jurídica y comercial):</h3>
          <ul className="space-y-2 text-sm text-neutral-600 text-justify mb-6">
            <li className="flex gap-3"><span className="text-black font-black">•</span><span>Procesamiento, confirmación, seguimiento y envío logístico de los pedidos de rollos textiles adquiridos en la plataforma.</span></li>
            <li className="flex gap-3"><span className="text-black font-black">•</span><span>Emisión de comprobantes fiscales (CFDI 4.0) y gestión de cobranza.</span></li>
            <li className="flex gap-3"><span className="text-black font-black">•</span><span>Creación y administración del perfil de usuario (Membresías/Accesos B2B) en la plataforma.</span></li>
            <li className="flex gap-3"><span className="text-black font-black">•</span><span>Cumplimiento de obligaciones contractuales, gestión de garantías y devoluciones por defectos de fábrica.</span></li>
            <li className="flex gap-3"><span className="text-black font-black">•</span><span>Prevención y detección de fraudes electrónicos en coordinación con OpenPay y autoridades competentes.</span></li>
          </ul>

          <h3 className="text-lg font-bold text-black mb-4">B. Finalidades Secundarias (Marketing, Publicidad y Prospección Comercial):</h3>
          <p className="text-sm text-neutral-600 mb-4 text-justify">
            Al aceptar el presente Aviso de Privacidad y/o al registrarse en nuestra plataforma, El Titular otorga su consentimiento expreso a Coyote Textil para conservar y utilizar sus datos de contacto con el fin de enviarle notificaciones, boletines, promociones exclusivas, ofertas comerciales, encuestas de calidad y material publicitario relacionado con nuestros productos y servicios.
          </p>
          <p className="text-sm text-neutral-600 text-justify">
            <strong>Cláusula de Negativa:</strong> En caso de que El Titular no desee que sus datos personales sean tratados para estas Finalidades Secundarias, cuenta con un plazo de 5 (cinco) días hábiles desde la aceptación de este aviso para enviar un correo a <strong>privacidad@coyotetextil.com</strong> manifestando su negativa. La negativa para el uso de sus datos con estos fines no será motivo para negarle la compra de productos o el acceso a la plataforma.
          </p>
        </section>

        {/* 4. TRANSFERENCIA DE DATOS A TERCEROS */}
        <section className="bg-neutral-50 p-8 border border-neutral-200">
          <h2 className="text-xl font-[900] uppercase mb-6 flex items-center gap-3 text-black">
            <Shield className="text-[#FDCB02]" size={24} /> 
            <span className="text-[#FDCB02]">4.</span> Transferencia de Datos a Terceros
          </h2>
          <p className="text-sm text-neutral-600 mb-6 text-justify">
            El Titular acepta y autoriza expresamente que Coyote Textil transfiera sus datos personales, dentro y fuera del país, exclusivamente a los siguientes terceros y para los fines jurídicamente justificados:
          </p>
          <ul className="space-y-4 text-sm text-neutral-600 text-justify mb-6">
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>OpenPay S.A. de C.V. / Instituciones Bancarias:</strong> Con la finalidad de procesar transacciones financieras, ejecutar cobros recurrentes de membresías y realizar validaciones algorítmicas antifraude.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Proveedores de Logística y Paquetería:</strong> Con la finalidad exclusiva de documentar guías de envío y realizar la entrega física de la mercancía.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Autoridades Gubernamentales y Fiscales (SAT):</strong> Cuando sea requerido por mandato de ley o para el cumplimiento de obligaciones tributarias y prevención de lavado de dinero.</span>
            </li>
          </ul>
          <p className="text-sm text-neutral-600 text-justify">
            <strong>Exención de Responsabilidad Cibernética:</strong> Coyote Textil exige a sus proveedores el cumplimiento de la LFPDPPP; sin embargo, La Empresa se deslinda de cualquier responsabilidad legal, civil o penal derivada de vulneraciones, hackeos o mal uso de datos que ocurran en los servidores de terceros (pasarelas de pago o paqueterías) una vez que la información ha sido transferida bajo los protocolos de seguridad correspondientes.
          </p>
        </section>

        {/* 5. DERECHOS ARCO */}
        <section>
          <h2 className="text-2xl font-[900] uppercase mb-6 flex items-center gap-3 text-black border-b-2 border-black pb-2">
            <span className="text-[#FDCB02]">5.</span> Ejercicio de Derechos ARCO
          </h2>
          <p className="text-sm text-neutral-600 mb-4 text-justify">
            El Titular tiene el derecho constitucional de conocer qué datos personales tenemos, para qué los utilizamos (Acceso); solicitar la corrección de su información si está desactualizada o inexacta (Rectificación); pedir que eliminemos su información de nuestras bases de datos si considera que no se utiliza adecuadamente (Cancelación); o negarse al uso de sus datos para fines específicos (Oposición).
          </p>
          <p className="text-sm text-neutral-600 mb-4 text-justify">
            Para ejercer cualquier derecho ARCO, El Titular deberá enviar una solicitud formal al correo <strong>privacidad@coyotetextil.com</strong>, adjuntando:
          </p>
          <ul className="space-y-2 text-sm text-neutral-600 text-justify mb-6">
            <li className="flex gap-3"><span className="text-black font-black">•</span><span>Nombre completo del Titular y correo electrónico para recibir respuesta.</span></li>
            <li className="flex gap-3"><span className="text-black font-black">•</span><span>Copia digital de un documento de identidad oficial vigente (INE, Pasaporte, Cédula Profesional).</span></li>
            <li className="flex gap-3"><span className="text-black font-black">•</span><span>Descripción clara, precisa y detallada de los datos personales respecto de los que se busca ejercer el derecho.</span></li>
          </ul>
          <p className="text-sm text-neutral-600 text-justify">
            El Responsable emitirá una resolución vinculante en un plazo máximo de 20 (veinte) días hábiles contados a partir de la recepción de la solicitud completa.
          </p>
        </section>

        {/* 6. COOKIES */}
        <section className="bg-neutral-50 p-8 border border-neutral-200">
          <h2 className="text-xl font-[900] uppercase mb-6 flex items-center gap-3 text-black">
            <Cookie className="text-[#FDCB02]" size={24} /> 
            <span className="text-[#FDCB02]">6.</span> Uso de Cookies, Web Beacons y Rastreo
          </h2>
          <p className="text-sm text-neutral-600 mb-4 text-justify">
            Coyote Textil emplea "Cookies", web beacons y tecnologías de rastreo automatizadas en coyotetextil.com. Estas herramientas recopilan datos como direcciones IP, tipo de navegador, sistema operativo y comportamiento de navegación (clics, tiempo en página, carrito de compras).
          </p>
          <p className="text-sm text-neutral-600 text-justify">
            Estos datos son de uso estrictamente técnico, estadístico y analítico para garantizar el correcto funcionamiento del ecosistema B2B, mantener la sesión del usuario activa y personalizar la experiencia del cliente. El Titular puede deshabilitar estas tecnologías directamente desde la configuración de su navegador web, bajo el entendimiento de que esto podría degradar drásticamente la funcionalidad del sitio o impedir la realización de compras.
          </p>
        </section>

        {/* 7. MODIFICACIONES */}
        <section>
          <h2 className="text-2xl font-[900] uppercase mb-6 flex items-center gap-3 text-black border-b-2 border-black pb-2">
            <span className="text-[#FDCB02]">7.</span> Modificaciones al Aviso de Privacidad
          </h2>
          <p className="text-sm text-neutral-600 text-justify">
            Coyote Textil se reserva el derecho absoluto de efectuar, en cualquier momento, modificaciones, adendas o actualizaciones al presente Aviso de Privacidad, para la atención de novedades legislativas, políticas internas o nuevos requerimientos operativos. Estas modificaciones estarán disponibles al público de manera inmediata a través de la actualización de este documento en la sección "Aviso de Privacidad" de la página web coyotetextil.com. Constituye una obligación ineludible del Titular revisar periódicamente este apartado.
          </p>
        </section>

      </div>
    </div>
  );
}