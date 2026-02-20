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
  // Nuevos campos para personalización avanzada
  cumpleanos?: string;
  preferencias?: string[];
  ultimaCampana?: string;
  etapaAbandono?: 'carrito' | 'cotizacion' | 'pago' | null;
  fechaAbandono?: string;
  recordatoriosPendientes?: Array<{ tipo: string; fecha: string; mensaje: string }>;
}

interface PedidoRegistro {
  fecha: string;
  productos: string;
  monto: number;
  metodo: string;
  conFactura: boolean;
}

// ==========================================
// 🚚 CONSTANTES DE LOGÍSTICA REAL
// ==========================================
const DIESEL_PRICE_PER_LITER = 27.00;
const LITERS_PER_100KM = 20.0;
const OPERATIONAL_MARKUP = 4;
const FIXED_SERVICE_FEE = 175;
const MAX_ROLLS_PER_VEHICLE = 80;

interface ProductoEnvio {
  nombre: string;
  kg: number;                // kilos solicitados
  esRollo?: boolean;         // true si ya se vende por rollo completo
}

interface ResultadoEnvio {
  totalKilos: number;
  totalRollos: number;
  flete: number;
  traslado: number;
  vehiculos: number;
  tarifaServicio: number;
  base: number;
  iva: number;
  total: number;
  desglose: string;          // texto listo para mostrar al cliente
}

function calcularEnvioReal(
  productos: ProductoEnvio[],
  cpEnvio: string,
  subtotal: number,
  requiereFactura: boolean
): ResultadoEnvio {
  // Calcular peso total y número de rollos
  let totalKilos = productos.reduce((acc, p) => acc + p.kg, 0);
  let totalRollos = 0;
  for (const p of productos) {
    if (p.esRollo) {
      totalRollos += Math.ceil(p.kg / 25); // un rollo son 25kg
    } else {
      totalRollos += Math.ceil(p.kg / 25);
    }
  }
  totalRollos = Math.max(1, totalRollos); // mínimo 1 para efectos de flete

  // --- FLETE (carga de bultos) ---
  let flete = 0;
  if (totalKilos < 10 && totalRollos === 1) flete = 150;
  else if (totalRollos === 1) flete = 200;
  else if (totalRollos <= 4) flete = 250;
  else if (totalRollos <= 10) flete = 300;
  else if (totalRollos <= 15) flete = 400;
  else if (totalRollos <= 20) flete = 500;
  else flete = 1000;

  // --- DETERMINAR ZONA Y DISTANCIA (COYOTE LOCAL VS SKYDROPX) ---
  const prefix2 = Math.floor(parseInt(cpEnvio) / 1000);
  let tipoEnvio: 'COYOTE' | 'SKYDROPX' = 'SKYDROPX';
  let distanciaKm = 0;

  // CDMX
  if (prefix2 >= 1 && prefix2 <= 16) {
    tipoEnvio = 'COYOTE';
    if ([15, 6, 8].includes(prefix2)) distanciaKm = 5;
    else if ([7, 9, 3].includes(prefix2)) distanciaKm = 12;
    else if ([2, 4, 11].includes(prefix2)) distanciaKm = 18;
    else if ([1, 5, 10, 12, 13, 14, 16].includes(prefix2)) distanciaKm = 28;
    else distanciaKm = 15;
  }
  // EDOMEX
  else if (prefix2 >= 50 && prefix2 <= 57) {
    tipoEnvio = 'COYOTE';
    if (prefix2 === 57) distanciaKm = 10;
    else if (prefix2 === 55) distanciaKm = 20;
    else if (prefix2 === 53 || prefix2 === 54) distanciaKm = 25;
    else if (prefix2 === 56) distanciaKm = 35;
    else if (prefix2 === 52) distanciaKm = 55;
    else if (prefix2 === 50 || prefix2 === 51) distanciaKm = 70;
    else distanciaKm = 40;
  }
  // Colindantes
  else if (prefix2 === 42 || prefix2 === 43) { tipoEnvio = 'COYOTE'; distanciaKm = 100; }
  else if (prefix2 >= 72 && prefix2 <= 75) { tipoEnvio = 'COYOTE'; distanciaKm = 130; }
  else if (prefix2 === 62) { tipoEnvio = 'COYOTE'; distanciaKm = 90; }
  // Resto del país: SKYDROPX

  // --- TRASLADO ---
  let traslado = 0;
  let vehiculos = 1;
  if (tipoEnvio === 'COYOTE') {
    vehiculos = Math.max(1, Math.ceil(totalRollos / MAX_ROLLS_PER_VEHICLE));
    const kmIdaVuelta = distanciaKm * 2;
    const litros = (kmIdaVuelta / 100) * LITERS_PER_100KM;
    const costoCombustible = litros * DIESEL_PRICE_PER_LITER;
    const costoPorVehiculo = costoCombustible * OPERATIONAL_MARKUP;
    traslado = costoPorVehiculo * vehiculos;
  } else {
    // Skydropx
    traslado = 180;
    if (totalKilos > 5) traslado += (totalKilos - 5) * 12;
  }

  // --- TARIFA DE SERVICIO ---
  const tarifa = FIXED_SERVICE_FEE;

  // --- BASE E IVA ---
  const base = subtotal + flete + traslado + tarifa;
  const iva = requiereFactura ? base * 0.16 : 0;
  const total = base + iva;

  // --- DESGLOSE PARA MOSTRAR ---
  const desglose = `
📦 *Desglose de tu cotización*
• Subtotal productos: $${subtotal.toFixed(2)} MXN
• Flete (manejo de bultos): $${flete.toFixed(2)}
• Traslado (${tipoEnvio === 'COYOTE' ? `flotilla Coyote, ${distanciaKm} km` : 'Skydropx nacional'}): $${traslado.toFixed(2)}
• Tarifa de servicio: $${tarifa.toFixed(2)}
• Base: $${base.toFixed(2)}
${requiereFactura ? `• IVA 16%: $${iva.toFixed(2)}` : ''}
• *TOTAL: $${total.toFixed(2)} MXN*
  `.trim();

  return {
    totalKilos,
    totalRollos,
    flete,
    traslado,
    vehiculos,
    tarifaServicio: tarifa,
    base,
    iva,
    total,
    desglose
  };
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
  const trimmed = h.length > 60 ? h.slice(-60) : h;
  await redis.set(`historial:${tel}`, trimmed, { ex: 60 * 60 * 24 * 90 });
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
// Paleta compartida para micro piqué, piqué vera, micro panal y torneo
const COLORES_STOCK = "Azul rey, Rojo, Negro, Kaki, Amarillo canario, Amarillo mango, Perla, Gris medio, Oxford, Azul marino oscuro, Azul marino claro, Fiusha, Palo de rosa, Rosa pastel, Rosa baby, Petróleo, Uva, Gris baby, Naranja, Lila, Vino, Azul cielo, Verde bandera, Verde botella, Verde militar, Magenta, Aqua, Menta, Celeste, Turquesa, Amarillo neón, Verde neón, Rosa neón, Oro viejo, Mostaza, Camel, Francia, Chedron, Uva oscuro, Pistache, Manzana, Acero, Cemento, Hueso";

const PRECIOS_DEFAULT: Record<string, { menudeo: number; mayoreo: number; info: string }> = {
  "micro piqué":       { menudeo: 90,  mayoreo: 85,  info: `100% Poliéster 145g. Dry-Fit alto rendimiento. Rend. 4.3m/kg. Colores disponibles: ${COLORES_STOCK}.` },
  "piqué vera":        { menudeo: 95,  mayoreo: 90,  info: `100% Poliéster 145g. Más suave que el micro. Rend. 4.3m/kg. Colores disponibles: ${COLORES_STOCK}.` },
  "micro panal":       { menudeo: 95,  mayoreo: 90,  info: `100% Poliéster 145g. Máxima transpiración. Rend. 4.3m/kg. Colores disponibles: ${COLORES_STOCK}.` },
  "torneo":            { menudeo: 105, mayoreo: 98,  info: `100% Poliéster 150g. Uso rudo/torneos. Rend. 4.3m/kg. Colores disponibles: ${COLORES_STOCK}.` },
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
  // Siempre sobreescribe el campo info de los 4 productos con paleta de colores para que Redis no quede desactualizado
  let dirty = false;
  for (const key of Object.keys(PRECIOS_DEFAULT) as Array<keyof typeof PRECIOS_DEFAULT>) {
    if (guardado[key] && guardado[key].info !== PRECIOS_DEFAULT[key].info) {
      guardado[key].info = PRECIOS_DEFAULT[key].info;
      dirty = true;
    }
  }
  if (dirty) await redis.set('bodega_coyote', guardado);
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
  if (mensajeInfo.type !== 'text') return;

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

  // ── 🐺 TRIGGER "COYOTE" — RESPUESTA AUTOMÁTICA ──
  const esSoloCoyote = /^\s*coyote[\s!?.]*$/i.test(msgCliente.trim());
  if (esSoloCoyote) {
    const respuestaCoyote = '🐺 ¡Aquí estoy! Un Coyote nunca duerme. ¿En qué te puedo ayudar?';
    const h = await getHistorial(redis, tel);
    h.push({ role: 'user', content: msgCliente });
    h.push({ role: 'assistant', content: respuestaCoyote });
    await saveHistorial(redis, tel, h);
    await enviarWhatsapp(tel, respuestaCoyote);
    return;
  }

  // ── PERFIL DEL CLIENTE ─────────────────────
  let perfil = await getCliente(redis, tel);

  // ── CLIENTE COMPLETAMENTE NUEVO ────────────
  if (!perfil) {
    perfil = {
      nombre: '', genero: 'unknown', telefono: tel,
      primerContacto: new Date().toISOString(), ultimoContacto: new Date().toISOString(),
      totalCompras: 0, montoAcumulado: 0, productosComprados: [],
      direccionEnvio: '', cpFiscal: '', metodoPagoFavorito: '', requiereFrecuenteFactura: false, notas: '',
      // nuevos campos opcionales
      cumpleanos: undefined,
      preferencias: [],
      ultimaCampana: undefined,
      etapaAbandono: null,
      fechaAbandono: undefined,
      recordatoriosPendientes: []
    };
    await saveCliente(redis, tel, perfil);

    const bienvenida =
      `¡Hola! Bienvenido a la familia *Coyote Textil* 🐺\n\n` +
      `¿Autorizas que te enviemos promociones y novedades para mejorar la calidad del servicio? 🎯\n\n` +
      `📋 Términos y condiciones: https://www.coyotetextil.com/terms\n` +
      `🔒 Aviso de privacidad: https://www.coyotetextil.com/privacy\n\n` +
      `Estamos para servirte *24/7 los 365 días del año*. 💪\n\n` +
      `¿Con quién tengo el gusto? ¿Cuál es tu nombre? 😊`;

    const h = await getHistorial(redis, tel);
    h.push({ role: 'user', content: msgCliente });
    h.push({ role: 'assistant', content: bienvenida });
    await saveHistorial(redis, tel, h);
    await enviarWhatsapp(tel, bienvenida);
    return;
  }

  // ── AÚN NO TENEMOS SU NOMBRE ──────────────
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

  const alertaDireccion = perfil.direccionEnvio
    ? `⚠️ DIRECCIÓN GUARDADA: "${perfil.direccionEnvio}". Antes de calcular envío CONFIRMA con el cliente si sigue siendo correcta o si cambió.`
    : `⚠️ SIN DIRECCIÓN DE ENVÍO. OBLIGATORIO pedirla antes de calcular flete, aunque el cliente ya haya comprado antes. Pídela así: "¿A qué dirección te enviamos? (calle, número, colonia, ciudad y CP)"`;

  const resumenCliente = `
PERFIL DEL CLIENTE EN ESTE CHAT:
- Nombre: ${perfil.nombre} | Género: ${perfil.genero}
- Compras realizadas: ${perfil.totalCompras} | Total gastado: $${perfil.montoAcumulado} MXN
- Productos que ha comprado antes: ${perfil.productosComprados.length > 0 ? perfil.productosComprados.join(', ') : 'ninguno aún'}
- ${alertaDireccion}
- CP Fiscal (SAT): ${perfil.cpFiscal || 'no registrado — pedirlo SOLO si requiere factura'}
- Método de pago habitual: ${perfil.metodoPagoFavorito || 'no registrado'}
- Requiere factura frecuentemente: ${perfil.requiereFrecuenteFactura ? 'SÍ — ofrecerla proactivamente' : 'NO'}
- Notas del cliente: ${perfil.notas || 'ninguna'}
- Preferencias: ${perfil.preferencias?.join(', ') || 'aún no registradas'}
- Etapa de abandono: ${perfil.etapaAbandono || 'ninguna'}
`.trim();

  const tratamiento = perfil.genero === 'mujer'
    ? `Usa "jefa", "patrona" o su nombre "${perfil.nombre}". Tono cálido, amigable, profesional.`
    : `Usa "jefe", "patrón", "amigo" o su nombre "${perfil.nombre}". Tono de cuate mexicano, informal pero profesional.`;

  const CONTEXTO_VENDEDOR = `
ERES "EL COYOTE", UN AGENTE DE IA ESPECIALIZADO EN VENTAS, ATENCIÓN AL CLIENTE Y MARKETING AUTOMATION. OPERAS PRINCIPALMENTE POR WHATSAPP.

🎯 IDENTIDAD
Representas a COYOTE TEXTIL. Tu comunicación es natural, cálida, persuasiva y autónoma. Buscas maximizar conversiones y retención.

📋 FUNCIONES PRINCIPALES
1. WHATSAPP: Gestionas conversaciones entrantes y salientes. Respondes inmediato, empático y orientado a acción. Mantienes el tono de la marca.
2. REPORTES: Puedes generar reportes periódicos (conversaciones, leads, ventas, tasa de respuesta, conversión). Si te piden un reporte, usa el comando: GENERAR_REPORTE|tipo(diario/semanal/mensual)|formato(texto/json)
3. CAMPAÑAS DE PUBLICIDAD: Apoyas en envíos masivos segmentados. Personalizas según perfil. Para enviar una campaña: ENVIAR_CAMPANA|segmento(todos/activos/inactivos)|mensaje
4. ATENCIÓN AL CLIENTE: Resuelves dudas, quejas y solicitudes autónomamente. Escalas a humano solo si es estrictamente necesario. Registrar cada interacción.
5. RECORDATORIOS: Envías recordatorios automáticos de citas, pagos, renovaciones o seguimientos. Para programar: PROGRAMAR_RECORDATORIO|telefono|fecha|mensaje
6. PERSONALIZACIÓN: Adaptas cada interacción según nombre, historial, preferencias, comportamiento. NUNCA trates a dos clientes igual si sus perfiles son distintos.
7. RECUPERACIÓN DE ABANDONO: Detectas clientes que dejaron de comprar o abandonaron proceso. Inicias secuencia de reactivación (máx 3 intentos). Si detectas abandono, usa: REACTIVAR|telefono|etapa
8. APRENDIZAJE CONTINUO: Aprendes de cada conversación para mejorar respuestas. Identificas objeciones frecuentes y propones nuevas respuestas. Si encuentras algo que no sabes manejar, notifica: ESCALAR|duda

📌 REGLAS DE COMPORTAMIENTO
- Siempre saluda con el nombre del cliente si lo conoces.
- Nunca prometas lo que no puedes cumplir.
- Si no sabes algo, dilo y busca la respuesta antes de responder.
- Prioriza cerrar la venta o resolver el problema en el menor número de mensajes posible.
- Usa lenguaje simple, directo y humano. Evita sonar como un bot.

🚀 OBJETIVO FINAL
Aumentar ventas, mejorar la experiencia del cliente y reducir carga operativa del equipo humano. Actúa con autonomía, criterio y orientación a resultados.

--- REGLAS ESPECÍFICAS DE COYOTE TEXTIL ---

PERSONALIDAD:
- Eres listo, rápido, y conoces las telas al 100%. Siempre tienes la respuesta.
- Máximo 4 líneas por respuesta. Directo, sin rodeos. Nada de bienvenidas repetidas.
- ${tratamiento}
- Usas el historial de conversación completo. NUNCA preguntes algo que el cliente ya respondió antes.
- Si el cliente ya ha comprado antes, reconócelo naturalmente.
- Si ${perfil.requiereFrecuenteFactura}, ofrece la factura antes de que la pida.

REGLAS DE PRODUCTO — CRÍTICO:
- Todo se vende por kilo.
- Un rollo pesa EXACTAMENTE 25kg. Nunca menciones otro número.
- Menudeo: menos de 25kg. Mayoreo: desde 25kg (un rollo completo).
- El precio de un rollo completo = precio mayoreo × 25. Siempre muéstralo calculado.
- Empuja el rollo completo porque baja el precio y es mejor negocio para el cliente.

🗺️ FLUJO DE VENTA OBLIGATORIO — RESPÉTALO SIEMPRE EN ESTE ORDEN:
1. COTIZACIÓN: El cliente pregunta por tela → presentas precio menudeo/mayoreo y el precio del rollo calculado.
2. DIRECCIÓN DE ENVÍO: Inmediatamente después de cotizar, pides o confirmas la dirección COMPLETA:
   - Si NO hay dirección guardada: "¿A qué dirección te lo enviamos? (calle, número, colonia, ciudad y CP)"
   - Si YA hay dirección guardada: "¿Te lo mandamos de nuevo a [dirección guardada]? ¿O cambió la dirección?"
   → Con el CP de ESA dirección calculas el flete. NUNCA uses el CP fiscal para esto.
3. TOTAL CON ENVÍO: Presentas el desglose: producto + flete + tarifa de servicio = total.
   IMPORTANTE: NO CALCULES EL ENVÍO MANUALMENTE. Cuando tengas el producto, la cantidad y el CP de envío, usa el comando:
   CALCULAR_ENVIO|productos=[{"nombre":"nombre del producto","kg":cantidad}]|cp=01234
   El sistema te devolverá el desglose exacto. Luego preséntalo al cliente.
4. FACTURA: Preguntas si requiere factura.
   → Si SÍ: pides RFC, Razón Social, CP FISCAL (es diferente al de envío), Régimen y Uso CFDI. Sumas 16% IVA.
   → Si NO: precio sin IVA.
5. MÉTODO DE PAGO: Tarjeta, SPEI o OXXO (no OXXO si supera $29,000).
6. COBRO: Generas el cargo con el comando GENERAR_COBRO.

⚠️ SEPARACIÓN ABSOLUTA DE CÓDIGOS POSTALES:
- CP DE ENVÍO = parte de la dirección física donde llega la mercancía. Lo usas SOLO para calcular distancia/flete.
- CP FISCAL = dato del SAT para timbrar la factura. Lo pides SOLO si el cliente quiere factura, NUNCA antes.
- Son dos datos completamente distintos. JAMÁS los mezcles ni uses uno en lugar del otro.

🎨 REGLA DE COLORES:
- Micro piqué, Piqué vera, Micro panal y Torneo tienen paleta amplia de colores.
- SIEMPRE que el cliente pregunte o cotice cualquiera de estas 4 telas, pregunta por el color ANTES de continuar. Ejemplo: "¡Con gusto! ¿En qué color lo necesitas? 🎨"
- Si el cliente pide la carta de colores o pregunta qué colores hay: PEGA LA LISTA COMPLETA DEL CATÁLOGO AQUÍ MISMO, en este mensaje, ahora. NO mandes un subconjunto. NO digas "aquí algunos ejemplos". NO digas "te mando la carta por mensaje". NO pidas número. NO ofrezcas enviarla "después" ni "por otro medio". La lista YA ESTÁ en el catálogo — solo pégala completa y listo.
- Si el cliente pide *blanco*: confirmamos que sí lo manejamos. De cortesía, menciónale también otros tonos claros que podrían interesarle: Perla, Hueso, Gris baby, Rosa baby, Celeste, Menta. Algo como: "¡Claro que sí! Y por si te late alguno, también tenemos Perla, Hueso, Celeste y más tonos claros. 😊"
- Para los demás artículos (athlos, brock, kyoto, etc.) el color es único por rollo; indícalo así.

🎯 CIERRE DE CONVERSACIÓN:
Cuando la conversación llegue a su fin (por ejemplo, después de confirmar un pedido, resolver una duda, o si el cliente se despide), despídete con un mensaje cálido que incluya:
- Reconocer al cliente por su nombre.
- Sugerirle productos basados en su historial de compras (si tiene compras previas) o productos populares.
- La frase: "Estoy aquí 24/7 para cualquier duda."
- Luego añade: "Estamos vistiendo la fuerza de México en cada hilo. Tú ya eres parte de nuestra familia, y estamos contigo 24/7. Con tu permiso, te sorprenderemos con promociones a tu medida, porque juntos tejemos éxitos."
- Finaliza con un toque coyote: "auuuuuuuuu aquí estamos chambeando sin parar, patrón. Ando medio desvielado pero jalando. 🐺"

Si el cliente aún no ha terminado o espera más información, no uses este cierre; espera a que la conversación fluya naturalmente.

🚫 FRASES PROHIBIDAS — NUNCA las uses bajo ninguna circunstancia:
- "Te enviaré los detalles" / "Enviaré la cotización" / "Procederé" → CALCULA AHÍ MISMO, en ese mensaje.
- "¿Algo más en lo que pueda asistirte?" → Suena a call center corporativo. Usa frases naturales como "¿Le entramos?" o "¿Cómo la ves, jefe?" o "¿Cerramos?"
- "Lo siento" seguido de no hacer nada → Si tienes los datos, actúa. Si te falta algo, pregunta puntual.
- Cualquier variante de "te mando", "te envío", "te hago llegar" cuando la info puede darse ahora mismo en el chat.

⚡ REGLA DE ACCIÓN INMEDIATA:
Cuando ya tienes: producto + cantidad + dirección de envío → USA EL COMANDO CALCULAR_ENVIO Y PRESENTA EL DESGLOSE.
No esperes que el cliente te lo pida de nuevo. No digas "procederé". Hazlo y punto.

🚨 REGLA DE HIERRO — PAGOS:
- NUNCA confirmes un pedido porque el cliente diga que ya pagó o mande capturas.
- Solo OpenPay verifica pagos. Si dicen "ya pagué" → "¡Perfecto! En cuanto OpenPay me confirme el pago te aviso y tu pedido pasa a bodega. 🐺📦"

💰 COMANDO DE COBRO — cuando tengas TODOS los datos:
  GENERAR_COBRO|metodo(tarjeta/spei/tienda)|monto_total|rfc|razon_social|cp_fiscal|regimen|uso
  Sin factura: GENERAR_COBRO|spei|1500|NONE|NONE|NONE|NONE|NONE
  Con factura: GENERAR_COBRO|tarjeta|1740|XAXX010101000|PUBLICO EN GENERAL|00000|616|G03

📊 COMANDOS DE REPORTES (cuando te soliciten un reporte):
  GENERAR_REPORTE|tipo(diario/semanal/mensual)|formato(texto/json)

📢 COMANDOS DE CAMPAÑAS (para envíos masivos):
  ENVIAR_CAMPANA|segmento(todos/activos/inactivos)|mensaje

⏰ COMANDOS DE RECORDATORIOS (para programar seguimientos):
  PROGRAMAR_RECORDATORIO|telefono|fecha(YYYY-MM-DD)|mensaje

🔄 COMANDOS DE REACTIVACIÓN (para abandono):
  REACTIVAR|telefono|etapa(carrito/cotizacion/pago)

🆘 COMANDO DE ESCALAMIENTO (cuando no sepas algo):
  ESCALAR|descripción de la duda

REGISTRO INTERNO (invisible para el cliente) — incluye AL FINAL cuando detectes datos nuevos:
  DATOS_CLIENTE|direccion:[dirección completa de envío]|cp_fiscal:[cp fiscal]|productos:[lista]|notas:[dato relevante]|preferencias:[lista]|cumpleanos:[fecha]|etapa_abandono:[etapa]

PALETA DE COLORES (Micro Piqué / Piqué Vera / Micro Panal / Torneo):
Blanco, Azul rey, Rojo, Negro, Kaki, Amarillo canario, Amarillo mango, Perla, Gris medio, Oxford, Azul marino oscuro, Azul marino claro, Fiusha, Palo de rosa, Rosa pastel, Rosa baby, Petróleo, Uva, Gris baby, Naranja, Lila, Vino, Azul cielo, Verde bandera, Verde botella, Verde militar, Magenta, Aqua, Menta, Celeste, Turquesa, Amarillo neón, Verde neón, Rosa neón, Oro viejo, Mostaza, Camel, Francia, Chedron, Uva oscuro, Pistache, Manzana, Acero, Cemento, Hueso.
(Total: 45 colores. Cuando el cliente pida la carta, PEGA ESTA LISTA COMPLETA aquí mismo en el chat, sin excepciones.)

CATÁLOGO ACTUAL:
${PRECIOS_ACTUALES}

${resumenCliente}
`;

  const CONTEXTO_JEFE = `
ERES EL ASISTENTE PERSONAL DE JACK, EL PATRÓN.
- Respuestas cortas. "A la orden Habibi", "Al 100 jefe".
- Puedes modificar precios. AL FINAL: PRECIO_UPDATE|nombre_producto|menudeo_o_mayoreo|numero
- Puedes mandar mensajes. AL FINAL: SEND_MSG|numero_telefono|mensaje
- Puedes generar reportes: GENERAR_REPORTE|tipo|formato
- Puedes enviar campañas: ENVIAR_CAMPANA|segmento|mensaje
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
    max_tokens: 700,
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
    const prefM   = partes.match(/preferencias:([^|]+)/);
    const cumpleM = partes.match(/cumpleanos:([^|]+)/);
    const etapaM  = partes.match(/etapa_abandono:([^|]+)/);
    if (dirM?.[1]?.trim())    perfil.direccionEnvio = dirM[1].trim();
    if (cpFiscM?.[1]?.trim()) perfil.cpFiscal       = cpFiscM[1].trim();
    if (prodM?.[1]?.trim()) {
      const nuevos = prodM[1].trim().split(',').map((s: string) => s.trim()).filter(Boolean);
      perfil.productosComprados = [...new Set([...perfil.productosComprados, ...nuevos])];
    }
    if (notasM?.[1]?.trim()) perfil.notas = notasM[1].trim();
    if (prefM?.[1]?.trim()) perfil.preferencias = prefM[1].trim().split(',').map(s => s.trim());
    if (cumpleM?.[1]?.trim()) perfil.cumpleanos = cumpleM[1].trim();
    if (etapaM?.[1]?.trim()) perfil.etapaAbandono = etapaM[1].trim() as any;
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

    // Generar reporte (simulado)
    const matchReporte = respuesta.match(/GENERAR_REPORTE\|(.+?)\|(.+)/);
    if (matchReporte) {
      const [, tipo, formato] = matchReporte;
      respuesta = respuesta.replace(/GENERAR_REPORTE\|.+/g, '').trim();
      // Aquí se podría implementar lógica real de reportes
      respuesta += `\n\n📊 Reporte ${tipo} en formato ${formato} (simulado).`;
    }

    // Enviar campaña (simulado)
    const matchCampana = respuesta.match(/ENVIAR_CAMPANA\|(.+?)\|(.+)/);
    if (matchCampana) {
      const [, segmento, mensaje] = matchCampana;
      respuesta = respuesta.replace(/ENVIAR_CAMPANA\|.+/g, '').trim();
      // Aquí se podría implementar envío masivo real
      respuesta += `\n\n📢 Campaña enviada a segmento "${segmento}" con mensaje: "${mensaje}" (simulado).`;
    }
  } else {
    // --- COMANDO DE CÁLCULO DE ENVÍO REAL ---
    const matchEnvio = respuesta.match(/CALCULAR_ENVIO\|productos=\[(.+?)\]\|cp=(.+)/i);
    if (matchEnvio) {
      const [, productosStr, cpEnvio] = matchEnvio;
      respuesta = respuesta.replace(/CALCULAR_ENVIO\|.+/g, '').trim();

      try {
        // Parsear productos (se espera un JSON válido)
        const productos: ProductoEnvio[] = JSON.parse(`[${productosStr}]`);
        // Necesitamos el subtotal. Podríamos calcularlo con getBodega, pero por ahora usamos 0 y la IA lo ajusta.
        const subtotal = 0; // En un futuro se puede calcular con precios reales
        const requiereFactura = false; // Se definirá después
        const resultado = calcularEnvioReal(productos, cpEnvio, subtotal, requiereFactura);
        respuesta += `\n\n✅ *Cálculo de envío exacto:*\n${resultado.desglose}`;
        respuesta += `\n\n¿Te parece bien? Si quieres factura, avísame para sumar el IVA.`;
      } catch (e) {
        console.error('Error parseando CALCULAR_ENVIO:', e);
        respuesta += `\n\n⚠️ No pude calcular el envío con esos datos. Asegúrate de escribir los productos en formato correcto. Ejemplo: CALCULAR_ENVIO|productos=[{"nombre":"micro piqué","kg":50}]|cp=01234`;
      }
    }

    // --- COMANDO DE REACTIVACIÓN (simulado) ---
    const matchReactivar = respuesta.match(/REACTIVAR\|(.+?)\|(.+)/i);
    if (matchReactivar) {
      const [, telefono, etapa] = matchReactivar;
      respuesta = respuesta.replace(/REACTIVAR\|.+/g, '').trim();
      // Aquí se podría iniciar una secuencia automática
      respuesta += `\n\n🔄 Iniciando secuencia de reactivación para ${telefono} (etapa: ${etapa}).`;
    }

    // --- COMANDO DE PROGRAMAR RECORDATORIO (simulado) ---
    const matchRecordatorio = respuesta.match(/PROGRAMAR_RECORDATORIO\|(.+?)\|(.+?)\|(.+)/i);
    if (matchRecordatorio) {
      const [, telefono, fecha, mensaje] = matchRecordatorio;
      respuesta = respuesta.replace(/PROGRAMAR_RECORDATORIO\|.+/g, '').trim();
      // Aquí se guardaría en Redis o se programaría un cron
      respuesta += `\n\n⏰ Recordatorio programado para ${telefono} el ${fecha}: "${mensaje}" (simulado).`;
    }

    // --- COMANDO DE ESCALAMIENTO ---
    const matchEscalar = respuesta.match(/ESCALAR\|(.+)/i);
    if (matchEscalar) {
      const [, duda] = matchEscalar;
      respuesta = respuesta.replace(/ESCALAR\|.+/g, '').trim();
      // Notificar al equipo (podría ser un email o mensaje interno)
      console.log(`🆘 ESCALAMIENTO: ${duda}`);
      respuesta += `\n\n🆘 He notificado al equipo humano sobre tu consulta. En breve te atenderán.`;
    }

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