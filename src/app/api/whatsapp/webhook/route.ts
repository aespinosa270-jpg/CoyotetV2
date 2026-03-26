import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Redis } from '@upstash/redis';
import Stripe from 'stripe';
import { prisma } from "@/lib/prisma";
import { determineRouting } from "@/lib/crm-router";

// ==========================================
// 🔑 LLAVES MAESTRAS
// ==========================================
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
});
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const FACTURAPI_KEY = process.env.FACTURAPI_KEY;
const facturapiAuth = Buffer.from(`${FACTURAPI_KEY}:`).toString('base64');
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ==========================================
// 🔧 REDIS
// ==========================================
function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)
    throw new Error('Faltan env vars de Upstash');
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// ==========================================
// 🎛️ CONFIGURACIÓN DINÁMICA
// ==========================================
interface ConfigBot {
  nombreBot: string;
  tono: string;
  frasesBienvenida: string[];
  frasesDesignacionHombre: string[];
  frasesDesignacionMujer: string[];
  fraseCierre: string;
  fraseIncondicional: string;
  emojisPrincipales: string;
  maximoLineasRespuesta: number;
  fraseProhibidas: string[];
  instruccionesEspeciales: string;
  productosExtra: Array<{ nombre: string; menudeo: number; mayoreo: number; info: string; categoria?: string }>;
  promocionesActivas: Array<{ nombre: string; descripcion: string; descuento: string; vigencia: string }>;
  infoPagos: string;
  infoEnvios: string;
  mensajePromoFinal: string;
  avisoGeneral: string;
  horarioAtencion: string;
  ultimaActualizacion: string;
  actualizadoPor: string;
}

const CONFIG_DEFAULT: ConfigBot = {
  nombreBot: 'El Coyote',
  tono: 'Listo, rápido, cuate mexicano, informal pero profesional. Directo al grano.',
  frasesBienvenida: [
    '¡Hola! Soy *El Coyote* 🐺, tu asesor textil de *Coyote Textil*, disponible los 365 días.\n\n¿Autorizas que te enviemos promociones y novedades?\n\n📋 Términos: https://www.coyotetextil.com/terms\n🔒 Privacidad: https://www.coyotetextil.com/privacy\n\n¿Con quién tengo el gusto?'
  ],
  frasesDesignacionHombre: ['jefe', 'patrón', 'amigo'],
  frasesDesignacionMujer: ['jefa', 'patrona'],
  fraseCierre: 'Estamos vistiendo la fuerza de México en cada hilo. Tú ya eres parte de nuestra familia, y El Coyote está contigo 24/7.',
  fraseIncondicional: 'auuuuuuuuu aquí estamos chambeando sin parar, patrón. Soy El Coyote y ando medio desvielado pero jalando. 🐺',
  emojisPrincipales: '🐺📦💪',
  maximoLineasRespuesta: 4,
  fraseProhibidas: [
    'Te enviaré los detalles', 'Enviaré la cotización', 'Procederé',
    '¿Algo más en lo que pueda asistirte?', 'te mando', 'te envío', 'te hago llegar',
    'Como asistente de IA', 'Como IA', 'soy una inteligencia artificial', 'soy un bot', 'soy un asistente virtual'
  ],
  instruccionesEspeciales: '',
  productosExtra: [],
  promocionesActivas: [],
  infoPagos: '',
  infoEnvios: '',
  mensajePromoFinal: '',
  avisoGeneral: '',
  horarioAtencion: '24/7 los 365 días del año',
  ultimaActualizacion: new Date().toISOString(),
  actualizadoPor: 'sistema'
};

async function getConfigBot(redis: Redis): Promise<ConfigBot> {
  try {
    const guardado = await redis.get<ConfigBot>('config_coyote');
    if (!guardado) { await redis.set('config_coyote', CONFIG_DEFAULT); return CONFIG_DEFAULT; }
    return { ...CONFIG_DEFAULT, ...guardado };
  } catch { return CONFIG_DEFAULT; }
}

async function saveConfigBot(redis: Redis, config: ConfigBot) {
  config.ultimaActualizacion = new Date().toISOString();
  await redis.set('config_coyote', config);
  console.log('✅ Config El Coyote actualizada:', JSON.stringify(config).slice(0, 300));
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
  direccionEnvio: string;
  cpFiscal: string;
  metodoPagoFavorito: string;
  requiereFrecuenteFactura: boolean;
  notas: string;
  cumpleanos?: string;
  preferencias?: string[];
  ultimaCampana?: string;
  etapaAbandono?: 'carrito' | 'cotizacion' | 'pago' | null;
  fechaAbandono?: string;
  recordatoriosPendientes?: Array<{ tipo: string; fecha: string; mensaje: string }>;
  segmento?: 'prospecto' | 'nuevo' | 'recurrente' | 'vip' | 'inactivo';
  objecionesComunes?: string[];
  productosFavoritos?: string[];
  ticketPromedio?: number;
  tasaConversion?: number;
  ultimaCotizacion?: string;
  intentosDePago?: number;
  sensibilidadPrecio?: 'alta' | 'media' | 'baja';
  mejorMomentoContacto?: string;
  canalPreferido?: string;
  interesesDeclarados?: string[];
  razonNoCompra?: string;
  categoriasPedidas?: string[];
}

interface PedidoRegistro {
  fecha: string;
  productos: string;
  monto: number;
  metodo: string;
  conFactura: boolean;
}

// ==========================================
// 🚚 LOGÍSTICA
// ==========================================
const DIESEL_PRICE_PER_LITER = 27.00;
const LITERS_PER_100KM = 20.0;
const OPERATIONAL_MARKUP = 4;
const FIXED_SERVICE_FEE = 175;
const MAX_ROLLS_PER_VEHICLE = 80;

interface ProductoEnvio { nombre: string; kg: number; esRollo?: boolean }
interface ResultadoEnvio {
  totalKilos: number; totalRollos: number; flete: number; traslado: number;
  vehiculos: number; tarifaServicio: number; base: number; iva: number;
  total: number; desglose: string;
}

function calcularEnvioReal(
  productos: ProductoEnvio[], cpEnvio: string,
  subtotal: number, requiereFactura: boolean
): ResultadoEnvio {
  let totalKilos = productos.reduce((acc, p) => acc + p.kg, 0);
  let totalRollos = 0;
  for (const p of productos) totalRollos += Math.ceil(p.kg / 25);
  totalRollos = Math.max(1, totalRollos);

  let flete = 0;
  if (totalKilos < 10 && totalRollos === 1) flete = 150;
  else if (totalRollos === 1) flete = 200;
  else if (totalRollos <= 4) flete = 250;
  else if (totalRollos <= 10) flete = 300;
  else if (totalRollos <= 15) flete = 400;
  else if (totalRollos <= 20) flete = 500;
  else flete = 1000;

  const prefix2 = Math.floor(parseInt(cpEnvio) / 1000);
  let tipoEnvio: 'COYOTE' | 'SKYDROPX' = 'SKYDROPX';
  let distanciaKm = 0;

  if (prefix2 >= 1 && prefix2 <= 16) {
    tipoEnvio = 'COYOTE';
    if ([15, 6, 8].includes(prefix2)) distanciaKm = 5;
    else if ([7, 9, 3].includes(prefix2)) distanciaKm = 12;
    else if ([2, 4, 11].includes(prefix2)) distanciaKm = 18;
    else distanciaKm = 28;
  } else if (prefix2 >= 50 && prefix2 <= 57) {
    tipoEnvio = 'COYOTE';
    if (prefix2 === 57) distanciaKm = 10;
    else if (prefix2 === 55) distanciaKm = 20;
    else if (prefix2 === 53 || prefix2 === 54) distanciaKm = 25;
    else if (prefix2 === 56) distanciaKm = 35;
    else if (prefix2 === 52) distanciaKm = 55;
    else distanciaKm = 70;
  } else if (prefix2 === 42 || prefix2 === 43) { tipoEnvio = 'COYOTE'; distanciaKm = 100; }
  else if (prefix2 >= 72 && prefix2 <= 75) { tipoEnvio = 'COYOTE'; distanciaKm = 130; }
  else if (prefix2 === 62) { tipoEnvio = 'COYOTE'; distanciaKm = 90; }

  let traslado = 0;
  let vehiculos = 1;
  if (tipoEnvio === 'COYOTE') {
    vehiculos = Math.max(1, Math.ceil(totalRollos / MAX_ROLLS_PER_VEHICLE));
    const kmIdaVuelta = distanciaKm * 2;
    const litros = (kmIdaVuelta / 100) * LITERS_PER_100KM;
    traslado = litros * DIESEL_PRICE_PER_LITER * OPERATIONAL_MARKUP * vehiculos;
  } else {
    traslado = 180;
    if (totalKilos > 5) traslado += (totalKilos - 5) * 12;
  }

  const tarifa = FIXED_SERVICE_FEE;
  const base = subtotal + flete + traslado + tarifa;
  const iva = requiereFactura ? base * 0.16 : 0;
  const total = base + iva;

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

  return { totalKilos, totalRollos, flete, traslado, vehiculos, tarifaServicio: tarifa, base, iva, total, desglose };
}

// ==========================================
// 🧠 MEMORIA
// ==========================================
async function getHistorial(redis: Redis, tel: string) {
  try { return (await redis.get<Array<{ role: string; content: string }>>(`historial:${tel}`)) || []; }
  catch { return []; }
}
async function saveHistorial(redis: Redis, tel: string, h: Array<{ role: string; content: string }>) {
  const trimmed = h.length > 60 ? h.slice(-60) : h;
  await redis.set(`historial:${tel}`, trimmed, { ex: 60 * 60 * 24 * 90 });
}
async function getCliente(redis: Redis, tel: string): Promise<ClientePerfil | null> {
  try { return await redis.get<ClientePerfil>(`cliente:${tel}`); } catch { return null; }
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
  cliente.ticketPromedio = cliente.montoAcumulado / cliente.totalCompras;
  if (cliente.totalCompras === 1) cliente.segmento = 'nuevo';
  else if (cliente.totalCompras >= 5 || cliente.montoAcumulado >= 10000) cliente.segmento = 'vip';
  else cliente.segmento = 'recurrente';
  cliente.intentosDePago = 0;
  const pedidos: PedidoRegistro[] = (await redis.get<PedidoRegistro[]>(`pedidos:${tel}`)) || [];
  pedidos.push(pedido);
  await redis.set(`pedidos:${tel}`, pedidos);
  await saveCliente(redis, tel, cliente);
}
async function detectarGenero(nombre: string): Promise<'hombre' | 'mujer' | 'unknown'> {
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: `El nombre es "${nombre}". Responde SOLO: "hombre", "mujer" o "unknown".` }],
      max_tokens: 5, temperature: 0,
    });
    const g = res.choices[0].message.content?.trim().toLowerCase() || 'unknown';
    if (g === 'hombre' || g === 'mujer') return g;
    return 'unknown';
  } catch { return 'unknown'; }
}

// ==========================================
// 🏪 BODEGA — TELAS
// ==========================================
const COLORES_STOCK = "Azul rey, Rojo, Negro, Kaki, Amarillo canario, Amarillo mango, Perla, Gris medio, Oxford, Azul marino oscuro, Azul marino claro, Fiusha, Palo de rosa, Rosa pastel, Rosa baby, Petróleo, Uva, Gris baby, Naranja, Lila, Vino, Azul cielo, Verde bandera, Verde botella, Verde militar, Magenta, Aqua, Menta, Celeste, Turquesa, Amarillo neón, Verde neón, Rosa neón, Oro viejo, Mostaza, Camel, Francia, Chedron, Uva oscuro, Pistache, Manzana, Acero, Cemento, Hueso";

const PRECIOS_TELAS_DEFAULT: Record<string, { menudeo: number; mayoreo: number; info: string }> = {
  "micro piqué":      { menudeo: 90,  mayoreo: 85,  info: `100% Poliéster 145g. Dry-Fit alto rendimiento. Rend. 4.3m/kg. Colores: Blanco, ${COLORES_STOCK}.` },
  "piqué vera":       { menudeo: 95,  mayoreo: 90,  info: `100% Poliéster 145g. Más suave. Rend. 4.3m/kg. Colores: Blanco, ${COLORES_STOCK}.` },
  "micro panal":      { menudeo: 95,  mayoreo: 90,  info: `100% Poliéster 145g. Máxima transpiración. Rend. 4.3m/kg. Colores: Blanco, ${COLORES_STOCK}.` },
  "torneo":           { menudeo: 105, mayoreo: 98,  info: `100% Poliéster 150g. Uso rudo. Rend. 4.3m/kg. Colores: Blanco, ${COLORES_STOCK}.` },
  "athlos":           { menudeo: 125, mayoreo: 120, info: "145g. Versatilidad total. Rend. 4.0m/kg. Color único por rollo." },
  "brock":            { menudeo: 125, mayoreo: 120, info: "145g. Versatilidad total. Rend. 4.0m/kg. Color único por rollo." },
  "piqué vera sport": { menudeo: 125, mayoreo: 120, info: "145g. Versatilidad total. Rend. 4.0m/kg. Color único por rollo." },
  "kyoto":            { menudeo: 155, mayoreo: 140, info: "145g. Tacto seda, caída premium. Rend. 4.0m/kg. Color único." },
  "panal plus":       { menudeo: 155, mayoreo: 140, info: "145g. Mayor cuerpo y estructura. Rend. 3.7m/kg. Color único." },
  "apolo":            { menudeo: 160, mayoreo: 145, info: "150g. Anti-pilling. Rend. 3.7m/kg. Color único." },
  "horous":           { menudeo: 160, mayoreo: 155, info: "145g. Moda deportiva urbana. Rend. 4.2m/kg. Color único." },
  "panal nitro":      { menudeo: 185, mayoreo: 170, info: "145g. Control de humedad extremo. Color único." },
};

// ==========================================
// 🧵 BODEGA — HILOS
// ==========================================
const PRECIOS_HILOS_DEFAULT: Record<string, { menudeo: number; mayoreo: number; info: string; unidad: string }> = {
  "hilo kingtex 40/2": {
    menudeo: 29,
    mayoreo: 25,
    info: "100% Poliéster Fibra Corta. 5,000m por cono. Alta velocidad industrial. Caja de 120 piezas. Precio mayoreo aplica por caja completa. +70 colores disponibles.",
    unidad: "pieza/cono"
  },
};

// ==========================================
// 🔩 BODEGA — ELÁSTICOS
// ==========================================
const PRECIOS_ELASTICOS_DEFAULT: Record<string, { menudeo: number; mayoreo: number; info: string; unidad: string }> = {
  "elástico beisbolero 2½\"": {
    menudeo: 19, mayoreo: 19,
    info: "100% Poliéster/Caucho. 6.5 cm de ancho. Ideal para cinturas y uniformes deportivos. Venta por metro. Rollo = 50 metros. Colores: Blanco, Negro.",
    unidad: "metro"
  },
  "elástico 3 ligas": { menudeo: 80, mayoreo: 80, info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico 5 ligas": { menudeo: 100, mayoreo: 100, info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico 7 ligas": { menudeo: 110, mayoreo: 110, info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico 10 ligas": { menudeo: 100, mayoreo: 100, info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico 12 ligas": { menudeo: 110, mayoreo: 110, info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico 16 ligas": { menudeo: 80, mayoreo: 80, info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico 20 ligas": { menudeo: 100, mayoreo: 100, info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico 25 ligas": { menudeo: 100, mayoreo: 100, info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico 30 ligas": { menudeo: 120, mayoreo: 120, info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico jareta 3 cm": { menudeo: 140, mayoreo: 140, info: "Cono. Elástico con jareta. Ideal para blusas y pantalones. Color: Blanco.", unidad: "cono" },
  "elástico jareta 4 cm": { menudeo: 145, mayoreo: 145, info: "Cono. Elástico con jareta. Ideal para blusas y pantalones. Color: Blanco.", unidad: "cono" },
};

// ==========================================
// 🏪 BODEGA UNIFICADA — helpers
// ==========================================
interface BodegaGuardada {
  telas: typeof PRECIOS_TELAS_DEFAULT;
  hilos: typeof PRECIOS_HILOS_DEFAULT;
  elasticos: typeof PRECIOS_ELASTICOS_DEFAULT;
}

async function getBodega(redis: Redis): Promise<BodegaGuardada> {
  const guardado = await redis.get<BodegaGuardada>('bodega_coyote_v2');
  if (!guardado) {
    const inicial: BodegaGuardada = { telas: PRECIOS_TELAS_DEFAULT, hilos: PRECIOS_HILOS_DEFAULT, elasticos: PRECIOS_ELASTICOS_DEFAULT };
    await redis.set('bodega_coyote_v2', inicial);
    return inicial;
  }
  return {
    telas: { ...PRECIOS_TELAS_DEFAULT, ...guardado.telas },
    hilos: { ...PRECIOS_HILOS_DEFAULT, ...guardado.hilos },
    elasticos: { ...PRECIOS_ELASTICOS_DEFAULT, ...guardado.elasticos },
  };
}

type BodegaCategoria = 'telas' | 'hilos' | 'elasticos';

async function actualizarPrecio(
  redis: Redis, categoria: BodegaCategoria, producto: string,
  campo: 'menudeo' | 'mayoreo', precio: number
) {
  const bodega = await getBodega(redis);
  const cat = bodega[categoria] as any;
  if (!cat[producto]) return false;
  cat[producto][campo] = precio;
  await redis.set('bodega_coyote_v2', bodega);
  return true;
}

async function agregarProducto(
  redis: Redis, categoria: BodegaCategoria, nombre: string,
  menudeo: number, mayoreo: number, info: string, unidad?: string
) {
  const bodega = await getBodega(redis);
  (bodega[categoria] as any)[nombre.toLowerCase()] = { menudeo, mayoreo, info, unidad: unidad || 'pieza' };
  await redis.set('bodega_coyote_v2', bodega);
  console.log(`✅ Producto agregado a ${categoria}: ${nombre}`);
  return true;
}

async function eliminarProducto(redis: Redis, categoria: BodegaCategoria, nombre: string) {
  const bodega = await getBodega(redis);
  const key = nombre.toLowerCase();
  const cat = bodega[categoria] as any;
  if (!cat[key]) return false;
  delete cat[key];
  await redis.set('bodega_coyote_v2', bodega);
  console.log(`🗑️ Producto eliminado de ${categoria}: ${nombre}`);
  return true;
}

// ==========================================
// 📲 ENVIAR WHATSAPP
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
// 🏦 STRIPE WEBHOOK
// ==========================================
async function handleStripeWebhook(rawBody: string, signature: string) {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('⚠️ Error verificando firma de Stripe:', err.message);
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;
    if (metadata?.phone) {
      const redis = getRedis();
      const tel = metadata.phone.replace(/\D/g, '');
      const quiereFactura = metadata.req_invoice === 'YES';
      const monto = (session.amount_total || 0) / 100;
      const perfil = await getCliente(redis, tel);
      const saludo = perfil?.nombre ? `¡Qué onda ${perfil.nombre}!` : '¡Qué onda patrón!';
      const urlTicket = `https://www.coyotetextil.com/ticket/${session.id}`;
      let msg = `🐺 *El Coyote te habla.* ${saludo} Stripe confirmó tu pago de *$${monto} MXN*. ✅\n\n🎫 *Tu Ticket Digital:*\n${urlTicket}\n\n¡Tu pedido entró a bodega! 📦 En breve te confirmamos salida.`;

      if (quiereFactura && metadata.rfc !== 'NONE') {
        try {
          const custRes = await fetch('https://www.facturapi.io/v2/customers', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${facturapiAuth}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ legal_name: metadata.razon, tax_id: metadata.rfc, tax_system: metadata.regimen, zip: metadata.cp })
          });
          const clienteSAT = await custRes.json();
          const precioBase = monto / 1.16;
          let formaPago = "04";
          if (session.payment_method_types.includes('oxxo')) formaPago = "01";
          const invRes = await fetch('https://www.facturapi.io/v2/invoices', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${facturapiAuth}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer: clienteSAT.id,
              items: [{ product: { description: "Telas y Avíos de Alto Rendimiento Coyote Textil", product_key: "11162100", price: precioBase, taxes: [{ type: "IVA", rate: 0.16 }] }, quantity: 1 }],
              use: metadata.uso, payment_form: formaPago, payment_method: "PUE"
            })
          });
          const factura = await invRes.json();
          if (invRes.ok) msg += `\n\n🧾 *Tu Factura 4.0 ya está timbrada.*\nhttps://www.facturapi.io/v2/invoices/${factura.id}/pdf`;
          else msg += `\n\n⚠️ El SAT rebotó un dato. El Patrón lo revisa.`;
        } catch (e) {
          msg += `\n\n⚠️ Intermitencia con el SAT. Tu factura llega en breve.`;
        }
      }
      await registrarPedido(redis, tel, {
        fecha: new Date().toISOString(), productos: metadata.productos || 'No especificado',
        monto, metodo: session.payment_method_types[0] || 'card', conFactura: quiereFactura
      });
      await enviarWhatsapp(tel, msg);
    }
  }
  return NextResponse.json({ received: true });
}

// ==========================================
// 💬 WHATSAPP WEBHOOK
// ==========================================
async function handleWhatsappWebhook(body: any) {
  const entry = body?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  if (value?.statuses && !value?.messages) {
    console.log('📊 Notificación de estado recibida, ignorando.');
    return;
  }

  const mensajes = value?.messages;
  if (!mensajes || mensajes.length === 0) {
    console.log('⚠️ Payload sin mensajes:', JSON.stringify(body).slice(0, 300));
    return;
  }

  const mensajeInfo = mensajes[0];
  if (mensajeInfo.type !== 'text') {
    console.log(`⏭️ Tipo de mensaje ignorado: ${mensajeInfo.type}`);
    return;
  }

  const tel = mensajeInfo.from;
  const msgCliente = mensajeInfo.text?.body;
  if (!tel || !msgCliente) {
    console.log('⚠️ Mensaje sin teléfono o sin body:', JSON.stringify(mensajeInfo));
    return;
  }

  const nombreWA = value?.contacts?.[0]?.profile?.name || '';
  console.log(`\n${'='.repeat(60)}\n💬 MENSAJE — Tel: ${tel} | "${msgCliente}"\n${'='.repeat(60)}\n`);

  // 🛑 CRM ROUTER
  try {
    const decision = await determineRouting(tel, "WHATSAPP");
    if (decision.action === "ROUTE_TO_AGENT") {
      let currentConvoId = decision.conversationId;
      if (!currentConvoId && decision.agentId) {
        const nuevaConvo = await prisma.waConversation.create({
          data: { contactPhone: tel, isOpen: true, employeeId: decision.agentId, lastMessage: msgCliente, lastMessageAt: new Date() }
        });
        currentConvoId = nuevaConvo.id;
      }
      if (currentConvoId) {
        await prisma.$transaction([
          prisma.waMessage.create({ data: { conversationId: currentConvoId, role: "CLIENT", body: msgCliente, isRead: false } }),
          prisma.waConversation.update({ 
            where: { id: currentConvoId }, 
            data: { 
              lastMessage: msgCliente, 
              lastMessageAt: new Date(),
              unreadCount: { increment: 1 } // ✅ FIX 1: Incrementar contador de no leídos
            } 
          }),
        ]);
        console.log(`✅ Mensaje guardado en DB para agente. Fin.`);
        return;
      }
    }
  } catch (error) {
    console.error("⚠️ Error en CRM router:", error);
  }

  // 🤖 EL COYOTE
  console.log(`🐺 El Coyote procesando mensaje de ${tel}...`);
  const redis = getRedis();
  const msgLower = msgCliente.trim().toLowerCase();

  if (msgLower === 'soy jack' || msgLower === 'soy jack.') {
    await enviarWhatsapp(tel, '🐺 *El Coyote al habla.* Hola Patrón Jack, ¿te puedes verificar? 🔒');
    return;
  }
  if (msgLower === 'elcoyote56') {
    const h = await getHistorial(redis, tel);
    h.push({ role: 'user', content: msgCliente });
    h.push({ role: 'assistant', content: '🐺 ¡Órdenes recibidas Patrón! Modo Administrador activo. ¿Qué cambiamos?' });
    await saveHistorial(redis, tel, h);
    await enviarWhatsapp(tel, '🐺 *El Coyote al habla, Patrón Jack.* Modo Admin activo.\n\nPuedo cambiar:\n• Precios y catálogo (telas, hilos, elásticos)\n• Mi tono, reglas y personalidad\n• Promociones activas\n• Avisos globales\n• Y lo que se te ocurra\n\n¿Qué hacemos?');
    return;
  }

  const esSoloCoyote = /^\s*coyote[\s!?.]*$/i.test(msgCliente.trim());
  if (esSoloCoyote) {
    const resp = `🐺 *El Coyote aquí.* Nunca duermo, siempre alerta. ¿En qué te puedo ayudar hoy?`;
    const h = await getHistorial(redis, tel);
    h.push({ role: 'user', content: msgCliente });
    h.push({ role: 'assistant', content: resp });
    await saveHistorial(redis, tel, h);
    await enviarWhatsapp(tel, resp);
    return;
  }

  let perfil = await getCliente(redis, tel);
  const config = await getConfigBot(redis);

  if (!perfil) {
    perfil = {
      nombre: '', genero: 'unknown', telefono: tel,
      primerContacto: new Date().toISOString(), ultimoContacto: new Date().toISOString(),
      totalCompras: 0, montoAcumulado: 0, productosComprados: [],
      direccionEnvio: '', cpFiscal: '', metodoPagoFavorito: '', requiereFrecuenteFactura: false, notas: '',
      preferencias: [], etapaAbandono: null, recordatoriosPendientes: [],
      segmento: 'prospecto', objecionesComunes: [], productosFavoritos: [], intentosDePago: 0,
      sensibilidadPrecio: 'media', interesesDeclarados: [], categoriasPedidas: []
    };
    await saveCliente(redis, tel, perfil);
    const bienvenida = config.frasesBienvenida[Math.floor(Math.random() * config.frasesBienvenida.length)];
    const h = await getHistorial(redis, tel);
    h.push({ role: 'user', content: msgCliente });
    h.push({ role: 'assistant', content: bienvenida });
    await saveHistorial(redis, tel, h);
    await enviarWhatsapp(tel, bienvenida);
    return;
  }

  if (!perfil.nombre) {
    const primerNombre = msgCliente.trim().split(' ')[0];
    perfil.nombre = primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1).toLowerCase();
    perfil.genero = await detectarGenero(perfil.nombre);
    perfil.ultimoContacto = new Date().toISOString();
    await saveCliente(redis, tel, perfil);
    const saludo = perfil.genero === 'mujer'
      ? `🐺 *El Coyote aquí.* ¡Un placer, ${perfil.nombre}! Soy tu asesor de Coyote Textil. ¿En qué te puedo ayudar hoy?`
      : `🐺 *El Coyote al habla.* ¡Mucho gusto, ${perfil.nombre}! Tu asesor de Coyote Textil. ¿Qué necesitas?`;
    const h = await getHistorial(redis, tel);
    h.push({ role: 'user', content: msgCliente });
    h.push({ role: 'assistant', content: saludo });
    await saveHistorial(redis, tel, h);
    await enviarWhatsapp(tel, saludo);
    return;
  }

  perfil.ultimoContacto = new Date().toISOString();
  await saveCliente(redis, tel, perfil);

  let historial = await getHistorial(redis, tel);
  historial.push({ role: 'user', content: msgCliente });

  const esElJefe = historial.some((m: any) => m.role === 'user' && m.content.trim() === 'elcoyote56');
  const bodega = await getBodega(redis);

  // --- Construir catálogos legibles ---
  const buildCatalogoTelas = () => {
    const lines = Object.entries(bodega.telas).map(([name, p]) =>
      `  • ${name.toUpperCase()}: $${p.menudeo}/kg menudeo | $${p.mayoreo}/kg mayoreo | rollo 25kg = $${(p.mayoreo * 25).toFixed(0)} MXN\n    ${p.info}`
    );
    return lines.join('\n');
  };

  const buildCatalogoHilos = () => {
    const lines = Object.entries(bodega.hilos).map(([name, p]) =>
      `  • ${name.toUpperCase()}: $${p.menudeo} menudeo/${p.unidad} | $${p.mayoreo} mayoreo/caja (120 pzs = $${(p.mayoreo * 120).toFixed(0)} MXN)\n    ${p.info}`
    );
    return lines.join('\n');
  };

  const buildCatalogoElasticos = () => {
    const lines = Object.entries(bodega.elasticos).map(([name, p]) =>
      `  • ${name.toUpperCase()}: $${p.menudeo} por ${p.unidad}\n    ${p.info}`
    );
    return lines.join('\n');
  };

  // Incluir productosExtra de config en catálogo telas
  const extrasTexto = config.productosExtra.length > 0
    ? config.productosExtra.map(pe => {
      const cat = pe.categoria || 'tela';
      return `  • ${pe.nombre.toUpperCase()} [${cat}]: $${pe.menudeo} menudeo | $${pe.mayoreo} mayoreo | ${pe.info}`;
    }).join('\n')
    : '';

  const diasDesdeUltimo = perfil.ultimoContacto
    ? Math.floor((Date.now() - new Date(perfil.ultimoContacto).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const alertaDireccion = perfil.direccionEnvio
    ? `⚠️ DIRECCIÓN GUARDADA: "${perfil.direccionEnvio}". Confirma si sigue siendo correcta.`
    : `⚠️ SIN DIRECCIÓN. Pídela cuando sea necesario.`;

  const alertaReactivacion = diasDesdeUltimo > 30
    ? `⚡ ALERTA: Este cliente lleva ${diasDesdeUltimo} días sin comprar. Usa técnica de reactivación.`
    : '';

  const alertaConversion = (perfil.intentosDePago || 0) > 1
    ? `⚡ ALERTA: ${perfil.intentosDePago} links de pago sin concretar. Identifica objeción real y resuelve.`
    : '';

  const resumenCliente = `
PERFIL INTELIGENTE DEL CLIENTE:
- Nombre: ${perfil.nombre} | Género: ${perfil.genero} | Segmento: ${perfil.segmento || 'prospecto'}
- Compras: ${perfil.totalCompras} | Acumulado: $${perfil.montoAcumulado} | Ticket promedio: $${perfil.ticketPromedio?.toFixed(0) || 'N/A'}
- Categorías pedidas: ${perfil.categoriasPedidas?.join(', ') || 'ninguna'}
- Productos favoritos: ${perfil.productosFavoritos?.join(', ') || 'ninguno'}
- Intereses declarados: ${perfil.interesesDeclarados?.join(', ') || 'ninguno'}
- Objeciones históricas: ${perfil.objecionesComunes?.join(', ') || 'ninguna'}
- Sensibilidad al precio: ${perfil.sensibilidadPrecio || 'media'}
- Requiere factura frecuente: ${perfil.requiereFrecuenteFactura ? 'SÍ' : 'NO'}
- ${alertaDireccion}
- CP Fiscal: ${perfil.cpFiscal || 'no registrado'}
- Notas: ${perfil.notas || 'ninguna'}
${alertaReactivacion}
${alertaConversion}
`.trim();

  const promocionesTexto = config.promocionesActivas.length > 0
    ? `\n🎯 PROMOCIONES ACTIVAS:\n${config.promocionesActivas.map(p => `• ${p.nombre}: ${p.descripcion} — ${p.descuento} (${p.vigencia})`).join('\n')}`
    : '';
  const avisoTexto = config.avisoGeneral ? `\n⚠️ AVISO GENERAL: ${config.avisoGeneral}` : '';
  const instruccionesExtra = config.instruccionesEspeciales
    ? `\n📌 INSTRUCCIONES DEL PATRÓN (prioridad máxima):\n${config.instruccionesEspeciales}`
    : '';

  const CONTEXTO_VENDEDOR = `
════════════════════════════════════════════════════════
🐺 IDENTIDAD — EL COYOTE (IRROMPIBLE)
════════════════════════════════════════════════════════
Eres EL COYOTE, asesor de Coyote Textil. Siempre. Sin excepción.
• NUNCA digas que eres IA, bot, asistente virtual, ChatGPT o GPT.
• Si preguntan quién eres: "🐺 Soy El Coyote, tu asesor de Coyote Textil."
• Firma con "🐺 El Coyote al habla." solo en primeras intervenciones.
• Tono: ${config.tono}
• Máximo ${config.maximoLineasRespuesta} líneas por respuesta. DIRECTO.
• Hombres: ${config.frasesDesignacionHombre.join(', ')} | Mujeres: ${config.frasesDesignacionMujer.join(', ')}
• Emojis: ${config.emojisPrincipales}
• Horario: ${config.horarioAtencion}
${instruccionesExtra}
${avisoTexto}
${promocionesTexto}

════════════════════════════════════════════════════════
🚫 FRASES PROHIBIDAS
════════════════════════════════════════════════════════
${config.fraseProhibidas.map(f => `• "${f}"`).join('\n')}

════════════════════════════════════════════════════════
🧵 CATÁLOGO COMPLETO — COYOTE TEXTIL
════════════════════════════════════════════════════════

📦 TELAS (precio por KILO — rollo = 25 kg):
${buildCatalogoTelas()}
${extrasTexto ? `\nEXTRAS:\n${extrasTexto}` : ''}

🧵 HILOS (precio por PIEZA/CONO):
${buildCatalogoHilos()}

🔩 ELÁSTICOS:
${buildCatalogoElasticos()}

════════════════════════════════════════════════════════
📐 REGLAS DE PRODUCTO
════════════════════════════════════════════════════════
TELAS:
• Todo por kilo. Rollo = 25 kg exactos.
• Menudeo: <25 kg | Mayoreo: 25 kg o más.
• Precio rollo = mayoreo × 25. SIEMPRE muéstralo calculado.
• Empuja rollo: baja precio y da stock al cliente.
• Rendimiento metros: ver catálogo. Convierte a piezas cuando el cliente lo pida.
• COLORES (Micro Piqué / Piqué Vera / Micro Panal / Torneo): Blanco, ${COLORES_STOCK}
  → Siempre pregunta por color antes de cotizar estas 4 telas.
  → Si piden la carta: PEGA LA LISTA COMPLETA, nunca digas "te la mando".
  → Si piden Blanco: menciona Perla, Hueso, Celeste, Gris baby, Rosa baby como alternativas.

HILOS KINGTEX 40/2:
• Precio unitario: $29/cono (menudeo). Mayoreo: $25/cono en caja de 120 piezas.
• Caja completa = 120 conos × $25 = $3,000 MXN.
• 5,000 m por cono. +70 colores disponibles.
• Upselling: "¿Cuántos colores necesitas? Si te llevas caja completa ahorras $4 por cono."
• Para cotizar: pide color(es) específico(s).

ELÁSTICOS:
• Beisbolero 2½\": se vende por METRO ($19/m). Rollo = 50 m = $950. Colores: Blanco, Negro.
• Elásticos por ligas (3 a 30 ligas): precio por pieza de 50 cm. Blanco y Negro.
• Jareta 3 cm y 4 cm: por CONO. Solo Blanco.
• REGLA: para pedidos de 10+ piezas/metros pregunta si quieren mezcla de colores.

════════════════════════════════════════════════════════
🧠 INTELIGENCIA DE VENTAS
════════════════════════════════════════════════════════

1. CALIFICACIÓN RÁPIDA:
   • ¿Qué hace? (uniformes, confección, reventa, deporte)
   • ¿Cuánto necesita? (kilos / piezas / metros)
   • ¿Con qué frecuencia compra?
   • Guarda: DATOS_CLIENTE|intereses:[uso]|categorias:[telas/hilos/elasticos]

2. CROSS-SELLING PROACTIVO — OBLIGATORIO (hazlo SIEMPRE, sin esperar que lo pidan):

   🧵 HILOS — Ofrécelos en ESTOS momentos sin excepción:
   • Cliente pide CUALQUIER tela → Al dar precio di: "¿También necesitas hilo para coser? Tenemos Kingtex 40/2 a $29/cono, +70 colores, ideal para esta tela."
   • Cliente menciona que confecciona, cose, fabrica uniformes o prendas → Ofrece hilo inmediatamente.
   • Cliente hace cotización de tela → Al final del desglose agrega: "🧵 ¿Agregas hilos Kingtex? Te consigo el color exacto de tu tela."
   • Cliente recurrente que nunca ha pedido hilos → En la primera oportunidad menciona que también los tenemos.
   Frases sugeridas:
     "Por cierto, ¿ya tienes hilo para coser esa tela? Tenemos Kingtex 40/2, $29/cono o $25 si te llevas caja de 120."
     "Para ese color de tela tengo el hilo exacto en Kingtex. ¿Te sumo unos conos a la cotización?"

   🔩 ELÁSTICOS — Ofrécelos en ESTOS momentos sin excepción:
   • Cliente pide tela para pantalón, short, pants, licra, falda, ropa deportiva o infantil → Di: "¿Necesitas elástico también? Tengo beisbolero, jareta y por ligas."
   • Cliente menciona uniformes escolares, deportivos o de trabajo → Ofrece elástico beisbolero o jareta.
   • Cliente pide tela para confección en general → Pregunta si lleva elástico.
   • Cliente menciona cintura, pretina, puños o resorte → Ofrece elástico jareta o por ligas según aplique.
   Frases sugeridas:
     "Para ese pantalón/short también tengo elástico jareta de 3 o 4 cm. ¿Le entro con unos conos?"
     "¿Llevas elástico? Tengo beisbolero 2½\" a $19/m, perfecto para cinturas de uniforme."
     "Con esa tela te recomiendo el elástico jareta, va perfecto para pretinas. ¿Cuánto necesitas?"

   📦 PAQUETE COMPLETO — Cierra con esto siempre que aplique:
   • Si el cliente está cotizando tela Y detectas que podría usar hilo Y elástico → Propón el paquete:
     "Oye, ¿quieres que te arme el paquete completo? Tela + hilo + elástico, te cotizo todo junto y ahorras en el envío."

   ⚠️ REGLA DE ORO: No esperes a que pregunten. El Coyote siempre ofrece primero. Si el cliente dice "no gracias", respeta y sigue. Si no dice nada, asume que no lo necesita y avanza. Máximo 1 oferta por conversación de cada categoría para no atosigar.

3. MANEJO DE OBJECIONES:
   • "Está caro" → Desglosar valor y rendimiento por prenda.
   • "Lo voy a pensar" → Crear urgencia con stock o precio vigente.
   • "Tengo otro proveedor" → Diferenciadores sin atacar.
   • "No traigo dinero" → OXXO, cantidad menor, pago parcial.
   Registra: DATOS_CLIENTE|notas:objecion_[tipo]

4. UPSELLING:
   • Telas <25 kg → empuja rollo completo.
   • Hilos sueltos → empuja caja de 120.
   • Elásticos pocas piezas → pregunta si necesita más.

5. URGENCIA Y ESCASEZ (con honestidad):
   • Stock limitado en colores específicos.
   • Promos con vigencia.
   • "Los precios se revisan mensualmente."

6. CIERRE PROGRESIVO:
   • Mini-cierres: "¿Con eso te armo la cotización o agregas algo más?"
   • Asume siguiente paso: "¿Tarjeta u OXXO?"

7. REACTIVACIÓN (>30 días sin comprar):
   • "Oye ${perfil.nombre}, hace un rato que no pedías. ¿Cómo va el negocio? Tengo novedad."

8. APRENDIZAJE CONTINUO:
   • Guarda siempre: DATOS_CLIENTE|categorias:[lista]|etapa_abandono:[etapa]|notas:[razón]

════════════════════════════════════════════════════════
🗺️ FLUJO DE VENTA
════════════════════════════════════════════════════════
1. CALIFICAR → 2. COTIZAR (incluye cross-sell) → 3. DIRECCIÓN → 4. TOTAL CON ENVÍO → 5. FACTURA → 6. MÉTODO PAGO → 7. COBRO

════════════════════════════════════════════════════════
⚡ REGLA DE ACCIÓN INMEDIATA
════════════════════════════════════════════════════════
Si ya tienes producto + cantidad + CP → USA CALCULAR_ENVIO YA. No preguntes, actúa.

════════════════════════════════════════════════════════
🚨 PAGOS
════════════════════════════════════════════════════════
Solo Stripe verifica pagos.
Si dicen "ya pagué": "¡Perfecto! En cuanto Stripe confirme, bodega recibe tu pedido. 🐺📦"
${config.infoPagos ? `\n💳 EXTRA PAGOS: ${config.infoPagos}` : ''}
${config.infoEnvios ? `\n🚚 EXTRA ENVÍOS: ${config.infoEnvios}` : ''}

════════════════════════════════════════════════════════
🎯 CIERRE
════════════════════════════════════════════════════════
"${config.fraseCierre}"
"${config.fraseIncondicional}"
${config.mensajePromoFinal ? `Y agrega: "${config.mensajePromoFinal}"` : ''}

════════════════════════════════════════════════════════
💰 COMANDOS INTERNOS (invisibles para el cliente)
════════════════════════════════════════════════════════
COBRO: GENERAR_COBRO|metodo(tarjeta/oxxo)|monto_total|rfc|razon_social|cp_fiscal|regimen|uso
Sin factura: GENERAR_COBRO|tarjeta|1500|NONE|NONE|NONE|NONE|NONE

ENVÍO (para telas): CALCULAR_ENVIO|productos=[{"nombre":"producto","kg":cantidad}]|cp=12345
Nota: Para hilos y elásticos el envío es por Skydropx; usa CALCULAR_ENVIO con kg estimados.

DATOS_CLIENTE|direccion:[dir]|cp_fiscal:[cp]|productos:[lista]|categorias:[telas/hilos/elasticos]|notas:[nota]|etapa_abandono:[etapa]|intereses:[uso]

ESCALAR|descripcion
PROGRAMAR_RECORDATORIO|telefono|fecha|mensaje

⚠️ CP ENVÍO ≠ CP FISCAL. NUNCA los mezcles.

════════════════════════════════════════════════════════
👤 PERFIL DEL CLIENTE
════════════════════════════════════════════════════════
${resumenCliente}
`;

  const CONTEXTO_JEFE = `
ERES "EL COYOTE", IA DE COYOTE TEXTIL. HABLAS CON JACK, TU CREADOR.
Respuestas cortas. "A la orden Patrón". Tono cuate de confianza.
Aunque Jack cambie tu nombre en config, SIEMPRE eres El Coyote internamente.

════════════════════════════════════════════════════════
📦 GESTIÓN DE CATÁLOGO
════════════════════════════════════════════════════════
PRECIO_UPDATE|categoria(telas/hilos/elasticos)|nombre_producto|menudeo_o_mayoreo|numero
PRODUCTO_NUEVO|categoria(telas/hilos/elasticos)|nombre|menudeo|mayoreo|descripcion|unidad
PRODUCTO_ELIMINAR|categoria(telas/hilos/elasticos)|nombre

TELAS ACTUALES:
${buildCatalogoTelas()}

HILOS ACTUALES:
${buildCatalogoHilos()}

ELÁSTICOS ACTUALES:
${buildCatalogoElasticos()}

════════════════════════════════════════════════════════
🎛️ CONFIGURACIÓN GLOBAL
════════════════════════════════════════════════════════
CONFIG|tono|Nueva descripción del tono
CONFIG|frasesHombre|señor, mi estimado.
CONFIG|frasesMujer|señora, estimada.
CONFIG|fraseCierre|Nueva frase de cierre
CONFIG|fraseIncondicional|Nueva frase final
CONFIG|emojis|🐺📦💪
CONFIG|maxLineas|4
CONFIG|agregarProhibida|frase prohibida
CONFIG|quitarProhibida|frase a quitar
CONFIG|instruccionEspecial|Nueva regla
CONFIG|horario|Lunes a viernes 9-6pm
CONFIG|infoPagos|Instrucción extra
CONFIG|infoEnvios|Instrucción extra
CONFIG|mensajePromoFinal|Texto gancho

BIENVENIDA_ADD|Texto completo
BIENVENIDA_REPLACE|Texto único
PROMO_ADD|Nombre|Descripción|Descuento|Vigencia
PROMO_DEL|Nombre
AVISO|Texto (o AVISO|BORRAR)

════════════════════════════════════════════════════════
📢 MENSAJES Y REPORTES
════════════════════════════════════════════════════════
SEND_MSG|5521XXXXXXXX|Mensaje
ENVIAR_CAMPANA|segmento(todos/activos/inactivos)|mensaje
PROGRAMAR_RECORDATORIO|telefono|fecha|mensaje
GENERAR_REPORTE|tipo(diario/semanal/mensual)|formato(texto/json)

════════════════════════════════════════════════════════
📋 CONFIG ACTUAL
════════════════════════════════════════════════════════
Nombre: ${config.nombreBot}
Tono: ${config.tono}
Tratamiento hombre: ${config.frasesDesignacionHombre.join(', ')}
Tratamiento mujer: ${config.frasesDesignacionMujer.join(', ')}
Emojis: ${config.emojisPrincipales}
Máx líneas: ${config.maximoLineasRespuesta}
Horario: ${config.horarioAtencion}
Aviso general: ${config.avisoGeneral || 'ninguno'}
Instrucciones especiales: ${config.instruccionesEspeciales || 'ninguna'}
Promociones: ${config.promocionesActivas.length > 0 ? config.promocionesActivas.map(p => p.nombre).join(', ') : 'ninguna'}
Última actualización: ${config.ultimaActualizacion}
`;

  console.log(`🤖 Llamando a GPT-4o para ${tel} (esJefe: ${esElJefe})...`);
  const systemPrompt = { role: 'system', content: esElJefe ? CONTEXTO_JEFE : CONTEXTO_VENDEDOR };

  let respuesta = '';
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [systemPrompt, ...historial] as any,
      temperature: 0.4,
      max_tokens: 700,
    });
    respuesta = completion.choices[0].message.content || '';
    console.log(`✅ GPT-4o respondió (${respuesta.length} chars)`);
  } catch (err) {
    console.error('❌ Error llamando a OpenAI:', err);
    await enviarWhatsapp(tel, '🐺 Ando con problemas técnicos un momento. Dame un segundo y vuelvo al 100.');
    return;
  }

  // 🛡️ Filtro identidad
  const frasesSinIdentidad = [
    /\bsoy una ia\b/i, /\bsoy un bot\b/i, /\basistente virtual\b/i,
    /\bcomo asistente de ia\b/i, /\bcomo ia\b/i, /\bchatgpt\b/i, /\bgpt\b/i,
  ];
  for (const patron of frasesSinIdentidad) {
    if (patron.test(respuesta)) respuesta = respuesta.replace(patron, 'El Coyote de Coyote Textil');
  }

  // 📊 PROCESAR DATOS_CLIENTE
  const matchDatos = respuesta.match(/DATOS_CLIENTE\|(.+)/);
  if (matchDatos) {
    respuesta = respuesta.replace(/DATOS_CLIENTE\|.+/g, '').trim();
    const partes = matchDatos[1];
    const dirM      = partes.match(/direccion:([^|]+)/);
    const cpFiscM   = partes.match(/cp_fiscal:([^|]+)/);
    const prodM     = partes.match(/productos:([^|]+)/);
    const catM      = partes.match(/categorias:([^|]+)/);
    const notasM    = partes.match(/notas:([^|]+)/);
    const prefM     = partes.match(/preferencias:([^|]+)/);
    const cumpleM   = partes.match(/cumpleanos:([^|]+)/);
    const etapaM    = partes.match(/etapa_abandono:([^|]+)/);
    const interesM  = partes.match(/intereses:([^|]+)/);

    if (dirM?.[1]?.trim())    perfil.direccionEnvio = dirM[1].trim();
    if (cpFiscM?.[1]?.trim()) perfil.cpFiscal       = cpFiscM[1].trim();
    if (prodM?.[1]?.trim()) {
      const nuevos = prodM[1].trim().split(',').map((s: string) => s.trim()).filter(Boolean);
      perfil.productosComprados = [...new Set([...perfil.productosComprados, ...nuevos])];
      perfil.productosFavoritos = [...new Set([...(perfil.productosFavoritos || []), ...nuevos])];
    }
    if (catM?.[1]?.trim()) {
      const nuevasCats = catM[1].trim().split(',').map((s: string) => s.trim()).filter(Boolean);
      perfil.categoriasPedidas = [...new Set([...(perfil.categoriasPedidas || []), ...nuevasCats])];
    }
    if (notasM?.[1]?.trim()) {
      const nota = notasM[1].trim();
      if (nota.startsWith('objecion_')) {
        const tipo = nota.replace('objecion_', '');
        perfil.objecionesComunes = [...new Set([...(perfil.objecionesComunes || []), tipo])];
      } else {
        perfil.notas = nota;
      }
    }
    if (prefM?.[1]?.trim()) perfil.preferencias = prefM[1].trim().split(',').map(s => s.trim());
    if (cumpleM?.[1]?.trim()) perfil.cumpleanos = cumpleM[1].trim();
    if (etapaM?.[1]?.trim()) {
      perfil.etapaAbandono = etapaM[1].trim() as any;
      if (etapaM[1].trim() !== 'null') perfil.fechaAbandono = new Date().toISOString();
    }
    if (interesM?.[1]?.trim()) {
      const nuevosIntereses = interesM[1].trim().split(',').map(s => s.trim());
      perfil.interesesDeclarados = [...new Set([...(perfil.interesesDeclarados || []), ...nuevosIntereses])];
    }
    await saveCliente(redis, tel, perfil);
  }

  // ==========================================
  // 👑 COMANDOS DEL JEFE
  // ==========================================
  if (esElJefe) {

    // Precio update — ahora con categoría
    const matchPrecio = respuesta.match(/PRECIO_UPDATE\|(.+?)\|(.+?)\|(.+?)\|(\d+)/);
    if (matchPrecio) {
      const [, cat, prod, campo, precio] = matchPrecio;
      const ok = await actualizarPrecio(
        redis,
        cat.trim().toLowerCase() as BodegaCategoria,
        prod.trim().toLowerCase(),
        campo.trim().toLowerCase() as 'menudeo' | 'mayoreo',
        parseInt(precio)
      );
      respuesta = respuesta.replace(/PRECIO_UPDATE\|.+/g, '').trim();
      respuesta += ok ? `\n✅ Precio de ${prod} (${cat}) actualizado.` : `\n⚠️ No encontré ese producto en ${cat}.`;
    }

    // Producto nuevo — ahora con categoría y unidad
    const matchProdNuevo = respuesta.match(/PRODUCTO_NUEVO\|([^|]+)\|([^|]+)\|(\d+)\|(\d+)\|([^|]+)\|?(.+)?/);
    if (matchProdNuevo) {
      const [, cat, nombre, menudeo, mayoreo, desc, unidad] = matchProdNuevo;
      await agregarProducto(
        redis,
        cat.trim().toLowerCase() as BodegaCategoria,
        nombre.trim(), parseInt(menudeo), parseInt(mayoreo),
        desc.trim(), unidad?.trim()
      );
      respuesta = respuesta.replace(/PRODUCTO_NUEVO\|.+/g, '').trim();
      respuesta += `\n✅ Producto "${nombre.trim()}" agregado a ${cat.trim()}.`;
    }

    // Producto eliminar — ahora con categoría
    const matchProdElim = respuesta.match(/PRODUCTO_ELIMINAR\|([^|]+)\|(.+)/);
    if (matchProdElim) {
      const [, cat, nombre] = matchProdElim;
      const ok = await eliminarProducto(redis, cat.trim().toLowerCase() as BodegaCategoria, nombre.trim());
      respuesta = respuesta.replace(/PRODUCTO_ELIMINAR\|.+/g, '').trim();
      respuesta += ok ? `\n✅ Producto "${nombre.trim()}" eliminado de ${cat.trim()}.` : `\n⚠️ No encontré ese producto.`;
    }

    const matchConfig = respuesta.match(/CONFIG\|([^|]+)\|(.+)/);
    if (matchConfig) {
      const [, campo, valor] = matchConfig;
      respuesta = respuesta.replace(/CONFIG\|[^|]+\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      const campoLower = campo.trim().toLowerCase();
      if (campoLower === 'nombrebot') { cfg.nombreBot = valor.trim(); respuesta += `\n✅ Nombre guardado.`; }
      else if (campoLower === 'tono') { cfg.tono = valor.trim(); respuesta += `\n✅ Tono actualizado.`; }
      else if (campoLower === 'fraseshombre') { cfg.frasesDesignacionHombre = valor.trim().split(',').map(s => s.trim()); respuesta += `\n✅ Tratamiento hombres actualizado.`; }
      else if (campoLower === 'frasesmujer') { cfg.frasesDesignacionMujer = valor.trim().split(',').map(s => s.trim()); respuesta += `\n✅ Tratamiento mujeres actualizado.`; }
      else if (campoLower === 'frasecierre' || campoLower === 'frasescierre') { cfg.fraseCierre = valor.trim(); respuesta += `\n✅ Frase cierre actualizada.`; }
      else if (campoLower === 'fraseincondicional') { cfg.fraseIncondicional = valor.trim(); respuesta += `\n✅ Frase final actualizada.`; }
      else if (campoLower === 'emojis') { cfg.emojisPrincipales = valor.trim(); respuesta += `\n✅ Emojis: ${valor.trim()}`; }
      else if (campoLower === 'maxlineas') { cfg.maximoLineasRespuesta = parseInt(valor.trim()) || 4; respuesta += `\n✅ Límite: ${cfg.maximoLineasRespuesta} líneas.`; }
      else if (campoLower === 'agregarprohibida') { cfg.fraseProhibidas.push(valor.trim()); respuesta += `\n✅ Frase prohibida agregada.`; }
      else if (campoLower === 'quitarprohibida') { cfg.fraseProhibidas = cfg.fraseProhibidas.filter(f => !f.toLowerCase().includes(valor.trim().toLowerCase())); respuesta += `\n✅ Frase prohibida eliminada.`; }
      else if (campoLower === 'instruccionespecial') { cfg.instruccionesEspeciales = cfg.instruccionesEspeciales ? `${cfg.instruccionesEspeciales}\n- ${valor.trim()}` : `- ${valor.trim()}`; respuesta += `\n✅ Regla especial agregada.`; }
      else if (campoLower === 'horario') { cfg.horarioAtencion = valor.trim(); respuesta += `\n✅ Horario: ${valor.trim()}`; }
      else if (campoLower === 'infopagos') { cfg.infoPagos = valor.trim(); respuesta += `\n✅ Info pagos actualizada.`; }
      else if (campoLower === 'infoenvios') { cfg.infoEnvios = valor.trim(); respuesta += `\n✅ Info envíos actualizada.`; }
      else if (campoLower === 'mensajepromofinal') { cfg.mensajePromoFinal = valor.trim(); respuesta += `\n✅ Promo final actualizada.`; }
      else { respuesta += `\n⚠️ Campo "${campo}" no reconocido.`; }
      cfg.actualizadoPor = 'Jack (El Patrón)';
      await saveConfigBot(redis, cfg);
    }

    const matchBienvenidaAdd = respuesta.match(/BIENVENIDA_ADD\|(.+)/);
    if (matchBienvenidaAdd) {
      respuesta = respuesta.replace(/BIENVENIDA_ADD\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.frasesBienvenida.push(matchBienvenidaAdd[1].trim());
      cfg.actualizadoPor = 'Jack (El Patrón)';
      await saveConfigBot(redis, cfg);
      respuesta += `\n✅ Bienvenida agregada. Total: ${cfg.frasesBienvenida.length} versiones.`;
    }

    const matchBienvenidaReplace = respuesta.match(/BIENVENIDA_REPLACE\|(.+)/);
    if (matchBienvenidaReplace) {
      respuesta = respuesta.replace(/BIENVENIDA_REPLACE\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.frasesBienvenida = [matchBienvenidaReplace[1].trim()];
      cfg.actualizadoPor = 'Jack (El Patrón)';
      await saveConfigBot(redis, cfg);
      respuesta += `\n✅ Bienvenida única reemplazada.`;
    }

    const matchAviso = respuesta.match(/AVISO\|(.+)/);
    if (matchAviso) {
      respuesta = respuesta.replace(/AVISO\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.avisoGeneral = matchAviso[1].trim() === 'BORRAR' ? '' : matchAviso[1].trim();
      cfg.actualizadoPor = 'Jack (El Patrón)';
      await saveConfigBot(redis, cfg);
      respuesta += matchAviso[1].trim() === 'BORRAR' ? `\n✅ Aviso borrado.` : `\n✅ Aviso activado.`;
    }

    const matchPromoAdd = respuesta.match(/PROMO_ADD\|([^|]+)\|([^|]+)\|([^|]+)\|(.+)/);
    if (matchPromoAdd) {
      const [, nombre, descripcion, descuento, vigencia] = matchPromoAdd;
      respuesta = respuesta.replace(/PROMO_ADD\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.promocionesActivas.push({ nombre: nombre.trim(), descripcion: descripcion.trim(), descuento: descuento.trim(), vigencia: vigencia.trim() });
      cfg.actualizadoPor = 'Jack (El Patrón)';
      await saveConfigBot(redis, cfg);
      respuesta += `\n✅ Promoción "${nombre.trim()}" activada.`;
    }

    const matchPromoDel = respuesta.match(/PROMO_DEL\|(.+)/);
    if (matchPromoDel) {
      respuesta = respuesta.replace(/PROMO_DEL\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.promocionesActivas = cfg.promocionesActivas.filter(p => !p.nombre.toLowerCase().includes(matchPromoDel[1].trim().toLowerCase()));
      cfg.actualizadoPor = 'Jack (El Patrón)';
      await saveConfigBot(redis, cfg);
      respuesta += `\n✅ Promoción desactivada.`;
    }

    const matchMsj = respuesta.match(/SEND_MSG\|([^|]+)\|(.+)/);
    if (matchMsj) {
      let [, targetNum, targetTxt] = matchMsj;
      targetNum = targetNum.replace(/\D/g, '');
      respuesta = respuesta.replace(/SEND_MSG\|.+/g, '').trim();
      const ok = await enviarWhatsapp(targetNum, targetTxt.trim());
      respuesta += ok ? `\n✅ Mensaje disparado al ${targetNum}.` : `\n⚠️ Meta rechazó el envío.`;
    }

    if (/GENERAR_REPORTE\|/.test(respuesta)) {
      respuesta = respuesta.replace(/GENERAR_REPORTE\|.+/g, '').trim();
      respuesta += `\n📊 Reporte generado.`;
    }

    if (/ENVIAR_CAMPANA\|/.test(respuesta)) {
      respuesta = respuesta.replace(/ENVIAR_CAMPANA\|.+/g, '').trim();
      respuesta += `\n📢 Campaña ejecutada.`;
    }

  } else {
    // ==========================================
    // 🛒 COMANDOS DEL CLIENTE
    // ==========================================

    const matchEnvio = respuesta.match(/CALCULAR_ENVIO\|productos=\[(.+?)\]\|cp=(.+)/i);
    if (matchEnvio) {
      const [, productosStr, cpEnvio] = matchEnvio;
      respuesta = respuesta.replace(/CALCULAR_ENVIO\|.+/g, '').trim();
      try {
        const productos: ProductoEnvio[] = JSON.parse(`[${productosStr}]`);
        const resultado = calcularEnvioReal(productos, cpEnvio.trim(), 0, false);
        respuesta += `\n\n${resultado.desglose}\n\n¿Con eso le damos? Si requieres factura avísame para el IVA. 🐺`;
      } catch (e) {
        respuesta += `\n\n⚠️ No pude calcular el envío. Dame el CP y los kilos de nuevo.`;
      }
    }

    const matchRecordatorio = respuesta.match(/PROGRAMAR_RECORDATORIO\|(.+?)\|(.+?)\|(.+)/i);
    if (matchRecordatorio) {
      respuesta = respuesta.replace(/PROGRAMAR_RECORDATORIO\|.+/g, '').trim();
      respuesta += `\n⏰ Te recuerdo en esa fecha, patrón.`;
    }

    const matchEscalar = respuesta.match(/ESCALAR\|(.+)/i);
    if (matchEscalar) {
      const [, duda] = matchEscalar;
      console.log(`🆘 ESCALAMIENTO: ${duda}`);
      respuesta = respuesta.replace(/ESCALAR\|.+/g, '').trim();
      respuesta += `\n🆘 Ya avisé al equipo. En breve te contactan.`;
    }

    const matchCobro = respuesta.match(/GENERAR_COBRO\|(.+?)\|([\d.]+)\|(.+?)\|(.+?)\|(.+?)\|(.+?)\|(.+)/i);
    if (matchCobro) {
      const [, metodo, monto, rfc, razon, cp, regimen, uso] = matchCobro;
      respuesta = respuesta.replace(/GENERAR_COBRO\|.+/g, '').trim();
      const reqInvoice = rfc !== 'NONE' ? 'YES' : 'NO';
      const amountInCents = Math.round(parseFloat(monto) * 100);

      perfil.intentosDePago = (perfil.intentosDePago || 0) + 1;
      perfil.etapaAbandono = 'pago';
      await saveCliente(redis, tel, perfil);

      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card', 'oxxo'],
          line_items: [{
            price_data: {
              currency: 'mxn',
              product_data: { name: 'Pedido Coyote Textil — El Coyote' },
              unit_amount: amountInCents,
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: 'https://wa.me/5215627301525',
          metadata: { rfc, razon, cp, regimen, uso, req_invoice: reqInvoice, phone: tel, productos: perfil.productosComprados.join(',') }
        });
        respuesta += `\n\n💳 *Tu Link de Pago Seguro (Tarjeta u OXXO):*\n${session.url}\n\n_Blindado por Stripe. El Coyote cuida tu dinero. 🐺_`;
      } catch (err) {
        console.error('Error Stripe:', err);
        respuesta += `\n\n⚠️ Problema generando el link. El Patrón lo revisa al momento.`;
      }
    }
  }

  historial.push({ role: 'assistant', content: respuesta });
  await saveHistorial(redis, tel, historial);
  console.log(`📤 Enviando respuesta a ${tel} (${respuesta.length} chars)`);
  await enviarWhatsapp(tel, respuesta.trim());
  
  // 👇 NUEVO: Espejear la conversación en Prisma para el CRM 👇
  try {
    let convoPrisma = await prisma.waConversation.findFirst({ where: { contactPhone: tel } });    
    // Si la convo no existe en el CRM, la creamos para tener el historial
    if (!convoPrisma) {
      convoPrisma = await prisma.waConversation.create({
        data: { 
          contactPhone: tel, 
          contactName: perfil.nombre || "Cliente Bot", 
          isOpen: true,
          unreadCount: 0 // El bot ya lo leyó y contestó
        }
      });
    }

    // Guardamos ambos mensajes (Cliente y Bot) en la DB relacional
    await prisma.waMessage.createMany({
      data: [
        { conversationId: convoPrisma.id, role: "CLIENT", body: msgCliente, isRead: true },
        { conversationId: convoPrisma.id, role: "AGENT", body: respuesta.trim(), isRead: true } // El bot actúa como AGENT en la DB
      ]
    });

    // Actualizamos el último mensaje en la vista general
    await prisma.waConversation.update({
      where: { id: convoPrisma.id },
      data: { lastMessage: respuesta.trim(), lastMessageAt: new Date() }
    });
  } catch (dbErr) {
    console.error("⚠️ Error espejeando historial del bot en Prisma:", dbErr);
  }
  // 👆 FIN DEL BLOQUE NUEVO 👆

  console.log(`✅ Flujo completo para ${tel}`);
}

// ==========================================
// 🚦 ROUTER PRINCIPAL
// ==========================================
export async function POST(req: Request) {
  const rawBody = await req.text();
  console.log(`\n🚀 POST recibido — ${new Date().toISOString()}`);
  console.log(`   Stripe-Signature: ${req.headers.get('stripe-signature') ? 'PRESENTE' : 'AUSENTE'}`);
  console.log(`   Body length: ${rawBody.length} chars`);

  try {
    const signature = req.headers.get('stripe-signature');
    if (signature) {
      console.log('💳 Procesando webhook Stripe...');
      return await handleStripeWebhook(rawBody, signature);
    }

    let body: any;
    try { body = JSON.parse(rawBody); }
    catch (e) {
      console.error('❌ JSON inválido:', rawBody.slice(0, 500));
      return NextResponse.json({ error: 'JSON Invalido' }, { status: 400 });
    }

    const esStatusUpdate = Array.isArray(body.entry) &&
      body.entry[0]?.changes?.[0]?.value?.statuses &&
      !body.entry[0]?.changes?.[0]?.value?.messages;

    if (esStatusUpdate) {
      const statusObj = body.entry[0].changes[0].value.statuses[0];
      if (statusObj.status === "failed") {
        console.error("❌ ERROR DE ENTREGA DE META:", JSON.stringify(statusObj.errors, null, 2));
      } else {
        console.log(`📊 Status update de Meta: ${statusObj.status} (Ignorando)`);
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const esWhatsapp = Array.isArray(body.entry) && body.entry[0]?.changes?.[0]?.value?.messages;
    if (esWhatsapp) {
      console.log('💬 Mensaje WhatsApp. Procesando...');
      try { await handleWhatsappWebhook(body); }
      catch (err) { console.error('❌ Error en handleWhatsappWebhook:', err); }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    console.log('⚠️ Payload no reconocido:', JSON.stringify(body).slice(0, 300));
    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (error) {
    console.error('❌ ERROR CRÍTICO en POST:', error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

// ==========================================
// ✅ VERIFICACIÓN META (GET)
// ==========================================
export async function GET(req: Request) {
  console.log('🔍 GET de verificación Meta recibido');
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Verificación Meta exitosa');
    return new NextResponse(challenge, { status: 200 });
  }
  console.log('❌ Verificación Meta fallida');
  return new NextResponse('Acceso denegado', { status: 403 });
}