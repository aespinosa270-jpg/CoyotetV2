import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Redis } from '@upstash/redis';
import Stripe from 'stripe';
import { prisma } from "@/lib/prisma";
import { determineRouting } from "@/lib/crm-router";
import { createTrace } from "@/lib/tracer";

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
// ⏱️ TIMEOUT DE AGENTE — 15 MINUTOS
// ==========================================
const AGENT_SILENCE_TIMEOUT_MS = 15 * 60 * 1000;

async function agentEstaActivo(conversationId: string): Promise<boolean> {
  try {
    const ultimoMensajeAgente = await prisma.waMessage.findFirst({
      where: { conversationId, role: "AGENT" },
      orderBy: { sentAt: "desc" },
    });
    if (!ultimoMensajeAgente) return false;
    const silencioMs = Date.now() - new Date(ultimoMensajeAgente.sentAt).getTime();
    const agenteActivo = silencioMs < AGENT_SILENCE_TIMEOUT_MS;
    if (!agenteActivo) {
      console.log(`⏱️ Agente silencioso por ${Math.round(silencioMs / 60000)} min. Bot retoma.`);
    }
    return agenteActivo;
  } catch (err) {
    console.error("⚠️ Error verificando actividad del agente:", err);
    return false;
  }
}

// ==========================================
// 🏦 DATOS SPEI
// ==========================================
const SPEI_CUENTAS = [
  { banco: "BBVA",      clabe: "012180015657512129", beneficiario: "Jack Rizk Cabrera" },
  { banco: "Santander", clabe: "014180606262821861", beneficiario: "Jack Rizk Cabrera" },
  { banco: "Banamex",   clabe: "002180702340784354", beneficiario: "Jack Rizk Cabrera" },
];

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
  tono: `Vendedor consultivo de alto rendimiento. Siempre hablar de "usted". 
Tono: profesional con energía y dinamismo B2B. Directo, resolutivo y con urgencia comercial genuina.
Estilo: frases cortas y contundentes. Cada mensaje debe empujar hacia el cierre.
PROHIBIDO: tutear al cliente, lenguaje coloquial, frases de relleno ("con gusto", "por supuesto", "claro que sí").
OBLIGATORIO: precio en cada cotización, propuesta concreta al final de cada mensaje, costo por prenda cuando aplique.`,
  frasesBienvenida: [
    'Bienvenido a *Coyote Textil*. Soy *El Coyote* 🐺, su asesor especializado disponible 24/7.\n\nPara darle una atención precisa, ¿con quién tengo el gusto?\n\n📋 Términos: https://www.coyotetextil.com/terms\n🔒 Privacidad: https://www.coyotetextil.com/privacy'
  ],
  frasesDesignacionHombre: ['señor', 'estimado', 'licenciado'],
  frasesDesignacionMujer: ['señora', 'señorita', 'estimada'],
  fraseCierre: 'Vestimos la fuerza de México en cada hilo. Ha sido un placer atenderle — El Coyote y todo el equipo de Coyote Textil quedan a su entera disposición. 🐺',
  fraseIncondicional: 'Nuestras operaciones no se detienen. Soy El Coyote y permanezco siempre activo para respaldar la logística de su negocio, a cualquier hora. 🐺',
  emojisPrincipales: '🐺📦🤝',
  maximoLineasRespuesta: 4,
  fraseProhibidas: [
    'Te enviaré los detalles', 'Enviaré la cotización', 'Procederé',
    '¿Algo más en lo que pueda asistirte?', 'te mando', 'te envío', 'te hago llegar',
    'tú', 'oye', 'dale', 'órale',
    'patrón', 'patrona', 'jefe', 'cuate', 'chambeando', 'desvielado', 'jalando',
    'Como asistente de IA', 'Como IA', 'soy una inteligencia artificial', 'soy un bot', 'soy un asistente virtual',
    'Con gusto le ayudo', 'Déjeme revisar', 'Por supuesto', 'Claro que sí',
    '¿En qué más le puedo ayudar?',
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
  correoElectronico?: string;
  correoVerificado?: boolean;
  privacidadAceptada?: boolean;
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
  temperaturaCompra?: number;
  patronCompra?: string;
  prediccionSiguientePedido?: string;
  tacticaActual?: string;
  resumenSemantico?: string;
  vectorObjeciones?: Record<string, number>;
  ultimaObjecionResuelta?: string;
  propensionCross?: { hilos: number; elasticos: number; volumenExtra: number };
  nivelConfianza?: number;
  diasEntreCompras?: number;
  ultimaFechaCompra?: string;
  terminosAceptados?: boolean;
  membresiaOfrecida?: boolean;
  tieneSuscripcion?: boolean;
  planMembresia?: string;
}

interface PedidoRegistro {
  fecha: string;
  productos: string;
  monto: number;
  metodo: string;
  conFactura: boolean;
}

// ==========================================
// 🧠 MOTOR DE APRENDIZAJE
// ==========================================
async function analizarPatronesCliente(
  redis: Redis,
  perfil: ClientePerfil,
  msgActual: string,
  historial: Array<{ role: string; content: string }>
): Promise<ClientePerfil> {
  const senalesCalientes = [
    /cuánto cuesta|precio|cuanto vale|cotiz|presupuesto/i,
    /quiero|necesito|me interesa|me llevo|pedido/i,
    /cuándo llega|tiempo de entrega|envío|flete/i,
    /pago|tarjeta|oxxo|spei|transferencia|deposito/i,
    /disponible|tienen en stock|hay en/i,
    /metro|kilo|rollo|pieza|cono|caja/i,
  ];
  const senalesFrias = [
    /solo viendo|nada más|solo pregunto|para saber/i,
    /muy caro|no tengo|sin dinero|ahorita no/i,
    /lo pienso|después|mañana|luego/i,
  ];

  let delta = 0;
  for (const s of senalesCalientes) if (s.test(msgActual)) delta += 15;
  for (const s of senalesFrias) if (s.test(msgActual)) delta -= 20;
  if (perfil.ultimaCotizacion) delta += 10;
  if (perfil.direccionEnvio) delta += 8;
  if (perfil.etapaAbandono === 'pago') delta -= 10;

  const tempAnterior = perfil.temperaturaCompra ?? 30;
  perfil.temperaturaCompra = Math.min(100, Math.max(0, Math.round(tempAnterior * 0.7 + (tempAnterior + delta) * 0.3)));

  if (perfil.temperaturaCompra >= 70) perfil.tacticaActual = 'cierre_directo';
  else if (perfil.temperaturaCompra >= 50) perfil.tacticaActual = 'urgencia_escasez';
  else if ((perfil.objecionesComunes?.length ?? 0) > 1) perfil.tacticaActual = 'manejo_objecion';
  else if (perfil.totalCompras === 0) perfil.tacticaActual = 'social_proof';
  else if (perfil.totalCompras >= 3) perfil.tacticaActual = 'fidelizacion_vip';
  else perfil.tacticaActual = 'valor_rendimiento';

  if (perfil.productosFavoritos && perfil.productosFavoritos.length > 0) {
    const favorito = perfil.productosFavoritos[0];
    const diasDesde = perfil.ultimaFechaCompra
      ? Math.floor((Date.now() - new Date(perfil.ultimaFechaCompra).getTime()) / 86400000)
      : 999;
    const ciclo = perfil.diasEntreCompras ?? 30;
    if (diasDesde >= ciclo * 0.8) {
      perfil.prediccionSiguientePedido = `Pronto pedirá ${favorito} (ciclo ${ciclo} días, van ${diasDesde} días)`;
    }
  }

  if (!perfil.propensionCross) perfil.propensionCross = { hilos: 20, elasticos: 10, volumenExtra: 15 };
  const pidioTela = /tela|piqué|panal|torneo|kyoto|athlos|brock|apolo|horous|micro|sportok|felpa|flanel|polar/i.test(msgActual);
  const pidioUniforme = /uniforme|deportiv|pants|short|pantalon|sudadera/i.test(msgActual);
  if (pidioTela) perfil.propensionCross.hilos = Math.min(90, perfil.propensionCross.hilos + 25);
  if (pidioUniforme) perfil.propensionCross.elasticos = Math.min(90, perfil.propensionCross.elasticos + 30);

  const mensajesPositivos = historial.filter(m =>
    m.role === 'user' && /gracias|perfecto|excelente|muy bien|de acuerdo|listo/i.test(m.content)
  ).length;
  const mensajesNegativos = historial.filter(m =>
    m.role === 'user' && /caro|no me convence|lo pienso|otro proveedor|más barato/i.test(m.content)
  ).length;
  perfil.nivelConfianza = Math.min(100, Math.max(0,
    (perfil.nivelConfianza ?? 40) + (mensajesPositivos * 5) - (mensajesNegativos * 8)
  ));

  if (perfil.totalCompras >= 2 && perfil.ultimaFechaCompra && perfil.primerContacto) {
    const diasTotal = (new Date(perfil.ultimaFechaCompra).getTime() - new Date(perfil.primerContacto).getTime()) / 86400000;
    perfil.diasEntreCompras = Math.round(diasTotal / (perfil.totalCompras - 1));
    const favs = perfil.productosFavoritos?.slice(0, 2).join(' + ') || 'varios';
    perfil.patronCompra = `Compra cada ~${perfil.diasEntreCompras} días. Favorito: ${favs}. Ticket promedio: $${perfil.ticketPromedio?.toFixed(0) || 'N/A'}`;
  }

  await saveCliente(redis, perfil.telefono, perfil);
  return perfil;
}

async function generarResumenSemantico(
  historial: Array<{ role: string; content: string }>,
  perfil: ClientePerfil
): Promise<string> {
  if (historial.length < 10) return '';
  const mod = historial.length % 20;
  if (mod !== 0 && mod !== 1) return perfil.resumenSemantico || '';
  try {
    const ultimos = historial.slice(-40).map(m => `${m.role === 'user' ? 'Cliente' : 'Coyote'}: ${m.content}`).join('\n');
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Eres un extractor de memoria para un bot de ventas textil. Resume en 5 líneas máximo los puntos clave de esta conversación: qué quiso comprar, qué objeciones tuvo, en qué etapa quedó, qué cotizaciones se dieron, y cualquier dato crítico del cliente. SÉ MUY CONCRETO. No uses bullet points.\n\nConversación:\n${ultimos}`
      }],
      max_tokens: 200,
      temperature: 0,
    });
    return res.choices[0].message.content?.trim() || '';
  } catch { return perfil.resumenSemantico || ''; }
}

function detectarIntencionPago(
  msgCliente: string,
  historial: Array<{ role: string; content: string }>
): { detectado: boolean; metodo: 'tarjeta' | 'oxxo' | null; montoEstimado: number | null } {
  const quereTarjeta = /tarjeta|visa|mastercard|crédito|débito|card/i.test(msgCliente);
  const quereOxxo = /oxxo|efectivo/i.test(msgCliente);
  const quereSpei = /spei|transferencia|depósito|deposito|clabe/i.test(msgCliente);
  const intenciones = [
    /\b(pago|pagar|pa[gq]ue|quiero pagar|cómo pago|link de pago|mándame el link|manda el link|mándame el cobro)\b/i,
    /\b(le entro|cerramos|lo quiero|me lo llevo|apártame|apartame)\b/i,
    /\b(cuánto|cuanto) (me cobras|es|total|debo|pago)\b/i,
  ];
  const detectado = intenciones.some(r => r.test(msgCliente)) && !quereSpei;
  if (!detectado) return { detectado: false, metodo: null, montoEstimado: null };
  const metodo = quereTarjeta ? 'tarjeta' : quereOxxo ? 'oxxo' : 'tarjeta';
  let montoEstimado: number | null = null;
  for (let i = historial.length - 1; i >= 0; i--) {
    const m = historial[i];
    if (m.role === 'assistant') {
      const matchTotal = m.content.match(/TOTAL[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
      const matchMonto = m.content.match(/\$\s*([\d,]+(?:\.\d{2})?)\s*MXN/i);
      const raw = matchTotal?.[1] || matchMonto?.[1];
      if (raw) { montoEstimado = parseFloat(raw.replace(/,/g, '')); break; }
    }
  }
  return { detectado, metodo, montoEstimado };
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
  const totalKilos = productos.reduce((acc, p) => acc + p.kg, 0);
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
📦 *Desglose de su cotización*
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
  cliente.ultimaFechaCompra = pedido.fecha;
  cliente.metodoPagoFavorito = pedido.metodo;
  if (pedido.conFactura) cliente.requiereFrecuenteFactura = true;
  cliente.ticketPromedio = cliente.montoAcumulado / cliente.totalCompras;
  if (cliente.totalCompras === 1) cliente.segmento = 'nuevo';
  else if (cliente.totalCompras >= 5 || cliente.montoAcumulado >= 10000) cliente.segmento = 'vip';
  else cliente.segmento = 'recurrente';
  cliente.intentosDePago = 0;
  cliente.etapaAbandono = null;
  cliente.temperaturaCompra = 20;
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
// 🏆 VERIFICAR MEMBRESÍA DE SOCIO
// ==========================================
async function verificarMembresia(tel: string): Promise<{ activa: boolean; plan?: string }> {
  try {
    const user = await prisma.user.findFirst({ where: { phone: tel } });
    if (!user) return { activa: false };
    const sub = await (prisma as any).subscription?.findFirst?.({
      where: {
        userId: user.id,
        status: { in: ['active', 'ACTIVA', 'ACTIVE', 'VIGENTE'] },
      },
    });
    return { activa: !!sub, plan: sub?.plan || sub?.type || 'Socio Coyote' };
  } catch {
    return { activa: false };
  }
}

// ==========================================
// 🏪 BODEGA — TELAS (precio por KILO, rollo = 25 kg)
// ==========================================
const PRECIOS_TELAS_DEFAULT: Record<string, { menudeo: number; mayoreo: number; info: string }> = {
  "alaska":               { menudeo: 175, mayoreo: 170, info: "100% Poliéster 140g. Sublimación de alta definición. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "andromeda":            { menudeo: 155, mayoreo: 150, info: "100% Poliéster 140g. Sublimación premium. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "apolo":                { menudeo: 160, mayoreo: 155, info: "100% Poliéster 150g. Resistencia superior anti-pilling. Rend. 3.7m/kg. Ancho 1.60m. Color único por rollo." },
  "ares":                 { menudeo: 135, mayoreo: 130, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "athlos":               { menudeo: 125, mayoreo: 120, info: "100% Poliéster 145g. Versatilidad total. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "azucena":              { menudeo: 95,  mayoreo: 90,  info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "brock":                { menudeo: 155, mayoreo: 150, info: "100% Poliéster 145g. Versatilidad total. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "brush":                { menudeo: 120, mayoreo: 115, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "capriati":             { menudeo: 135, mayoreo: 130, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "caprice":              { menudeo: 140, mayoreo: 135, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "delta":                { menudeo: 175, mayoreo: 170, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "f30":                  { menudeo: 135, mayoreo: 130, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "granizo":              { menudeo: 115, mayoreo: 110, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "horous":               { menudeo: 160, mayoreo: 155, info: "100% Poliéster 145g. Moda deportiva urbana. Rend. 4.2m/kg. Ancho 1.60m. Color único por rollo." },
  "inter 70":             { menudeo: 140, mayoreo: 135, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "kyoto":                { menudeo: 155, mayoreo: 150, info: "100% Poliéster 145g. Tacto seda, caída premium. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "madelino":             { menudeo: 155, mayoreo: 150, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "micro estrella":       { menudeo: 145, mayoreo: 140, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "micro panal":          { menudeo: 110, mayoreo: 105, info: "100% Poliéster 145g. Máxima transpiración y ligereza. Rend. 4.3m/kg. Ancho 1.60m. +40 colores: Blanco, Negro, Rojo, Azul Rey, Navy Blue, Oxford, Gris Medio, Perla, Vino, Fiusha, Menta, Aqua, Turquesa, Verde Bandera, Verde Botella, Verde Militar, Canario, Mango, Mostaza, Naranja, Naranja Neón, Verde Neón, Amarillo Neón, Rosa Neón, Rosa Baby, Palo de Rosa, Rosa Pastel, Lila, Uva, Petróleo, Cielo, Magenta, Camel, Kaki, Oro Viejo, Gris Baby, Azul Francia, Light Blue, Botella, Medio." },
  "micropique":           { menudeo: 100, mayoreo: 95,  info: "100% Poliéster 145g. Dry-Fit alto rendimiento calidad Gold. Rend. 4.3m/kg. Ancho 1.60m. +38 colores: Blanco, Negro, Rojo, Azul Rey, Navy Blue, Light Navy, Dark Navy, Oxford, Gris Medio, Gris Perla, Vino, Fiusha, Rosa Baby, Rosa Neón, Menta, Aqua, Turquesa, Verde Bandera, Verde Botella, Canario, Mango, Mostaza, Naranja, Naranja Neón, Verde Neón, Azul Francia, Uva, Uva M, Petróleo, Camel, Kaki, Beige, Bugambilia, Azul Acero, Oro Viejo, Rosa Palo, Cielo, Amarillo." },
  "micropique fusionado": { menudeo: 150, mayoreo: 145, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "miky":                 { menudeo: 135, mayoreo: 130, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "monaco":               { menudeo: 155, mayoreo: 150, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "nagasaky":             { menudeo: 135, mayoreo: 130, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "panal nitro":          { menudeo: 185, mayoreo: 180, info: "100% Poliéster 145g. Control de humedad extremo. Rend. 4.2m/kg. Ancho 1.60m. Color único por rollo." },
  "panal plus":           { menudeo: 155, mayoreo: 150, info: "100% Poliéster 145g. Mayor cuerpo y estructura. Rend. 3.7m/kg. Ancho 1.60m. Color único por rollo." },
  "phoenix":              { menudeo: 95,  mayoreo: 90,  info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "pique lacoste":        { menudeo: 140, mayoreo: 135, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "piqué vera":           { menudeo: 110, mayoreo: 105, info: "100% Poliéster 145g. Dry-Fit textura suave. Rend. 4.3m/kg. Ancho 1.60m. +34 colores: Blanco, Negro, Rojo, Azul Rey, Light Navy, Dark Navy, Oxford, Gris Medio, Gris Perla, Vino, Fiusha, Rosa Baby, Rosa Pastel, Palo Rosa, Menta, Aqua, Turquesa, Verde Bandera, Verde Botella, Canario, Mango, Mostaza, Naranja, Verde Neón, Amarillo Neón, Rosa Neón, Magenta, Lila, Uva, Petróleo, Caqui, Camel, Oro Viejo, Cielo." },
  "pique vera sport":     { menudeo: 140, mayoreo: 135, info: "100% Poliéster 145g. Versatilidad total. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "pixel":                { menudeo: 155, mayoreo: 150, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "saturno":              { menudeo: 165, mayoreo: 160, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "super trix":           { menudeo: 175, mayoreo: 170, info: "100% Poliéster 140g. Deportiva sublimación. Rend. 4.0m/kg. Ancho 1.60m. Color único por rollo." },
  "torneo":               { menudeo: 125, mayoreo: 120, info: "100% Poliéster 150g. Estándar de durabilidad para torneos exigentes. Rend. 4.3m/kg. Ancho 1.60m. Colores principales disponibles." },
  "felpa china":  { menudeo: 110, mayoreo: 105, info: "50% Algodón / 50% Poliéster 280g. Cara lisa + reverso afelpado. Rend. 2.2m/kg. Ancho 1.60m. Rollo 25 kg. Colores: Marino, Negro, Blanco, Azul Rey, Vino, Rojo, Jaspe Perla, Oxford Jaspe." },
  "felpa spun":   { menudeo: 110, mayoreo: 105, info: "100% Poliéster 280g. Alto volumen y suavidad. Rend. 2.5m/kg. Ancho 1.90m. Rollo 25 kg. Colores: Blanco, Rojo, Marino, Negro, Azul Rey, Vino." },
  "flanel":       { menudeo: 125, mayoreo: 120, info: "100% Poliéster 260g. Ultra suave afelpado. Ideal para pijamas y ropa de descanso. Rend. 2.4m/kg. Ancho 1.60m. Rollo 27 kg. Colores: Blanco, Vino, Marino, Negro, Fiusha, Palo Rosa, Rosa Pastel, Azul Rey, Naranja, Rojo." },
  "polar":        { menudeo: 120, mayoreo: 115, info: "100% Poliéster 280g. Térmico anti-pilling. Rend. 2.5m/kg. Ancho 1.60m. Rollo 25 kg. Colores: Verde Botella, Verde Militar, Palo Rosa, Azul Rey, Vino, Marino, Fiusha, Negro, Rojo, Blanco." },
  "jumanji":          { menudeo: 145, mayoreo: 140, info: "Poliéster/Spandex 180g. Alta elasticidad y recuperación. Rend. 3.5m/kg. Ancho 1.60m. Color único por rollo." },
  "licra liluna":     { menudeo: 135, mayoreo: 130, info: "Poliéster/Spandex 180g. Alta elasticidad. Rend. 3.5m/kg. Ancho 1.60m. Color único por rollo." },
  "licra playera":    { menudeo: 130, mayoreo: 125, info: "Poliéster/Spandex 180g. Alta elasticidad. Rend. 3.5m/kg. Ancho 1.60m. Color único por rollo." },
  "licra poliéster":  { menudeo: 145, mayoreo: 140, info: "Poliéster/Spandex 180g. Alta elasticidad. Rend. 3.5m/kg. Ancho 1.60m. Colores: Blanco, Negro, Rojo, Azul Rey, Marino." },
  "licra saludable":  { menudeo: 140, mayoreo: 135, info: "Poliéster/Spandex 180g. Alta elasticidad. Rend. 3.5m/kg. Ancho 1.60m. Colores: Blanco, Negro, Rojo, Azul Rey, Marino, Militar, Perla Jaspe, Oxford Jaspe." },
  "mercury":          { menudeo: 160, mayoreo: 155, info: "Poliéster/Spandex 180g. Alta elasticidad premium. Rend. 3.5m/kg. Ancho 1.60m. Color único por rollo." },
  "microtrix":        { menudeo: 150, mayoreo: 145, info: "Poliéster/Spandex 180g. Alta elasticidad. Rend. 3.5m/kg. Ancho 1.60m. Color único por rollo." },
  "sportok": { menudeo: 80, mayoreo: 75, info: "100% Poliéster interior afelpado 260g. Estándar para pants, sudaderas y uniformes escolares. Rend. 2.4m/kg. Ancho 1.60m. Rollo 25 kg. +48 colores: Blanco, Negro, Marino, Rojo, Azul Rey, Francia, Marino Claro, Oxford, Medio, Gris Baby, Perla, Vino, Fiusha, Bugambilia, Lila, Uva, Morado, Aqua, Menta, Turquesa, Cielo, Rosa Baby, Rosa Pastel, Palo de Rosa, Magenta, Petróleo, Militar, Botella, Bandera, Caqui, Camel, Beige, Café, Mostaza, Oro Viejo, Mango, Canario, Naranja, Rojo Quemado, Verde Neón, Amarillo Neón, Naranja Neón, Rosa Neón, Pistache, Manzana, Acero." },
};

// ==========================================
// 📐 BODEGA — TELAS POR METRO
// ==========================================
const PRECIOS_TELAS_METRO_DEFAULT: Record<string, { menudeo: number; mayoreo: number; info: string; metrosPorRollo: number }> = {
  "diablo": {
    menudeo: 88, mayoreo: 83,
    info: "100% Nylon Alta Tenacidad 220g. Uso rudo, resistente a la abrasión. Ideal para equipo táctico y calzado. Ancho 1.50m. Rollo = 50 m. Colores: Perla, Marino, Vino, Blanco, Azul Rey, Rojo, Negro, Oxford.",
    metrosPorRollo: 50,
  },
  "lycra metálica": {
    menudeo: 50, mayoreo: 45,
    info: "100% Poliéster 145g. Acabado brillante metálico. Ideal para prendas escénicas, deportivas y disfraces. Ancho 1.60m. Rollo = 98 m. Colores: Oro, Plata, Naranja, Rojo, Azul Rey, Turquesa, Perla, Verde Bandera, Verde Manzana, Rosa Pastel, Fiusha, Blanco, Negro.",
    metrosPorRollo: 98,
  },
};

// ==========================================
// 🧵 BODEGA — HILOS
// ==========================================
const PRECIOS_HILOS_DEFAULT: Record<string, { menudeo: number; mayoreo: number; info: string; unidad: string }> = {
  "hilo kingtex 40/2": {
    menudeo: 29, mayoreo: 25,
    info: "100% Poliéster Fibra Corta. 5,000m por cono. Alta velocidad industrial. Caja de 120 piezas. Precio mayoreo aplica por caja completa. +70 colores disponibles.",
    unidad: "pieza/cono"
  },
};

// ==========================================
// 🔩 BODEGA — ELÁSTICOS
// ==========================================
const PRECIOS_ELASTICOS_DEFAULT: Record<string, { menudeo: number; mayoreo: number; info: string; unidad: string }> = {
  "elástico beisbolero 2½\"": { menudeo: 19, mayoreo: 19, info: "100% Poliéster/Caucho. 6.5 cm de ancho. Ideal para cinturas y uniformes deportivos. Venta por metro. Rollo = 50 metros. Colores: Blanco, Negro.", unidad: "metro" },
  "elástico 3 ligas":         { menudeo: 80,  mayoreo: 80,  info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico 5 ligas":         { menudeo: 100, mayoreo: 100, info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico 7 ligas":         { menudeo: 110, mayoreo: 110, info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico 10 ligas":        { menudeo: 100, mayoreo: 100, info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico 12 ligas":        { menudeo: 110, mayoreo: 110, info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico 16 ligas":        { menudeo: 80,  mayoreo: 80,  info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico 20 ligas":        { menudeo: 100, mayoreo: 100, info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico 25 ligas":        { menudeo: 100, mayoreo: 100, info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico 30 ligas":        { menudeo: 120, mayoreo: 120, info: "Rollo de 50 cm. Poliéster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elástico jareta 3 cm":     { menudeo: 140, mayoreo: 140, info: "Cono. Elástico con jareta. Ideal para blusas y pantalones. Color: Blanco.", unidad: "cono" },
  "elástico jareta 4 cm":     { menudeo: 145, mayoreo: 145, info: "Cono. Elástico con jareta. Ideal para blusas y pantalones. Color: Blanco.", unidad: "cono" },
};

// ==========================================
// 🏪 BODEGA UNIFICADA
// ==========================================
interface BodegaGuardada {
  telas: typeof PRECIOS_TELAS_DEFAULT;
  telasMetro: typeof PRECIOS_TELAS_METRO_DEFAULT;
  hilos: typeof PRECIOS_HILOS_DEFAULT;
  elasticos: typeof PRECIOS_ELASTICOS_DEFAULT;
}

async function getBodega(redis: Redis): Promise<BodegaGuardada> {
  const guardado = await redis.get<BodegaGuardada>('bodega_coyote_v3');
  if (!guardado) {
    const inicial: BodegaGuardada = {
      telas: PRECIOS_TELAS_DEFAULT,
      telasMetro: PRECIOS_TELAS_METRO_DEFAULT,
      hilos: PRECIOS_HILOS_DEFAULT,
      elasticos: PRECIOS_ELASTICOS_DEFAULT,
    };
    await redis.set('bodega_coyote_v3', inicial);
    return inicial;
  }
  return {
    telas:      { ...PRECIOS_TELAS_DEFAULT,       ...guardado.telas },
    telasMetro: { ...PRECIOS_TELAS_METRO_DEFAULT,  ...(guardado.telasMetro || {}) },
    hilos:      { ...PRECIOS_HILOS_DEFAULT,        ...guardado.hilos },
    elasticos:  { ...PRECIOS_ELASTICOS_DEFAULT,    ...guardado.elasticos },
  };
}

type BodegaCategoria = 'telas' | 'telasMetro' | 'hilos' | 'elasticos';

async function actualizarPrecio(
  redis: Redis, categoria: BodegaCategoria, producto: string,
  campo: 'menudeo' | 'mayoreo', precio: number
) {
  const bodega = await getBodega(redis);
  const cat = bodega[categoria] as any;
  if (!cat[producto]) return false;
  cat[producto][campo] = precio;
  await redis.set('bodega_coyote_v3', bodega);
  return true;
}

async function agregarProducto(
  redis: Redis, categoria: BodegaCategoria, nombre: string,
  menudeo: number, mayoreo: number, info: string, unidad?: string
) {
  const bodega = await getBodega(redis);
  (bodega[categoria] as any)[nombre.toLowerCase()] = { menudeo, mayoreo, info, unidad: unidad || 'pieza' };
  await redis.set('bodega_coyote_v3', bodega);
  console.log(`✅ Producto agregado a ${categoria}: ${nombre}`);
  return true;
}

async function eliminarProducto(redis: Redis, categoria: BodegaCategoria, nombre: string) {
  const bodega = await getBodega(redis);
  const key = nombre.toLowerCase();
  const cat = bodega[categoria] as any;
  if (!cat[key]) return false;
  delete cat[key];
  await redis.set('bodega_coyote_v3', bodega);
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
      const nombreCliente = perfil?.nombre ? perfil.nombre : 'estimado cliente';
      const urlTicket = `https://www.coyotetextil.com/ticket/${session.id}`;
      let msg = `🐺 *El Coyote le confirma.* Buen día, ${nombreCliente}. Su pago de *$${monto} MXN* fue procesado exitosamente. ✅\n\n🎫 *Su ticket digital:*\n${urlTicket}\n\n📦 Su pedido ya entró a bodega. En breve le confirmamos la salida.`;

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
          if (invRes.ok) msg += `\n\n🧾 *Su factura CFDI 4.0 ya está timbrada.*\nhttps://www.facturapi.io/v2/invoices/${factura.id}/pdf`;
          else msg += `\n\n⚠️ El SAT presentó un inconveniente con un dato. Nuestro equipo lo revisa de inmediato.`;
        } catch (e) {
          msg += `\n\n⚠️ Intermitencia momentánea con el SAT. Su factura le llegará en breve.`;
        }
      }

      await registrarPedido(redis, tel, {
        fecha: new Date().toISOString(), productos: metadata.productos || 'No especificado',
        monto, metodo: session.payment_method_types[0] || 'card', conFactura: quiereFactura
      });

      try {
        const convoTrace = await prisma.waConversation.findFirst({ where: { contactPhone: tel } });
        await createTrace({
          employeeId: convoTrace?.employeeId || "SISTEMA", phone: tel, type: "WHATSAPP",
          summary: `Pago Stripe confirmado: $${monto} MXN${quiereFactura ? ' (con factura)' : ''}`,
          content: { direction: "inbound", event: "stripe_payment_completed", sessionId: session.id, monto, metodo: session.payment_method_types[0] || 'card', conFactura: quiereFactura, productos: metadata.productos || 'No especificado' },
          actionName: "PAGO_STRIPE_CONFIRMADO",
        });
      } catch (traceErr) { console.error("⚠️ Error en createTrace (stripe):", traceErr); }

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

  let tel = mensajeInfo.from;
  if (tel && tel.startsWith("521") && tel.length === 13) {
    tel = tel.replace(/^521/, "52");
    console.log(`🧹 Número mexicano limpiado: convertido a ${tel}`);
  }

  const msgCliente = mensajeInfo.text?.body;
  if (!tel || !msgCliente) {
    console.log('⚠️ Mensaje sin teléfono o sin body:', JSON.stringify(mensajeInfo));
    return;
  }

  console.log(`\n${'='.repeat(60)}\n💬 MENSAJE — Tel: ${tel} | "${msgCliente}"\n${'='.repeat(60)}\n`);

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
        const agenteActivo = await agentEstaActivo(currentConvoId);

        if (agenteActivo) {
          await prisma.$transaction([
            prisma.waMessage.create({ data: { conversationId: currentConvoId, role: "CLIENT", body: msgCliente, isRead: false } }),
            prisma.waConversation.update({ where: { id: currentConvoId }, data: { lastMessage: msgCliente, lastMessageAt: new Date(), unreadCount: { increment: 1 } } }),
          ]);
          try {
            await createTrace({
              employeeId: decision.agentId || "SISTEMA", phone: tel, type: "WHATSAPP",
              summary: `Mensaje enrutado a agente activo: ${msgCliente.substring(0, 60)}${msgCliente.length > 60 ? '...' : ''}`,
              content: { direction: "inbound", body: msgCliente, routedTo: "agent", conversationId: currentConvoId },
              actionName: "RECEPCION_WHATSAPP_CLIENTE",
            });
          } catch (traceErr) { console.error("⚠️ Error en createTrace (route_to_agent):", traceErr); }
          console.log(`✅ Agente activo — mensaje guardado. Bot en espera.`);
          return;
        }

        console.log(`🐺 Agente silencioso >15 min. El Coyote retoma la conversación de ${tel}.`);
        try {
          await prisma.$transaction([
            prisma.waMessage.create({ data: { conversationId: currentConvoId, role: "CLIENT", body: msgCliente, isRead: true } }),
            prisma.waConversation.update({ where: { id: currentConvoId }, data: { lastMessage: msgCliente, lastMessageAt: new Date() } }),
          ]);
        } catch (dbErr) { console.error("⚠️ Error guardando mensaje en DB (timeout agente):", dbErr); }
      }
    }
  } catch (error) {
    console.error("⚠️ Error en CRM router:", error);
  }

  console.log(`🐺 El Coyote procesando mensaje de ${tel}...`);
  const redis = getRedis();
  const msgLower = msgCliente.trim().toLowerCase();

  try {
    const convoParaTrace = await prisma.waConversation.findFirst({ where: { contactPhone: tel } });
    await createTrace({
      employeeId: convoParaTrace?.employeeId || "SISTEMA", phone: tel, type: "WHATSAPP",
      summary: `Mensaje entrante: ${msgCliente.substring(0, 60)}${msgCliente.length > 60 ? '...' : ''}`,
      content: { direction: "inbound", body: msgCliente, processedBy: "bot_coyote" },
      actionName: "RECEPCION_WHATSAPP_CLIENTE",
    });
  } catch (traceErr) { console.error("⚠️ Error en createTrace (mensaje entrante bot):", traceErr); }

  if (msgLower === 'soy jack' || msgLower === 'soy jack.') {
    await enviarWhatsapp(tel, '🐺 *El Coyote en línea.* Hola Jack, ¿puede verificarse? 🔒');
    return;
  }
  if (msgLower === 'elcoyote56') {
    const h = await getHistorial(redis, tel);
    h.push({ role: 'user', content: msgCliente });
    h.push({ role: 'assistant', content: '🐺 Modo Administrador activo. ¿Qué ajustamos?' });
    await saveHistorial(redis, tel, h);
    await enviarWhatsapp(tel, '🐺 *El Coyote listo, Jack.* Modo Admin activo.\n\nPuedo cambiar:\n• Precios y catálogo (telas, hilos, elásticos)\n• Tono, reglas y personalidad\n• Promociones activas\n• Avisos globales\n• Y lo que necesite\n\n¿Qué ajustamos?');
    return;
  }

  const esSoloCoyote = /^\s*coyote[\s!?.]*$/i.test(msgCliente.trim());
  if (esSoloCoyote) {
    const resp = `🐺 *El Coyote en línea.* Operaciones activas 24/7. ¿En qué le puedo ayudar?`;
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
      nombre: '',
      correoElectronico: '',
      correoVerificado: false,
      privacidadAceptada: false,
      genero: 'unknown',
      telefono: tel,
      primerContacto: new Date().toISOString(),
      ultimoContacto: new Date().toISOString(),
      totalCompras: 0,
      montoAcumulado: 0,
      productosComprados: [],
      direccionEnvio: '',
      cpFiscal: '',
      metodoPagoFavorito: '',
      requiereFrecuenteFactura: false,
      notas: '',
      preferencias: [],
      etapaAbandono: null,
      recordatoriosPendientes: [],
      segmento: 'prospecto',
      objecionesComunes: [],
      productosFavoritos: [],
      intentosDePago: 0,
      sensibilidadPrecio: 'media',
      interesesDeclarados: [],
      categoriasPedidas: [],
      temperaturaCompra: 30,
      tacticaActual: 'social_proof',
      nivelConfianza: 40,
      propensionCross: { hilos: 20, elasticos: 10, volumenExtra: 15 },
      terminosAceptados: false,
      membresiaOfrecida: false,
      tieneSuscripcion: false,
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
    const primerNombre = msgCliente.trim().split(/\s+/)[0];
    const pareceNombre = primerNombre.length >= 2 && !/[¿?!0-9@]/.test(primerNombre);

    if (pareceNombre) {
      perfil.nombre = primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1).toLowerCase();
      perfil.genero = await detectarGenero(perfil.nombre);
      perfil.ultimoContacto = new Date().toISOString();
      await saveCliente(redis, tel, perfil);

      const pedirCorreo = `🐺 *El Coyote al habla.* Mucho gusto, *${perfil.nombre}*. Para verificar su cuenta y enviarle cotizaciones, actualizaciones y facturación, ¿me comparte su correo electrónico por favor?`;
      const h = await getHistorial(redis, tel);
      h.push({ role: 'user', content: msgCliente });
      h.push({ role: 'assistant', content: pedirCorreo });
      await saveHistorial(redis, tel, h);
      await enviarWhatsapp(tel, pedirCorreo);
      return;
    } else {
      const insistirNombre = `🐺 Para darle atención personalizada, necesito saber su nombre. ¿Con quién tengo el gusto?`;
      const h = await getHistorial(redis, tel);
      h.push({ role: 'user', content: msgCliente });
      h.push({ role: 'assistant', content: insistirNombre });
      await saveHistorial(redis, tel, h);
      await enviarWhatsapp(tel, insistirNombre);
      return;
    }
  }

  if (!perfil.correoElectronico) {
    const regexCorreo = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
    const matchCorreo = msgCliente.match(regexCorreo);

    if (matchCorreo) {
      perfil.correoElectronico = matchCorreo[0].toLowerCase();
      perfil.correoVerificado = true;
      perfil.ultimoContacto = new Date().toISOString();
      await saveCliente(redis, tel, perfil);

      const confirmacionYPrivacidad =
        `✅ Correo registrado: *${perfil.correoElectronico}*\n\n` +
        `¡Hola! 👋 Antes de continuar, queremos informarle que tratamos sus datos personales conforme a nuestro Aviso de Privacidad.\n` +
        `Puede consultarlo aquí: https://www.coyotetextil.com/privacy\n\n` +
        `¿Nos autoriza a enviarle promociones, actualizaciones y comunicaciones comerciales por correo electrónico y WhatsApp?\n` +
        `Responda *SÍ* o *NO*.`;
      const h = await getHistorial(redis, tel);
      h.push({ role: 'user', content: msgCliente });
      h.push({ role: 'assistant', content: confirmacionYPrivacidad });
      await saveHistorial(redis, tel, h);
      await enviarWhatsapp(tel, confirmacionYPrivacidad);
      return;
    } else {
      const insistirCorreo =
        `🐺 Para verificar su cuenta y poder enviarle cotizaciones y facturación, necesito su correo electrónico. ` +
        `¿Me lo comparte por favor? (Ejemplo: nombre@empresa.com)`;
      const h = await getHistorial(redis, tel);
      h.push({ role: 'user', content: msgCliente });
      h.push({ role: 'assistant', content: insistirCorreo });
      await saveHistorial(redis, tel, h);
      await enviarWhatsapp(tel, insistirCorreo);
      return;
    }
  }

  if (!perfil.privacidadAceptada) {
    const respondioSi = /^\s*(sí|si|yes|acepto|autorizo|de acuerdo|ok|okay)\s*$/i.test(msgCliente.trim());
    const respondioNo = /^\s*(no|nope|no gracias)\s*$/i.test(msgCliente.trim());

    if (respondioSi) {
      perfil.privacidadAceptada = true;
      perfil.ultimoContacto = new Date().toISOString();
      await saveCliente(redis, tel, perfil);

      const saludo = perfil.genero === 'mujer'
        ? `🐺 ¡Perfecto, ${perfil.nombre}! Queda registrada su autorización. Estamos listos para ayudarle. ¿En qué le puedo servir hoy?`
        : `🐺 ¡Perfecto, ${perfil.nombre}! Queda registrada su autorización. Estamos listos para atenderle. ¿Qué necesita?`;
      const h = await getHistorial(redis, tel);
      h.push({ role: 'user', content: msgCliente });
      h.push({ role: 'assistant', content: saludo });
      await saveHistorial(redis, tel, h);
      await enviarWhatsapp(tel, saludo);
      return;
    } else if (respondioNo) {
      perfil.privacidadAceptada = false;
      perfil.ultimoContacto = new Date().toISOString();
      await saveCliente(redis, tel, perfil);

      const respuestaNo =
        `Entendido, respetamos su decisión. 🐺\n\n` +
        `Sus datos solo se usarán para gestionar su pedido. ` +
        `¿En qué le puedo ayudar hoy?`;
      const h = await getHistorial(redis, tel);
      h.push({ role: 'user', content: msgCliente });
      h.push({ role: 'assistant', content: respuestaNo });
      await saveHistorial(redis, tel, h);
      await enviarWhatsapp(tel, respuestaNo);
      return;
    } else {
      const reenviarAviso =
        `🐺 Necesito su respuesta para continuar. ¿Nos autoriza a enviarle promociones, actualizaciones y comunicaciones comerciales?\n\n` +
        `🔒 Aviso de Privacidad: https://www.coyotetextil.com/privacy\n\n` +
        `Responda *SÍ* o *NO* por favor.`;
      const h = await getHistorial(redis, tel);
      h.push({ role: 'user', content: msgCliente });
      h.push({ role: 'assistant', content: reenviarAviso });
      await saveHistorial(redis, tel, h);
      await enviarWhatsapp(tel, reenviarAviso);
      return;
    }
  }

  perfil.ultimoContacto = new Date().toISOString();

  const estadoMembresia = await verificarMembresia(tel);
  if (estadoMembresia.activa && !perfil.tieneSuscripcion) {
    perfil.tieneSuscripcion = true;
    perfil.planMembresia = estadoMembresia.plan;
    await saveCliente(redis, tel, perfil);
  }

  let historial = await getHistorial(redis, tel);
  perfil = await analizarPatronesCliente(redis, perfil, msgCliente, historial);

  const nuevoResumen = await generarResumenSemantico(historial, perfil);
  if (nuevoResumen) { perfil.resumenSemantico = nuevoResumen; await saveCliente(redis, tel, perfil); }

  const intencionPago = detectarIntencionPago(msgCliente, historial);
  let linkStripeAutoGenerado: string | null = null;
  if (intencionPago.detectado && intencionPago.montoEstimado && intencionPago.montoEstimado > 0) {
    try {
      const amountInCents = Math.round(intencionPago.montoEstimado * 100);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'oxxo'],
        line_items: [{ price_data: { currency: 'mxn', product_data: { name: 'Pedido Coyote Textil — El Coyote' }, unit_amount: amountInCents }, quantity: 1 }],
        mode: 'payment',
        success_url: 'https://wa.me/5215627301525',
        metadata: { rfc: 'NONE', razon: 'NONE', cp: 'NONE', regimen: 'NONE', uso: 'NONE', req_invoice: 'NO', phone: tel, productos: perfil.productosComprados.join(',') }
      });
      linkStripeAutoGenerado = session.url;
      perfil.intentosDePago = (perfil.intentosDePago || 0) + 1;
      perfil.etapaAbandono = 'pago';
      perfil.fechaAbandono = new Date().toISOString();
      await saveCliente(redis, tel, perfil);
      console.log(`💳 Link Stripe auto-generado para ${tel}: ${linkStripeAutoGenerado}`);
    } catch (err) { console.error('Error generando Stripe auto:', err); }
  }

  historial.push({ role: 'user', content: msgCliente });

  const esElJefe = historial.some((m: any) => m.role === 'user' && m.content.trim() === 'elcoyote56');
  const bodega = await getBodega(redis);

  const buildCatalogoTelas = () =>
    Object.entries(bodega.telas).map(([name, p]) =>
      `  • ${name.toUpperCase()}: $${p.menudeo}/kg menudeo | $${p.mayoreo}/kg mayoreo | rollo 25kg = $${(p.mayoreo * 25).toFixed(0)} MXN\n    ${p.info}`
    ).join('\n');

  const buildCatalogoTelasMetro = () =>
    Object.entries(bodega.telasMetro).map(([name, p]) =>
      `  • ${name.toUpperCase()}: $${p.menudeo}/m menudeo | $${p.mayoreo}/m mayoreo | rollo ${p.metrosPorRollo}m = $${(p.mayoreo * p.metrosPorRollo).toFixed(0)} MXN\n    ${p.info}`
    ).join('\n');

  const buildCatalogoHilos = () =>
    Object.entries(bodega.hilos).map(([name, p]) =>
      `  • ${name.toUpperCase()}: $${p.menudeo} menudeo/${p.unidad} | $${p.mayoreo} mayoreo/caja (120 pzs = $${(p.mayoreo * 120).toFixed(0)} MXN)\n    ${p.info}`
    ).join('\n');

  const buildCatalogoElasticos = () =>
    Object.entries(bodega.elasticos).map(([name, p]) =>
      `  • ${name.toUpperCase()}: $${p.menudeo} por ${p.unidad}\n    ${p.info}`
    ).join('\n');

  const extrasTexto = config.productosExtra.length > 0
    ? config.productosExtra.map(pe =>
        `  • ${pe.nombre.toUpperCase()} [${pe.categoria || 'tela'}]: $${pe.menudeo} menudeo | $${pe.mayoreo} mayoreo | ${pe.info}`
      ).join('\n')
    : '';

  const diasDesdeUltimo = perfil.ultimoContacto
    ? Math.floor((Date.now() - new Date(perfil.ultimoContacto).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const alertaDireccion = perfil.direccionEnvio
    ? `⚠️ DIRECCIÓN GUARDADA: "${perfil.direccionEnvio}". Confirme si sigue siendo correcta.`
    : `⚠️ SIN DIRECCIÓN. Solicítela cuando corresponda.`;

  const alertaReactivacion = diasDesdeUltimo > 30
    ? `⚡ ALERTA: Este cliente lleva ${diasDesdeUltimo} días sin comprar. Use técnica de reactivación.`
    : '';
  const alertaConversion = (perfil.intentosDePago || 0) > 1
    ? `⚡ ALERTA: ${perfil.intentosDePago} links de pago sin concretar. Identifique la objeción real y resuélvala.`
    : '';

  const ahora = new Date();
  const recordatoriosPendientes = (perfil.recordatoriosPendientes || []).filter(r => {
    try { return new Date(r.fecha) <= ahora; } catch { return false; }
  });
  const alertaRecordatorio = recordatoriosPendientes.length > 0
    ? `⚡ RECORDATORIO ACTIVO: ${recordatoriosPendientes.map(r => r.mensaje).join(' | ')} — Retome la conversación ahora.`
    : '';
  if (recordatoriosPendientes.length > 0) {
    perfil.recordatoriosPendientes = (perfil.recordatoriosPendientes || []).filter(r => {
      try { return new Date(r.fecha) > ahora; } catch { return true; }
    });
    await saveCliente(redis, tel, perfil);
  }

  const alertaAbandono         = perfil.etapaAbandono ? `⚡ CLIENTE EN ETAPA DE ABANDONO: "${perfil.etapaAbandono}" — Retome desde ese punto, NO empiece de cero.` : '';
  const alertaUltimaCotizacion = perfil.ultimaCotizacion ? `⚡ ÚLTIMA COTIZACIÓN REGISTRADA: ${perfil.ultimaCotizacion} — Úsela para retomar.` : '';
  const alertaTemperatura      = perfil.temperaturaCompra !== undefined ? `🌡️ TEMPERATURA DE COMPRA: ${perfil.temperaturaCompra}/100 — Táctica activa: ${perfil.tacticaActual || 'valor_rendimiento'}` : '';
  const alertaPrediccion       = perfil.prediccionSiguientePedido ? `🔮 PREDICCIÓN: ${perfil.prediccionSiguientePedido}` : '';
  const alertaPatron           = perfil.patronCompra ? `📊 PATRÓN: ${perfil.patronCompra}` : '';
  const alertaPropension       = perfil.propensionCross ? `🎯 PROPENSIÓN CROSS: Hilos ${perfil.propensionCross.hilos}% | Elásticos ${perfil.propensionCross.elasticos}% | Volumen+ ${perfil.propensionCross.volumenExtra}%` : '';
  const memoriaSemantica       = perfil.resumenSemantico ? `\n🧠 MEMORIA SEMÁNTICA:\n${perfil.resumenSemantico}` : '';

  const instruccionTactica = (() => {
    const temp = perfil.temperaturaCompra ?? 30;
    const intentos = perfil.intentosDePago ?? 0;

    if (linkStripeAutoGenerado) {
      return `🚨 CIERRE INMEDIATO: El sistema ya generó el link de pago. ENTRÉGUELO AHORA con el monto: "Su pedido entra a bodega en cuanto confirme el pago." No agregue más preguntas.`;
    }
    if (perfil.direccionEnvio && perfil.ultimaCotizacion) {
      return `🚨 CLIENTE LISTO PARA CERRAR: Tiene dirección y cotización registrada (${perfil.ultimaCotizacion}). Su ÚNICO objetivo es cobrar ahora. Pregunte: "¿Cerramos con tarjeta, OXXO o SPEI?" y ejecute GENERAR_COBRO o GENERAR_SPEI. NO haga más preguntas de calificación.`;
    }

    switch (perfil.tacticaActual) {
      case 'cierre_directo':
        return `🚨 CIERRE DIRECTO (Temp: ${temp}/100):
Su mensaje DEBE terminar con UNA propuesta de pago concreta: "Son $X MXN. ¿Le procesamos con tarjeta, OXXO o SPEI?"
${intentos > 0 ? `⚠️ Ya intentó pagar ${intentos} veces sin concretar. Detecte la fricción: "¿Tuvo algún inconveniente con el link anterior?"` : ''}`;

      case 'urgencia_escasez':
        return `⚡ URGENCIA REAL (Temp: ${temp}/100):
1. Dé el precio total con envío incluido (use CALCULAR_ENVIO si tiene CP).
2. Agregue presión real: "Tenemos stock del color solicitado, pero los rollos de temporada se mueven con rapidez."
3. Cierre con: "¿Apartamos hoy con $500 de anticipo vía OXXO?"
4. Si acepta → ejecute GENERAR_COBRO|oxxo|500|NONE|NONE|NONE|NONE|NONE.`;

      case 'manejo_objecion':
        return `🤝 MANEJO DE OBJECIÓN (objeciones: ${perfil.objecionesComunes?.join(', ') || 'precio'}):
1. Valide la preocupación sin ceder en precio.
2. Redirija al costo por prenda, no por kilo.
3. Ofrezca cantidad menor para arrancar: "¿Empezamos con 10 kg para que pruebe la tela?"
4. Mini-cierre: "Si le convence la calidad, ¿arrancamos con ese pedido inicial hoy?"
NUNCA baje el precio sin obtener algo a cambio.`;

      case 'fidelizacion_vip':
        return `👑 CLIENTE VIP (${perfil.totalCompras} compras, $${perfil.montoAcumulado} acumulados):
1. Reconózcalo: "Usted ya es cliente frecuente, lo tenemos bien identificado."
2. Ofrezca algo concreto: lote reservado o envío prioritario.
3. Retome con su producto favorito: "${perfil.productosFavoritos?.[0] || 'su tela habitual'} sigue disponible."
4. Cierre: "¿Le armo el mismo pedido de siempre o necesita algo diferente esta vez?"`;

      case 'social_proof':
        return `🏆 PRUEBA SOCIAL + PRIMER CIERRE (cliente nuevo):
1. "Trabajamos con talleres de uniforme, equipos deportivos y marcas en toda la república."
2. Proponga entrada de bajo riesgo: "Para conocernos, puede arrancar con 10 kg de Micropique: $950 MXN."
3. Cierre directo: "¿Le envío el link de pago para ese primer pedido?"`;

      default:
        return `💡 TÁCTICA VALOR-RENDIMIENTO (Temp: ${temp}/100):
1. Precio SIEMPRE en costo por prenda: "A $95/kg con rend. 4.3m/kg, cada playera lleva ~$22 de tela."
2. Empuje rollo: "El rollo completo (25 kg) baja a $95/kg vs $100 en menudeo. Total: $2,375."
3. Cierre con decisión binaria: "¿Le armo la cotización con rollo completo o con los kilos que necesita?"`;
    }
  })();

  // ==========================================
  // 🏆 BLOQUE MEMBRESÍA — CON PRECIOS Y BENEFICIOS REALES
  // ==========================================
  const bloqueMembresia = (() => {
    if (estadoMembresia.activa) {
      const planLabel = perfil.planMembresia === 'ELITE' ? '💎 ELITE — Master Partner'
        : perfil.planMembresia === 'BLACK' ? '⚫ BLACK — Socio Ejecutivo'
        : '🥇 GOLD — Socio Comercial';
      const beneficiosPlan = perfil.planMembresia === 'ELITE'
        ? '4 ptos por cada $100 MXN | 6 colocaciones gratis/mes | Prioridad máxima en envíos | Reserva ilimitada | Muestras anticipadas | $0 tarifa de servicio'
        : perfil.planMembresia === 'BLACK'
        ? '2 ptos por cada $100 MXN | 3 colocaciones gratis/mes | Prioridad en envíos Coyote Logistics | Reserva de textiles | Merchandising sorpresa anual'
        : '1 pto por cada $100 MXN | 1 colocación gratis/mes | Atención IA 24/7';
      return `✅ CLIENTE CON MEMBRESÍA ACTIVA (Plan: ${planLabel})
Al momento de cerrar la venta, reconozca su membresía y mencione sus beneficios activos:
${beneficiosPlan}
Mencione: "Como Socio Coyote ${perfil.planMembresia === 'ELITE' ? '💎 ELITE' : perfil.planMembresia === 'BLACK' ? '⚫ BLACK' : '🥇 GOLD'} 👑, su pedido lleva todos los beneficios de su plan activo — incluyendo ${perfil.planMembresia === 'ELITE' ? '$0 en tarifa de servicio y máxima prioridad en envío' : perfil.planMembresia === 'BLACK' ? 'prioridad en envío y reserva de textiles' : '1 colocación gratis al mes'}."`;
    }
    if (perfil.membresiaOfrecida) {
      return `⬜ MEMBRESÍA YA FUE OFRECIDA Y DECLINADA — No la mencione de nuevo. Proceda directo al cobro una vez aceptados los T&C.`;
    }
    return `⚠️ CLIENTE SIN MEMBRESÍA — Ofrezca UNA sola vez, justo antes del cobro (si aún no fue ofrecida).
Texto exacto a usar:

"Antes de procesar su pago, le presento nuestro *Programa Socios Coyote* 🐺👑. Tenemos 3 niveles:

*🥇 GOLD — Socio Comercial: $299/mes*
• 1 pto por cada $100 MXN en compras (el doble que el acceso base)
• 1 colocación gratis a paquetería al mes
• Atención IA 24/7
• Plan anual: $3,233 MXN (ahorra $255)

*⚫ BLACK — Socio Ejecutivo: $699/mes*
• 2 ptos por cada $100 MXN (4× más que el acceso base)
• 3 colocaciones gratis al mes
• Prioridad en envíos Coyote Logistics
• Reserva de textiles antes de que se agoten
• Merchandising sorpresa anual
• Plan anual: $7,549 MXN (ahorra $639)

*💎 ELITE — Master Partner: $1,129/mes*
• 4 ptos por cada $100 MXN (8× más que el acceso base)
• 6 colocaciones gratis al mes
• Máxima prioridad en envíos — siempre al frente
• Reserva ilimitada de cualquier textil del catálogo
• Muestras gratis + acceso anticipado a nuevos textiles
• *$0 en tarifa de servicio en toda operación*
• Merchandising exclusivo anual
• Plan anual: $12,193 MXN (ahorra $1,155)

Más información: https://www.coyotetextil.com/membresia
¿Le interesa activar algún nivel, o continuamos con su pedido?"

Si acepta → use: ESCALAR|Cliente interesado en Membresía Socios Coyote — plan [GOLD/BLACK/ELITE]
Si declina → emita: MEMBRESIA_OFRECIDA y proceda con el cobro`;
  })();

  const resumenCliente = `
PERFIL DEL CLIENTE:
- Nombre: ${perfil.nombre} | Género: ${perfil.genero} | Segmento: ${perfil.segmento || 'prospecto'}
- Correo: ${perfil.correoElectronico || 'NO REGISTRADO'} | Privacidad: ${perfil.privacidadAceptada ? 'ACEPTADA' : 'NO ACEPTADA'}
- Compras: ${perfil.totalCompras} | Acumulado: $${perfil.montoAcumulado} | Ticket promedio: $${perfil.ticketPromedio?.toFixed(0) || 'N/A'}
- Categorías pedidas: ${perfil.categoriasPedidas?.join(', ') || 'ninguna'}
- Productos favoritos: ${perfil.productosFavoritos?.join(', ') || 'ninguno'}
- Intereses declarados: ${perfil.interesesDeclarados?.join(', ') || 'ninguno'}
- Objeciones históricas: ${perfil.objecionesComunes?.join(', ') || 'ninguna'}
- Sensibilidad al precio: ${perfil.sensibilidadPrecio || 'media'}
- Nivel de confianza: ${perfil.nivelConfianza || 40}/100
- Requiere factura frecuente: ${perfil.requiereFrecuenteFactura ? 'SÍ' : 'NO'}
- ${alertaDireccion}
- CP Fiscal: ${perfil.cpFiscal || 'no registrado'}
- Notas: ${perfil.notas || 'ninguna'}
- Términos aceptados: ${perfil.terminosAceptados ? '✅ SÍ' : '❌ NO'}
- Membresía activa: ${estadoMembresia.activa ? `✅ SÍ (${perfil.planMembresia || 'Socio Coyote'})` : '❌ NO'}
- Membresía ofrecida: ${perfil.membresiaOfrecida ? '✅ YA OFRECIDA' : '⬜ Pendiente'}
${alertaTemperatura}
${alertaPrediccion}
${alertaPatron}
${alertaPropension}
${alertaReactivacion}
${alertaConversion}
${alertaAbandono}
${alertaUltimaCotizacion}
${alertaRecordatorio}
${memoriaSemantica}
`.trim();

  const promocionesTexto = config.promocionesActivas.length > 0
    ? `\n🎯 PROMOCIONES ACTIVAS:\n${config.promocionesActivas.map(p => `• ${p.nombre}: ${p.descripcion} — ${p.descuento} (${p.vigencia})`).join('\n')}`
    : '';
  const avisoTexto = config.avisoGeneral ? `\n⚠️ AVISO GENERAL: ${config.avisoGeneral}` : '';
  const instruccionesExtra = config.instruccionesEspeciales
    ? `\n📌 INSTRUCCIONES ESPECIALES (prioridad máxima):\n${config.instruccionesEspeciales}`
    : '';
  const avisoStripeAuto = linkStripeAutoGenerado
    ? `\n⚡ LINK STRIPE YA GENERADO: ${linkStripeAutoGenerado}\nUSE ESTE LINK directamente. NO use GENERAR_COBRO.`
    : '';

  const CONTEXTO_VENDEDOR = `
════════════════════════════════════════════════════════
🐺 IDENTIDAD — EL COYOTE (IRROMPIBLE)
════════════════════════════════════════════════════════
Usted es EL COYOTE, asesor de Coyote Textil. Siempre. Sin excepción.
• NUNCA diga que es IA, bot, asistente virtual, ChatGPT o GPT.
• Si preguntan quién es: "🐺 Soy El Coyote, su asesor en Coyote Textil."
• Tono: ${config.tono}
• Máximo ${config.maximoLineasRespuesta} líneas por respuesta. DIRECTO Y VENDEDOR.
• SIEMPRE hable de "usted" al cliente. NUNCA tutee.
• Hombres: ${config.frasesDesignacionHombre.join(', ')} | Mujeres: ${config.frasesDesignacionMujer.join(', ')}
• Emojis: ${config.emojisPrincipales}
• Horario: ${config.horarioAtencion}
${instruccionesExtra}
${avisoTexto}
${promocionesTexto}
${avisoStripeAuto}

════════════════════════════════════════════════════════
🚫 LENGUAJE PROHIBIDO — NUNCA USE NINGUNA DE ESTAS
════════════════════════════════════════════════════════
${config.fraseProhibidas.map(f => `• "${f}"`).join('\n')}
• Tutear en cualquier forma: "tú", "te", "tu", "dale", "órale"
• Términos informales con clientes: "patrón", "patrona", "jefe", "cuate"
• Frases de relleno sin propuesta: "Con gusto le ayudo", "Por supuesto", "Claro que sí"
• Preguntas sin cierre: "¿En qué más le puedo ayudar?"

════════════════════════════════════════════════════════
🧵 CATÁLOGO COMPLETO — COYOTE TEXTIL
════════════════════════════════════════════════════════

📦 TELAS POR KILO (rollo estándar = 25 kg):
${buildCatalogoTelas()}
${extrasTexto ? `\nEXTRAS:\n${extrasTexto}` : ''}

📐 TELAS POR METRO:
${buildCatalogoTelasMetro()}

🧵 HILOS (precio por PIEZA/CONO):
${buildCatalogoHilos()}

🔩 ELÁSTICOS:
${buildCatalogoElasticos()}

════════════════════════════════════════════════════════
📐 REGLAS DE PRODUCTO
════════════════════════════════════════════════════════
TELAS POR KILO:
• Todo por kilo. Rollo = 25 kg exactos.
• Menudeo: <25 kg | Mayoreo: 25 kg o más.
• Precio rollo = mayoreo × 25. SIEMPRE muéstrelo calculado.
• Rendimiento en metros: ver catálogo. Convierta a piezas cuando el cliente lo pida.

TELAS CON PALETA DE COLORES (pregunta el color SIEMPRE antes de cotizar):
Micropique, Micro Panal, Piqué Vera, Torneo, Sportok, Felpa China, Felpa Spun,
Flanel, Polar, Licra Poliéster, Licra Saludable, Diablo, Lycra Metálica.
→ Si piden la carta completa: PEGUE LA LISTA DE COLORES del catálogo.
→ Si piden Blanco: mencione Perla, Hueso, Gris baby, Rosa baby como alternativas.

TELAS COLOR ÚNICO POR ROLLO (NO preguntar color):
Alaska, Andromeda, Apolo, Ares, Athlos, Azucena, Brock, Brush, Capriati, Caprice,
Delta, F30, Granizo, Horous, Inter 70, Kyoto, Madelino, Micro Estrella, Micropique Fusionado,
Miky, Monaco, Nagasaky, Panal Nitro, Panal Plus, Phoenix, Pique Lacoste, Pique Vera Sport,
Pixel, Saturno, Super Trix, Jumanji, Licra Liluna, Licra Playera, Mercury, Microtrix.
→ Para estas: "Color único por rollo, confirme al apartar."

TELAS POR METRO (Diablo / Lycra Metálica):
• Se venden por METRO, NO por kilo.
• Rollo Diablo = 50 m. Rollo Lycra Metálica = 98 m.
• Precio por metro: menudeo / mayoreo según catálogo.

HILOS KINGTEX 40/2:
• Precio unitario: $29/cono (menudeo). Mayoreo: $25/cono en caja de 120 piezas.
• Caja completa = 120 conos × $25 = $3,000 MXN.

ELÁSTICOS:
• Beisbolero 2½": se vende por METRO ($19/m). Rollo = 50 m = $950.
• Elásticos por ligas (3 a 30 ligas): precio por pieza de 50 cm.
• Jareta 3 cm y 4 cm: por CONO. Solo Blanco.

════════════════════════════════════════════════════════
🗺️ FLUJO DE VENTA OBLIGATORIO — NO SALTARSE PASOS
════════════════════════════════════════════════════════

PASO 1 — RECOPILAR DATOS ANTES DE COTIZAR:
Antes de dar cualquier precio usted DEBE tener:
  a) Producto específico
  b) Cantidad (kilos, metros o piezas según aplique)
  c) Color (SOLO si la tela tiene paleta de colores — ver lista arriba)
Si falta algún dato → pregúntelo de forma directa y concisa.
NUNCA cotice sin tener producto + cantidad + color (cuando aplica).

PASO 2 — COTIZACIÓN INMEDIATA:
Una vez con los 3 datos → cotice en ese mismo mensaje:
  • Precio por kg/metro
  • Precio rollo (si aplica)
  • Costo aproximado por prenda

PASO 3 — CP DE ENVÍO:
Inmediatamente después de cotizar → "¿A qué CP enviamos para incluir el flete?"

PASO 4 — FACTURA:
Al tener el CP → "¿Requiere factura fiscal?"

PASO 5 — MÉTODO DE PAGO:
"¿Cerramos con tarjeta, OXXO o SPEI?"

PASO 5.5 — PRE-CIERRE OBLIGATORIO (ANTES DE COBRAR):
Antes de ejecutar cualquier cobro, DEBE completar en orden:

  A) TÉRMINOS Y CONDICIONES:
  Si perfil.terminosAceptados = false → presente los T&C y solicite aceptación:
  "Para formalizar su pedido, le pido confirmar que ha leído y acepta nuestros
  Términos y Condiciones: https://www.coyotetextil.com/terms
  ¿Acepta? Responda *SÍ* para continuar."
  → Cuando responda SÍ: emita TERMINOS_ACEPTADOS en su respuesta
  → Cuando responda NO: "Sin aceptación de Términos no es posible procesar el pedido."
  Si perfil.terminosAceptados = true → omita este paso, ya está aceptado.

  B) MEMBRESÍA SOCIOS COYOTE:
  ${bloqueMembresia}

PASO 6 — EJECUTAR COBRO:
Solo cuando T&C estén aceptados (y membresía resuelta) → GENERAR_COBRO o GENERAR_SPEI.

ATAJO: Si el cliente da producto + cantidad + color + CP en un solo mensaje → salte directo al total con envío + factura, pero SIEMPRE pase por el Paso 5.5 antes del cobro.

════════════════════════════════════════════════════════
🔥 MOTOR DE CIERRE — LEY MÁXIMA
════════════════════════════════════════════════════════

${instruccionTactica}

════════════════════════════════════════════════════════
⚡ REGLAS DE ACCIÓN INMEDIATA
════════════════════════════════════════════════════════

REGLA 1 — CIERRE EN CADA MENSAJE:
Cada respuesta debe terminar con UNA pregunta que avance hacia el pago:
• "¿Qué color necesita?"  • "¿Cuántos kilos requiere?"
• "¿Su CP para incluir el envío?"  • "¿Requiere factura?"
• "¿Acepta nuestros Términos y Condiciones?"
• "¿Le interesa la Membresía Socios Coyote?"
• "¿Cerramos con tarjeta, OXXO o SPEI?"
NUNCA termine con "¿En qué más le puedo ayudar?"

REGLA 2 — ENVÍO OBLIGATORIO:
Si tiene producto + kg/metros + CP → ejecute CALCULAR_ENVIO en ese mismo mensaje.

REGLA 3 — CROSS-SELL AL CIERRE:
Al dar precio de tela → "¿Le incluimos hilo para ese pedido? Kingtex 40/2 a $29/cono."
Al dar precio de uniforme → "¿Necesita elástico para cintura? Beisbolero a $19/metro."

REGLA 4 — PRECIO SIN RODEOS:
precio + rollo + costo por prenda en 3 líneas máximo.

REGLA 5 — MANEJO DE "LO PIENSO":
→ "¿Para cuándo necesita el material? Le reservamos el color."
→ SIEMPRE registre: DATOS_CLIENTE|etapa_abandono:cotizacion
→ SIEMPRE programe: PROGRAMAR_RECORDATORIO|${tel}|[mañana 10am]|Retomar cotización pendiente

REGLA 6 — OBJECIÓN DE PRECIO:
NUNCA baje el precio directamente. Responda con costo por prenda y compare con proveedor actual.

REGLA 7 — SI YA HAY LINK GENERADO:
Entréguelo de inmediato. Sin más preguntas:
"Aquí su link de pago seguro 👇\n[LINK]\nEn cuanto confirme, bodega recibe su pedido. 🐺"

REGLA 8 — ESCALAMIENTO A HUMANO:
Si el cliente pide explícitamente hablar con un humano, se muestra muy molesto, o pide una cotización mayor a 1,000 kg, use INMEDIATAMENTE el comando: ESCALAR|motivo_breve

════════════════════════════════════════════════════════
🧠 MEMORIA PERSISTENTE
════════════════════════════════════════════════════════
• NUNCA trate a un cliente recurrente como nuevo.
• Si tiene nombre → úselo: "${perfil.genero === 'mujer' ? 'señora' : 'señor'} ${perfil.nombre}"
• Si tiene etapaAbandono = 'cotizacion' → retome SIN reiniciar.
• Si tiene etapaAbandono = 'pago' → entregue el link/SPEI pendiente de inmediato.
• NUNCA envíe bienvenida a cliente con historial.
• NUNCA pregunte el nombre ni el correo si ya los tiene registrados.
• Si terminosAceptados = true → NUNCA vuelva a pedir T&C.
• Si membresiaOfrecida = true → NUNCA vuelva a ofrecer la membresía.

════════════════════════════════════════════════════════
🚨 PAGOS — TRES MÉTODOS
════════════════════════════════════════════════════════
• TARJETA / OXXO (Stripe):
  → Si el sistema YA generó link → ÚSELO, no use GENERAR_COBRO.
  → Si no → GENERAR_COBRO|metodo|monto|rfc|razon|cp|regimen|uso
• SPEI: GENERAR_SPEI|monto_total
• "Ya pagué" → "Perfecto. En cuanto se confirme la transferencia, bodega recibe su pedido. 🐺📦"
${config.infoPagos ? `\n💳 EXTRA PAGOS: ${config.infoPagos}` : ''}
${config.infoEnvios ? `\n🚚 EXTRA ENVÍOS: ${config.infoEnvios}` : ''}

════════════════════════════════════════════════════════
💰 COMANDOS INTERNOS (invisibles para el cliente)
════════════════════════════════════════════════════════
COBRO: GENERAR_COBRO|metodo(tarjeta/oxxo)|monto_total|rfc|razon_social|cp_fiscal|regimen|uso
SPEI: GENERAR_SPEI|monto_total
ENVÍO: CALCULAR_ENVIO|productos=[{"nombre":"producto","kg":cantidad}]|cp=12345
DATOS_CLIENTE|direccion:[dir]|cp_fiscal:[cp]|productos:[lista]|categorias:[telas/hilos/elasticos]|notas:[nota]|etapa_abandono:[etapa]|intereses:[uso]
PROGRAMAR_RECORDATORIO|${tel}|[fecha ISO]|[mensaje]
ESCALAR|descripcion
TERMINOS_ACEPTADOS  ← (sin parámetros) Emítalo cuando el cliente confirme aceptar los T&C
MEMBRESIA_OFRECIDA  ← (sin parámetros) Emítalo cuando el cliente decline la membresía

⚠️ CP ENVÍO ≠ CP FISCAL. NUNCA los mezcle.

════════════════════════════════════════════════════════
🎯 FRASES DE CIERRE
════════════════════════════════════════════════════════
"${config.fraseCierre}"
"${config.fraseIncondicional}"
${config.mensajePromoFinal ? `"${config.mensajePromoFinal}"` : ''}

════════════════════════════════════════════════════════
👤 PERFIL DEL CLIENTE
════════════════════════════════════════════════════════
${resumenCliente}
`;

  const CONTEXTO_JEFE = `
ERES "EL COYOTE", IA DE COYOTE TEXTIL. HABLAS CON JACK, TU CREADOR.
Respuestas cortas. Tono de confianza entre socios.

════════════════════════════════════════════════════════
📦 GESTIÓN DE CATÁLOGO
════════════════════════════════════════════════════════
PRECIO_UPDATE|categoria(telas/telasMetro/hilos/elasticos)|nombre_producto|menudeo_o_mayoreo|numero
PRODUCTO_NUEVO|categoria(telas/telasMetro/hilos/elasticos)|nombre|menudeo|mayoreo|descripcion|unidad
PRODUCTO_ELIMINAR|categoria(telas/telasMetro/hilos/elasticos)|nombre

TELAS ACTUALES (por kilo):
${buildCatalogoTelas()}

TELAS POR METRO:
${buildCatalogoTelasMetro()}

HILOS ACTUALES:
${buildCatalogoHilos()}

ELÁSTICOS ACTUALES:
${buildCatalogoElasticos()}

════════════════════════════════════════════════════════
🎛️ CONFIGURACIÓN GLOBAL
════════════════════════════════════════════════════════
CONFIG|tono|Nueva descripción
CONFIG|frasesHombre|señor, estimado
CONFIG|frasesMujer|señora, estimada
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

  console.log(`🤖 GPT-4o para ${tel} (esJefe: ${esElJefe}) | Temp: ${perfil.temperaturaCompra} | Táctica: ${perfil.tacticaActual}`);
  const systemPrompt = { role: 'system', content: esElJefe ? CONTEXTO_JEFE : CONTEXTO_VENDEDOR };

  let respuesta = '';
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [systemPrompt, ...historial] as any,
      temperature: 0.3,
      max_tokens: 700,
    });
    respuesta = completion.choices[0].message.content || '';
    console.log(`✅ GPT-4o respondió (${respuesta.length} chars)`);
  } catch (err) {
    console.error('❌ Error llamando a OpenAI:', err);
    await enviarWhatsapp(tel, '🐺 Estamos teniendo un inconveniente técnico momentáneo. Le respondo en breve.');
    return;
  }

  const frasesSinIdentidad = [
    /\bsoy una ia\b/i, /\bsoy un bot\b/i, /\basistente virtual\b/i,
    /\bcomo asistente de ia\b/i, /\bcomo ia\b/i, /\bchatgpt\b/i, /\bgpt\b/i,
  ];
  for (const patron of frasesSinIdentidad) {
    if (patron.test(respuesta)) respuesta = respuesta.replace(patron, 'El Coyote de Coyote Textil');
  }

  if (/TERMINOS_ACEPTADOS/i.test(respuesta)) {
    respuesta = respuesta.replace(/TERMINOS_ACEPTADOS/gi, '').trim();
    perfil.terminosAceptados = true;
    await saveCliente(redis, tel, perfil);
    console.log(`✅ Términos y Condiciones aceptados por ${tel}`);
    try {
      const convoTrace = await prisma.waConversation.findFirst({ where: { contactPhone: tel } });
      await createTrace({
        employeeId: convoTrace?.employeeId || "SISTEMA", phone: tel, type: "WHATSAPP",
        summary: `Cliente aceptó Términos y Condiciones`,
        content: { direction: "inbound", event: "terminos_aceptados" },
        actionName: "TERMINOS_ACEPTADOS",
      });
    } catch (traceErr) { console.error("⚠️ Error en createTrace (terminos):", traceErr); }
  }

  if (/MEMBRESIA_OFRECIDA/i.test(respuesta)) {
    respuesta = respuesta.replace(/MEMBRESIA_OFRECIDA/gi, '').trim();
    perfil.membresiaOfrecida = true;
    await saveCliente(redis, tel, perfil);
    console.log(`📋 Membresía ofrecida y rechazada por ${tel} — continuar con cobro normal`);
  }

  const matchDatos = respuesta.match(/DATOS_CLIENTE\|(.+)/);
  if (matchDatos) {
    respuesta = respuesta.replace(/DATOS_CLIENTE\|.+/g, '').trim();
    const partes = matchDatos[1];
    const dirM     = partes.match(/direccion:([^|]+)/);
    const cpFiscM  = partes.match(/cp_fiscal:([^|]+)/);
    const prodM    = partes.match(/productos:([^|]+)/);
    const catM     = partes.match(/categorias:([^|]+)/);
    const notasM   = partes.match(/notas:([^|]+)/);
    const prefM    = partes.match(/preferencias:([^|]+)/);
    const cumpleM  = partes.match(/cumpleanos:([^|]+)/);
    const etapaM   = partes.match(/etapa_abandono:([^|]+)/);
    const interesM = partes.match(/intereses:([^|]+)/);

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
        perfil.vectorObjeciones = perfil.vectorObjeciones || {};
        perfil.vectorObjeciones[tipo] = (perfil.vectorObjeciones[tipo] || 0) + 1;
      } else if (nota.startsWith('cotizacion_')) {
        perfil.ultimaCotizacion = nota.replace('cotizacion_', '');
        perfil.etapaAbandono = 'cotizacion';
        perfil.fechaAbandono = new Date().toISOString();
      } else {
        perfil.notas = nota;
      }
    }
    if (prefM?.[1]?.trim())   perfil.preferencias = prefM[1].trim().split(',').map(s => s.trim());
    if (cumpleM?.[1]?.trim()) perfil.cumpleanos = cumpleM[1].trim();
    if (etapaM?.[1]?.trim()) {
      perfil.etapaAbandono = etapaM[1].trim() as any;
      if (etapaM[1].trim() !== 'null') perfil.fechaAbandono = new Date().toISOString();
      else { perfil.etapaAbandono = null; perfil.fechaAbandono = undefined; }
    }
    if (interesM?.[1]?.trim()) {
      const nuevosIntereses = interesM[1].trim().split(',').map(s => s.trim());
      perfil.interesesDeclarados = [...new Set([...(perfil.interesesDeclarados || []), ...nuevosIntereses])];
    }
    await saveCliente(redis, tel, perfil);
  }

  if (esElJefe) {

    const matchPrecio = respuesta.match(/PRECIO_UPDATE\|(.+?)\|(.+?)\|(.+?)\|(\d+)/);
    if (matchPrecio) {
      const [, cat, prod, campo, precio] = matchPrecio;
      const ok = await actualizarPrecio(
        redis, cat.trim().toLowerCase() as BodegaCategoria,
        prod.trim().toLowerCase(), campo.trim().toLowerCase() as 'menudeo' | 'mayoreo', parseInt(precio)
      );
      respuesta = respuesta.replace(/PRECIO_UPDATE\|.+/g, '').trim();
      respuesta += ok ? `\n✅ Precio de ${prod} (${cat}) actualizado.` : `\n⚠️ No encontré ese producto en ${cat}.`;
    }

    const matchProdNuevo = respuesta.match(/PRODUCTO_NUEVO\|([^|]+)\|([^|]+)\|(\d+)\|(\d+)\|([^|]+)\|?(.+)?/);
    if (matchProdNuevo) {
      const [, cat, nombre, menudeo, mayoreo, desc, unidad] = matchProdNuevo;
      await agregarProducto(redis, cat.trim().toLowerCase() as BodegaCategoria, nombre.trim(), parseInt(menudeo), parseInt(mayoreo), desc.trim(), unidad?.trim());
      respuesta = respuesta.replace(/PRODUCTO_NUEVO\|.+/g, '').trim();
      respuesta += `\n✅ Producto "${nombre.trim()}" agregado a ${cat.trim()}.`;
    }

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
      if      (campoLower === 'nombrebot')             { cfg.nombreBot = valor.trim(); respuesta += `\n✅ Nombre guardado.`; }
      else if (campoLower === 'tono')                  { cfg.tono = valor.trim(); respuesta += `\n✅ Tono actualizado.`; }
      else if (campoLower === 'fraseshombre')          { cfg.frasesDesignacionHombre = valor.trim().split(',').map(s => s.trim()); respuesta += `\n✅ Tratamiento hombres actualizado.`; }
      else if (campoLower === 'frasesmujer')           { cfg.frasesDesignacionMujer = valor.trim().split(',').map(s => s.trim()); respuesta += `\n✅ Tratamiento mujeres actualizado.`; }
      else if (campoLower === 'frasecierre' || campoLower === 'frasescierre') { cfg.fraseCierre = valor.trim(); respuesta += `\n✅ Frase cierre actualizada.`; }
      else if (campoLower === 'fraseincondicional')    { cfg.fraseIncondicional = valor.trim(); respuesta += `\n✅ Frase final actualizada.`; }
      else if (campoLower === 'emojis')                { cfg.emojisPrincipales = valor.trim(); respuesta += `\n✅ Emojis: ${valor.trim()}`; }
      else if (campoLower === 'maxlineas')             { cfg.maximoLineasRespuesta = parseInt(valor.trim()) || 4; respuesta += `\n✅ Límite: ${cfg.maximoLineasRespuesta} líneas.`; }
      else if (campoLower === 'agregarprohibida')      { cfg.fraseProhibidas.push(valor.trim()); respuesta += `\n✅ Frase prohibida agregada.`; }
      else if (campoLower === 'quitarprohibida')       { cfg.fraseProhibidas = cfg.fraseProhibidas.filter(f => !f.toLowerCase().includes(valor.trim().toLowerCase())); respuesta += `\n✅ Frase prohibida eliminada.`; }
      else if (campoLower === 'instruccionespecial')   { cfg.instruccionesEspeciales = cfg.instruccionesEspeciales ? `${cfg.instruccionesEspeciales}\n- ${valor.trim()}` : `- ${valor.trim()}`; respuesta += `\n✅ Regla especial agregada.`; }
      else if (campoLower === 'horario')               { cfg.horarioAtencion = valor.trim(); respuesta += `\n✅ Horario: ${valor.trim()}`; }
      else if (campoLower === 'infopagos')             { cfg.infoPagos = valor.trim(); respuesta += `\n✅ Info pagos actualizada.`; }
      else if (campoLower === 'infoenvios')            { cfg.infoEnvios = valor.trim(); respuesta += `\n✅ Info envíos actualizada.`; }
      else if (campoLower === 'mensajepromofinal')     { cfg.mensajePromoFinal = valor.trim(); respuesta += `\n✅ Promo final actualizada.`; }
      else { respuesta += `\n⚠️ Campo "${campo}" no reconocido.`; }
      cfg.actualizadoPor = 'Jack';
      await saveConfigBot(redis, cfg);
    }

    const matchBienvenidaAdd = respuesta.match(/BIENVENIDA_ADD\|(.+)/);
    if (matchBienvenidaAdd) {
      respuesta = respuesta.replace(/BIENVENIDA_ADD\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.frasesBienvenida.push(matchBienvenidaAdd[1].trim());
      cfg.actualizadoPor = 'Jack';
      await saveConfigBot(redis, cfg);
      respuesta += `\n✅ Bienvenida agregada. Total: ${cfg.frasesBienvenida.length} versiones.`;
    }

    const matchBienvenidaReplace = respuesta.match(/BIENVENIDA_REPLACE\|(.+)/);
    if (matchBienvenidaReplace) {
      respuesta = respuesta.replace(/BIENVENIDA_REPLACE\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.frasesBienvenida = [matchBienvenidaReplace[1].trim()];
      cfg.actualizadoPor = 'Jack';
      await saveConfigBot(redis, cfg);
      respuesta += `\n✅ Bienvenida única reemplazada.`;
    }

    const matchAviso = respuesta.match(/AVISO\|(.+)/);
    if (matchAviso) {
      respuesta = respuesta.replace(/AVISO\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.avisoGeneral = matchAviso[1].trim() === 'BORRAR' ? '' : matchAviso[1].trim();
      cfg.actualizadoPor = 'Jack';
      await saveConfigBot(redis, cfg);
      respuesta += matchAviso[1].trim() === 'BORRAR' ? `\n✅ Aviso borrado.` : `\n✅ Aviso activado.`;
    }

    const matchPromoAdd = respuesta.match(/PROMO_ADD\|([^|]+)\|([^|]+)\|([^|]+)\|(.+)/);
    if (matchPromoAdd) {
      const [, nombre, descripcion, descuento, vigencia] = matchPromoAdd;
      respuesta = respuesta.replace(/PROMO_ADD\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.promocionesActivas.push({ nombre: nombre.trim(), descripcion: descripcion.trim(), descuento: descuento.trim(), vigencia: vigencia.trim() });
      cfg.actualizadoPor = 'Jack';
      await saveConfigBot(redis, cfg);
      respuesta += `\n✅ Promoción "${nombre.trim()}" activada.`;
    }

    const matchPromoDel = respuesta.match(/PROMO_DEL\|(.+)/);
    if (matchPromoDel) {
      respuesta = respuesta.replace(/PROMO_DEL\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.promocionesActivas = cfg.promocionesActivas.filter(p => !p.nombre.toLowerCase().includes(matchPromoDel[1].trim().toLowerCase()));
      cfg.actualizadoPor = 'Jack';
      await saveConfigBot(redis, cfg);
      respuesta += `\n✅ Promoción desactivada.`;
    }

    const matchMsj = respuesta.match(/SEND_MSG\|([^|]+)\|(.+)/);
    if (matchMsj) {
      let [, targetNum, targetTxt] = matchMsj;
      targetNum = targetNum.replace(/\D/g, '');
      respuesta = respuesta.replace(/SEND_MSG\|.+/g, '').trim();
      const ok = await enviarWhatsapp(targetNum, targetTxt.trim());
      respuesta += ok ? `\n✅ Mensaje enviado al ${targetNum}.` : `\n⚠️ Meta rechazó el envío.`;
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

    if (linkStripeAutoGenerado && !respuesta.includes('https://checkout.stripe.com')) {
      respuesta += `\n\n💳 *Su link de pago seguro (Tarjeta u OXXO):*\n${linkStripeAutoGenerado}\n\n_Procesado por Stripe. Su transacción está protegida. 🐺_`;
    }

    const matchSpei = respuesta.match(/GENERAR_SPEI\|([\d.]+)/i);
    if (matchSpei) {
      const [, monto] = matchSpei;
      respuesta = respuesta.replace(/GENERAR_SPEI\|.+/g, '').trim();
      const referencia = `CT${tel.slice(-6)}${Date.now().toString().slice(-4)}`;
      perfil.intentosDePago = (perfil.intentosDePago || 0) + 1;
      perfil.etapaAbandono = 'pago';
      perfil.fechaAbandono = new Date().toISOString();
      await saveCliente(redis, tel, perfil);

      const cuentasTexto = SPEI_CUENTAS.map((c, i) =>
        `*Opción ${i + 1} — ${c.banco}*\n• Beneficiario: ${c.beneficiario}\n• CLABE: ${c.clabe}`
      ).join('\n\n');

      respuesta +=
        `\n\n🏦 *Datos para su transferencia SPEI — $${parseFloat(monto).toFixed(2)} MXN*\n\n` +
        `${cuentasTexto}\n\n` +
        `• Monto exacto: *$${parseFloat(monto).toFixed(2)} MXN*\n` +
        `• Referencia: *${referencia}*\n\n` +
        `_Una vez realizada la transferencia, comparta la captura y confirmaremos su pedido de inmediato. 🐺_`;

      try {
        const convoTrace = await prisma.waConversation.findFirst({ where: { contactPhone: tel } });
        await createTrace({
          employeeId: convoTrace?.employeeId || "SISTEMA", phone: tel, type: "WHATSAPP",
          summary: `Datos SPEI enviados al cliente por $${parseFloat(monto).toFixed(2)} MXN`,
          content: { direction: "outbound", event: "spei_generado", monto: parseFloat(monto), referencia },
          actionName: "SPEI_GENERADO",
        });
      } catch (traceErr) { console.error("⚠️ Error en createTrace (spei):", traceErr); }
    }

    const matchRecordatorio = respuesta.match(/PROGRAMAR_RECORDATORIO\|(.+?)\|(.+?)\|(.+)/i);
    if (matchRecordatorio) {
      const [, , fechaRec, mensajeRec] = matchRecordatorio;
      respuesta = respuesta.replace(/PROGRAMAR_RECORDATORIO\|.+/g, '').trim();
      if (!perfil.recordatoriosPendientes) perfil.recordatoriosPendientes = [];
      perfil.recordatoriosPendientes.push({ tipo: 'reactivacion', fecha: fechaRec.trim(), mensaje: mensajeRec.trim() });
      await saveCliente(redis, tel, perfil);
      console.log(`⏰ Recordatorio guardado para ${tel}: ${mensajeRec.trim()} en ${fechaRec.trim()}`);
    }

    const matchEnvio = respuesta.match(/CALCULAR_ENVIO\|productos=\[(.+?)\]\|cp=(.+)/i);
    if (matchEnvio) {
      const [, productosStr, cpEnvio] = matchEnvio;
      respuesta = respuesta.replace(/CALCULAR_ENVIO\|.+/g, '').trim();
      try {
        const productos: ProductoEnvio[] = JSON.parse(`[${productosStr}]`);
        const resultado = calcularEnvioReal(productos, cpEnvio.trim(), 0, false);
        respuesta += `\n\n${resultado.desglose}\n\n¿Le procesamos el pedido? Si requiere factura, indíquemelo para incluir el IVA. 🐺`;
      } catch (e) {
        respuesta += `\n\n⚠️ No pude calcular el envío. Compártame el CP y los kilos nuevamente.`;
      }
    }

    const matchEscalar = respuesta.match(/ESCALAR\|(.+)/i);
    if (matchEscalar) {
      const [, duda] = matchEscalar;
      console.log(`🆘 ESCALAMIENTO: ${duda}`);
      respuesta = respuesta.replace(/ESCALAR\|.+/g, '').trim();
      respuesta += `\n🐺 Entendido. Acabo de generar un ticket de alta prioridad. Un asesor de la Jauría tomará este chat en breve para darle atención personal.`;

      try {
        let userPrisma = await prisma.user.findFirst({ where: { phone: tel } });
        if (!userPrisma) {
          userPrisma = await prisma.user.create({
            data: {
              email: perfil.correoElectronico || `prospecto_${Date.now()}@coyotetextil.local`,
              password: "bot-generated",
              phone: tel,
              name: perfil.nombre || "Prospecto WA",
              role: "USER"
            }
          });
        }

        await prisma.ticket.create({
          data: {
            userId: userPrisma.id,
            subject: "Escalamiento WA: " + (perfil.nombre || "Cliente"),
            description: duda,
            status: "ABIERTO",
            priority: "ALTA",
          }
        });

        await prisma.waConversation.updateMany({
          where: { contactPhone: tel },
          data: {
            handledBy: "ADMIN",
            unreadCount: { increment: 1 }
          }
        });

        const convoTrace = await prisma.waConversation.findFirst({ where: { contactPhone: tel } });
        await createTrace({
          employeeId: convoTrace?.employeeId || "SISTEMA", phone: tel, type: "WHATSAPP",
          summary: `Escalamiento: ${duda.substring(0, 80)}`,
          content: { direction: "internal", event: "escalamiento", motivo: duda, clienteNombre: perfil.nombre, segmento: perfil.segmento },
          actionName: "ESCALAMIENTO_A_AGENTE",
        });
      } catch (dbErr) {
        console.error("⚠️ Error en DB durante el escalamiento:", dbErr);
      }
    }

    const matchCobro = respuesta.match(/GENERAR_COBRO\|(.+?)\|([\d.]+)\|(.+?)\|(.+?)\|(.+?)\|(.+?)\|(.+)/i);
    if (matchCobro && !linkStripeAutoGenerado) {
      const [, metodo, monto, rfc, razon, cp, regimen, uso] = matchCobro;
      respuesta = respuesta.replace(/GENERAR_COBRO\|.+/g, '').trim();
      const reqInvoice = rfc !== 'NONE' ? 'YES' : 'NO';
      const amountInCents = Math.round(parseFloat(monto) * 100);
      perfil.intentosDePago = (perfil.intentosDePago || 0) + 1;
      perfil.etapaAbandono = 'pago';
      perfil.fechaAbandono = new Date().toISOString();
      await saveCliente(redis, tel, perfil);
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card', 'oxxo'],
          line_items: [{ price_data: { currency: 'mxn', product_data: { name: 'Pedido Coyote Textil — El Coyote' }, unit_amount: amountInCents }, quantity: 1 }],
          mode: 'payment',
          success_url: 'https://wa.me/5215627301525',
          metadata: { rfc, razon, cp, regimen, uso, req_invoice: reqInvoice, phone: tel, productos: perfil.productosComprados.join(',') }
        });
        respuesta += `\n\n💳 *Su link de pago seguro (Tarjeta u OXXO):*\n${session.url}\n\n_Procesado por Stripe. Su transacción está protegida. 🐺_`;
        try {
          const convoTrace = await prisma.waConversation.findFirst({ where: { contactPhone: tel } });
          await createTrace({
            employeeId: convoTrace?.employeeId || "SISTEMA", phone: tel, type: "WHATSAPP",
            summary: `Link Stripe generado: $${parseFloat(monto).toFixed(2)} MXN (${metodo})`,
            content: { direction: "outbound", event: "stripe_link_generado", metodo, monto: parseFloat(monto), conFactura: reqInvoice === 'YES', sessionId: session.id },
            actionName: "LINK_STRIPE_GENERADO",
          });
        } catch (traceErr) { console.error("⚠️ Error en createTrace (stripe link):", traceErr); }
      } catch (err) {
        console.error('Error Stripe:', err);
        respuesta += `\n\n⚠️ Inconveniente generando el link de pago. Nuestro equipo lo revisa de inmediato.`;
      }
    } else if (matchCobro && linkStripeAutoGenerado) {
      respuesta = respuesta.replace(/GENERAR_COBRO\|.+/g, '').trim();
    }
  }

  historial.push({ role: 'assistant', content: respuesta });
  await saveHistorial(redis, tel, historial);
  console.log(`📤 Enviando a ${tel} (${respuesta.length} chars) | Temp: ${perfil.temperaturaCompra} | Táctica: ${perfil.tacticaActual}`);
  await enviarWhatsapp(tel, respuesta.trim());

  try {
    const convoTrace = await prisma.waConversation.findFirst({ where: { contactPhone: tel } });
    await createTrace({
      employeeId: convoTrace?.employeeId || "SISTEMA", phone: tel, type: "WHATSAPP",
      summary: `Respuesta del Coyote: ${respuesta.substring(0, 60)}${respuesta.length > 60 ? '...' : ''}`,
      content: { direction: "outbound", body: respuesta.trim(), tactica: perfil.tacticaActual, temperaturaCompra: perfil.temperaturaCompra, segmento: perfil.segmento },
      actionName: "RESPUESTA_BOT_COYOTE",
    });
  } catch (traceErr) { console.error("⚠️ Error en createTrace (respuesta bot):", traceErr); }

  try {
    let convoPrisma = await prisma.waConversation.findFirst({ where: { contactPhone: tel } });
    if (!convoPrisma) {
      convoPrisma = await prisma.waConversation.create({
        data: { contactPhone: tel, contactName: perfil.nombre || "Cliente Bot", isOpen: true, unreadCount: 0 }
      });
    }
    await prisma.waMessage.createMany({
      data: [
        { conversationId: convoPrisma.id, role: "CLIENT", body: msgCliente, isRead: true },
        { conversationId: convoPrisma.id, role: "AGENT",  body: respuesta.trim(), isRead: true }
      ]
    });
    await prisma.waConversation.update({
      where: { id: convoPrisma.id },
      data: { lastMessage: respuesta.trim(), lastMessageAt: new Date() }
    });
  } catch (dbErr) { console.error("⚠️ Error espejeando historial en Prisma:", dbErr); }

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
        console.error("❌ ERROR DE ENTREGA META:", JSON.stringify(statusObj.errors, null, 2));
      } else {
        console.log(`📊 Status update Meta: ${statusObj.status} (Ignorando)`);
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