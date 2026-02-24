// src/lib/facturapi.ts
import Facturapi from 'facturapi';

// 🔥 AHORA SÍ: Usamos tu llave LIVE de producción para timbrar ante el SAT
const facturapi = new Facturapi(process.env.FACTURAPI_LIVE_SECRET_KEY as string);

export const timbrarFacturaReal = async (customerData: any, fiscalData: any, items: any[], paymentMethod: string, enviosYFletes: number) => {
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
        description: `${item.title} - Color: ${item.meta?.color || 'N/A'}`,
        product_key: "53103000", // Clave SAT general para textiles/telas (cámbiala si usas otra)
        price: item.price,
        taxes: [
          {
            type: "IVA",
            rate: 0.16 // IVA 16% REAL
          }
        ]
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
          taxes: [
            {
              type: "IVA",
              rate: 0.16
            }
          ]
        },
        quantity: 1
      });
    }

    // 4. MAPEAR LA FORMA DE PAGO DEL SAT
    let formaPago = "99"; // Por definir (Efectivo/SPEI no pagado)
    let metodoPago = "PPD"; // Pago en parcialidades o diferido

    if (paymentMethod === 'card') {
      formaPago = "04"; // Tarjeta de crédito/débito
      metodoPago = "PUE"; // Pago en una sola exhibición (ya se cobró)
    }

    console.log("Timbrando Factura en el SAT...");

    // 5. TIMBRAR LA FACTURA REAL
    const invoice = await facturapi.invoices.create({
      customer: customer.id,
      items: lineItems,
      use: fiscalData.usoCFDI,
      payment_form: formaPago,
      payment_method: metodoPago
    });

    console.log("✅ FACTURA TIMBRADA CON ÉXITO. UUID:", invoice.uuid);
    
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