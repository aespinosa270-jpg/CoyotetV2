// src/lib/zeptomail.ts

// 1. Generador de la plantilla HTML dinámica
function generarHtmlMembresia(clienteNombre: string, memberId: string, tier: string = "NONE") {
    const anio = new Date().getFullYear()
  
    // ─── CONFIGURACIÓN VISUAL POR NIVEL DE MEMBRESÍA ──────────────────────────
    const themes: Record<string, any> = {
      NONE: {
        titulo: "BASE",
        material: "ALUMINIO",
        cardGradient: "linear-gradient(135deg, #f5f5f5 0%, #b5b5b5 50%, #7a7a7a 100%)",
        mainTextGradient: "linear-gradient(to bottom, #aaaaaa, #555555)",
        borderColor: "#ffffff",
        textColor: "#222222",
        subTextColor: "#444444"
      },
      GOLD: {
        titulo: "ORO",
        material: "AURUM 24K",
        cardGradient: "linear-gradient(135deg, #FFF7D6 0%, #D4AF37 50%, #AA7C11 100%)",
        mainTextGradient: "linear-gradient(to bottom, #FFE87C, #AA7C11)",
        borderColor: "#FFE87C",
        textColor: "#111111",
        subTextColor: "#333333"
      },
      BLACK: {
        titulo: "BLACK",
        material: "OBSIDIANA",
        cardGradient: "linear-gradient(135deg, #434343 0%, #1c1c1c 50%, #000000 100%)",
        mainTextGradient: "linear-gradient(to bottom, #ffffff, #888888)",
        borderColor: "#333333",
        textColor: "#ffffff",
        subTextColor: "#aaaaaa"
      },
      ELITE: {
        titulo: "ELITE",
        material: "TITANIO",
        cardGradient: "linear-gradient(135deg, #ffffff 0%, #f0f1f5 50%, #d1d5db 100%)",
        mainTextGradient: "linear-gradient(to bottom, #555555, #111111)",
        borderColor: "#ffffff",
        textColor: "#111111",
        subTextColor: "#555555"
      }
    }
  
    // Fallback seguro por si llega un nivel no registrado
    const config = themes[tier] || themes.NONE
  
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-apple-disable-message-reformatting">
      <title>Confirmación de Membresía - Coyote Textil</title>
      <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        body { margin: 0; padding: 0; background-color: #050505; color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #050505; padding-bottom: 40px; }
        .main { background-color: #0d0d0d; margin: 0 auto; width: 100%; max-width: 600px; border: 1px solid #222222; border-top: 5px solid #FFD100; border-radius: 0 0 8px 8px;}
        .yellow-text { color: #FFD100; }
        .link-yellow { color: #FFD100; text-decoration: none; font-weight: bold; }
        
        @keyframes cardShine {
          0% { border-color: #333333; box-shadow: 0 0 15px rgba(0,0,0,0.8); }
          50% { border-color: #555555; box-shadow: 0 0 25px rgba(255,255,255,0.1); transform: translateY(-2px); }
          100% { border-color: #333333; box-shadow: 0 0 15px rgba(0,0,0,0.8); }
        }
        .css-card-container {
          animation: cardShine 4s infinite ease-in-out;
          transition: all 0.3s ease;
        }
        @media screen and (max-width: 600px) {
          .mobile-padding { padding: 20px !important; }
          .header-col { display: block !important; width: 100% !important; text-align: center !important; margin-bottom: 10px; }
          .base-text { font-size: 45px !important; }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <table class="main" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" role="presentation">
          <tr>
            <td style="padding: 15px 30px; background-color: #111111; border-bottom: 1px solid #222222;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <th class="header-col" width="50%" align="left" style="font-weight: 800; font-size: 14px; letter-spacing: 2px; color: #ffffff;">
                    COYOTE TEXTIL
                  </th>
                  <th class="header-col" width="50%" align="right" style="font-weight: 400; font-size: 11px; letter-spacing: 1px; color: #888888;">
                    SOPORTE 24/7: <a href="tel:5596023567" class="link-yellow" style="font-size: 13px;">55 9602 3567</a>
                  </th>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 50px 30px 30px 30px; text-align: center;" class="mobile-padding">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td align="center">
                    <div style="width: 200px; margin: 0 auto;">
                      <div style="font-size: 42px; font-weight: 900; letter-spacing: 2px; color: #ffffff; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); line-height: 1;">
                        COYOTE
                      </div>
                      <div style="font-size: 18px; font-weight: 700; letter-spacing: 8px; color: #FFD100; margin-top: 5px;">
                        TEXTIL
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 30px 40px 30px; text-align: center;" class="mobile-padding">
              <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; color: #ffffff;">
                CONFIRMACIÓN DE <span class="yellow-text">MEMBRESÍA</span>
              </h1>
              <p style="margin: 15px 0 0 0; font-size: 15px; color: #aaaaaa; line-height: 1.6;">
                Hola, <strong>${clienteNombre}</strong>. Tu nivel de acceso <strong style="color: #ffffff;">${config.titulo}</strong> ha sido activado. Tienes acceso inmediato a nuestra plataforma.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 50px 30px;" align="center" class="mobile-padding">
              <div class="css-card-container" style="background-color: #1a1a1a; padding: 15px; border-radius: 16px; border: 1px solid #333333;">
                
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; margin: 0 auto; background: ${config.cardGradient}; border-radius: 12px; border: 1px solid ${config.borderColor};">
                  <tr>
                    <td style="padding: 25px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="40" align="left">
                            <div style="background-color: #111111; color: #ffffff; font-weight: bold; font-size: 14px; width: 36px; height: 36px; border-radius: 8px; text-align: center; line-height: 36px;">
                              CY
                            </div>
                          </td>
                          <td align="left" style="padding-left: 15px;">
                            <div style="font-size: 10px; font-weight: 800; letter-spacing: 2px; color: ${config.textColor}; text-transform: uppercase;">
                              Coyote Textil<br>
                              <span style="color: ${config.subTextColor};">Infraestructura Nac.</span>
                            </div>
                          </td>
                          <td align="right">
                            <div style="background-color: #111111; color: #aaaaaa; font-size: 9px; font-weight: bold; padding: 6px 12px; border-radius: 4px; letter-spacing: 2px;">
                              ${config.material}
                            </div>
                          </td>
                        </tr>
                      </table>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="padding: 40px 0;">
                            <div class="base-text" style="font-size: 60px; font-weight: 900; letter-spacing: 12px; color: ${config.textColor}; background: ${config.mainTextGradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);">
                              ${config.titulo}
                            </div>
                          </td>
                        </tr>
                      </table>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="left">
                            <div style="font-size: 9px; font-weight: 700; color: ${config.subTextColor}; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 5px;">
                              Credencial de Acceso
                            </div>
                            <div style="font-family: 'Courier New', Courier, monospace; font-size: 16px; font-weight: 900; color: ${config.textColor}; letter-spacing: 4px;">
                              MX-${memberId} &bull;&bull;&bull;&bull; ${anio}
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 30px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr><td height="1" style="background-color: #222222; font-size: 0; line-height: 0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px; text-align: center;" class="mobile-padding">
              <a href="https://www.coyotetextil.com" class="link-yellow" style="font-size: 18px; letter-spacing: 2px;">WWW.COYOTETEXTIL.COM</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #080808; text-align: center; border-radius: 0 0 8px 8px;" class="mobile-padding">
              <p style="margin: 0; font-size: 11px; color: #555555; line-height: 1.6; letter-spacing: 0.5px;">
                <strong>COYOTE TEXTIL - INFRAESTRUCTURA NACIONAL</strong><br>
                República de Guatemala Letra A, Zona Centro<br>
                Alcaldía Cuauhtémoc, Ciudad de México.
              </p>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
    `
  }
  
  // 2. Función principal para enviar el correo
  export async function sendMembresiaEmail(clienteEmail: string, clienteNombre: string, memberId: string, tier: string = "NONE") {
    const ZEPTOMAIL_API_URL = "https://api.zeptomail.com/v1.1/email"
    const SENDER = process.env.ZEPTOMAIL_SENDER! 
    const TOKEN = process.env.ZEPTOMAIL_API_KEY!
  
    // Inyectamos el nivel ("GOLD", "BLACK", etc.) a la plantilla
    const htmlBody = generarHtmlMembresia(clienteNombre, memberId, tier)
  
    const payload = {
      from: { 
        address: SENDER,
        name: "Coyote Textil" 
      },
      to: [
        {
          email_address: {
            address: clienteEmail,
            name: clienteNombre
          }
        }
      ],
      subject: `Confirmación de Membresía ${tier === "NONE" ? "Base" : tier} - Coyote Textil`,
      htmlbody: htmlBody
    }
  
    try {
      const response = await fetch(ZEPTOMAIL_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Zoho-enczapikey ${TOKEN}` 
        },
        body: JSON.stringify(payload)
      })
  
      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ Error de ZeptoMail:", errorData)
        throw new Error(`Fallo al enviar correo: ${response.statusText}`)
      }
  
      const data = await response.json()
      console.log(`✅ Correo enviado exitosamente (${tier}):`, data)
      return { success: true, data }
  
    } catch (error) {
      console.error("❌ Excepción al enviar correo:", error)
      return { success: false, error }
    }
  }
  // 1. Generador de la plantilla HTML para Bienvenida
function generarHtmlBienvenida(clienteNombre: string) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-apple-disable-message-reformatting">
      <title>Bienvenido a Coyote Textil</title>
      <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        body { margin: 0; padding: 0; background-color: #050505; color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #050505; padding-bottom: 40px; }
        .main { background-color: #0d0d0d; margin: 0 auto; width: 100%; max-width: 600px; border: 1px solid #222222; border-top: 5px solid #FFD100; border-radius: 0 0 8px 8px;}
        .yellow-text { color: #FFD100; }
        .link-yellow { color: #FFD100; text-decoration: none; font-weight: bold; }
        
        /* Botón CSS Puro */
        .btn-primary {
          background-color: #FFD100;
          color: #050505 !important;
          padding: 16px 32px;
          text-decoration: none;
          font-weight: 900;
          letter-spacing: 2px;
          border-radius: 4px;
          display: inline-block;
          text-transform: uppercase;
          font-size: 14px;
          transition: background-color 0.3s ease;
        }
  
        @media screen and (max-width: 600px) {
          .mobile-padding { padding: 20px !important; }
          .header-col { display: block !important; width: 100% !important; text-align: center !important; margin-bottom: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <table class="main" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" role="presentation">
          
          <tr>
            <td style="padding: 15px 30px; background-color: #111111; border-bottom: 1px solid #222222;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <th class="header-col" width="50%" align="left" style="font-weight: 800; font-size: 14px; letter-spacing: 2px; color: #ffffff;">
                    COYOTE TEXTIL
                  </th>
                  <th class="header-col" width="50%" align="right" style="font-weight: 400; font-size: 11px; letter-spacing: 1px; color: #888888;">
                    SOPORTE 24/7: <a href="tel:5596023567" class="link-yellow" style="font-size: 13px;">55 9602 3567</a>
                  </th>
                </tr>
              </table>
            </td>
          </tr>
  
          <tr>
            <td style="padding: 50px 30px 20px 30px; text-align: center;" class="mobile-padding">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td align="center">
                    <div style="width: 200px; margin: 0 auto;">
                      <div style="font-size: 42px; font-weight: 900; letter-spacing: 2px; color: #ffffff; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); line-height: 1;">
                        COYOTE
                      </div>
                      <div style="font-size: 18px; font-weight: 700; letter-spacing: 8px; color: #FFD100; margin-top: 5px;">
                        TEXTIL
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
  
          <tr>
            <td style="padding: 10px 30px 30px 30px; text-align: center;" class="mobile-padding">
              <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; color: #ffffff;">
                BIENVENIDO A LA <span class="yellow-text">INFRAESTRUCTURA</span>
              </h1>
              <p style="margin: 20px 0 0 0; font-size: 16px; color: #cccccc; line-height: 1.6;">
                Hola, <strong>${clienteNombre}</strong>. Tu cuenta ha sido creada exitosamente.
              </p>
              <p style="margin: 15px 0 0 0; font-size: 15px; color: #888888; line-height: 1.6;">
                A partir de este momento tienes acceso a nuestra plataforma. Estamos listos para operar y brindarte el soporte logístico y comercial que tu negocio necesita.
              </p>
            </td>
          </tr>
  
          <tr>
            <td style="padding: 0 30px 40px 30px;" align="center" class="mobile-padding">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 400px; background-color: #111111; border-radius: 8px; border: 1px solid #222222;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 700; color: #ffffff; letter-spacing: 1px;">
                      <span class="yellow-text">✓</span> CATÁLOGO COMPLETO
                    </p>
                    <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 700; color: #ffffff; letter-spacing: 1px;">
                      <span class="yellow-text">✓</span> LOGÍSTICA INTEGRADA
                    </p>
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #ffffff; letter-spacing: 1px;">
                      <span class="yellow-text">✓</span> ATENCIÓN INTELIGENTE
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
  
          <tr>
            <td style="padding: 0 30px 50px 30px; text-align: center;" class="mobile-padding">
              <a href="https://www.coyotetextil.com" class="btn-primary">INICIAR SESIÓN</a>
            </td>
          </tr>
  
          <tr>
            <td align="center" style="padding: 0 30px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr><td height="1" style="background-color: #222222; font-size: 0; line-height: 0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>
  
          <tr>
            <td style="padding: 40px 30px; text-align: center;" class="mobile-padding">
              <a href="https://www.coyotetextil.com" class="link-yellow" style="font-size: 18px; letter-spacing: 2px;">WWW.COYOTETEXTIL.COM</a>
            </td>
          </tr>
  
          <tr>
            <td style="padding: 30px; background-color: #080808; text-align: center; border-radius: 0 0 8px 8px;" class="mobile-padding">
              <p style="margin: 0; font-size: 11px; color: #555555; line-height: 1.6; letter-spacing: 0.5px;">
                <strong>COYOTE TEXTIL - INFRAESTRUCTURA NACIONAL</strong><br>
                República de Guatemala Letra A, Zona Centro<br>
                Alcaldía Cuauhtémoc, Ciudad de México.
              </p>
            </td>
          </tr>
  
        </table>
      </div>
    </body>
    </html>
    `
  }
  
  // 2. Función principal para enviar el correo de Bienvenida
  export async function sendBienvenidaEmail(clienteEmail: string, clienteNombre: string) {
    const ZEPTOMAIL_API_URL = "https://api.zeptomail.com/v1.1/email"
    const SENDER = process.env.ZEPTOMAIL_SENDER! 
    const TOKEN = process.env.ZEPTOMAIL_API_KEY!
  
    const htmlBody = generarHtmlBienvenida(clienteNombre)
  
    const payload = {
      from: { 
        address: SENDER,
        name: "Coyote Textil" 
      },
      to: [
        {
          email_address: {
            address: clienteEmail,
            name: clienteNombre
          }
        }
      ],
      subject: "Bienvenido a la Infraestructura - Coyote Textil",
      htmlbody: htmlBody
    }
  
    try {
      const response = await fetch(ZEPTOMAIL_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Zoho-enczapikey ${TOKEN}` 
        },
        body: JSON.stringify(payload)
      })
  
      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ Error de ZeptoMail (Bienvenida):", errorData)
        throw new Error(`Fallo al enviar correo: ${response.statusText}`)
      }
  
      const data = await response.json()
      console.log(`✅ Correo de bienvenida enviado a ${clienteEmail}`, data)
      return { success: true, data }
  
    } catch (error) {
      console.error("❌ Excepción al enviar correo de bienvenida:", error)
      return { success: false, error }
    }
  }
  // ─────────────────────────────────────────────────────────────────────
// AÑADIR AL FINAL DE src/lib/zeptomail.ts
// ─────────────────────────────────────────────────────────────────────

function generarHtmlResetPassword(clienteNombre: string, resetUrl: string) {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <title>Recuperar Acceso - Coyote Textil</title>
    <style>
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      body { margin: 0; padding: 0; background-color: #050505; color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
      .wrapper { width: 100%; table-layout: fixed; background-color: #050505; padding-bottom: 40px; }
      .main { background-color: #0d0d0d; margin: 0 auto; width: 100%; max-width: 600px; border: 1px solid #222222; border-top: 5px solid #FFD100; border-radius: 0 0 8px 8px; }
      .yellow-text { color: #FFD100; }
      .link-yellow { color: #FFD100; text-decoration: none; font-weight: bold; }
      .btn-primary { background-color: #FFD100; color: #050505 !important; padding: 16px 32px; text-decoration: none; font-weight: 900; letter-spacing: 2px; border-radius: 4px; display: inline-block; text-transform: uppercase; font-size: 14px; }
      @media screen and (max-width: 600px) {
        .mobile-padding { padding: 20px !important; }
        .header-col { display: block !important; width: 100% !important; text-align: center !important; margin-bottom: 10px; }
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <table class="main" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" role="presentation">
        <tr>
          <td style="padding: 15px 30px; background-color: #111111; border-bottom: 1px solid #222222;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <th class="header-col" width="50%" align="left" style="font-weight: 800; font-size: 14px; letter-spacing: 2px; color: #ffffff;">COYOTE TEXTIL</th>
                <th class="header-col" width="50%" align="right" style="font-weight: 400; font-size: 11px; letter-spacing: 1px; color: #888888;">
                  SOPORTE 24/7: <a href="tel:5596023567" class="link-yellow" style="font-size: 13px;">55 9602 3567</a>
                </th>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 50px 30px 20px 30px; text-align: center;" class="mobile-padding">
            <div style="width: 200px; margin: 0 auto;">
              <div style="font-size: 42px; font-weight: 900; letter-spacing: 2px; color: #ffffff; line-height: 1;">COYOTE</div>
              <div style="font-size: 18px; font-weight: 700; letter-spacing: 8px; color: #FFD100; margin-top: 5px;">TEXTIL</div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 30px 30px 30px; text-align: center;" class="mobile-padding">
            <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; color: #ffffff;">
              RECUPERAR <span class="yellow-text">ACCESO</span>
            </h1>
            <p style="margin: 20px 0 0 0; font-size: 16px; color: #cccccc; line-height: 1.6;">
              Hola, <strong>${clienteNombre}</strong>. Recibimos una solicitud para restablecer tu contraseña.
            </p>
            <p style="margin: 15px 0 0 0; font-size: 14px; color: #888888; line-height: 1.6;">
              Si no fuiste tú, ignora este correo. Tu contraseña no cambiará.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 30px 20px 30px;" align="center" class="mobile-padding">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 400px; background-color: #111111; border-radius: 8px; border: 1px solid #222222;">
              <tr>
                <td style="padding: 20px; text-align: center;">
                  <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #555555; letter-spacing: 2px; text-transform: uppercase;">Este enlace expira en</p>
                  <p style="margin: 0; font-size: 28px; font-weight: 900; color: #FFD100; letter-spacing: 4px;">60 MINUTOS</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 30px 50px 30px; text-align: center;" class="mobile-padding">
            <a href="${resetUrl}" class="btn-primary">RESTABLECER CONTRASEÑA</a>
            <p style="margin: 20px 0 0 0; font-size: 12px; color: #555555; line-height: 1.6;">
              O copia y pega este enlace en tu navegador:<br>
              <a href="${resetUrl}" style="color: #888888; word-break: break-all;">${resetUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0 30px;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
              <tr><td height="1" style="background-color: #222222; font-size: 0; line-height: 0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px 30px; text-align: center;" class="mobile-padding">
            <a href="https://www.coyotetextil.com" class="link-yellow" style="font-size: 18px; letter-spacing: 2px;">WWW.COYOTETEXTIL.COM</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px; background-color: #080808; text-align: center; border-radius: 0 0 8px 8px;" class="mobile-padding">
            <p style="margin: 0; font-size: 11px; color: #555555; line-height: 1.6; letter-spacing: 0.5px;">
              <strong>COYOTE TEXTIL - INFRAESTRUCTURA NACIONAL</strong><br>
              República de Guatemala Letra A, Zona Centro<br>
              Alcaldía Cuauhtémoc, Ciudad de México.
            </p>
          </td>
        </tr>
      </table>
    </div>
  </body>
  </html>
  `
}

export async function sendResetPasswordEmail(clienteEmail: string, clienteNombre: string, resetUrl: string) {
  const ZEPTOMAIL_API_URL = "https://api.zeptomail.com/v1.1/email"
  const SENDER = process.env.ZEPTOMAIL_SENDER!
  const TOKEN  = process.env.ZEPTOMAIL_API_KEY!

  const payload = {
    from:     { address: SENDER, name: "Coyote Textil" },
    to:       [{ email_address: { address: clienteEmail, name: clienteNombre } }],
    subject:  "Recuperar acceso - Coyote Textil",
    htmlbody: generarHtmlResetPassword(clienteNombre, resetUrl),
  }

  try {
    const response = await fetch(ZEPTOMAIL_API_URL, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Zoho-enczapikey ${TOKEN}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("❌ Error de ZeptoMail (Reset):", errorData)
      throw new Error(`Fallo al enviar correo: ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`✅ Correo de reset enviado a ${clienteEmail}`, data)
    return { success: true, data }
  } catch (error) {
    console.error("❌ Excepción al enviar correo de reset:", error)
    return { success: false, error }
  }
}