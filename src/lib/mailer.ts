export async function sendAdminOrderNotification(orderData: any) {
  const url = "https://api.zeptomail.com/v1.1/email";
  
  // OJO: ZeptoMail requiere que el token empiece con "Zoho-enczapikey "
  const zeptoToken = `Zoho-enczapikey ${process.env.ZEPTOMAIL_TOKEN}`;

  // Armamos el HTML del correo
  const htmlTemplate = `
    <div style="font-family: monospace; max-width: 600px; margin: 0 auto; background-color: #050505; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #333;">
      
      <div style="text-align: center; border-bottom: 2px dashed #FDCB02; padding-bottom: 20px; margin-bottom: 20px;">
        <h1 style="color: #FDCB02; margin: 0; font-size: 28px; text-transform: uppercase;">🚨 ¡NUEVA VENTA COYOTE! 🚨</h1>
        <p style="color: #888; margin-top: 5px;">Orden #${orderData.orderId || 'Desconocida'}</p>
      </div>

      <h3 style="color: #FDCB02; border-bottom: 1px solid #333; padding-bottom: 5px;">👤 DATOS DEL CLIENTE</h3>
      <p><strong>Nombre:</strong> ${orderData.customerName}</p>
      <p><strong>Email:</strong> ${orderData.customerEmail}</p>
      <p><strong>Teléfono:</strong> ${orderData.customerPhone || 'No proporcionado'}</p>

      <h3 style="color: #FDCB02; border-bottom: 1px solid #333; padding-bottom: 5px; margin-top: 25px;">📦 LOGÍSTICA Y ENVÍO</h3>
      <p><strong>Método de Envío:</strong> ${orderData.shippingMethod}</p>
      <p><strong>Dirección:</strong> ${orderData.shippingAddress}</p>

      <h3 style="color: #FDCB02; border-bottom: 1px solid #333; padding-bottom: 5px; margin-top: 25px;">💳 DETALLES DE PAGO</h3>
      <p><strong>Estado:</strong> ✅ PAGADO Y CONFIRMADO (Stripe)</p>
      <p><strong>Método:</strong> ${orderData.paymentMethod || 'Tarjeta'}</p>

      <h3 style="color: #FDCB02; border-bottom: 1px solid #333; padding-bottom: 5px; margin-top: 25px;">🛍️ PRODUCTOS COMPRADOS</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <tr style="background-color: #1a1a1a; text-align: left;">
          <th style="padding: 10px; border: 1px solid #333;">Producto</th>
          <th style="padding: 10px; border: 1px solid #333;">Cant.</th>
          <th style="padding: 10px; border: 1px solid #333;">Total</th>
        </tr>
        ${orderData.items.map((item: any) => `
          <tr>
            <td style="padding: 10px; border: 1px solid #333;">${item.name}</td>
            <td style="padding: 10px; border: 1px solid #333;">${item.quantity}</td>
            <td style="padding: 10px; border: 1px solid #333;">$${item.price} MXN</td>
          </tr>
        `).join('')}
      </table>

      <div style="margin-top: 30px; text-align: right; font-size: 22px; font-weight: 900; color: #FDCB02;">
        TOTAL COBRADO: $${orderData.totalAmount} MXN
      </div>

    </div>
  `;

  // Estructura exacta que pide la API de ZeptoMail
  const body = {
    from: {
      address: process.env.EMAIL_FROM_ADDRESS,
      name: "Radar Coyote"
    },
    to: [
      {
        email_address: {
          address: process.env.ADMIN_NOTIFICATION_EMAIL,
          name: "Patrón Coyote"
        }
      }
    ],
    subject: `💰 Venta Confirmada - $${orderData.totalAmount} MXN - ${orderData.customerName}`,
    htmlbody: htmlTemplate,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': zeptoToken
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("🔥 Error de ZeptoMail:", errorData);
      throw new Error("Fallo al enviar correo con ZeptoMail");
    }

    console.log("🐺 ¡Notificación de venta disparada con éxito por ZeptoMail!");
  } catch (error) {
    console.error("❌ Excepción enviando correo del Radar:", error);
  }
}