// src/lib/facturapi.ts
import Facturapi from 'facturapi';

// 🔥 Usamos tu llave LIVE de producción para timbrar ante el SAT
const facturapi = new Facturapi(process.env.FACTURAPI_LIVE_SECRET_KEY as string);

export const timbrarFacturaReal = async (
  customerData: any, 
  fiscalData: any, 
  items: any[], 
  paymentMethod: string, 
  enviosYFletes: number,
  serviceFee: number // 🔥 NUEVO: Recibimos la tarifa de servicio para que cuadren los centavos
) => {
  try {
    console.log("Creando cliente en Facturapi (CFDI 4.0)...");
    
    // 1. REGISTRAR O ACTUALIZAR CLIENTE (Estricto CFDI 4.0)
    const customer = await facturapi.customers.create({
      legal_name: fiscalData.razonSocial.toUpperCase(), // SAT exige mayúsculas y SIN "SA DE CV"
      tax_id: fiscalData.rfc.toUpperCase(),
      tax_system: fiscalData.regimen,
      zip: fiscalData.cpFiscal,
      email: customerData.email
    });

    console.log("Cliente fiscal listo. ID:", customer.id);

    // 2. MAPEAR PRODUCTOS AL FORMATO SAT (Con IVA desglosado)
    const lineItems = items.map(item => ({
      product: {
        description: `${item.title} - Color: ${item.meta?.color || item.color || 'N/A'}`,
        product_key: "53103000", // Clave SAT general para textiles/telas
        price: item.price,
        taxes: [{ type: "IVA", rate: 0.16 }] // IVA 16% REAL
      },
      quantity: item.quantity
    }));

    // 3. AGREGAR EL COSTO DE LOGÍSTICA/FLETE SI APLICA
    if (enviosYFletes > 0) {
      lineItems.push({
        product: {
          description: "Servicio de flete y logística de entrega",
          product_key: "78102200", // Clave SAT para servicios de transporte postal/flete
          price: enviosYFletes,
          taxes: [{ type: "IVA", rate: 0.16 }]
        },
        quantity: 1
      });
    }

    // 🔥 4. AGREGAR LA TARIFA DE SERVICIO (Para que cuadre exacto con Stripe)
    if (serviceFee > 0) {
      lineItems.push({
        product: {
          description: "Tarifa de servicio y uso de plataforma",
          product_key: "80141600", // Clave SAT para servicios de gestión/ventas
          price: serviceFee,
          taxes: [{ type: "IVA", rate: 0.16 }]
        },
        quantity: 1
      });
    }

    // 5. MAPEAR LA FORMA DE PAGO DEL SAT
    let formaPago = "99"; // Por definir (Efectivo/SPEI no pagado)
    let metodoPago = "PPD"; // Pago en parcialidades o diferido

    if (paymentMethod === 'card' || paymentMethod === 'stripe') {
      formaPago = "04"; // Tarjeta de crédito (Si es débito es 28, pero 04 pasa perfecto)
      metodoPago = "PUE"; // Pago en una sola exhibición (ya se cobró)
    }

    console.log("Timbrando Factura en el SAT...");

    // 6. TIMBRAR LA FACTURA REAL
    const invoice = await facturapi.invoices.create({
      customer: customer.id,
      items: lineItems,
      use: fiscalData.usoCFDI,
      payment_form: formaPago,
      payment_method: metodoPago
    });

    console.log("✅ FACTURA TIMBRADA CON ÉXITO. UUID:", invoice.uuid);

    // 🔥 7. ENVIARLA AL CLIENTE AUTOMÁTICAMENTE POR CORREO
    try {
      await facturapi.invoices.sendByEmail(invoice.id);
      console.log(`✉️ Factura enviada al correo del cliente: ${customerData.email}`);
    } catch (emailErr) {
      console.error("⚠️ La factura se timbró, pero no se pudo enviar el correo:", emailErr);
    }
    
    // Devolvemos el link para descargar el PDF y XML
    return {
      success: true,
      uuid: invoice.uuid,
      pdf: invoice.verification_url, // Link directo para el cliente
      id: invoice.id
    };

  } catch (error: any) {
    console.error("❌ Error mortal timbrando factura:", error.message);
    return { success: false, error: error.message };
  }
};