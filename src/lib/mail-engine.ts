// src/lib/mail-engine.ts
import nodemailer from 'nodemailer';

// ==========================================
// 1. PLANTILLA INDUSTRIAL B2B (PARA CLIENTES)
// ==========================================
const getIndustrialTemplate = (title: string, content: string) => `
  <div style="background-color: #f4f4f4; padding: 40px 20px; font-family: 'Arial Black', Arial, sans-serif; color: #000;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-collapse: collapse;">
      <tr>
        <td style="background-color: #000000; padding: 25px 40px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1.5px; font-style: italic;">
            COYOTE<span style="color: #FDCB02;">.</span>
          </h1>
          <p style="color: #FDCB02; margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 3px;">
            INFRAESTRUCTURA TEXTIL NACIONAL
          </p>
        </td>
      </tr>
      <tr><td height="4" style="background-color: #FDCB02;"></td></tr>
      <tr>
        <td style="padding: 40px;">
          <h2 style="font-size: 22px; font-weight: 900; text-transform: uppercase; margin-top: 0; margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 10px;">
            ${title}
          </h2>
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; font-size: 14px;">
            ${content}
          </div>
        </td>
      </tr>
      <tr>
        <td style="background-color: #f9f9f9; padding: 20px 40px; text-align: left; border-top: 1px solid #eee;">
          <p style="font-size: 11px; color: #333; margin: 0; font-weight: bold;">COYOTE TEXTIL S.A. DE C.V.</p>
          <p style="font-size: 10px; color: #999; margin: 5px 0 0 0;">Este es un mensaje automático del sistema. Documento de carácter confidencial.</p>
        </td>
      </tr>
    </table>
  </div>
`;

// ==========================================
// 2. MOTOR: ZEPTOMAIL (PARA CLIENTES - ALTA VELOCIDAD)
// ==========================================
export async function sendClientEmail(toEmail: string, subject: string, title: string, htmlBody: string) {
  const url = "https://api.zeptomail.com/v1.1/email";
  
  // Envolvemos el contenido en el diseño industrial Coyote
  const finalHtml = getIndustrialTemplate(title, htmlBody);

  const payload = {
    from: { address: "noreply@coyotetextil.com", name: "COYOTE TEXTIL" },
    to: [{ email_address: { address: toEmail } }],
    subject: subject,
    htmlbody: finalHtml,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Zoho-enczapikey ${process.env.ZEPTOMAIL_API_KEY}`
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("ZeptoMail Error:", errorData);
      throw new Error("Fallo al enviar correo con ZeptoMail");
    }
    return await response.json();
  } catch (error) {
    console.error("Error en motor ZeptoMail:", error);
    throw error;
  }
}

// ==========================================
// 3. MOTOR: ZOHO SMTP (PARA ADMIN / INTERNO)
// ==========================================
export async function sendAdminNotification(subject: string, htmlContent: string) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_EMAIL,
      pass: process.env.ZOHO_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"Portal B2B" <${process.env.ZOHO_EMAIL}>`,
    to: process.env.ZOHO_EMAIL, // Te lo envías a ti mismo
    subject: subject,
    html: htmlContent,
  };

  return await transporter.sendMail(mailOptions);
}