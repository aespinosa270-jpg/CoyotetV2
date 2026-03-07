import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Redis } from '@upstash/redis';
import Stripe from 'stripe'; 
import { prisma } from "@/lib/prisma"; // 🐺 INYECTAMOS PRISMA PARA EL CRM
import { determineRouting } from "@/lib/crm-router"; // 🧠 INYECTAMOS EL CEREBRO ENRUTADOR

// ==========================================
// 🔑 LLAVES MAESTRAS
// ==========================================
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🐺 STRIPE KEYS EN LUGAR DE OPENPAY
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
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Faltan env vars de Upstash');
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// ==========================================
// 🎛️ CONFIGURACIÓN DINÁMICA DE LA IA (EL COYOTE)
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
  productosExtra: Array<{ nombre: string; menudeo: number; mayoreo: number; info: string; }>;
  promocionesActivas: Array<{ nombre: string; descripcion: string; descuento: string; vigencia: string; }>;
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
    '¡Hola! Bienvenido a la familia *Coyote Textil* 🐺\n\n¿Autorizas que te enviemos promociones y novedades?\n\n📋 Términos: https://www.coyotetextil.com/terms\n🔒 Privacidad: https://www.coyotetextil.com/privacy\n\nEstamos para servirte *24/7 los 365 días del año*. 💪\n\n¿Con quién tengo el gusto?'
  ],
  frasesDesignacionHombre: ['jefe', 'patrón', 'amigo'],
  frasesDesignacionMujer: ['jefa', 'patrona'],
  fraseCierre: 'Estamos vistiendo la fuerza de México en cada hilo. Tú ya eres parte de nuestra familia, y estamos contigo 24/7. Con tu permiso, te sorprenderemos con promociones a tu medida, porque juntos tejemos éxitos.',
  fraseIncondicional: 'auuuuuuuuu aquí estamos chambeando sin parar, patrón. Ando medio desvielado pero jalando. 🐺',
  emojisPrincipales: '🐺📦💪',
  maximoLineasRespuesta: 4,
  fraseProhibidas: [
    'Te enviaré los detalles',
    'Enviaré la cotización',
    'Procederé',
    '¿Algo más en lo que pueda asistirte?',
    'te mando',
    'te envío',
    'te hago llegar'
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
    if (!guardado) {
      await redis.set('config_coyote', CONFIG_DEFAULT);
      return CONFIG_DEFAULT;
    }
    return { ...CONFIG_DEFAULT, ...guardado };
  } catch {
    return CONFIG_DEFAULT;
  }
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
}

interface PedidoRegistro {
  fecha: string;
  productos: string;
  monto: number;
  metodo: string;
  conFactura: boolean;
}

// ==========================================
// 🚚 CONSTANTES DE LOGÍSTICA
// ==========================================
const DIESEL_PRICE_PER_LITER = 27.00;
const LITERS_PER_100KM = 20.0;
const OPERATIONAL_MARKUP = 4;
const FIXED_SERVICE_FEE = 175;
const MAX_ROLLS_PER_VEHICLE = 80;

interface ProductoEnvio {
  nombre: string;
  kg: number;
  esRollo?: boolean;
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
  desglose: string;
}

function calcularEnvioReal(
  productos: ProductoEnvio[],
  cpEnvio: string,
  subtotal: number,
  requiereFactura: boolean
): ResultadoEnvio {
  let totalKilos = productos.reduce((acc, p) => acc + p.kg, 0);
  let totalRollos = 0;
  for (const p of productos) {
    totalRollos += Math.ceil(p.kg / 25);
  }
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
    else if ([1, 5, 10, 12, 13, 14, 16].includes(prefix2)) distanciaKm = 28;
    else distanciaKm = 15;
  } else if (prefix2 >= 50 && prefix2 <= 57) {
    tipoEnvio = 'COYOTE';
    if (prefix2 === 57) distanciaKm = 10;
    else if (prefix2 === 55) distanciaKm = 20;
    else if (prefix2 === 53 || prefix2 === 54) distanciaKm = 25;
    else if (prefix2 === 56) distanciaKm = 35;
    else if (prefix2 === 52) distanciaKm = 55;
    else if (prefix2 === 50 || prefix2 === 51) distanciaKm = 70;
    else distanciaKm = 40;
  } else if (prefix2 === 42 || prefix2 === 43) { tipoEnvio = 'COYOTE'; distanciaKm = 100; }
  else if (prefix2 >= 72 && prefix2 <= 75) { tipoEnvio = 'COYOTE'; distanciaKm = 130; }
  else if (prefix2 === 62) { tipoEnvio = 'COYOTE'; distanciaKm = 90; }

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
// 🧠 HELPERS DE MEMORIA
// ==========================================
async function getHistorial(redis: Redis, tel: string) {
  try {
    return (await redis.get<Array<{role: string; content: string}>>(`historial:${tel}`)) || [];
  } catch { return []; }
}

async function saveHistorial(redis: Redis, tel: string, h: Array<{role: string; content: string}>) {
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
// 🏪 BODEGA Y PRECIOS
// ==========================================
const COLORES_STOCK = "Azul rey, Rojo, Negro, Kaki, Amarillo canario, Amarillo mango, Perla, Gris medio, Oxford, Azul marino oscuro, Azul marino claro, Fiusha, Palo de rosa, Rosa pastel, Rosa baby, Petróleo, Uva, Gris baby, Naranja, Lila, Vino, Azul cielo, Verde bandera, Verde botella, Verde militar, Magenta, Aqua, Menta, Celeste, Turquesa, Amarillo neón, Verde neón, Rosa neón, Oro viejo, Mostaza, Camel, Francia, Chedron, Uva oscuro, Pistache, Manzana, Acero, Cemento, Hueso";

const PRECIOS_DEFAULT: Record<string, { menudeo: number; mayoreo: number; info: string }> = {
  "micro piqué":      { menudeo: 90,  mayoreo: 85,  info: `100% Poliéster 145g. Dry-Fit alto rendimiento. Rend. 4.3m/kg. Colores: ${COLORES_STOCK}.` },
  "piqué vera":       { menudeo: 95,  mayoreo: 90,  info: `100% Poliéster 145g. Más suave. Rend. 4.3m/kg. Colores: ${COLORES_STOCK}.` },
  "micro panal":      { menudeo: 95,  mayoreo: 90,  info: `100% Poliéster 145g. Máxima transpiración. Rend. 4.3m/kg. Colores: ${COLORES_STOCK}.` },
  "torneo":           { menudeo: 105, mayoreo: 98,  info: `100% Poliéster 150g. Uso rudo. Rend. 4.3m/kg. Colores: ${COLORES_STOCK}.` },
  "athlos":           { menudeo: 125, mayoreo: 120, info: "145g. Versatilidad total. Rend. 4.0m/kg. Color único por rollo." },
  "brock":            { menudeo: 125, mayoreo: 120, info: "145g. Versatilidad total. Rend. 4.0m/kg. Color único por rollo." },
  "piqué vera sport": { menudeo: 125, mayoreo: 120, info: "145g. Versatilidad total. Rend. 4.0m/kg. Color único por rollo." },
  "kyoto":            { menudeo: 155, mayoreo: 140, info: "145g. Tacto seda, caída premium. Rend. 4.0m/kg. Color único." },
  "panal plus":       { menudeo: 155, mayoreo: 140, info: "145g. Mayor cuerpo y estructura. Rend. 3.7m/kg. Color único." },
  "apolo":            { menudeo: 160, mayoreo: 145, info: "150g. Anti-pilling. Rend. 3.7m/kg. Color único." },
  "horous":           { menudeo: 160, mayoreo: 155, info: "145g. Moda deportiva urbana. Rend. 4.2m/kg. Color único." },
  "panal nitro":      { menudeo: 185, mayoreo: 170, info: "145g. Control de humedad extremo. Color único." },
};

async function getBodega(redis: Redis) {
  const guardado = await redis.get<typeof PRECIOS_DEFAULT>('bodega_coyote');
  if (!guardado) { await redis.set('bodega_coyote', PRECIOS_DEFAULT); return PRECIOS_DEFAULT; }
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

async function agregarProducto(redis: Redis, nombre: string, menudeo: number, mayoreo: number, info: string) {
  const bodega = await getBodega(redis);
  bodega[nombre.toLowerCase()] = { menudeo, mayoreo, info };
  await redis.set('bodega_coyote', bodega);
  console.log(`✅ Producto agregado a bodega: ${nombre}`);
  return true;
}

async function eliminarProducto(redis: Redis, nombre: string) {
  const bodega = await getBodega(redis);
  const key = nombre.toLowerCase();
  if (!bodega[key]) return false;
  delete bodega[key];
  await redis.set('bodega_coyote', bodega);
  console.log(`🗑️ Producto eliminado de bodega: ${nombre}`);
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
// 🏦 WEBHOOK STRIPE
// ==========================================
async function handleStripeWebhook(rawBody: string, signature: string) {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('⚠️ Error verificando firma de Stripe:', err.message);
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
  }

  // Escuchamos cuando un Checkout Session se completa con éxito
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (metadata?.phone) {
      const redis = getRedis();
      const tel = metadata.phone.replace(/\D/g, '');
      const quiereFactura = metadata.req_invoice === 'YES';
      const monto = (session.amount_total || 0) / 100; // Stripe viene en centavos
      const perfil = await getCliente(redis, tel);
      const saludo = perfil?.nombre ? `¡Qué onda ${perfil.nombre}!` : '¡Qué onda patrón!';
      
      // 🎫 AQUÍ GENERAMOS LA URL DEL TICKET AUTOMÁTICAMENTE
      const urlTicket = `https://www.coyotetextil.com/ticket/${session.id}`;

      let msg = `🐺 ${saludo} Stripe nos confirmó que tu pago de *$${monto} MXN* ya cayó. ✅\n\n🎫 *Aquí tienes tu Ticket Digital:*\n${urlTicket}\n\n¡Tu pedido entró a bodega! 📦`;

      if (quiereFactura && metadata.rfc !== 'NONE') {
        try {
          const custRes = await fetch('https://www.facturapi.io/v2/customers', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${facturapiAuth}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ legal_name: metadata.razon, tax_id: metadata.rfc, tax_system: metadata.regimen, zip: metadata.cp })
          });
          const clienteSAT = await custRes.json();
          const precioBase = monto / 1.16;
          
          let formaPago = "04"; // Tarjeta por defecto
          if (session.payment_method_types.includes('oxxo')) formaPago = "01";
          
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
          if (invRes.ok) msg += `\n\n🧾 *Tu Factura 4.0 ya está timbrada.*\nhttps://www.facturapi.io/v2/invoices/${factura.id}/pdf`;
          else msg += `\n\n⚠️ El SAT rebotó un dato. El Patrón lo revisa.`;
        } catch (e) {
          msg += `\n\n⚠️ Intermitencia con el SAT. Te mando tu factura más tarde.`;
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
// 💬 WEBHOOK WHATSAPP (CON ENRUTADOR INTELIGENTE)
// ==========================================
async function handleWhatsappWebhook(body: any) {
  const mensajeInfo = body.entry[0].changes[0].value.messages[0];
  if (mensajeInfo.type !== 'text') return;

  const tel = mensajeInfo.from;
  const msgCliente = mensajeInfo.text.body;
  const nombreWA = body.entry[0].changes[0].value.contacts[0].profile.name || '';
  console.log(`💬 [${tel}]: "${msgCliente}"`);

  // 🛑 1. EL SWITCH INTELIGENTE: ENRUTADOR Y BALANCEO DE CARGAS DE TUS 3 AGENTES
  try {
    const decision = await determineRouting(tel, "WHATSAPP");

    if (decision.action === "ROUTE_TO_AGENT") {
      let currentConvoId = decision.conversationId;

      // Si es un cliente VIP nuevo, el enrutador eligió un agente pero no hay chat abierto aún.
      if (!currentConvoId && decision.agentId) {
        const nuevaConvo = await prisma.waConversation.create({
          data: {
            contactPhone: tel,
            isOpen: true,
            employeeId: decision.agentId, 
            lastMessage: msgCliente,
            lastMessageAt: new Date()
          }
        });
        currentConvoId = nuevaConvo.id;
        console.log(`✨ Nuevo chat VIP asignado al agente: ${decision.agentId}`);
      }

      if (currentConvoId) {
        console.log(`👤 ${decision.reason} IA silenciada para ${tel}`);
        
        // Guardamos el mensaje en la BD para que el agente humano lo vea en su pantalla CRM
        await prisma.$transaction([
          prisma.waMessage.create({
            data: { conversationId: currentConvoId, role: "CLIENT", body: msgCliente, isRead: false },
          }),
          prisma.waConversation.update({
            where: { id: currentConvoId },
            data:  { lastMessage: msgCliente, lastMessageAt: new Date() },
          }),
        ]);

        // ¡Hacemos RETURN para matar la ejecución! La IA de OpenAI NO se dispara.
        return;
      }
    }
  } catch (error) {
    console.error("⚠️ Error consultando Prisma para el CRM / Enrutador:", error);
    // Si falla el enrutador, permitimos que siga el flujo hacia Redis/El Coyote
  }

  // 🤖 2. SI LLEGA AQUÍ, NO HAY AGENTE. EL COYOTE (IA) TOMA EL CONTROL.
  const redis = getRedis();
  const msgLower = msgCliente.trim().toLowerCase();

  // ── COMANDOS ADMIN (Solo Jack el dueño) ──────────────
  if (msgLower === 'soy jack' || msgLower === 'soy jack.') {
    await enviarWhatsapp(tel, 'Hola Patrón Jack, ¿te puedes verificar? 🔒');
    return;
  }
  if (msgLower === 'elcoyote56') {
    const h = await getHistorial(redis, tel);
    h.push({ role: 'user', content: msgCliente });
    h.push({ role: 'assistant', content: '🐺 ¡Órdenes recibidas Patrón! Modo Administrador activo. ¿Qué cambiamos?' });
    await saveHistorial(redis, tel, h);
    await enviarWhatsapp(tel, '🐺 ¡Órdenes recibidas Patrón Jack! Modo Administrador activo.\n\nPuedes cambiar CUALQUIER cosa de mi programación:\n• Precios y productos (agregar/quitar)\n• Mi personalidad, tono y forma de hablar\n• Frases, emojis, reglas\n• Promociones activas\n• Avisos para todos los clientes\n• ¡Lo que se te ocurra!\n\n¿Qué hacemos?');
    return;
  }

  // Trigger "coyote"
  const esSoloCoyote = /^\s*coyote[\s!?.]*$/i.test(msgCliente.trim());
  if (esSoloCoyote) {
    const cfg = await getConfigBot(redis);
    const respuestaCoyote = `🐺 ¡Aquí estoy! ${cfg.nombreBot} nunca duerme. ¿En qué te puedo ayudar?`;
    const h = await getHistorial(redis, tel);
    h.push({ role: 'user', content: msgCliente });
    h.push({ role: 'assistant', content: respuestaCoyote });
    await saveHistorial(redis, tel, h);
    await enviarWhatsapp(tel, respuestaCoyote);
    return;
  }

  // ── PERFIL DEL CLIENTE ───────────────────────
  let perfil = await getCliente(redis, tel);
  const config = await getConfigBot(redis);

  if (!perfil) {
    perfil = {
      nombre: '', genero: 'unknown', telefono: tel,
      primerContacto: new Date().toISOString(), ultimoContacto: new Date().toISOString(),
      totalCompras: 0, montoAcumulado: 0, productosComprados: [],
      direccionEnvio: '', cpFiscal: '', metodoPagoFavorito: '', requiereFrecuenteFactura: false, notas: '',
      preferencias: [], etapaAbandono: null, recordatoriosPendientes: []
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

    const tratamiento = perfil.genero === 'mujer'
      ? config.frasesDesignacionMujer[0]
      : config.frasesDesignacionHombre[0];
    const saludo = perfil.genero === 'mujer'
      ? `¡Un placer, ${perfil.nombre}! 🌟 ¿En qué te puedo ayudar hoy?`
      : `¡Mucho gusto, ${perfil.nombre}! ${config.emojisPrincipales} ¿En qué te puedo ayudar hoy?`;
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

  // Combinar productos base + productos extra de la configuración
  const bodegaCompleta: typeof PRECIOS_DEFAULT = { ...bodega };
  for (const pe of config.productosExtra) {
    bodegaCompleta[pe.nombre.toLowerCase()] = { menudeo: pe.menudeo, mayoreo: pe.mayoreo, info: pe.info };
  }

  const PRECIOS_ACTUALES = Object.entries(bodegaCompleta)
    .map(([name, p]) => `- ${name.toUpperCase()}: $${p.menudeo}/kg menudeo | $${p.mayoreo}/kg mayoreo | rollo 25kg = $${p.mayoreo * 25}. ${p.info}`)
    .join('\n');

  const alertaDireccion = perfil.direccionEnvio
    ? `⚠️ DIRECCIÓN GUARDADA: "${perfil.direccionEnvio}". Confirma si sigue siendo correcta.`
    : `⚠️ SIN DIRECCIÓN. Pídela antes de calcular envío: "¿A qué dirección te enviamos? (calle, número, colonia, ciudad y CP)"`;

  const resumenCliente = `
PERFIL:
- Nombre: ${perfil.nombre} | Género: ${perfil.genero}
- Compras: ${perfil.totalCompras} | Total gastado: $${perfil.montoAcumulado} MXN
- Productos comprados: ${perfil.productosComprados.join(', ') || 'ninguno'}
- ${alertaDireccion}
- CP Fiscal: ${perfil.cpFiscal || 'no registrado'}
- Método de pago: ${perfil.metodoPagoFavorito || 'no registrado'}
- Requiere factura frecuente: ${perfil.requiereFrecuenteFactura ? 'SÍ' : 'NO'}
- Notas: ${perfil.notas || 'ninguna'}
`.trim();

  // ─────────────────────────────────────────────────────────────────────────────
  // 🎛️ PROMPT DINÁMICO — CONSTRUIDO 100% DESDE LA CONFIG DEL COYOTE
  // ─────────────────────────────────────────────────────────────────────────────
  const promocionesTexto = config.promocionesActivas.length > 0
    ? `\n🎯 PROMOCIONES ACTIVAS (menciónalas cuando sea relevante):\n${config.promocionesActivas.map(p => `• ${p.nombre}: ${p.descripcion} — ${p.descuento} (${p.vigencia})`).join('\n')}`
    : '';

  const avisoTexto = config.avisoGeneral
    ? `\n⚠️ AVISO GENERAL PARA TODOS LOS CLIENTES: ${config.avisoGeneral}`
    : '';

  const infoPagosTexto = config.infoPagos
    ? `\n💳 INSTRUCCIONES EXTRA DE PAGO: ${config.infoPagos}`
    : '';

  const infoEnviosTexto = config.infoEnvios
    ? `\n🚚 INSTRUCCIONES EXTRA DE ENVÍOS: ${config.infoEnvios}`
    : '';

  const instruccionesExtra = config.instruccionesEspeciales
    ? `\n📌 INSTRUCCIONES ESPECIALES DEL PATRÓN (prioridad máxima, seguirlas siempre):\n${config.instruccionesEspeciales}`
    : '';

  const CONTEXTO_VENDEDOR = `
ERES "${config.nombreBot}", UN AGENTE DE IA DE VENTAS Y ATENCIÓN AL CLIENTE DE COYOTE TEXTIL OPERANDO POR WHATSAPP.

🎯 PERSONALIDAD Y TONO:
${config.tono}
- Máximo ${config.maximoLineasRespuesta} líneas por respuesta. Directo, sin rodeos.
- Para hombres usa: ${config.frasesDesignacionHombre.join(', ')} o su nombre.
- Para mujeres usa: ${config.frasesDesignacionMujer.join(', ')} o su nombre.
- Emojis característicos: ${config.emojisPrincipales}
- Horario de atención que debes mencionar: ${config.horarioAtencion}

🚫 FRASES PROHIBIDAS — NUNCA las uses:
${config.fraseProhibidas.map(f => `• "${f}"`).join('\n')}
${instruccionesExtra}
${avisoTexto}
${promocionesTexto}

📋 FUNCIONES PRINCIPALES:
1. Gestionar conversaciones, responder inmediato y orientado a acción.
2. Cotizar y vender telas (ver catálogo abajo).
3. Calcular envíos con el comando CALCULAR_ENVIO.
4. Generar cobros con Stripe.
5. Generar reportes, campañas, recordatorios y reactivar clientes.
6. Personalizar cada interacción según el perfil del cliente.

REGLAS DE PRODUCTO:
- Todo se vende por kilo.
- Un rollo = exactamente 25kg.
- Menudeo: menos de 25kg. Mayoreo: 25kg o más.
- Precio rollo completo = precio mayoreo × 25. Siempre muéstralo calculado.
- Empuja el rollo completo porque el precio baja.

🗺️ FLUJO DE VENTA OBLIGATORIO:
1. COTIZACIÓN → 2. DIRECCIÓN DE ENVÍO → 3. TOTAL CON ENVÍO → 4. FACTURA → 5. MÉTODO DE PAGO → 6. COBRO

🎨 COLORES (Micro Piqué / Piqué Vera / Micro Panal / Torneo):
Blanco, ${COLORES_STOCK}
- Siempre pregunta por color antes de cotizar estas 4 telas.
- Si piden la carta: PEGA LA LISTA COMPLETA aquí mismo, nunca digas "te la mando".
- Si piden blanco: confirma y menciona Perla, Hueso, Celeste, Gris baby, Rosa baby.

⚡ REGLA DE ACCIÓN INMEDIATA:
Si ya tienes producto + cantidad + CP de envío → USA CALCULAR_ENVIO YA. No esperes.

🚨 PAGOS:
Solo Stripe verifica pagos. Si dicen "ya pagué" → "¡Perfecto! En cuanto Stripe confirme te aviso y tu pedido pasa a bodega. 🐺📦"

🎯 CIERRE DE CONVERSACIÓN:
"${config.fraseCierre}"
"${config.fraseIncondicional}"
${config.mensajePromoFinal ? `Añade también: "${config.mensajePromoFinal}"` : ''}
${infoPagosTexto}
${infoEnviosTexto}

💰 COMANDO COBRO (NUEVO CON STRIPE):
GENERAR_COBRO|metodo(tarjeta/oxxo)|monto_total|rfc|razon_social|cp_fiscal|regimen|uso
Sin factura: GENERAR_COBRO|tarjeta|1500|NONE|NONE|NONE|NONE|NONE

🚚 COMANDO ENVÍO:
CALCULAR_ENVIO|productos=[{"nombre":"producto","kg":cantidad}]|cp=12345

📊 OTROS COMANDOS:
GENERAR_REPORTE|tipo|formato
ENVIAR_CAMPANA|segmento|mensaje
PROGRAMAR_RECORDATORIO|telefono|fecha|mensaje
REACTIVAR|telefono|etapa
ESCALAR|descripcion

⚠️ CP DE ENVÍO ≠ CP FISCAL. NUNCA los mezcles.
Si requiere factura frecuente, ofrécela proactivamente.

REGISTRO INTERNO (invisible para cliente):
DATOS_CLIENTE|direccion:[dir]|cp_fiscal:[cp]|productos:[lista]|notas:[nota]|preferencias:[pref]|cumpleanos:[fecha]|etapa_abandono:[etapa]

CATÁLOGO:
${PRECIOS_ACTUALES}

${resumenCliente}
`;

  // ─────────────────────────────────────────────────────────────────────────────
  // 🎛️ PROMPT JEFE — CUANDO JACK LE DA ÓRDENES A EL COYOTE
  // ─────────────────────────────────────────────────────────────────────────────
  const CONTEXTO_JEFE = `
ERES "EL COYOTE", LA IA DE COYOTE TEXTIL, Y ESTÁS HABLANDO CON JACK, TU CREADOR Y PATRÓN.
Respuestas cortas. "A la orden Patrón", "Al 100 Jefe". Tono de cuate de confianza y mucha lealtad.

Jack puede cambiar ABSOLUTAMENTE TODO de tu comportamiento para TODOS los clientes.
Cuando Jack da una instrucción que cambia el comportamiento global, usa los comandos correspondientes AL FINAL de tu respuesta.

═══════════════════════════════════════
📦 PRECIOS Y CATÁLOGO
═══════════════════════════════════════
Cambiar precio: PRECIO_UPDATE|nombre_producto|menudeo_o_mayoreo|numero
Agregar producto: PRODUCTO_NUEVO|nombre|menudeo|mayoreo|descripcion
Eliminar producto: PRODUCTO_ELIMINAR|nombre

PRECIOS ACTUALES:
${PRECIOS_ACTUALES}

═══════════════════════════════════════
🎛️ CONFIGURACIÓN GLOBAL DEL BOT
(Se aplica a TODOS los clientes inmediatamente)
═══════════════════════════════════════

Cambiar nombre del bot:         CONFIG|nombreBot|NuevoNombre
Cambiar tono/personalidad:        CONFIG|tono|Nueva descripción del tono completa
Cambiar frases para hombre:       CONFIG|frasesHombre|señor, mi estimado.
Cambiar frases para mujer:        CONFIG|frasesMujer|señora, mi estimado.
Cambiar frase de cierre:          CONFIG|fraseCierre|Nueva frase de cierre completa
Cambiar frase final (auuu):       CONFIG|fraseIncondicional|Nueva frase final
Cambiar emojis principales:       CONFIG|emojis|🐺📦💪
Cambiar máx líneas respuesta:     CONFIG|maxLineas|4
Agregar frase prohibida:          CONFIG|agregarProhibida|frase que no debe decir
Quitar frase prohibida:           CONFIG|quitarProhibida|frase a quitar
Agregar instrucción especial:     CONFIG|instruccionEspecial|Texto de la instrucción

Agregar bienvenida:              BIENVENIDA_ADD|Texto completo de la bienvenida
Reemplazar todas las bienvenidas: BIENVENIDA_REPLACE|Texto único de bienvenida

Añadir promoción activa:          PROMO_ADD|NombrePromo|Descripción|Descuento|Vigencia
Quitar promoción:                 PROMO_DEL|NombrePromo

Aviso general a todos:            AVISO|Texto del aviso (o AVISO|BORRAR para quitarlo)
Horario de atención:              CONFIG|horario|Lunes a viernes 9-6pm
Info extra de pagos:              CONFIG|infoPagos|Instrucción extra
Info extra de envíos:             CONFIG|infoEnvios|Instrucción extra
Mensaje promo al cierre:          CONFIG|mensajePromoFinal|Texto de promo

═══════════════════════════════════════
📢 MENSAJES Y CAMPAÑAS
═══════════════════════════════════════
Enviar mensaje directo:  SEND_MSG|5521XXXXXXXX|Mensaje
Enviar campaña:          ENVIAR_CAMPANA|segmento(todos/activos/inactivos)|mensaje
Programar recordatorio:  PROGRAMAR_RECORDATORIO|telefono|fecha|mensaje

═══════════════════════════════════════
📊 REPORTES
═══════════════════════════════════════
GENERAR_REPORTE|tipo(diario/semanal/mensual)|formato(texto/json)

═══════════════════════════════════════
📋 TU CONFIGURACIÓN ACTUAL (CÓMO ESTÁS PROGRAMADO)
═══════════════════════════════════════
Nombre: ${config.nombreBot}
Tono: ${config.tono}
Tratamiento hombre: ${config.frasesDesignacionHombre.join(', ')}
Tratamiento mujer: ${config.frasesDesignacionMujer.join(', ')}
Emojis: ${config.emojisPrincipales}
Máx líneas: ${config.maximoLineasRespuesta}
Horario: ${config.horarioAtencion}
Aviso general: ${config.avisoGeneral || 'ninguno'}
Instrucciones especiales: ${config.instruccionesEspeciales || 'ninguna'}
Promociones activas: ${config.promocionesActivas.length > 0 ? config.promocionesActivas.map(p => p.nombre).join(', ') : 'ninguna'}
Frases prohibidas: ${config.fraseProhibidas.join(' | ')}
Última actualización: ${config.ultimaActualizacion}
`;

  // ── LLAMADA A GPT-4o ─────────────────────────
  const systemPrompt = { role: 'system', content: esElJefe ? CONTEXTO_JEFE : CONTEXTO_VENDEDOR };
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [systemPrompt, ...historial] as any,
    temperature: 0.4,
    max_tokens: 700,
  });

  let respuesta = completion.choices[0].message.content || '';

  // ══════════════════════════════════════════════════
  // 🔧 PROCESADOR DE COMANDOS — CLIENTE NORMAL
  // ══════════════════════════════════════════════════

  // Guardar datos del cliente
  const matchDatos = respuesta.match(/DATOS_CLIENTE\|(.+)/);
  if (matchDatos) {
    respuesta = respuesta.replace(/DATOS_CLIENTE\|.+/g, '').trim();
    const partes = matchDatos[1];
    const dirM  = partes.match(/direccion:([^|]+)/);
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
    // ══════════════════════════════════════════════════
    // 🔧 PROCESADOR DE COMANDOS JACK — TODOS LOS CAMBIOS
    // ══════════════════════════════════════════════════

    // --- PRECIO ---
    const matchPrecio = respuesta.match(/PRECIO_UPDATE\|(.+?)\|(.+?)\|(\d+)/);
    if (matchPrecio) {
      const [, prod, campo, precio] = matchPrecio;
      const ok = await actualizarPrecio(redis, prod.trim().toLowerCase(), campo.trim().toLowerCase() as 'menudeo' | 'mayoreo', parseInt(precio));
      respuesta = respuesta.replace(/PRECIO_UPDATE\|.+/g, '').trim();
      respuesta += ok ? `\n✅ Precio de ${prod} actualizado.` : `\n⚠️ No encontré ese producto, Patrón.`;
    }

    // --- PRODUCTO NUEVO ---
    const matchProdNuevo = respuesta.match(/PRODUCTO_NUEVO\|([^|]+)\|(\d+)\|(\d+)\|(.+)/);
    if (matchProdNuevo) {
      const [, nombre, menudeo, mayoreo, desc] = matchProdNuevo;
      await agregarProducto(redis, nombre.trim(), parseInt(menudeo), parseInt(mayoreo), desc.trim());
      respuesta = respuesta.replace(/PRODUCTO_NUEVO\|.+/g, '').trim();
      respuesta += `\n✅ Producto "${nombre.trim()}" agregado al catálogo. Todos los clientes ya lo pueden ver.`;
    }

    // --- ELIMINAR PRODUCTO ---
    const matchProdElim = respuesta.match(/PRODUCTO_ELIMINAR\|(.+)/);
    if (matchProdElim) {
      const [, nombre] = matchProdElim;
      const ok = await eliminarProducto(redis, nombre.trim());
      respuesta = respuesta.replace(/PRODUCTO_ELIMINAR\|.+/g, '').trim();
      respuesta += ok ? `\n✅ Producto "${nombre.trim()}" eliminado.` : `\n⚠️ No encontré ese producto.`;
    }

    // --- CONFIG GENERAL (campo único) ---
    // Formato: CONFIG|campo|valor
    const matchConfig = respuesta.match(/CONFIG\|([^|]+)\|(.+)/);
    if (matchConfig) {
      const [, campo, valor] = matchConfig;
      respuesta = respuesta.replace(/CONFIG\|[^|]+\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      const campoLower = campo.trim().toLowerCase();

      if (campoLower === 'nombrebot') {
        cfg.nombreBot = valor.trim();
        respuesta += `\n✅ Me he rebautizado como "${valor.trim()}". Aplica a todos.`;
      } else if (campoLower === 'tono') {
        cfg.tono = valor.trim();
        respuesta += `\n✅ Tono actualizado. Hablaré diferente con los clientes desde ya.`;
      } else if (campoLower === 'fraseshombre') {
        cfg.frasesDesignacionHombre = valor.trim().split(',').map(s => s.trim());
        respuesta += `\n✅ Tratamiento para hombres: ${cfg.frasesDesignacionHombre.join(', ')}.`;
      } else if (campoLower === 'frasesmujer') {
        cfg.frasesDesignacionMujer = valor.trim().split(',').map(s => s.trim());
        respuesta += `\n✅ Tratamiento para mujeres: ${cfg.frasesDesignacionMujer.join(', ')}.`;
      } else if (campoLower === 'frasescierre' || campoLower === 'frasecierre') {
        cfg.fraseCierre = valor.trim();
        respuesta += `\n✅ Frase de cierre actualizada.`;
      } else if (campoLower === 'fraseincondicional') {
        cfg.fraseIncondicional = valor.trim();
        respuesta += `\n✅ Frase final de fidelidad actualizada.`;
      } else if (campoLower === 'emojis') {
        cfg.emojisPrincipales = valor.trim();
        respuesta += `\n✅ Emojis de firma actualizados a: ${valor.trim()}`;
      } else if (campoLower === 'maxlineas') {
        cfg.maximoLineasRespuesta = parseInt(valor.trim()) || 4;
        respuesta += `\n✅ Límite de líneas por respuesta: ${cfg.maximoLineasRespuesta}.`;
      } else if (campoLower === 'agregarprohibida') {
        cfg.fraseProhibidas.push(valor.trim());
        respuesta += `\n✅ Frase prohibida agregada: "${valor.trim()}"`;
      } else if (campoLower === 'quitarprohibida') {
        cfg.fraseProhibidas = cfg.fraseProhibidas.filter(f => !f.toLowerCase().includes(valor.trim().toLowerCase()));
        respuesta += `\n✅ Frase prohibida eliminada.`;
      } else if (campoLower === 'instruccionespecial') {
        cfg.instruccionesEspeciales = cfg.instruccionesEspeciales
          ? `${cfg.instruccionesEspeciales}\n- ${valor.trim()}`
          : `- ${valor.trim()}`;
        respuesta += `\n✅ Regla de oro agregada. No la olvidaré.`;
      } else if (campoLower === 'horario') {
        cfg.horarioAtencion = valor.trim();
        respuesta += `\n✅ Horario actualizado: ${valor.trim()}`;
      } else if (campoLower === 'infopagos') {
        cfg.infoPagos = valor.trim();
        respuesta += `\n✅ Info extra de pagos actualizada.`;
      } else if (campoLower === 'infoenvios') {
        cfg.infoEnvios = valor.trim();
        respuesta += `\n✅ Info extra de envíos actualizada.`;
      } else if (campoLower === 'mensajepromofinal') {
        cfg.mensajePromoFinal = valor.trim();
        respuesta += `\n✅ Promo de cierre (gancho) actualizada.`;
      } else {
        respuesta += `\n⚠️ Comando "${campo}" no reconocido.`;
      }

      cfg.actualizadoPor = 'Jack (El Patrón)';
      await saveConfigBot(redis, cfg);
    }

    // --- BIENVENIDA NUEVA ---
    const matchBienvenidaAdd = respuesta.match(/BIENVENIDA_ADD\|(.+)/);
    if (matchBienvenidaAdd) {
      const [, texto] = matchBienvenidaAdd;
      respuesta = respuesta.replace(/BIENVENIDA_ADD\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.frasesBienvenida.push(texto.trim());
      cfg.actualizadoPor = 'Jack (El Patrón)';
      await saveConfigBot(redis, cfg);
      respuesta += `\n✅ Bienvenida agregada. Ahora tengo ${cfg.frasesBienvenida.length} versiones.`;
    }

    const matchBienvenidaReplace = respuesta.match(/BIENVENIDA_REPLACE\|(.+)/);
    if (matchBienvenidaReplace) {
      const [, texto] = matchBienvenidaReplace;
      respuesta = respuesta.replace(/BIENVENIDA_REPLACE\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.frasesBienvenida = [texto.trim()];
      cfg.actualizadoPor = 'Jack (El Patrón)';
      await saveConfigBot(redis, cfg);
      respuesta += `\n✅ Bienvenida única reemplazada.`;
    }

    // --- AVISO GENERAL ---
    const matchAviso = respuesta.match(/AVISO\|(.+)/);
    if (matchAviso) {
      const [, texto] = matchAviso;
      respuesta = respuesta.replace(/AVISO\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.avisoGeneral = texto.trim() === 'BORRAR' ? '' : texto.trim();
      cfg.actualizadoPor = 'Jack (El Patrón)';
      await saveConfigBot(redis, cfg);
      respuesta += texto.trim() === 'BORRAR'
        ? `\n✅ Aviso general borrado.`
        : `\n✅ Aviso general activado. Se lo diré a todos.`;
    }

    // --- PROMO NUEVA ---
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

    // --- QUITAR PROMO ---
    const matchPromoDel = respuesta.match(/PROMO_DEL\|(.+)/);
    if (matchPromoDel) {
      const [, nombre] = matchPromoDel;
      respuesta = respuesta.replace(/PROMO_DEL\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.promocionesActivas = cfg.promocionesActivas.filter(p => !p.nombre.toLowerCase().includes(nombre.trim().toLowerCase()));
      cfg.actualizadoPor = 'Jack (El Patrón)';
      await saveConfigBot(redis, cfg);
      respuesta += `\n✅ Promoción "${nombre.trim()}" desactivada.`;
    }

    // --- ENVIAR MENSAJE DIRECTO ---
    const matchMsj = respuesta.match(/SEND_MSG\|([^|]+)\|(.+)/);
    if (matchMsj) {
      let [, targetNum, targetTxt] = matchMsj;
      targetNum = targetNum.replace(/\D/g, '');
      respuesta = respuesta.replace(/SEND_MSG\|.+/g, '').trim();
      const ok = await enviarWhatsapp(targetNum, targetTxt.trim());
      respuesta += ok ? `\n✅ Mensaje disparado al ${targetNum}.` : `\n⚠️ Meta rechazó el envío al ${targetNum}.`;
    }

    // --- REPORTES ---
    const matchReporte = respuesta.match(/GENERAR_REPORTE\|(.+?)\|(.+)/);
    if (matchReporte) {
      const [, tipo, formato] = matchReporte;
      respuesta = respuesta.replace(/GENERAR_REPORTE\|.+/g, '').trim();
      respuesta += `\n📊 Reporte ${tipo} en formato ${formato} generado (simulado por ahora).`;
    }

    // --- CAMPAÑAS ---
    const matchCampana = respuesta.match(/ENVIAR_CAMPANA\|(.+?)\|(.+)/);
    if (matchCampana) {
      const [, segmento, mensaje] = matchCampana;
      respuesta = respuesta.replace(/ENVIAR_CAMPANA\|.+/g, '').trim();
      respuesta += `\n📢 Campaña enviada a "${segmento}": "${mensaje}" (simulado por ahora).`;
    }

  } else {
    // ── COMANDOS PARA CLIENTES NORMALES ──────────────

    // Calcular envío
    const matchEnvio = respuesta.match(/CALCULAR_ENVIO\|productos=\[(.+?)\]\|cp=(.+)/i);
    if (matchEnvio) {
      const [, productosStr, cpEnvio] = matchEnvio;
      respuesta = respuesta.replace(/CALCULAR_ENVIO\|.+/g, '').trim();
      try {
        const productos: ProductoEnvio[] = JSON.parse(`[${productosStr}]`);
        const resultado = calcularEnvioReal(productos, cpEnvio.trim(), 0, false);
        respuesta += `\n\n${resultado.desglose}\n\n¿Te parece bien? Si requieres factura avísame para sumar el IVA.`;
      } catch (e) {
        respuesta += `\n\n⚠️ No pude calcular el envío. Verifica los datos e inténtalo de nuevo.`;
      }
    }

    // Reactivar
    const matchReactivar = respuesta.match(/REACTIVAR\|(.+?)\|(.+)/i);
    if (matchReactivar) {
      respuesta = respuesta.replace(/REACTIVAR\|.+/g, '').trim();
      respuesta += `\n🔄 Iniciando reactivación.`;
    }

    // Recordatorio
    const matchRecordatorio = respuesta.match(/PROGRAMAR_RECORDATORIO\|(.+?)\|(.+?)\|(.+)/i);
    if (matchRecordatorio) {
      respuesta = respuesta.replace(/PROGRAMAR_RECORDATORIO\|.+/g, '').trim();
      respuesta += `\n⏰ Recordatorio programado.`;
    }

    // Escalar
    const matchEscalar = respuesta.match(/ESCALAR\|(.+)/i);
    if (matchEscalar) {
      const [, duda] = matchEscalar;
      console.log(`🆘 ESCALAMIENTO: ${duda}`);
      respuesta = respuesta.replace(/ESCALAR\|.+/g, '').trim();
      respuesta += `\n🆘 He notificado a mis compañeros humanos. En breve te atenderán.`;
    }

    // 🐺 Generar cobro (AHORA CON STRIPE)
    const matchCobro = respuesta.match(/GENERAR_COBRO\|(.+?)\|([\d.]+)\|(.+?)\|(.+?)\|(.+?)\|(.+?)\|(.+)/i);
    if (matchCobro) {
      const [, metodo, monto, rfc, razon, cp, regimen, uso] = matchCobro;
      respuesta = respuesta.replace(/GENERAR_COBRO\|.+/g, '').trim();
      const reqInvoice = rfc !== 'NONE' ? 'YES' : 'NO';
      const amountInCents = Math.round(parseFloat(monto) * 100);

      try {
        // Stripe Checkout Session (Soporta Tarjeta y OXXO nativo)
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card', 'oxxo'], 
          line_items: [{
            price_data: {
              currency: 'mxn',
              product_data: { name: 'Pedido Coyote Textil por WhatsApp' },
              unit_amount: amountInCents,
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: 'https://wa.me/5215627301525', // Los regresa al chat de WhatsApp
          metadata: { rfc, razon, cp, regimen, uso, req_invoice: reqInvoice, phone: tel, productos: perfil.productosComprados.join(',') }
        });

        respuesta += `\n\n💳 *Link de Pago Seguro (Tarjeta u OXXO):*\n${session.url}\n\n_Tu dinero está blindado por Stripe. 🐺_`;
      } catch (err) {
        console.error('Error Stripe:', err);
        respuesta += `\n\n⚠️ Problema al generar el link. El Patrón lo revisa en breve.`;
      }
    }
  }

  // ── GUARDAR Y RESPONDER ──────────────────────
  historial.push({ role: 'assistant', content: respuesta });
  await saveHistorial(redis, tel, historial);
  await enviarWhatsapp(tel, respuesta.trim());
}

// ==========================================
// 🚦 ROUTER PRINCIPAL (SEGURIDAD AUMENTADA)
// ==========================================
export async function POST(req: Request) {
  try {
    // 1. Extraemos el cuerpo crudo (Stripe lo exige para validar firmas)
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    // 2. Si trae la firma de Stripe, lo mandamos al motor de Stripe
    if (signature) {
      return await handleStripeWebhook(rawBody, signature);
    }

    // 3. Si no es Stripe, lo parseamos como JSON normal (Meta/WhatsApp)
    let body;
    try { body = JSON.parse(rawBody); } catch (e) { return NextResponse.json({ error: 'JSON Invalido' }, { status: 400 }); }

    const esWhatsapp = Array.isArray(body.entry) && body.entry[0]?.changes?.[0]?.value?.messages;
    if (esWhatsapp) {
      await handleWhatsappWebhook(body);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ ERROR:', error);
    return new NextResponse('Error procesando webhook', { status: 500 });
  }
}

// Verificación de META (WhatsApp)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (
    searchParams.get('hub.mode') === 'subscribe' &&
    searchParams.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new NextResponse(searchParams.get('hub.challenge'), { status: 200 });
  }
  return new NextResponse('Acceso denegado', { status: 403 });
}