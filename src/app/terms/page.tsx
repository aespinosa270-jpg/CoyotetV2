"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { jsPDF } from "jspdf";
import { 
  ShieldCheck, Scale, AlertCircle, Truck, CreditCard, 
  Download, FileText, ChevronLeft, Loader2
} from 'lucide-react';

export default function TermsPage() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = () => {
    setIsDownloading(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Configuración de márgenes y estilo
      const marginLeft = 20;
      let currentY = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxTextWidth = pageWidth - (marginLeft * 2);

      // --- ENCABEZADO ---
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, pageWidth, 30, 'F');
      
      doc.setFillColor(253, 203, 2); // Coyote Yellow
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
      const mainTitle = "TÉRMINOS Y CONDICIONES GENERALES DE VENTA Y USO";
      doc.text(mainTitle, pageWidth / 2, currentY, { align: "center" });
      
      currentY += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Sitio Web: coyotetextil.com | Empresa: Coyote Textil", pageWidth / 2, currentY, { align: "center" });
      currentY += 5;
      doc.text("Última actualización: Febrero de 2026", pageWidth / 2, currentY, { align: "center" });

      currentY += 15;

      // --- FUNCIÓN PARA AGREGAR TEXTO CON SALTO DE PÁGINA ---
      const addText = (text: string, isBold: boolean = false, isTitle: boolean = false) => {
        if (isTitle) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          currentY += 5; // Espacio extra antes del título
        } else if (isBold) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
        }

        const lines = doc.splitTextToSize(text, maxTextWidth);
        
        // Verifica si necesita salto de página
        if (currentY + (lines.length * 5) > 280) {
          doc.addPage();
          currentY = 20;
          
          // Membrete en páginas nuevas
          doc.setFillColor(10, 10, 10);
          doc.rect(0, 0, pageWidth, 15, 'F');
          doc.setFillColor(253, 203, 2);
          doc.rect(0, 15, pageWidth, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bolditalic");
          doc.setFontSize(12);
          doc.text("COYOTE.", marginLeft, 10);
          
          currentY = 30; // Resetear Y después del membrete
          
          // Restaurar la fuente correcta después de agregar la nueva página
          if (isTitle) doc.setFont("helvetica", "bold");
          else if (isBold) doc.setFont("helvetica", "bold");
          else doc.setFont("helvetica", "normal");
          doc.setTextColor(10, 10, 10);
        }

        doc.text(lines, marginLeft, currentY);
        currentY += (lines.length * 5) + 2; // Incrementar Y según las líneas impresas
      };

      // --- CONTENIDO LEGAL EXACTO ---
      
      addText("I. DECLARACIONES PREVIAS Y ACEPTACIÓN DEL CONTRATO", false, true);
      addText("El presente documento establece los Términos y Condiciones Generales (en adelante, los \"Términos\") que regulan el uso del sitio web coyotetextil.com y las transacciones comerciales de compraventa celebradas entre Coyote Textil (en adelante, \"El Proveedor\" o \"La Empresa\") y cualquier persona física o moral que adquiera sus productos (en adelante, \"El Cliente\").");
      addText("Al acceder, navegar y/o realizar cualquier transacción en el sitio web, El Cliente acepta someterse incondicionalmente a los presentes Términos, los cuales constituyen un contrato legalmente vinculante bajo las leyes de los Estados Unidos Mexicanos, específicamente el Código de Comercio y, en lo conducente, la Ley Federal de Protección al Consumidor. Si El Cliente no está de acuerdo con estos Términos, deberá abstenerse de utilizar el sitio y de adquirir los productos. La Empresa se reserva el derecho de modificar este documento en cualquier momento y sin previo aviso, siendo responsabilidad del Cliente su revisión periódica.");

      addText("II. ESPECIFICACIONES TÉCNICAS, NATURALEZA DEL PRODUCTO Y TOLERANCIAS INDUSTRIALES", false, true);
      addText("Dada la naturaleza de la industria textil y los procesos de manufactura, El Cliente declara comprender y aceptar las siguientes condiciones operativas y variaciones inherentes al producto:");
      addText("• Variación de Pesos y Medidas (Tolerancia Industrial): Los pesos expresados en kilogramos (kg) o metros para los rollos de tela son estrictamente aproximados. El Cliente acepta que pueden existir variaciones de peso o longitud derivadas de factores incontrolables de fabricación, niveles de humedad relativa, encogimiento natural de las fibras y calibración de maquinaria. Coyote Textil no garantiza bajo ninguna circunstancia un peso exacto al gramo. Dichas variaciones dentro de los estándares de la industria no serán consideradas como defecto ni causal de devolución.");
      addText("• Fidelidad de Colores y Lotes de Teñido: Las fotografías y catálogos digitales presentados en el sitio web tienen un fin exclusivamente ilustrativo. La visualización de los colores y texturas está sujeta a la calibración de la pantalla del dispositivo del Cliente. Asimismo, El Cliente reconoce que pueden existir variaciones tonales (shade variation o barras de color) entre diferentes lotes de producción. El Proveedor no garantiza una coincidencia cromática idéntica entre la imagen digital y el producto físico, ni entre diferentes pedidos realizados en fechas distintas.");
      addText("• Disponibilidad y Perfeccionamiento de la Compra: Toda oferta y pedido están sujetos a la confirmación de inventario físico en nuestros almacenes. El contrato de compraventa se entenderá perfeccionado únicamente cuando Coyote Textil confirme la disponibilidad y el pago íntegro. En caso de ruptura de stock posterior a la transacción, La Empresa se reserva el derecho de cancelar el pedido, notificando al Cliente para proceder con el reembolso íntegro o la sustitución por un producto equivalente, sin que esto genere responsabilidad civil o penal, ni derecho a reclamación por daños y perjuicios para La Empresa.");

      addText("III. POLÍTICA ESTRICTA DE CAMBIOS, DEVOLUCIONES Y GARANTÍAS", false, true);
      addText("Coyote Textil mantiene un control de calidad riguroso. Para preservar la higiene, integridad y valor comercial de nuestros textiles, la política de devoluciones se rige bajo los siguientes lineamientos limitativos:");
      addText("• Plazo Perentorio: Cualquier reclamación, solicitud de cambio o devolución deberá ser notificada por escrito a los canales oficiales de La Empresa dentro de los 15 (quince) días naturales posteriores a la recepción física del pedido. Transcurrido este plazo, se entenderá la aceptación tácita y absoluta de la mercancía, renunciando El Cliente a cualquier acción legal de reclamación por vicios ocultos o defectos (Art. 383 del Código de Comercio).");
      addText("• Causa Única de Devolución (Defectos de Fábrica): Solo procederán cambios o devoluciones por defectos de fabricación comprobables. Esto se limita de manera exclusiva a: roturas de origen, manchas preexistentes al embalaje o fallas estructurales graves en el tejido.");
      addText("• Exclusiones Estrictas (No Reembolsables): Queda estrictamente prohibida y será rechazada cualquier solicitud de devolución fundada en: Cambio de opinión del Cliente. Errores del Cliente al seleccionar el color, composición o gramaje. Variaciones de peso o color dentro de los rangos de tolerancia industrial mencionados en la Sección II. Mermas por encogimiento resultantes de procesos posteriores a la entrega.");
      addText("• Condición Sine Qua Non de la Mercancía: Para que cualquier revisión de garantía proceda, el rollo no puede devolverse ni cortado ni confeccionado. El producto deberá ser retornado en el mismo estado en que fue entregado: intacto, sin cortes, sin alteraciones, sin haber sido sometido a procesos de lavado, teñido o sublimado, y en su empaque original. Una vez que el Cliente o sus maquiladores realicen un corte o proceso sobre la tela, se anula automáticamente toda garantía y derecho de reclamación.");
      addText("• Gastos Operativos y Penalizaciones: En caso de que El Cliente devuelva mercancía que, tras la revisión técnica de La Empresa, no presente defectos de fábrica reales y busque forzar una devolución por causas ajenas a Coyote Textil, dicha mercancía será rechazada. En el supuesto excepcional de que se acepte una cancelación por causas no imputables a La Empresa, se aplicará una tarifa de penalización del 20% sobre el valor total de la mercancía devuelta por concepto de gastos operativos no reembolsables. Los costos de flete por retornos injustificados correrán en su totalidad por cuenta y riesgo del Cliente.");

      addText("IV. ENVÍOS, LOGÍSTICA Y TRANSMISIÓN DEL RIESGO", false, true);
      addText("• Tiempos de Entrega: Los tiempos de tránsito mostrados al momento de la compra (generalmente de 3 a 5 días hábiles) son meramente estimaciones proporcionadas por las empresas de paquetería y no constituyen una obligación de plazo fatal para Coyote Textil.");
      addText("• Transmisión del Riesgo y Liberación de Responsabilidad: En apego a las prácticas mercantiles, la responsabilidad, custodia y riesgo de pérdida o daño de la mercancía se transmite al Cliente en el momento exacto en que Coyote Textil entrega el paquete a la empresa de mensajería (Incoterm FCA / CPT análogo).");
      addText("• Caso Fortuito y Fuerza Mayor: Coyote Textil queda eximido de cualquier responsabilidad, penalización o solicitud de reembolso por retrasos, robos, extravíos o daños causados por la paquetería externa, retenes aduanales, huelgas, desastres naturales o cualquier otro evento de caso fortuito o fuerza mayor. La Empresa se compromete únicamente a asistir al Cliente proporcionando la información necesaria para el seguimiento y apertura de reportes ante la empresa transportista.");

      addText("V. PRECIOS, MÉTODOS DE PAGO Y FACTURACIÓN FISCAL (CFDI 4.0)", false, true);
      addText("• Procesamiento de Pagos Seguros: Se aceptan pagos mediante tarjetas de crédito y débito (Visa, Mastercard, American Express). Todas las transacciones son procesadas a través de la pasarela de pagos OpenPay, garantizando el cumplimiento de los estándares de seguridad de la industria de tarjetas de pago (PCI DSS). Coyote Textil declara que no almacena, captura ni tiene acceso en sus servidores a los datos financieros completos del Cliente.");
      addText("• Reglas Estrictas de Facturación: Para dar cumplimiento a las disposiciones del Servicio de Administración Tributaria (SAT), si El Cliente requiere un Comprobante Fiscal Digital por Internet (CFDI), es de carácter obligatorio solicitarlo dentro del mismo mes calendario en que se reflejó el pago.");
      addText("• Documentación: El Cliente deberá enviar su Constancia de Situación Fiscal actualizada, uso de CFDI y método de pago al correo: facturacion@coyotetextil.com. Bajo ninguna circunstancia se emitirán, re-facturarán o modificarán comprobantes fiscales de meses cerrados o ejercicios anteriores.");

      addText("VI. JURISDICCIÓN Y LEY APLICABLE", false, true);
      addText("Para la interpretación, cumplimiento y ejecución de los presentes Términos y Condiciones, así como para dirimir cualquier controversia que pudiera suscitarse, las partes se someten expresamente a las leyes federales de los Estados Unidos Mexicanos y a la jurisdicción de los tribunales competentes en la Ciudad de México, renunciando expresamente a cualquier otro fuero que pudiera corresponderles en razón de sus domicilios presentes o futuros, o por cualquier otra causa.");

      addText("VII. POLÍTICAS DE MEMBRESÍAS, SUSCRIPCIONES Y CARGOS RECURRENTES AUTOMÁTICOS", false, true);
      addText("• Naturaleza de la Suscripción y Consentimiento de Domiciliación: Al momento en que El Cliente se inscribe, adquiere o contrata cualquiera de los programas de membresía, acceso VIP o suscripción ofrecidos por Coyote Textil, otorga su consentimiento expreso, irrevocable y por escrito (mediante la aceptación de medios electrónicos) para la domiciliación y el cobro automático, periódico y recurrente a la tarjeta de crédito o débito proporcionada. El Cliente autoriza a La Empresa y a su procesador de pagos (OpenPay) a realizar dichos cargos con la periodicidad establecida en el plan contratado (mensual, trimestral o anual) hasta que se reciba una notificación formal de cancelación conforme a los lineamientos del presente capítulo.");
      addText("• Obligación de Pago Independiente del Uso (Cláusula de No Reembolso): El Cliente reconoce, acepta y se obliga a pagar la tarifa de la membresía por el derecho de acceso y disponibilidad de los beneficios, tarifas preferenciales o servicios exclusivos que esta otorga, independientemente de su utilización material. En consecuencia, la falta de uso, la inactividad en la plataforma, la ausencia de compras de textiles o la omisión en el aprovechamiento de los beneficios inherentes a la membresía durante cualquier ciclo de facturación, no eximen al Cliente de su obligación de pago, ni le otorgan derecho alguno a solicitar reembolsos, retroactividades, prorrateos, bonificaciones o cancelaciones de cargos ya procesados. El desconocimiento del cargo ante la institución bancaria bajo el argumento de \"no uso de la membresía\" será considerado un incumplimiento de mala fe a este contrato, reservándose Coyote Textil el derecho de ejercer las acciones mercantiles de cobro correspondientes y la suspensión definitiva de la cuenta.");
      addText("• Política Estricta de Cancelación: Es entera y exclusiva responsabilidad del Cliente gestionar la administración de su suscripción. Para evitar el cobro del siguiente ciclo de facturación, El Cliente deberá ejecutar la cancelación de su membresía directamente desde su panel de usuario en coyotetextil.com, o bien, notificarlo formalmente a los canales de soporte técnico con una anticipación mínima de 48 (cuarenta y ocho) horas hábiles previas a su fecha y hora de corte. Una vez que el sistema logístico y financiero de Coyote Textil haya procesado el cargo recurrente del nuevo ciclo, este se considerará en firme y definitivo, por lo que la cancelación solicitada surtirá efectos únicamente para el periodo inmediato siguiente, sin posibilidad de devolución del importe recién cobrado.");
      addText("• Suspensión por Cobro Fallido: En el supuesto de que el método de pago del Cliente sea declinado, se encuentre vencido o carezca de fondos suficientes al momento de la renovación automática, Coyote Textil suspenderá de forma inmediata y sin previo aviso todos los beneficios, niveles de descuento y accesos asociados a la membresía, hasta que El Cliente regularice su situación contable y actualice su método de pago. La Empresa podrá realizar intentos de cobro subsecuentemente durante los días posteriores al rechazo inicial para reactivar el servicio.");

      addText("VIII. TARIFAS OPERATIVAS, CARGOS DE SERVICIO Y MANIOBRAS DE DESPACHO", false, true);
      addText("• Tarifa de Servicio Administrativo (Surcharge del 5%): Con independencia del volumen de compra o del valor total de la mercancía adquirida, todo pedido procesado a través de coyotetextil.com o cualquier canal de venta oficial estará sujeto a la aplicación de un cargo adicional, fijo e innegociable, equivalente al 5% (cinco por ciento) sobre el subtotal de la compra por concepto de \"Tarifa de Servicio\". Este cargo ampara los costos de infraestructura tecnológica, procesamiento transaccional, gestión comercial y mantenimiento operativo del catálogo B2B. El Cliente manifiesta su conformidad expresa con la adición de este porcentaje al momento de finalizar su pedido. En consecuencia, El Cliente acepta que esta tarifa es de naturaleza estrictamente no reembolsable bajo ningún supuesto, incluyendo, de manera enunciativa más no limitativa: cancelaciones de pedidos, aplicación de garantías, rechazos bancarios posteriores o devoluciones de mercancía por defectos de fábrica.");
      addText("• Cargo de Maniobra y Colocación a Paquetería: Para garantizar el correcto embalaje, protección y despacho de los rollos textiles, La Empresa aplicará un \"Cargo de Colocación a Paquetería\". El Cliente reconoce de manera expresa e indubitable que este concepto no constituye, ni sustituye, ni forma parte del costo de flete, logística o envío de la mercancía. Este cargo ampara única y exclusivamente las maniobras físicas internas de almacén, la preparación de la carga pesada y el traslado operativo desde las instalaciones de Coyote Textil hasta los mostradores, centros de acopio o andenes de la empresa de mensajería externa asignada.");
      addText("• Independencia de Cargos Logísticos: Queda estrictamente establecido que la obligación de pago del \"Cargo de Colocación a Paquetería\" es concurrente y complementaria al pago de la guía de envío (tránsito logístico). El hecho de que El Cliente cubra el costo del flete para que la mercancía llegue a su destino no lo exime del pago por la maniobra de despacho inicial. Al igual que la Tarifa de Servicio, el importe por colocación a paquetería se considera un gasto operativo consumado en el momento en que la mercancía sale de nuestras puertas, por lo que no será objeto de devolución, bonificación o crédito a favor del Cliente en caso de que la paquetería presente retrasos, extravíos o daños durante el tránsito.");

      doc.save(`Coyote_Textil_Terminos_Condiciones_${new Date().getFullYear()}.pdf`);

    } catch (error) {
      console.error("Error generando PDF de Términos", error);
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
            Términos y <span className="text-[#FDCB02]">Condiciones</span>
          </h1>
          <p className="text-neutral-400 text-xs font-mono uppercase tracking-widest border border-white/10 inline-block px-3 py-1 rounded bg-black/50">
            Última actualización: Febrero 2026
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

        {/* I. DECLARACIONES PREVIAS Y ACEPTACIÓN DEL CONTRATO */}
        <section>
          <h2 className="text-2xl font-[900] uppercase mb-6 flex items-center gap-3 text-black border-b-2 border-black pb-2">
            <span className="text-[#FDCB02]">I.</span> Declaraciones Previas y Aceptación
          </h2>
          <div className="space-y-4 text-sm text-neutral-600 leading-relaxed text-justify">
              <p>
                El presente documento establece los Términos y Condiciones Generales (en adelante, los "Términos") que regulan el uso del sitio web <strong>coyotetextil.com</strong> y las transacciones comerciales de compraventa celebradas entre Coyote Textil (en adelante, "El Proveedor" o "La Empresa") y cualquier persona física o moral que adquiera sus productos (en adelante, "El Cliente").
              </p>
              <p>
                Al acceder, navegar y/o realizar cualquier transacción en el sitio web, El Cliente acepta someterse incondicionalmente a los presentes Términos, los cuales constituyen un contrato legalmente vinculante bajo las leyes de los Estados Unidos Mexicanos, específicamente el Código de Comercio y, en lo conducente, la Ley Federal de Protección al Consumidor. Si El Cliente no está de acuerdo con estos Términos, deberá abstenerse de utilizar el sitio y de adquirir los productos. La Empresa se reserva el derecho de modificar este documento en cualquier momento y sin previo aviso, siendo responsabilidad del Cliente su revisión periódica.
              </p>
          </div>
        </section>

        {/* II. ESPECIFICACIONES TÉCNICAS */}
        <section className="bg-neutral-50 p-8 border border-neutral-200">
          <h2 className="text-xl font-[900] uppercase mb-6 flex items-center gap-3 text-black">
            <Scale className="text-[#FDCB02]" size={24} /> 
            <span className="text-[#FDCB02]">II.</span> Especificaciones Técnicas y Tolerancias
          </h2>
          <p className="text-sm text-neutral-600 mb-6 text-justify">
            Dada la naturaleza de la industria textil y los procesos de manufactura, El Cliente declara comprender y aceptar las siguientes condiciones operativas y variaciones inherentes al producto:
          </p>
          <ul className="space-y-4 text-sm text-neutral-600 text-justify">
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Variación de Pesos y Medidas (Tolerancia Industrial):</strong> Los pesos expresados en kilogramos (kg) o metros para los rollos de tela son estrictamente aproximados. El Cliente acepta que pueden existir variaciones de peso o longitud derivadas de factores incontrolables de fabricación, niveles de humedad relativa, encogimiento natural de las fibras y calibración de maquinaria. Coyote Textil no garantiza bajo ninguna circunstancia un peso exacto al gramo. Dichas variaciones dentro de los estándares de la industria no serán consideradas como defecto ni causal de devolución.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Fidelidad de Colores y Lotes de Teñido:</strong> Las fotografías y catálogos digitales presentados en el sitio web tienen un fin exclusivamente ilustrativo. La visualización de los colores y texturas está sujeta a la calibración de la pantalla del dispositivo del Cliente. Asimismo, El Cliente reconoce que pueden existir variaciones tonales (shade variation o barras de color) entre diferentes lotes de producción. El Proveedor no garantiza una coincidencia cromática idéntica entre la imagen digital y el producto físico, ni entre diferentes pedidos realizados en fechas distintas.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Disponibilidad y Perfeccionamiento de la Compra:</strong> Toda oferta y pedido están sujetos a la confirmación de inventario físico en nuestros almacenes. El contrato de compraventa se entenderá perfeccionado únicamente cuando Coyote Textil confirme la disponibilidad y el pago íntegro. En caso de ruptura de stock posterior a la transacción, La Empresa se reserva el derecho de cancelar el pedido, notificando al Cliente para proceder con el reembolso íntegro o la sustitución por un producto equivalente, sin que esto genere responsabilidad civil o penal, ni derecho a reclamación por daños y perjuicios para La Empresa.</span>
            </li>
          </ul>
        </section>

        {/* III. POLÍTICA ESTRICTA DE CAMBIOS */}
        <section className="bg-neutral-50 p-8 border border-neutral-200">
          <h2 className="text-xl font-[900] uppercase mb-6 flex items-center gap-3 text-black">
            <AlertCircle className="text-red-500" size={24} /> 
            <span className="text-[#FDCB02]">III.</span> Política Estricta de Cambios y Devoluciones
          </h2>
          <p className="text-sm text-neutral-600 mb-6 text-justify">
            Coyote Textil mantiene un control de calidad riguroso. Para preservar la higiene, integridad y valor comercial de nuestros textiles, la política de devoluciones se rige bajo los siguientes lineamientos limitativos:
          </p>
          <ul className="space-y-4 text-sm text-neutral-600 text-justify">
            <li className="flex gap-3">
              <span className="text-red-500 font-black">•</span>
              <span><strong>Plazo Perentorio:</strong> Cualquier reclamación, solicitud de cambio o devolución deberá ser notificada por escrito a los canales oficiales de La Empresa dentro de los <strong>15 (quince) días naturales</strong> posteriores a la recepción física del pedido. Transcurrido este plazo, se entenderá la aceptación tácita y absoluta de la mercancía, renunciando El Cliente a cualquier acción legal de reclamación por vicios ocultos o defectos (Art. 383 del Código de Comercio).</span>
            </li>
            <li className="flex gap-3">
              <span className="text-red-500 font-black">•</span>
              <span><strong>Causa Única de Devolución (Defectos de Fábrica):</strong> Solo procederán cambios o devoluciones por defectos de fabricación comprobables. Esto se limita de manera exclusiva a: roturas de origen, manchas preexistentes al embalaje o fallas estructurales graves en el tejido.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-red-500 font-black">•</span>
              <span><strong>Exclusiones Estrictas (No Reembolsables):</strong> Queda estrictamente prohibida y será rechazada cualquier solicitud de devolución fundada en:
                <ul className="ml-6 mt-2 space-y-1 list-[circle]">
                  <li>Cambio de opinión del Cliente.</li>
                  <li>Errores del Cliente al seleccionar el color, composición o gramaje.</li>
                  <li>Variaciones de peso o color dentro de los rangos de tolerancia industrial mencionados en la Sección II.</li>
                  <li>Mermas por encogimiento resultantes de procesos posteriores a la entrega.</li>
                </ul>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-red-500 font-black">•</span>
              <span><strong>Condición Sine Qua Non de la Mercancía:</strong> Para que cualquier revisión de garantía proceda, <strong>el rollo no puede devolverse ni cortado ni confeccionado</strong>. El producto deberá ser retornado en el mismo estado en que fue entregado: intacto, sin cortes, sin alteraciones, sin haber sido sometido a procesos de lavado, teñido o sublimado, y en su empaque original. Una vez que el Cliente o sus maquiladores realicen un corte o proceso sobre la tela, se anula automáticamente toda garantía y derecho de reclamación.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-red-500 font-black">•</span>
              <span><strong>Gastos Operativos y Penalizaciones:</strong> En caso de que El Cliente devuelva mercancía que, tras la revisión técnica de La Empresa, no presente defectos de fábrica reales y busque forzar una devolución por causas ajenas a Coyote Textil, dicha mercancía será rechazada. En el supuesto excepcional de que se acepte una cancelación por causas no imputables a La Empresa, se aplicará una tarifa de penalización del 20% sobre el valor total de la mercancía devuelta por concepto de gastos operativos no reembolsables. Los costos de flete por retornos injustificados correrán en su totalidad por cuenta y riesgo del Cliente.</span>
            </li>
          </ul>
        </section>

        {/* IV. ENVÍOS */}
        <section>
          <h2 className="text-2xl font-[900] uppercase mb-6 flex items-center gap-3 text-black border-b-2 border-black pb-2">
            <span className="text-[#FDCB02]">IV.</span> Envíos, Logística y Transmisión del Riesgo
          </h2>
          <ul className="space-y-4 text-sm text-neutral-600 text-justify">
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Tiempos de Entrega:</strong> Los tiempos de tránsito mostrados al momento de la compra (generalmente de 3 a 5 días hábiles) son meramente estimaciones proporcionadas por las empresas de paquetería y no constituyen una obligación de plazo fatal para Coyote Textil.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Transmisión del Riesgo y Liberación de Responsabilidad:</strong> En apego a las prácticas mercantiles, la responsabilidad, custodia y riesgo de pérdida o daño de la mercancía se transmite al Cliente en el momento exacto en que Coyote Textil entrega el paquete a la empresa de mensajería (Incoterm FCA / CPT análogo).</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Caso Fortuito y Fuerza Mayor:</strong> Coyote Textil queda eximido de cualquier responsabilidad, penalización o solicitud de reembolso por retrasos, robos, extravíos o daños causados por la paquetería externa, retenes aduanales, huelgas, desastres naturales o cualquier otro evento de caso fortuito o fuerza mayor. La Empresa se compromete únicamente a asistir al Cliente proporcionando la información necesaria para el seguimiento y apertura de reportes ante la empresa transportista.</span>
            </li>
          </ul>
        </section>

        {/* V. PAGOS Y FACTURACIÓN */}
        <section>
          <h2 className="text-2xl font-[900] uppercase mb-6 flex items-center gap-3 text-black border-b-2 border-black pb-2">
            <span className="text-[#FDCB02]">V.</span> Precios, Métodos de Pago y Facturación Fiscal
          </h2>
          <ul className="space-y-4 text-sm text-neutral-600 text-justify">
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Procesamiento de Pagos Seguros:</strong> Se aceptan pagos mediante tarjetas de crédito y débito (Visa, Mastercard, American Express). Todas las transacciones son procesadas a través de la pasarela de pagos OpenPay, garantizando el cumplimiento de los estándares de seguridad de la industria de tarjetas de pago (PCI DSS). Coyote Textil declara que no almacena, captura ni tiene acceso en sus servidores a los datos financieros completos del Cliente.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Reglas Estrictas de Facturación:</strong> Para dar cumplimiento a las disposiciones del Servicio de Administración Tributaria (SAT), si El Cliente requiere un Comprobante Fiscal Digital por Internet (CFDI), es de carácter obligatorio solicitarlo dentro del mismo mes calendario en que se reflejó el pago.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Documentación:</strong> El Cliente deberá enviar su Constancia de Situación Fiscal actualizada, uso de CFDI y método de pago al correo: facturacion@coyotetextil.com. Bajo ninguna circunstancia se emitirán, re-facturarán o modificarán comprobantes fiscales de meses cerrados o ejercicios anteriores.</span>
            </li>
          </ul>
        </section>

        {/* VI. JURISDICCIÓN */}
        <section>
          <h2 className="text-2xl font-[900] uppercase mb-6 flex items-center gap-3 text-black border-b-2 border-black pb-2">
            <span className="text-[#FDCB02]">VI.</span> Jurisdicción y Ley Aplicable
          </h2>
          <p className="text-sm text-neutral-600 text-justify">
            Para la interpretación, cumplimiento y ejecución de los presentes Términos y Condiciones, así como para dirimir cualquier controversia que pudiera suscitarse, las partes se someten expresamente a las leyes federales de los Estados Unidos Mexicanos y a la jurisdicción de los tribunales competentes en la Ciudad de México, renunciando expresamente a cualquier otro fuero que pudiera corresponderles en razón de sus domicilios presentes o futuros, o por cualquier otra causa.
          </p>
        </section>

        {/* VII. MEMBRESÍAS Y SUSCRIPCIONES */}
        <section className="bg-neutral-50 p-8 border border-neutral-200">
          <h2 className="text-xl font-[900] uppercase mb-6 flex items-center gap-3 text-black">
            <CreditCard className="text-[#FDCB02]" size={24} /> 
            <span className="text-[#FDCB02]">VII.</span> Políticas de Membresías y Suscripciones
          </h2>
          <ul className="space-y-4 text-sm text-neutral-600 text-justify">
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Naturaleza de la Suscripción y Consentimiento de Domiciliación:</strong> Al momento en que El Cliente se inscribe, adquiere o contrata cualquiera de los programas de membresía, acceso VIP o suscripción ofrecidos por Coyote Textil, otorga su consentimiento expreso, irrevocable y por escrito (mediante la aceptación de medios electrónicos) para la domiciliación y el cobro automático, periódico y recurrente a la tarjeta de crédito o débito proporcionada. El Cliente autoriza a La Empresa y a su procesador de pagos (OpenPay) a realizar dichos cargos con la periodicidad establecida en el plan contratado (mensual, trimestral o anual) hasta que se reciba una notificación formal de cancelación conforme a los lineamientos del presente capítulo.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Obligación de Pago Independiente del Uso (Cláusula de No Reembolso):</strong> El Cliente reconoce, acepta y se obliga a pagar la tarifa de la membresía por el derecho de acceso y disponibilidad de los beneficios, tarifas preferenciales o servicios exclusivos que esta otorga, independientemente de su utilización material. En consecuencia, la falta de uso, la inactividad en la plataforma, la ausencia de compras de textiles o la omisión en el aprovechamiento de los beneficios inherentes a la membresía durante cualquier ciclo de facturación, no eximen al Cliente de su obligación de pago, ni le otorgan derecho alguno a solicitar reembolsos, retroactividades, prorrateos, bonificaciones o cancelaciones de cargos ya procesados. El desconocimiento del cargo ante la institución bancaria bajo el argumento de "no uso de la membresía" será considerado un incumplimiento de mala fe a este contrato, reservándose Coyote Textil el derecho de ejercer las acciones mercantiles de cobro correspondientes y la suspensión definitiva de la cuenta.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Política Estricta de Cancelación:</strong> Es entera y exclusiva responsabilidad del Cliente gestionar la administración de su suscripción. Para evitar el cobro del siguiente ciclo de facturación, El Cliente deberá ejecutar la cancelación de su membresía directamente desde su panel de usuario en coyotetextil.com, o bien, notificarlo formalmente a los canales de soporte técnico con una anticipación mínima de 48 (cuarenta y ocho) horas hábiles previas a su fecha y hora de corte. Una vez que el sistema logístico y financiero de Coyote Textil haya procesado el cargo recurrente del nuevo ciclo, este se considerará en firme y definitivo, por lo que la cancelación solicitada surtirá efectos únicamente para el periodo inmediato siguiente, sin posibilidad de devolución del importe recién cobrado.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Suspensión por Cobro Fallido:</strong> En el supuesto de que el método de pago del Cliente sea declinado, se encuentre vencido o carezca de fondos suficientes al momento de la renovación automática, Coyote Textil suspenderá de forma inmediata y sin previo aviso todos los beneficios, niveles de descuento y accesos asociados a la membresía, hasta que El Cliente regularice su situación contable y actualice su método de pago. La Empresa podrá realizar intentos de cobro subsecuentemente durante los días posteriores al rechazo inicial para reactivar el servicio.</span>
            </li>
          </ul>
        </section>

        {/* VIII. TARIFAS OPERATIVAS */}
        <section className="bg-neutral-50 p-8 border border-neutral-200">
          <h2 className="text-xl font-[900] uppercase mb-6 flex items-center gap-3 text-black">
            <Truck className="text-[#FDCB02]" size={24} /> 
            <span className="text-[#FDCB02]">VIII.</span> Tarifas Operativas, Cargos de Servicio y Maniobras
          </h2>
          <ul className="space-y-4 text-sm text-neutral-600 text-justify">
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Tarifa de Servicio Administrativo (Surcharge del 5%):</strong> Con independencia del volumen de compra o del valor total de la mercancía adquirida, todo pedido procesado a través de coyotetextil.com o cualquier canal de venta oficial estará sujeto a la aplicación de un cargo adicional, fijo e innegociable, equivalente al 5% (cinco por ciento) sobre el subtotal de la compra por concepto de "Tarifa de Servicio". Este cargo ampara los costos de infraestructura tecnológica, procesamiento transaccional, gestión comercial y mantenimiento operativo del catálogo B2B. El Cliente manifiesta su conformidad expresa con la adición de este porcentaje al momento de finalizar su pedido. En consecuencia, El Cliente acepta que esta tarifa es de naturaleza estrictamente no reembolsable bajo ningún supuesto, incluyendo, de manera enunciativa más no limitativa: cancelaciones de pedidos, aplicación de garantías, rechazos bancarios posteriores o devoluciones de mercancía por defectos de fábrica.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Cargo de Maniobra y Colocación a Paquetería:</strong> Para garantizar el correcto embalaje, protección y despacho de los rollos textiles, La Empresa aplicará un "Cargo de Colocación a Paquetería". El Cliente reconoce de manera expresa e indubitable que este concepto no constituye, ni sustituye, ni forma parte del costo de flete, logística o envío de la mercancía. Este cargo ampara única y exclusivamente las maniobras físicas internas de almacén, la preparación de la carga pesada y el traslado operativo desde las instalaciones de Coyote Textil hasta los mostradores, centros de acopio o andenes de la empresa de mensajería externa asignada.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-[#FDCB02] font-black">•</span>
              <span><strong>Independencia de Cargos Logísticos:</strong> Queda estrictamente establecido que la obligación de pago del "Cargo de Colocación a Paquetería" es concurrente y complementaria al pago de la guía de envío (tránsito logístico). El hecho de que El Cliente cubra el costo del flete para que la mercancía llegue a su destino no lo exime del pago por la maniobra de despacho inicial. Al igual que la Tarifa de Servicio, el importe por colocación a paquetería se considera un gasto operativo consumado en el momento en que la mercancía sale de nuestras puertas, por lo que no será objeto de devolución, bonificación o crédito a favor del Cliente en caso de que la paquetería presente retrasos, extravíos o daños durante el tránsito.</span>
            </li>
          </ul>
        </section>

      </div>
    </div>
  );
}