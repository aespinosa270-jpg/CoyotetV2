import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Redis } from '@upstash/redis';

// ==========================================
// 🔑 LLAVES MAESTRAS
// ==========================================
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Llaves OpenPay
const OPENPAY_ID = process.env.OPENPAY_MERCHANT_ID;
const OPENPAY_SK = process.env.OPENPAY_PRIVATE_KEY;
const openpayAuth = Buffer.from(`${OPENPAY_SK}:`).toString('base64');

// Llaves Facturapi
const FACTURAPI_KEY = process.env.FACTURAPI_KEY;
const facturapiAuth = Buffer.from(`${FACTURAPI_KEY}:`).toString('base64');

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ==========================================
// 🔧 REDIS — FUENTE DE VERDAD UNICA
// ==========================================
function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Faltan env vars de Upstash: UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN');
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// ==========================================
// 📦 TIPOS DE DATOS
// ==========================================
interface ClientePerfil {
  nombre: string;
  genero: 'hombre' | 'mujer' | 'unknown';
  telefono: string;
  primerContacto: string;
  ultimoContacto: string;
  totalCompras: number;
  montoAcumulado: number;
  productosComprados: string[];
  direccionEnvio: string;   // Dirección COMPLETA de entrega (calle, número, colonia, ciudad, CP de envío)
  cpFiscal: string;         // CP FISCAL exclusivo para facturación SAT — NUNCA usar para envío
  metodoPagoFavorito: string;
  requiereFrecuenteFactura: boolean;
  notas: string;
}

interface PedidoRegistro {
  fecha: string;
  productos: string;
  monto: number;
  metodo: string;
  conFactura: boolean;
}

// ==========================================
// 🧠 HELPERS DE MEMORIA PERSISTENTE
// ==========================================

async function getHistorial(redis: Redis, tel: string): Promise<Array<{role: string; content: string}>> {
  try {
    return (await redis.get<Array<{role: string; content: string}>>(`historial:${tel}`)) || [];
  } catch { return []; }
}

async function saveHistorial(redis: Redis, tel: string, h: Array<{role: string; content: string}>) {
  // 60 mensajes = ~30 turnos. Suficiente para recordar toda una negociacion.
  const trimmed = h.length > 60 ? h.slice(-60) : h;
  await redis.set(`historial:${tel}`, trimmed, { ex: 60 * 60 * 24 * 90 }); // 90 dias TTL
}

async function getCliente(redis: Redis, tel: string): Promise<ClientePerfil | null> {
  try {
    return await redis.get<ClientePerfil>(`cliente:${tel}`);
  } catch { return null; }
}

async function saveCliente(redis: Redis, tel: string, p: ClientePerfil) {
  await redis.set(`cliente:${tel}`, p);
}

async function registrarPedido(redis: Redis, tel: string, pedido: PedidoRegistro) {
  const cliente = await getCliente(redis, tel);
  if (!cliente) return;
  cliente.totalCompras = (cliente.totalCompras || 0) + 1;
  cliente.montoAcumulado = (cliente.montoAcumulado || 0) + pedido.monto;
  cliente.ultimoContacto = pedido.fecha;
  cliente.metodoPagoFavorito = pedido.metodo;
  if (pedido.conFactura) cliente.requiereFrecuenteFactura = true;
  const pedidos: PedidoRegistro[] = (await redis.get<PedidoRegistro[]>(`pedidos:${tel}`)) || [];
  pedidos.push(pedido);
  await redis.set(`pedidos:${tel}`, pedidos);
  await saveCliente(redis, tel, cliente);
  console.log(`📊 Pedido registrado para ${cliente.nombre}: $${pedido.monto} MXN`);
}

async function detectarGenero(nombre: string): Promise<'hombre' | 'mujer' | 'unknown'> {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: `El nombre es "${nombre}". Responde SOLO: "hombre", "mujer" o "unknown". Sin nada mas.` }],
      max_tokens: 5,
      temperature: 0,
    });
    const g = res.choices[0].message.content?.trim().toLowerCase() || 'unknown';
    if (g === 'hombre' || g === 'mujer') return g;
    return 'unknown';
  } catch { return 'unknown'; }
}

// ==========================================
// 🏪 BODEGA Y PRECIOS
// ==========================================
const PRECIOS_DEFAULT: Record<string, { menudeo: number; mayoreo: number; info: string }> = {
  "micro piqué":       { menudeo: 90,  mayoreo: 85,  info: "100% Poliéster 145g. Dry-Fit alto rendimiento. Rend. 4.3m/kg. +35 colores." },
  "piqué vera":        { menudeo: 95,  mayoreo: 90,  info: "100% Poliéster 145g. Más suave que el micro. Rend. 4.3m/kg. +40 colores." },
  "micro panal":       { menudeo: 95,  mayoreo: 90,  info: "100% Poliéster 145g. Máxima transpiración. Rend. 4.3m/kg. +35 colores." },
  "torneo":            { menudeo: 105, mayoreo: 98,  info: "100% Poliéster 150g. Uso rudo/torneos. Rend. 4.3m/kg. +35 colores." },
  "athlos":            { menudeo: 125, mayoreo: 120, info: "145g. Versatilidad total. Rend. 4.0m/kg. Color único por rollo." },
  "brock":             { menudeo: 125, mayoreo: 120, info: "145g. Versatilidad total. Rend. 4.0m/kg. Color único por rollo." },
  "piqué vera sport":  { menudeo: 125, mayoreo: 120, info: "145g. Versatilidad total. Rend. 4.0m/kg. Color único por rollo." },
  "kyoto":             { menudeo: 155, mayoreo: 140, info: "145g. Tacto seda, caída premium. Rend. 4.0m/kg. Color único." },
  "panal plus":        { menudeo: 155, mayoreo: 140, info: "145g. Mayor cuerpo y estructura. Rend. 3.7m/kg. Color único." },
  "apolo":             { menudeo: 160, mayoreo: 145, info: "150g. Anti-pilling. Rend. 3.7m/kg. Color único." },
  "horous":            { menudeo: 160, mayoreo: 155, info: "145g. Moda deportiva urbana. Rend. 4.2m/kg. Color único." },
  "panal nitro":       { menudeo: 185, mayoreo: 170, info: "145g. Control de humedad extremo. Color único." },
};

async function getBodega(redis: Redis) {
  const guardado = await redis.get<typeof PRECIOS_DEFAULT>('bodega_coyote');
  if (!guardado) { await redis.set('bodega_coyote', PRECIOS_DEFAULT); return PRECIOS_DEFAULT; }
  return guardado;
}

async function actualizarPrecio(redis: Redis, producto: string, campo: 'menudeo' | 'mayoreo', precio: number) {
  const bodega = await getBodega(redis);
  if (!bodega[producto]) return false;
  bodega[producto][campo] = precio;
  await redis.set('bodega_coyote', bodega);
  return true;
}

// ==========================================
// 🚚 LOGICA DE ENVIO
// ==========================================
const LOGICA_ENVIOS_REAL = `
════════════════════════════════════════
⚠️ DOS CP COMPLETAMENTE DISTINTOS — NUNCA LOS CONFUNDAS:
• CP DE ENVÍO → parte de la dirección física donde llega la mercancía.
  Se extrae de la dirección completa que el cliente te da. SOLO sirve para calcular distancia y flete.
• CP FISCAL (cpFiscal) → dato del SAT para timbrar factura.
  Se pide ÚNICAMENTE si el cliente requiere factura, NUNCA antes, NUNCA para calcular envío.
MEZCLARLOS es un error grave. Son dos datos independientes.
════════════════════════════════════════

PESO DE UN ROLLO: siempre 25kg exactos. Nunca menciones otro número.
CAPACIDAD MÁXIMA POR VEHÍCULO: 80 rollos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 1 — DETERMINAR ZONA (con el CP de la dirección de envío):
Toma los 2 primeros dígitos del CP (prefix2 = entero del CP ÷ 1000):

CDMX (prefix2: 01–16) → Flotilla Coyote:
  prefix2 06/08/15 → 5 km
  prefix2 07/09/03 → 12 km
  prefix2 02/04/11 → 18 km
  prefix2 01/05/10/12/13/14/16 → 28 km
  cualquier otro dentro de 01–16 → 15 km

EDOMEX (prefix2: 50–57) → Flotilla Coyote:
  57 → 10 km | 55 → 20 km | 53/54 → 25 km | 56 → 35 km
  52 → 55 km | 50/51 → 70 km | resto → 40 km

COLINDANTES → Flotilla Coyote:
  Hidalgo (prefix2 42–43) → 100 km
  Puebla  (prefix2 72–75) → 130 km
  Morelos (prefix2 62)    → 90 km

RESTO DEL PAÍS → Skydropx Nacional (no flotilla).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 2 — CALCULAR FLETE (carga de bultos):
  peso < 10 kg y 0 rollos → $150
  1 rollo                 → $200
  2–4 rollos              → $250
  5–10 rollos             → $300
  11–15 rollos            → $400
  16–20 rollos            → $500
  más de 20 rollos        → $1,000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 3 — CALCULAR TRASLADO:

A) Flotilla Coyote (zonas locales y colindantes):
  vehículos_necesarios = ceil(rollos / 80)  [mínimo 1]
  costo_combustible_por_vehículo = (km_ida × 2 / 100) × 20 litros × $27
  costo_por_vehículo = costo_combustible × 4  [factor operativo]
  traslado_total = costo_por_vehículo × vehículos_necesarios

B) Skydropx Nacional (resto del país):
  traslado = $180 base + $12 × cada kg que exceda 5kg
  (si peso ≤ 5 kg → solo $180)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASO 4 — SUMAR TODO:
  subtotal_producto  (kg × precio)
+ flete              (paso 2)
+ traslado           (paso 3)
+ tarifa de servicio ($175, siempre fija)
= BASE TOTAL
+ IVA 16%           (SOLO si el cliente pidió factura, se aplica sobre la BASE TOTAL)
= TOTAL FINAL

Muestra siempre el desglose completo línea por línea, nunca un número solo.
`;

// ==========================================
// 📲 HELPER ENVIAR WHATSAPP
// ==========================================
async function enviarWhatsapp(to: string, body: string) {
  const res = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body } })
  });
  const data = await res.json();
  if (!res.ok) console.error('❌ META ERROR:', JSON.stringify(data, null, 2));
  else console.log(`✅ WA enviado a ${to}`);
  return res.ok;
}

// ==========================================
// 🏦 WEBHOOK OPENPAY — PAGO CONFIRMADO
// ==========================================
async function handleOpenpayWebhook(body: any) {
  console.log('🔔 OPENPAY:', body.type);

  if (body.type === 'charge.succeeded') {
    const transaccion = body.transaction;
    const metadata = transaccion.metadata;

    if (metadata?.phone) {
      const redis = getRedis();
      const tel = metadata.phone.replace(/\D/g, '');
      const quiereFactura = metadata.req_invoice === 'YES';
      const monto = transaccion.amount;
      const perfil = await getCliente(redis, tel);
      const saludo = perfil?.nombre ? `¡Qué onda ${perfil.nombre}!` : '¡Qué onda patrón!';

      let msg = `🐺 ${saludo} El sistema de pagos confirmó que tu pago de *$${monto} MXN* ya cayó. ✅\n\n¡Tu pedido entró a bodega! 📦`;

      if (quiereFactura && metadata.rfc !== 'NONE') {
        console.log(`🧾 Facturando RFC: ${metadata.rfc}`);
        try {
          const custRes = await fetch('https://www.facturapi.io/v2/customers', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${facturapiAuth}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ legal_name: metadata.razon, tax_id: metadata.rfc, tax_system: metadata.regimen, zip: metadata.cp })
          });
          const clienteSAT = await custRes.json();
          const precioBase = monto / 1.16;
          let formaPago = "04";
          if (transaccion.method === 'bank_account') formaPago = "03";
          if (transaccion.method === 'store') formaPago = "01";

          const invRes = await fetch('https://www.facturapi.io/v2/invoices', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${facturapiAuth}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer: clienteSAT.id,
              items: [{ product: { description: "Telas de Alto Rendimiento Coyote Textil", product_key: "11162100", price: precioBase, taxes: [{ type: "IVA", rate: 0.16 }] }, quantity: 1 }],
              use: metadata.uso, payment_form: formaPago, payment_method: "PUE"
            })
          });
          const factura = await invRes.json();

          if (invRes.ok) {
            msg += `\n\n🧾 *Tu Factura 4.0 ya está timbrada.*\nDescarga el PDF:\nhttps://www.facturapi.io/v2/invoices/${factura.id}/pdf`;
            console.log('✅ Factura timbrada.');
          } else {
            console.error('❌ Facturapi:', factura);
            msg += `\n\n⚠️ El SAT rebotó un dato (RFC o CP). El Patrón lo revisa manualmente.`;
          }
        } catch (e) {
          console.error('❌ Error facturación:', e);
          msg += `\n\n⚠️ Intermitencia con el SAT. Te mando tu factura más tarde.`;
        }
      }

      // Registrar compra en Redis
      await registrarPedido(redis, tel, {
        fecha: new Date().toISOString(),
        productos: metadata.productos || 'No especificado',
        monto,
        metodo: transaccion.method || 'desconocido',
        conFactura: quiereFactura
      });

      await enviarWhatsapp(tel, msg);
    }
  }
}

// ==========================================
// 💬 WEBHOOK WHATSAPP — MENSAJES
// ==========================================
async function handleWhatsappWebhook(body: any) {
  const mensajeInfo = body.entry[0].changes[0].value.messages[0];
  if (mensajeInfo.type !== 'text') return; // Solo texto por ahora

  const tel = mensajeInfo.from;
  const msgCliente = mensajeInfo.text.body;
  const nombreWA = body.entry[0].changes[0].value.contacts[0].profile.name || '';
  console.log(`💬 [${tel}]: "${msgCliente}"`);

  const redis = getRedis();
  const msgLower = msgCliente.trim().toLowerCase();

  // ── COMANDOS ADMIN (JACK) ──────────────────
  if (msgLower === 'soy jack' || msgLower === 'soy jack.') {
    await enviarWhatsapp(tel, 'hola habibi te puedes verificar 🔒');
    return;
  }
  if (msgLower === 'elcoyote56') {
    const h = await getHistorial(redis, tel);
    h.push({ role: 'user', content: msgCliente });
    h.push({ role: 'assistant', content: '🐺 ¡Órdenes recibidas Habibi! Modo Administrador activo. ¿Qué cambiamos de la bodega o a quién le mandamos mensaje?' });
    await saveHistorial(redis, tel, h);
    await enviarWhatsapp(tel, '🐺 ¡Órdenes recibidas Habibi! Modo Administrador activo. ¿Qué cambiamos de la bodega o a quién le mandamos mensaje?');
    return;
  }

  // ── PERFIL DEL CLIENTE ─────────────────────
  let perfil = await getCliente(redis, tel);

  // Cliente completamente nuevo
  if (!perfil) {
    perfil = {
      nombre: '', genero: 'unknown', telefono: tel,
      primerContacto: new Date().toISOString(), ultimoContacto: new Date().toISOString(),
      totalCompras: 0, montoAcumulado: 0, productosComprados: [],
      direccionEnvio: '', cpFiscal: '', metodoPagoFavorito: '', requiereFrecuenteFactura: false, notas: ''
    };
    await saveCliente(redis, tel, perfil);
    const bienvenida = `¡Hola! Bienvenido a *Coyote Textil* 🐺\nSoy El Coyote, tu asesor de telas deportivas.\n\n¿Con quién tengo el gusto? ¿Cuál es tu nombre? 😊`;
    const h = await getHistorial(redis, tel);
    h.push({ role: 'user', content: msgCliente });
    h.push({ role: 'assistant', content: bienvenida });
    await saveHistorial(redis, tel, h);
    await enviarWhatsapp(tel, bienvenida);
    return;
  }

  // Aún no tenemos su nombre → el mensaje actual ES el nombre
  if (!perfil.nombre) {
    const primerNombre = msgCliente.trim().split(' ')[0];
    perfil.nombre = primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1).toLowerCase();
    perfil.genero = await detectarGenero(perfil.nombre);
    perfil.ultimoContacto = new Date().toISOString();
    await saveCliente(redis, tel, perfil);

    const saludo = perfil.genero === 'mujer'
      ? `¡Un placer, ${perfil.nombre}! 🌟 ¿En qué te puedo ayudar hoy?`
      : `¡Mucho gusto, ${perfil.nombre}! 🐺 ¿En qué te puedo ayudar hoy?`;

    const h = await getHistorial(redis, tel);
    h.push({ role: 'user', content: msgCliente });
    h.push({ role: 'assistant', content: saludo });
    await saveHistorial(redis, tel, h);
    await enviarWhatsapp(tel, saludo);
    return;
  }

  // Actualizar último contacto
  perfil.ultimoContacto = new Date().toISOString();
  await saveCliente(redis, tel, perfil);

  // ── HISTORIAL COMPLETO DESDE REDIS ─────────
  let historial = await getHistorial(redis, tel);
  historial.push({ role: 'user', content: msgCliente });

  const esElJefe = historial.some((m: any) => m.role === 'user' && m.content.trim() === 'elcoyote56');

  // ── DATOS FRESCOS PARA EL PROMPT ───────────
  const bodega = await getBodega(redis);
  const PRECIOS_ACTUALES = Object.entries(bodega)
    .map(([name, p]) => `- ${name.toUpperCase()}: $${p.menudeo}/kg menudeo | $${p.mayoreo}/kg mayoreo | rollo 25kg = $${p.mayoreo * 25}. ${p.info}`)
    .join('\n');

  const resumenCliente = `
PERFIL DEL CLIENTE EN ESTE CHAT:
- Nombre: ${perfil.nombre} | Género: ${perfil.genero}
- Compras realizadas: ${perfil.totalCompras} | Total gastado: $${perfil.montoAcumulado} MXN
- Productos que ha comprado antes: ${perfil.productosComprados.length > 0 ? perfil.productosComprados.join(', ') : 'ninguno aún'}
- Dirección de envío guardada: ${perfil.direccionEnvio || 'no registrada — pedirla después de cotizar'}
- CP Fiscal (SAT): ${perfil.cpFiscal || 'no registrado — pedirlo SOLO si requiere factura'}
- Método de pago habitual: ${perfil.metodoPagoFavorito || 'no registrado'}
- Requiere factura frecuentemente: ${perfil.requiereFrecuenteFactura ? 'SÍ — ofrecerla proactivamente' : 'NO'}
- Notas del cliente: ${perfil.notas || 'ninguna'}
`.trim();

  const tratamiento = perfil.genero === 'mujer'
    ? `Usa "jefa", "patrona" o su nombre "${perfil.nombre}". Tono cálido, amigable, profesional.`
    : `Usa "jefe", "patrón", "carnal" o su nombre "${perfil.nombre}". Tono de cuate mexicano, informal pero profesional.`;

  const CONTEXTO_VENDEDOR = `
ERES "EL COYOTE", ASESOR EXPERTO DE VENTAS DE COYOTE TEXTIL VÍA WHATSAPP.

PERSONALIDAD:
- Eres listo, rápido, y conoces las telas al 100%. Siempre tienes la respuesta.
- Máximo 4 líneas por respuesta. Directo, sin rodeos. Nada de bienvenidas repetidas.
- ${tratamiento}
- Usas el historial de conversación completo. NUNCA preguntes algo que el cliente ya respondió antes.
- Si el cliente ya ha comprado antes, reconócelo naturalmente.
- Si ya tienes la dirección de envío guardada, no la pidas de nuevo. Úsala y confirma.
- Si ${perfil.requiereFrecuenteFactura}, ofrece la factura antes de que la pida.

REGLAS DE PRODUCTO — CRÍTICO:
- Todo se vende por kilo.
- Un rollo pesa EXACTAMENTE 25kg. Nunca menciones otro número.
- Menudeo: menos de 25kg. Mayoreo: desde 25kg (un rollo completo).
- El precio de un rollo completo = precio mayoreo × 25. Siempre muéstralo calculado.
- Empuja el rollo completo porque baja el precio y es mejor negocio para el cliente.

🗺️ FLUJO DE VENTA OBLIGATORIO — RESPÉTALO SIEMPRE EN ESTE ORDEN:
1. COTIZACIÓN: El cliente pregunta por tela → presentas precio menudeo/mayoreo y el precio del rollo calculado.
2. DIRECCIÓN DE ENVÍO: Inmediatamente después de cotizar, pides la dirección COMPLETA:
   "¿A qué dirección te lo enviamos? (calle, número, colonia, ciudad y código postal)"
   → Con el CP de ESA dirección calculas el flete. NUNCA uses el CP fiscal para esto.
3. TOTAL CON ENVÍO: Presentas el desglose: producto + flete + tarifa de servicio = total.
4. FACTURA: Preguntas si requiere factura.
   → Si SÍ: pides RFC, Razón Social, CP FISCAL (es diferente al de envío), Régimen y Uso CFDI. Sumas 16% IVA.
   → Si NO: precio sin IVA.
5. MÉTODO DE PAGO: Tarjeta, SPEI o OXXO (no OXXO si supera $29,000).
6. COBRO: Generas el cargo con el comando GENERAR_COBRO.

⚠️ SEPARACIÓN ABSOLUTA DE CÓDIGOS POSTALES:
- CP DE ENVÍO = parte de la dirección física donde llega la mercancía. Lo usas SOLO para calcular distancia/flete.
- CP FISCAL = dato del SAT para timbrar la factura. Lo pides SOLO si el cliente quiere factura, NUNCA antes.
- Son dos datos completamente distintos. JAMÁS los mezcles ni uses uno en lugar del otro.

🚨 REGLA DE HIERRO — PAGOS:
- NUNCA confirmes un pedido porque el cliente diga que ya pagó o mande capturas.
- Solo OpenPay verifica pagos. Si dicen "ya pagué" → "¡Perfecto! En cuanto OpenPay me confirme el pago te aviso y tu pedido pasa a bodega. 🐺📦"

💰 COMANDO DE COBRO — cuando tengas TODOS los datos:
  GENERAR_COBRO|metodo(tarjeta/spei/tienda)|monto_total|rfc|razon_social|cp_fiscal|regimen|uso
  Sin factura: GENERAR_COBRO|spei|1500|NONE|NONE|NONE|NONE|NONE
  Con factura: GENERAR_COBRO|tarjeta|1740|XAXX010101000|PUBLICO EN GENERAL|00000|616|G03

REGISTRO INTERNO (invisible para el cliente) — incluye AL FINAL cuando detectes datos nuevos:
  DATOS_CLIENTE|direccion:[dirección completa de envío]|cp_fiscal:[cp fiscal]|productos:[lista]|notas:[dato relevante]
  Omite campos que no apliquen.

CATÁLOGO ACTUAL:
${PRECIOS_ACTUALES}

${LOGICA_ENVIOS_REAL}

${resumenCliente}
`;

  const CONTEXTO_JEFE = `
ERES EL ASISTENTE PERSONAL DE JACK, EL PATRÓN.
- Respuestas cortas. "A la orden Habibi", "Al 100 jefe".
- Puedes modificar precios. AL FINAL: PRECIO_UPDATE|nombre_producto|menudeo_o_mayoreo|numero
- Puedes mandar mensajes. AL FINAL: SEND_MSG|numero_telefono|mensaje
- No le expliques de envíos, ya sabe.

PRECIOS ACTUALES:
${PRECIOS_ACTUALES}
`;

  // ── LLAMADA A GPT-4o ───────────────────────
  const systemPrompt = { role: 'system', content: esElJefe ? CONTEXTO_JEFE : CONTEXTO_VENDEDOR };
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [systemPrompt, ...historial] as any,
    temperature: 0.4,
    max_tokens: 320,
  });

  let respuesta = completion.choices[0].message.content || '';

  // ── PROCESAR COMANDOS OCULTOS ──────────────

  // Guardar datos del cliente detectados por la IA
  const matchDatos = respuesta.match(/DATOS_CLIENTE\|(.+)/);
  if (matchDatos) {
    respuesta = respuesta.replace(/DATOS_CLIENTE\|.+/g, '').trim();
    const partes = matchDatos[1];
    const dirM    = partes.match(/direccion:([^|]+)/);
    const cpFiscM = partes.match(/cp_fiscal:([^|]+)/);
    const prodM   = partes.match(/productos:([^|]+)/);
    const notasM  = partes.match(/notas:([^|]+)/);
    if (dirM?.[1]?.trim())    perfil.direccionEnvio = dirM[1].trim();
    if (cpFiscM?.[1]?.trim()) perfil.cpFiscal       = cpFiscM[1].trim();
    if (prodM?.[1]?.trim()) {
      const nuevos = prodM[1].trim().split(',').map((s: string) => s.trim()).filter(Boolean);
      perfil.productosComprados = [...new Set([...perfil.productosComprados, ...nuevos])];
    }
    if (notasM?.[1]?.trim()) perfil.notas = notasM[1].trim();
    await saveCliente(redis, tel, perfil);
  }

  if (esElJefe) {
    // Actualizar precio
    const matchPrecio = respuesta.match(/PRECIO_UPDATE\|(.+?)\|(.+?)\|(\d+)/);
    if (matchPrecio) {
      const [, prod, campo, precio] = matchPrecio;
      const ok = await actualizarPrecio(redis, prod.trim().toLowerCase(), campo.trim().toLowerCase() as 'menudeo' | 'mayoreo', parseInt(precio));
      respuesta = respuesta.replace(/PRECIO_UPDATE\|.+/g, '').trim();
      if (!ok) respuesta += '\n⚠️ No encontré ese producto en la bodega, Habibi.';
    }

    // Enviar mensaje a terceros
    const matchMsj = respuesta.match(/SEND_MSG\|([^|]+)\|(.+)/);
    if (matchMsj) {
      let [, targetNum, targetTxt] = matchMsj;
      targetNum = targetNum.replace(/\D/g, '');
      respuesta = respuesta.replace(/SEND_MSG\|.+/g, '').trim();
      const ok = await enviarWhatsapp(targetNum, targetTxt.trim());
      respuesta += ok ? `\n\n✅ Mensaje disparado al ${targetNum}.` : `\n\n⚠️ Meta rechazó el mensaje al ${targetNum}.`;
    }
  } else {
    // Generar cobro OpenPay
    const matchCobro = respuesta.match(/GENERAR_COBRO\|(.+?)\|([\d.]+)\|(.+?)\|(.+?)\|(.+?)\|(.+?)\|(.+)/i);
    if (matchCobro) {
      const [, metodo, monto, rfc, razon, cp, regimen, uso] = matchCobro;
      respuesta = respuesta.replace(/GENERAR_COBRO\|.+/g, '').trim();
      const reqInvoice = rfc !== 'NONE' ? 'YES' : 'NO';
      const metodoOP = metodo.toLowerCase() === 'tarjeta' ? 'card' : metodo.toLowerCase() === 'spei' ? 'bank_account' : 'store';

      try {
        if (metodoOP === 'card') {
          const res = await fetch(`https://sandbox-api.openpay.mx/v1/${OPENPAY_ID}/checkouts`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${openpayAuth}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: parseFloat(monto), currency: 'MXN',
              description: 'Pedido Coyote Textil WhatsApp',
              order_id: `WA-${Date.now()}`,
              redirect_url: 'https://wa.me/5215627301525',
              customer: { name: perfil.nombre || nombreWA || 'Cliente', phone_number: tel, email: `cliente_${tel}@coyotetextil.com` },
              send_email: false,
              metadata: { rfc, razon, cp, regimen, uso, req_invoice: reqInvoice, phone: tel, productos: perfil.productosComprados.join(',') }
            })
          });
          const data = await res.json();
          if (res.ok) {
            respuesta += `\n\n💳 *Paga seguro con tarjeta:*\n${data.checkout_link}\n\n_Blindado por OpenPay. Al pagar regresa al chat. 🐺_`;
          } else {
            console.error('❌ OpenPay Tarjeta:', data);
            respuesta += `\n\n⚠️ Problema al generar el link de tarjeta. El Patrón lo revisa.`;
          }
        } else {
          const res = await fetch(`https://sandbox-api.openpay.mx/v1/${OPENPAY_ID}/charges`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${openpayAuth}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              method: metodoOP, amount: parseFloat(monto),
              description: 'Pedido Coyote Textil WhatsApp',
              customer: { name: perfil.nombre || nombreWA || 'Cliente', phone_number: tel, email: `cliente_${tel}@coyotetextil.com` },
              send_email: false,
              metadata: { rfc, razon, cp, regimen, uso, req_invoice: reqInvoice, phone: tel, productos: perfil.productosComprados.join(',') }
            })
          });
          const data = await res.json();
          if (res.ok) {
            if (metodoOP === 'bank_account') {
              respuesta += `\n\n🏦 *Datos para SPEI*\nBanco: STP\nCLABE: ${data.payment_method.clabe}\nConcepto: Coyote Textil\n\n_El sistema me avisa cuando caiga. 🐺_`;
            } else {
              respuesta += `\n\n🏪 *Pago en OXXO*\nReferencia: ${data.payment_method.reference}\nCódigo de barras: ${data.payment_method.barcode_url}\n\n_Paga en caja y activo tu pedido. 🐺_`;
            }
          } else {
            console.error('❌ OpenPay SPEI/OXXO:', data);
            if (data.error_code === 1012) {
              respuesta += `\n\n⚠️ OXXO no acepta montos mayores a $29,999 MXN. ¿Te hago la CLABE de SPEI o un link de tarjeta? 🐺`;
            } else {
              respuesta += `\n\n⚠️ Problema al generar la ficha de pago. El Patrón lo revisa.`;
            }
          }
        }
      } catch (err) {
        console.error('Error OpenPay:', err);
      }
    }
  }

  // ── GUARDAR HISTORIAL Y RESPONDER ──────────
  historial.push({ role: 'assistant', content: respuesta });
  await saveHistorial(redis, tel, historial);
  await enviarWhatsapp(tel, respuesta);
}

// ==========================================
// 🚦 ROUTER PRINCIPAL — UN SOLO POST
// ==========================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const esOpenpay = typeof body.type === 'string' && body.transaction !== undefined;
    const esWhatsapp = Array.isArray(body.entry) && body.entry[0]?.changes?.[0]?.value?.messages;

    if (esOpenpay) await handleOpenpayWebhook(body);
    else if (esWhatsapp) await handleWhatsappWebhook(body);
    else console.log('⚠️ Webhook origen desconocido:', JSON.stringify(body).slice(0, 200));

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('❌ ERROR WEBHOOK UNIFICADO:', error);
    return new NextResponse('Error procesando webhook', { status: 500 });
  }
}

// ==========================================
// ✅ VERIFICACION INICIAL DE META
// ==========================================
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (
    searchParams.get('hub.mode') === 'subscribe' &&
    searchParams.get('hub.verify_token') === 'coyote_token_123'
  ) {
    return new NextResponse(searchParams.get('hub.challenge'), { status: 200 });
  }
  return new NextResponse('Acceso denegado', { status: 403 });
}