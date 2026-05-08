import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Redis } from '@upstash/redis';
import Stripe from 'stripe';
import { prisma } from "@/lib/prisma";
import { determineRouting } from "@/lib/crm-router";
import { createTrace } from "@/lib/tracer";
import { shouldUseBotV2 } from "@/lib/bot/config/feature-flags";
import { handleWhatsAppWebhook as handleWhatsAppWebhookV2 } from "@/lib/bot/transports/whatsapp/adapter";

// ==========================================
// ðŸ”‘ LLAVES MAESTRAS
// ==========================================
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
});
const STRIPE_CHECKOUT_WEBHOOK_SECRET = process.env.STRIPE_CHECKOUT_WEBHOOK_SECRET;
const FACTURAPI_LIVE_SECRET_KEY = process.env.FACTURAPI_LIVE_SECRET_KEY;
const facturapiAuth = Buffer.from(`${FACTURAPI_LIVE_SECRET_KEY}:`).toString('base64');
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ==========================================
// â±ï¸ TIMEOUT DE AGENTE â€” 15 MINUTOS
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
      console.log(`â±ï¸ Agente silencioso por ${Math.round(silencioMs / 60000)} min. Bot retoma.`);
    }
    return agenteActivo;
  } catch (err) {
    console.error("âš ï¸ Error verificando actividad del agente:", err);
    return false;
  }
}

// ==========================================
// ðŸ¦ DATOS SPEI
// ==========================================
const SPEI_CUENTAS = [
  { banco: "BBVA",      clabe: "012180015657512129", beneficiario: "Jack Rizk Cabrera" },
  { banco: "Santander", clabe: "014180606262821861", beneficiario: "Jack Rizk Cabrera" },
  { banco: "Banamex",   clabe: "002180702340784354", beneficiario: "Jack Rizk Cabrera" },
];

// ==========================================
// ðŸ”§ REDIS â€” instancia Ãºnica por request (FIX: evitar mÃºltiples instancias)
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
// RATE LIMITER â€” mÃ¡x 8 mensajes por minuto por telÃ©fono
// ==========================================
async function checkRateLimit(redis: Redis, tel: string): Promise<boolean> {
  const windowKey = `rate:${tel}:${Math.floor(Date.now() / 60000)}`;
  try {
    const count = await redis.incr(windowKey);
    if (count === 1) await redis.expire(windowKey, 120);
    if (count > 8) {
      console.warn(`ðŸš¦ Rate limit alcanzado para ${tel} (${count} msgs/min)`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('âš ï¸ Error en rate limit check:', err);
    return true;
  }
}

// ==========================================
// ðŸŽ›ï¸ CONFIGURACIÃ“N DINÃMICA
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
Tono: profesional con energÃ­a y dinamismo B2B. Directo, resolutivo y con urgencia comercial genuina.
Estilo: frases cortas y contundentes. Cada mensaje debe empujar hacia el cierre.
PROHIBIDO: tutear al cliente, lenguaje coloquial, frases de relleno ("con gusto", "por supuesto", "claro que sÃ­").
OBLIGATORIO: precio en cada cotizaciÃ³n, propuesta concreta al final de cada mensaje, costo por prenda cuando aplique.`,
  // NUEVO: bienvenida pide nombre Y correo juntos desde el primer mensaje
  frasesBienvenida: [
    'Bienvenido a *Coyote Textil*. Soy *El Coyote* ðŸº, su asesor especializado disponible 24/7.\n\nðŸ“‹ TÃ©rminos: https://www.coyotetextil.com/terms\nðŸ”’ Privacidad: https://www.coyotetextil.com/privacy\n\nPara darle una atenciÃ³n precisa y verificar su cuenta, Â¿me comparte su *nombre* y *correo electrÃ³nico*?\n\n_(Ejemplo: Juan GarcÃ­a, juan@empresa.com)_'
  ],
  frasesDesignacionHombre: ['seÃ±or', 'estimado', 'licenciado'],
  frasesDesignacionMujer: ['seÃ±ora', 'seÃ±orita', 'estimada'],
  fraseCierre: 'Vestimos la fuerza de MÃ©xico en cada hilo. Ha sido un placer atenderle â€” El Coyote y todo el equipo de Coyote Textil quedan a su entera disposiciÃ³n. ðŸº',
  fraseIncondicional: 'Nuestras operaciones no se detienen. Soy El Coyote y permanezco siempre activo para respaldar la logÃ­stica de su negocio, a cualquier hora. ðŸº',
  emojisPrincipales: 'ðŸºðŸ“¦ðŸ¤',
  maximoLineasRespuesta: 4,
  fraseProhibidas: [
    'Te enviarÃ© los detalles', 'EnviarÃ© la cotizaciÃ³n', 'ProcederÃ©',
    'Â¿Algo mÃ¡s en lo que pueda asistirte?', 'te mando', 'te envÃ­o', 'te hago llegar',
    'tÃº', 'oye', 'dale', 'Ã³rale',
    'patrÃ³n', 'patrona', 'jefe', 'cuate', 'chambeando', 'desvielado', 'jalando',
    'Como asistente de IA', 'Como IA', 'soy una inteligencia artificial', 'soy un bot', 'soy un asistente virtual',
    'Con gusto le ayudo', 'DÃ©jeme revisar', 'Por supuesto', 'Claro que sÃ­',
    'Â¿En quÃ© mÃ¡s le puedo ayudar?',
    'voy a revisar', 'dÃ©jeme verificar', 'permÃ­tame consultar', 'voy a confirmar',
    'en un momento le confirmo', 'dÃ©me un momento', 'espere un momento',
    'voy a preguntar', 'le pregunto al equipo', 'consulto con bodega',
    'revisarÃ© disponibilidad', 'verifico el stock', 'checo con el equipo',
    'Un momento mientras genero',
    'Un momento mientras proceso',
    'Un momento mientras preparo',
    'Un momento mientras calculamos',
    'Un momento mientras obtenemos',
    'Un momento, por favor',
    'Un momento.',
    'Procesando su solicitud',
    'Procesando su pago',
    'Generando su link',
    'Procesaremos su pago',
    'procederemos con su',
    'Vamos a calcular',
    'vamos a procesar',
    'Procedemos a calcular',
    'Procedemos a generar',
    'a calcular el envÃ­o',
    'calcularÃ© el envÃ­o',
    'generarÃ© el link',
    'le genero el link',
    'le proceso el pago',
  ],
  instruccionesEspeciales: '',
  productosExtra: [],
  promocionesActivas: [],
  infoPagos: '',
  infoEnvios: '',
  mensajePromoFinal: '',
  avisoGeneral: '',
  horarioAtencion: '24/7 los 365 dÃ­as del aÃ±o',
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
  console.log('âœ… Config El Coyote actualizada:', JSON.stringify(config).slice(0, 300));
}

// ==========================================
// ðŸ“¦ TIPOS DE DATOS
// ==========================================
interface ClientePerfil {
  nombre: string;
  correoElectronico?: string;
  correoVerificado?: boolean;
  privacidadAceptada?: boolean;
  privacidadRespondida?: boolean;
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
  ultimaCotizacionObj?: {
    productos: string;
    kg: number;
    subtotal: number;
    subtotalConEnvio: number;
    subtotalConEnvioConIva: number;
    cp: string;
    direccion: string;
    conFactura: boolean;
    rfc?: string;
    razon?: string;
    regimen?: string;
    uso?: string;
    fecha: string;
  };
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
// ðŸ§  MOTOR DE APRENDIZAJE
// ==========================================
async function analizarPatronesCliente(
  redis: Redis,
  perfil: ClientePerfil,
  msgActual: string,
  historial: Array<{ role: string; content: string }>
): Promise<ClientePerfil> {
  const senalesCalientes = [
    /cuÃ¡nto cuesta|precio|cuanto vale|cotiz|presupuesto/i,
    /quiero|necesito|me interesa|me llevo|pedido/i,
    /cuÃ¡ndo llega|tiempo de entrega|envÃ­o|flete/i,
    /pago|tarjeta|oxxo|spei|transferencia|deposito/i,
    /disponible|tienen en stock|hay en/i,
    /metro|kilo|rollo|pieza|cono|caja/i,
  ];
  const senalesFrias = [
    /solo viendo|nada mÃ¡s|solo pregunto|para saber/i,
    /muy caro|no tengo|sin dinero|ahorita no/i,
    /lo pienso|despuÃ©s|maÃ±ana|luego/i,
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
      perfil.prediccionSiguientePedido = `Pronto pedirÃ¡ ${favorito} (ciclo ${ciclo} dÃ­as, van ${diasDesde} dÃ­as)`;
    }
  }

  if (!perfil.propensionCross) perfil.propensionCross = { hilos: 20, elasticos: 10, volumenExtra: 15 };
  const pidioTela = /tela|piquÃ©|panal|torneo|kyoto|athlos|brock|apolo|horous|micro|sportok|felpa|flanel|polar/i.test(msgActual);
  const pidioUniforme = /uniforme|deportiv|pants|short|pantalon|sudadera/i.test(msgActual);
  if (pidioTela) perfil.propensionCross.hilos = Math.min(90, perfil.propensionCross.hilos + 25);
  if (pidioUniforme) perfil.propensionCross.elasticos = Math.min(90, perfil.propensionCross.elasticos + 30);

  const mensajesPositivos = historial.filter(m =>
    m.role === 'user' && /gracias|perfecto|excelente|muy bien|de acuerdo|listo/i.test(m.content)
  ).length;
  const mensajesNegativos = historial.filter(m =>
    m.role === 'user' && /caro|no me convence|lo pienso|otro proveedor|mÃ¡s barato/i.test(m.content)
  ).length;
  perfil.nivelConfianza = Math.min(100, Math.max(0,
    (perfil.nivelConfianza ?? 40) + (mensajesPositivos * 5) - (mensajesNegativos * 8)
  ));

  if (perfil.totalCompras >= 2 && perfil.ultimaFechaCompra && perfil.primerContacto) {
    const diasTotal = (new Date(perfil.ultimaFechaCompra).getTime() - new Date(perfil.primerContacto).getTime()) / 86400000;
    perfil.diasEntreCompras = Math.round(diasTotal / (perfil.totalCompras - 1));
    const favs = perfil.productosFavoritos?.slice(0, 2).join(' + ') || 'varios';
    perfil.patronCompra = `Compra cada ~${perfil.diasEntreCompras} dÃ­as. Favorito: ${favs}. Ticket promedio: $${perfil.ticketPromedio?.toFixed(0) || 'N/A'}`;
  }

  await saveCliente(redis, perfil.telefono, perfil);
  return perfil;
}

// FIX: condiciones evaluadas ANTES del await â€” evita llamada innecesaria
async function generarResumenSemantico(
  historial: Array<{ role: string; content: string }>,
  perfil: ClientePerfil
): Promise<string> {
  if (historial.length < 5) return perfil.resumenSemantico || '';
  const mod = historial.length % 10;
  if (mod !== 0 && mod !== 1) return perfil.resumenSemantico || '';
  try {
    const ultimos = historial.slice(-40).map(m => `${m.role === 'user' ? 'Cliente' : 'Coyote'}: ${m.content}`).join('\n');
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Eres un extractor de memoria para un bot de ventas textil. Resume en 5 lÃ­neas mÃ¡ximo los puntos clave de esta conversaciÃ³n: quÃ© quiso comprar, quÃ© objeciones tuvo, en quÃ© etapa quedÃ³, quÃ© cotizaciones se dieron, y cualquier dato crÃ­tico del cliente. SÃ‰ MUY CONCRETO. No uses bullet points.\n\nConversaciÃ³n:\n${ultimos}`
      }],
      max_tokens: 200,
      temperature: 0,
    });
    return res.choices[0].message.content?.trim() || '';
  } catch { return perfil.resumenSemantico || ''; }
}

function detectarIntencionPago(
  msgCliente: string,
  historial: Array<{ role: string; content: string }>,
  perfil?: ClientePerfil
): { detectado: boolean; metodo: 'tarjeta' | 'oxxo' | null; montoEstimado: number | null } {
  const quereTarjeta = /tarjeta|visa|mastercard|crÃ©dito|dÃ©bito|card/i.test(msgCliente);
  const quereOxxo = /oxxo|efectivo/i.test(msgCliente);
  const quereSpei = /spei|transferencia|depÃ³sito|deposito|clabe/i.test(msgCliente);
  const intenciones = [
    /\b(pago|pagar|pa[gq]ue|quiero pagar|cÃ³mo pago|link de pago|mÃ¡ndame el link|manda el link|mÃ¡ndame el cobro)\b/i,
    /\b(le entro|cerramos|lo quiero|me lo llevo|apÃ¡rtame|apartame)\b/i,
    /\b(cuÃ¡nto|cuanto) (me cobras|es|total|debo|pago)\b/i,
  ];
  const detectado = intenciones.some(r => r.test(msgCliente)) && !quereSpei;
  if (!detectado) return { detectado: false, metodo: null, montoEstimado: null };
  const metodo = quereTarjeta ? 'tarjeta' : quereOxxo ? 'oxxo' : 'tarjeta';

  if (perfil?.ultimaCotizacionObj) {
    const obj = perfil.ultimaCotizacionObj;
    const monto = obj.conFactura ? obj.subtotalConEnvioConIva : obj.subtotalConEnvio;
    if (monto > 0) return { detectado, metodo, montoEstimado: monto };
  }

  let montoEstimado: number | null = null;
  for (let i = historial.length - 1; i >= 0; i--) {
    const m = historial[i];
    if (m.role !== 'assistant') continue;
    const matchTotalLine = m.content.match(/TOTAL[:\s]*\$?\s*([\d,]+(?:\.\d{2})?)/i);
    if (matchTotalLine) {
      const val = parseFloat(matchTotalLine[1].replace(/,/g, ''));
      if (val > 500) { montoEstimado = val; break; }
    }
    const matchMonto = m.content.match(/\$\s*([\d,]+(?:\.\d{2})?)\s*MXN/i);
    if (matchMonto) {
      const val = parseFloat(matchMonto[1].replace(/,/g, ''));
      if (val > 500) { montoEstimado = val; break; }
    }
  }
  return { detectado, metodo, montoEstimado };
}

// ==========================================
// ðŸšš LOGÃSTICA
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
  const cpLimpio = cpEnvio.replace(/\D/g, '').padStart(5, '0').slice(0, 5);
  const cpValido = /^\d{5}$/.test(cpLimpio) && parseInt(cpLimpio) > 0;
  if (!cpValido) console.warn(`âš ï¸ CP invÃ¡lido recibido: "${cpEnvio}" â†’ usando Skydropx como fallback`);
  // FIX: advertir si subtotal es 0 pero continuar calculando
  if (!subtotal || subtotal <= 0) console.warn(`âš ï¸ CALCULAR_ENVIO subtotal=${subtotal} â€” desglose mostrarÃ¡ $0 en productos`);
  const cpFinal = cpValido ? cpLimpio : '99999';

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

  const prefix2 = Math.floor(parseInt(cpFinal) / 1000);
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
ðŸ“¦ *Desglose de su cotizaciÃ³n*
â€¢ Subtotal productos: $${subtotal.toFixed(2)} MXN
â€¢ Flete (manejo de bultos): $${flete.toFixed(2)}
â€¢ Traslado (${tipoEnvio === 'COYOTE' ? `flotilla Coyote, ${distanciaKm} km` : 'Skydropx nacional'}): $${traslado.toFixed(2)}
â€¢ Tarifa de servicio: $${tarifa.toFixed(2)}
â€¢ Base: $${base.toFixed(2)}
${requiereFactura ? `â€¢ IVA 16%: $${iva.toFixed(2)}` : ''}
â€¢ *TOTAL: $${total.toFixed(2)} MXN*
  `.trim();

  return { totalKilos, totalRollos, flete, traslado, vehiculos, tarifaServicio: tarifa, base, iva, total, desglose };
}

// ==========================================
// ðŸ§  MEMORIA
// ==========================================
async function getHistorial(redis: Redis, tel: string) {
  try { return (await redis.get<Array<{ role: string; content: string }>>(`historial:${tel}`)) || []; }
  catch { return []; }
}
async function saveHistorial(redis: Redis, tel: string, h: Array<{ role: string; content: string }>) {
  const trimmed = h.length > 80 ? h.slice(-80) : h;
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
  // FIX: resetear membresiaOfrecida tras cada compra para volver a ofertar en la siguiente venta
  cliente.membresiaOfrecida = false;
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
// ðŸ† VERIFICAR MEMBRESÃA DE SOCIO
// FIX: early return si ya estÃ¡ en perfil â€” evita doble query a Prisma
// ==========================================
async function verificarMembresia(tel: string, perfil?: ClientePerfil): Promise<{ activa: boolean; plan?: string }> {
  if (perfil?.tieneSuscripcion) return { activa: true, plan: perfil.planMembresia };
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
// ðŸª BODEGA â€” TELAS (precio por KILO, rollo = 25 kg)
// ==========================================
const PRECIOS_TELAS_DEFAULT: Record<string, { menudeo: number; mayoreo: number; info: string }> = {
  "alaska":               { menudeo: 175, mayoreo: 170, info: "100% PoliÃ©ster 140g. SublimaciÃ³n de alta definiciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "andromeda":            { menudeo: 155, mayoreo: 150, info: "100% PoliÃ©ster 140g. SublimaciÃ³n premium. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "apolo":                { menudeo: 160, mayoreo: 155, info: "100% PoliÃ©ster 150g. Resistencia superior anti-pilling. Rend. 3.7m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "ares":                 { menudeo: 135, mayoreo: 130, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "athlos":               { menudeo: 125, mayoreo: 120, info: "100% PoliÃ©ster 145g. Versatilidad total. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "azucena":              { menudeo: 95,  mayoreo: 90,  info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "brock":                { menudeo: 155, mayoreo: 150, info: "100% PoliÃ©ster 145g. Versatilidad total. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "brush":                { menudeo: 120, mayoreo: 115, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "capriati":             { menudeo: 135, mayoreo: 130, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "caprice":              { menudeo: 140, mayoreo: 135, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "delta":                { menudeo: 175, mayoreo: 170, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "f30":                  { menudeo: 135, mayoreo: 130, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "granizo":              { menudeo: 115, mayoreo: 110, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "horous":               { menudeo: 160, mayoreo: 155, info: "100% PoliÃ©ster 145g. Moda deportiva urbana. Rend. 4.2m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "inter 70":             { menudeo: 140, mayoreo: 135, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "kyoto":                { menudeo: 155, mayoreo: 150, info: "100% PoliÃ©ster 145g. Tacto seda, caÃ­da premium. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "madelino":             { menudeo: 155, mayoreo: 150, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "micro estrella":       { menudeo: 145, mayoreo: 140, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "micro panal":          { menudeo: 110, mayoreo: 105, info: "100% PoliÃ©ster 145g. MÃ¡xima transpiraciÃ³n y ligereza. Rend. 4.3m/kg. Ancho 1.60m. +40 colores: Blanco, Negro, Rojo, Azul Rey, Navy Blue, Oxford, Gris Medio, Perla, Vino, Fiusha, Menta, Aqua, Turquesa, Verde Bandera, Verde Botella, Verde Militar, Canario, Mango, Mostaza, Naranja, Naranja NeÃ³n, Verde NeÃ³n, Amarillo NeÃ³n, Rosa NeÃ³n, Rosa Baby, Palo de Rosa, Rosa Pastel, Lila, Uva, PetrÃ³leo, Cielo, Magenta, Camel, Kaki, Oro Viejo, Gris Baby, Azul Francia, Light Blue, Botella, Medio." },
  "micropique":           { menudeo: 100, mayoreo: 95,  info: "100% PoliÃ©ster 145g. Dry-Fit alto rendimiento calidad Gold. Rend. 4.3m/kg. Ancho 1.60m. +38 colores: Blanco, Negro, Rojo, Azul Rey, Navy Blue, Light Navy, Dark Navy, Oxford, Gris Medio, Gris Perla, Vino, Fiusha, Rosa Baby, Rosa NeÃ³n, Menta, Aqua, Turquesa, Verde Bandera, Verde Botella, Canario, Mango, Mostaza, Naranja, Naranja NeÃ³n, Verde NeÃ³n, Azul Francia, Uva, Uva M, PetrÃ³leo, Camel, Kaki, Beige, Bugambilia, Azul Acero, Oro Viejo, Rosa Palo, Cielo, Amarillo." },
  "micropique fusionado": { menudeo: 150, mayoreo: 145, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "miky":                 { menudeo: 135, mayoreo: 130, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "monaco":               { menudeo: 155, mayoreo: 150, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "nagasaky":             { menudeo: 135, mayoreo: 130, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "panal nitro":          { menudeo: 185, mayoreo: 180, info: "100% PoliÃ©ster 145g. Control de humedad extremo. Rend. 4.2m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "panal plus":           { menudeo: 155, mayoreo: 150, info: "100% PoliÃ©ster 145g. Mayor cuerpo y estructura. Rend. 3.7m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "phoenix":              { menudeo: 95,  mayoreo: 90,  info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "pique lacoste":        { menudeo: 140, mayoreo: 135, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "piquÃ© vera":           { menudeo: 110, mayoreo: 105, info: "100% PoliÃ©ster 145g. Dry-Fit textura suave. Rend. 4.3m/kg. Ancho 1.60m. +34 colores: Blanco, Negro, Rojo, Azul Rey, Light Navy, Dark Navy, Oxford, Gris Medio, Gris Perla, Vino, Fiusha, Rosa Baby, Rosa Pastel, Palo Rosa, Menta, Aqua, Turquesa, Verde Bandera, Verde Botella, Canario, Mango, Mostaza, Naranja, Verde NeÃ³n, Amarillo NeÃ³n, Rosa NeÃ³n, Magenta, Lila, Uva, PetrÃ³leo, Caqui, Camel, Oro Viejo, Cielo." },
  "pique vera sport":     { menudeo: 140, mayoreo: 135, info: "100% PoliÃ©ster 145g. Versatilidad total. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "pixel":                { menudeo: 155, mayoreo: 150, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "saturno":              { menudeo: 165, mayoreo: 160, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "super trix":           { menudeo: 175, mayoreo: 170, info: "100% PoliÃ©ster 140g. Deportiva sublimaciÃ³n. Rend. 4.0m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "torneo":               { menudeo: 125, mayoreo: 120, info: "100% PoliÃ©ster 150g. EstÃ¡ndar de durabilidad para torneos exigentes. Rend. 4.3m/kg. Ancho 1.60m. Colores principales disponibles." },
  "felpa china":  { menudeo: 110, mayoreo: 105, info: "50% AlgodÃ³n / 50% PoliÃ©ster 280g. Cara lisa + reverso afelpado. Rend. 2.2m/kg. Ancho 1.60m. Rollo 25 kg. Colores: Marino, Negro, Blanco, Azul Rey, Vino, Rojo, Jaspe Perla, Oxford Jaspe." },
  "felpa spun":   { menudeo: 110, mayoreo: 105, info: "100% PoliÃ©ster 280g. Alto volumen y suavidad. Rend. 2.5m/kg. Ancho 1.90m. Rollo 25 kg. Colores: Blanco, Rojo, Marino, Negro, Azul Rey, Vino." },
  "flanel":       { menudeo: 125, mayoreo: 120, info: "100% PoliÃ©ster 260g. Ultra suave afelpado. Ideal para pijamas y ropa de descanso. Rend. 2.4m/kg. Ancho 1.60m. Rollo 27 kg. Colores: Blanco, Vino, Marino, Negro, Fiusha, Palo Rosa, Rosa Pastel, Azul Rey, Naranja, Rojo." },
  "polar":        { menudeo: 120, mayoreo: 115, info: "100% PoliÃ©ster 280g. TÃ©rmico anti-pilling. Rend. 2.5m/kg. Ancho 1.60m. Rollo 25 kg. Colores: Verde Botella, Verde Militar, Palo Rosa, Azul Rey, Vino, Marino, Fiusha, Negro, Rojo, Blanco." },
  "jumanji":          { menudeo: 145, mayoreo: 140, info: "PoliÃ©ster/Spandex 180g. Alta elasticidad y recuperaciÃ³n. Rend. 3.5m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "licra liluna":     { menudeo: 135, mayoreo: 130, info: "PoliÃ©ster/Spandex 180g. Alta elasticidad. Rend. 3.5m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "licra playera":    { menudeo: 130, mayoreo: 125, info: "PoliÃ©ster/Spandex 180g. Alta elasticidad. Rend. 3.5m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "licra poliÃ©ster":  { menudeo: 145, mayoreo: 140, info: "PoliÃ©ster/Spandex 180g. Alta elasticidad. Rend. 3.5m/kg. Ancho 1.60m. Colores: Blanco, Negro, Rojo, Azul Rey, Marino." },
  "licra saludable":  { menudeo: 140, mayoreo: 135, info: "PoliÃ©ster/Spandex 180g. Alta elasticidad. Rend. 3.5m/kg. Ancho 1.60m. Colores: Blanco, Negro, Rojo, Azul Rey, Marino, Militar, Perla Jaspe, Oxford Jaspe." },
  "mercury":          { menudeo: 160, mayoreo: 155, info: "PoliÃ©ster/Spandex 180g. Alta elasticidad premium. Rend. 3.5m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "microtrix":        { menudeo: 150, mayoreo: 145, info: "PoliÃ©ster/Spandex 180g. Alta elasticidad. Rend. 3.5m/kg. Ancho 1.60m. Color Ãºnico por rollo." },
  "sportok": { menudeo: 80, mayoreo: 75, info: "100% PoliÃ©ster interior afelpado 260g. EstÃ¡ndar para pants, sudaderas y uniformes escolares. Rend. 2.4m/kg. Ancho 1.60m. Rollo 25 kg. +48 colores: Blanco, Negro, Marino, Rojo, Azul Rey, Francia, Marino Claro, Oxford, Medio, Gris Baby, Perla, Vino, Fiusha, Bugambilia, Lila, Uva, Morado, Aqua, Menta, Turquesa, Cielo, Rosa Baby, Rosa Pastel, Palo de Rosa, Magenta, PetrÃ³leo, Militar, Botella, Bandera, Caqui, Camel, Beige, CafÃ©, Mostaza, Oro Viejo, Mango, Canario, Naranja, Rojo Quemado, Verde NeÃ³n, Amarillo NeÃ³n, Naranja NeÃ³n, Rosa NeÃ³n, Pistache, Manzana, Acero." },
};

// ==========================================
// ðŸ“ BODEGA â€” TELAS POR METRO
// ==========================================
const PRECIOS_TELAS_METRO_DEFAULT: Record<string, { menudeo: number; mayoreo: number; info: string; metrosPorRollo: number }> = {
  "diablo": {
    menudeo: 88, mayoreo: 83,
    info: "100% Nylon Alta Tenacidad 220g. Uso rudo, resistente a la abrasiÃ³n. Ideal para equipo tÃ¡ctico y calzado. Ancho 1.50m. Rollo = 50 m. Colores: Perla, Marino, Vino, Blanco, Azul Rey, Rojo, Negro, Oxford.",
    metrosPorRollo: 50,
  },
  "lycra metÃ¡lica": {
    menudeo: 50, mayoreo: 45,
    info: "100% PoliÃ©ster 145g. Acabado brillante metÃ¡lico. Ideal para prendas escÃ©nicas, deportivas y disfraces. Ancho 1.60m. Rollo = 98 m. Colores: Oro, Plata, Naranja, Rojo, Azul Rey, Turquesa, Perla, Verde Bandera, Verde Manzana, Rosa Pastel, Fiusha, Blanco, Negro.",
    metrosPorRollo: 98,
  },
};

// ==========================================
// ðŸ§µ BODEGA â€” HILOS
// ==========================================
const PRECIOS_HILOS_DEFAULT: Record<string, { menudeo: number; mayoreo: number; info: string; unidad: string }> = {
  "hilo kingtex 40/2": {
    menudeo: 29, mayoreo: 25,
    info: "100% PoliÃ©ster Fibra Corta. 5,000m por cono. Alta velocidad industrial. Caja de 120 piezas. Precio mayoreo aplica por caja completa. +70 colores disponibles.",
    unidad: "pieza/cono"
  },
};

// ==========================================
// ðŸ”© BODEGA â€” ELÃSTICOS
// ==========================================
const PRECIOS_ELASTICOS_DEFAULT: Record<string, { menudeo: number; mayoreo: number; info: string; unidad: string }> = {
  "elÃ¡stico beisbolero 2Â½\"": { menudeo: 19, mayoreo: 19, info: "100% PoliÃ©ster/Caucho. 6.5 cm de ancho. Ideal para cinturas y uniformes deportivos. Venta por metro. Rollo = 50 metros. Colores: Blanco, Negro.", unidad: "metro" },
  "elÃ¡stico 3 ligas":         { menudeo: 80,  mayoreo: 80,  info: "Rollo de 50 cm. PoliÃ©ster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elÃ¡stico 5 ligas":         { menudeo: 100, mayoreo: 100, info: "Rollo de 50 cm. PoliÃ©ster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elÃ¡stico 7 ligas":         { menudeo: 110, mayoreo: 110, info: "Rollo de 50 cm. PoliÃ©ster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elÃ¡stico 10 ligas":        { menudeo: 100, mayoreo: 100, info: "Rollo de 50 cm. PoliÃ©ster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elÃ¡stico 12 ligas":        { menudeo: 110, mayoreo: 110, info: "Rollo de 50 cm. PoliÃ©ster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elÃ¡stico 16 ligas":        { menudeo: 80,  mayoreo: 80,  info: "Rollo de 50 cm. PoliÃ©ster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elÃ¡stico 20 ligas":        { menudeo: 100, mayoreo: 100, info: "Rollo de 50 cm. PoliÃ©ster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elÃ¡stico 25 ligas":        { menudeo: 100, mayoreo: 100, info: "Rollo de 50 cm. PoliÃ©ster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elÃ¡stico 30 ligas":        { menudeo: 120, mayoreo: 120, info: "Rollo de 50 cm. PoliÃ©ster/Caucho. Colores: Blanco, Negro.", unidad: "pieza (50cm)" },
  "elÃ¡stico jareta 3 cm":     { menudeo: 140, mayoreo: 140, info: "Cono. ElÃ¡stico con jareta. Ideal para blusas y pantalones. Color: Blanco.", unidad: "cono" },
  "elÃ¡stico jareta 4 cm":     { menudeo: 145, mayoreo: 145, info: "Cono. ElÃ¡stico con jareta. Ideal para blusas y pantalones. Color: Blanco.", unidad: "cono" },
};

// ==========================================
// ðŸª BODEGA UNIFICADA
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
  console.log(`âœ… Producto agregado a ${categoria}: ${nombre}`);
  return true;
}

async function eliminarProducto(redis: Redis, categoria: BodegaCategoria, nombre: string) {
  const bodega = await getBodega(redis);
  const key = nombre.toLowerCase();
  const cat = bodega[categoria] as any;
  if (!cat[key]) return false;
  delete cat[key];
  await redis.set('bodega_coyote_v3', bodega);
  console.log(`ðŸ—‘ï¸ Producto eliminado de ${categoria}: ${nombre}`);
  return true;
}

// ==========================================
// ðŸ“² ENVIAR WHATSAPP â€” reintentos con backoff
// ==========================================
async function enviarWhatsapp(to: string, body: string, retries = 2): Promise<boolean> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body } })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`âœ… WA enviado a ${to}${attempt > 0 ? ` (intento ${attempt + 1})` : ''}`);
        return true;
      }
      console.error(`âŒ META ERROR (intento ${attempt + 1}/${retries + 1}):`, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`âŒ Error de red enviando WA (intento ${attempt + 1}/${retries + 1}):`, err);
    }
    if (attempt < retries) {
      const waitMs = 1000 * (attempt + 1);
      console.log(`â³ Reintentando en ${waitMs}ms...`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
  console.error(`âŒ WA fallÃ³ definitivamente para ${to} despuÃ©s de ${retries + 1} intentos`);
  return false;
}

// ==========================================
// ðŸ¦ STRIPE WEBHOOK
// ==========================================
async function handleStripeWebhook(rawBody: string, signature: string) {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_CHECKOUT_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('âš ï¸ Error verificando firma de Stripe:', err.message);
    return NextResponse.json({ error: 'Firma invÃ¡lida' }, { status: 400 });
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
      let msg = `ðŸº *El Coyote le confirma.* Buen dÃ­a, ${nombreCliente}. Su pago de *$${monto} MXN* fue procesado exitosamente. âœ…\n\nðŸŽ« *Su ticket digital:*\n${urlTicket}\n\nðŸ“¦ Su pedido ya entrÃ³ a bodega. En breve le confirmamos la salida.`;

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
              items: [{ product: { description: "Telas y AvÃ­os de Alto Rendimiento Coyote Textil", product_key: "11162100", price: precioBase, taxes: [{ type: "IVA", rate: 0.16 }] }, quantity: 1 }],
              use: metadata.uso, payment_form: formaPago, payment_method: "PUE"
            })
          });
          const factura = await invRes.json();
          if (invRes.ok) msg += `\n\nðŸ§¾ *Su factura CFDI 4.0 ya estÃ¡ timbrada.*\nhttps://www.facturapi.io/v2/invoices/${factura.id}/pdf`;
          else msg += `\n\nâš ï¸ El SAT presentÃ³ un inconveniente con un dato. Nuestro equipo lo revisa de inmediato.`;
        } catch (e) {
          msg += `\n\nâš ï¸ Intermitencia momentÃ¡nea con el SAT. Su factura le llegarÃ¡ en breve.`;
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
      } catch (traceErr) { console.error("âš ï¸ Error en createTrace (stripe):", traceErr); }

      await enviarWhatsapp(tel, msg);
    }
  }
  return NextResponse.json({ received: true });
}

// ==========================================
// ðŸ’¬ WHATSAPP WEBHOOK
// ==========================================
async function handleWhatsappWebhook(body: any) {
  const entry = body?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;

  if (value?.statuses && !value?.messages) {
    console.log('ðŸ“Š NotificaciÃ³n de estado recibida, ignorando.');
    return;
  }

  const mensajes = value?.messages;
  if (!mensajes || mensajes.length === 0) {
    console.log('âš ï¸ Payload sin mensajes:', JSON.stringify(body).slice(0, 300));
    return;
  }

  const mensajeInfo = mensajes[0];

  if (mensajeInfo.type !== 'text') {
    const tiposConAcuse: Record<string, string> = {
      image:    'ðŸº RecibÃ­ su imagen. Para atenderle mejor, Â¿me describe quÃ© producto necesita o quÃ© consulta tiene?',
      document: 'ðŸº RecibÃ­ su documento. Â¿Me indica quÃ© necesita que revisemos?',
      audio:    'ðŸº RecibÃ­ su nota de voz. Por el momento solo proceso mensajes de texto â€” Â¿me escribe quÃ© necesita?',
      video:    'ðŸº RecibÃ­ su video. Para continuar, Â¿me describe quÃ© producto o necesidad tiene?',
    };
    const ackMsg = tiposConAcuse[mensajeInfo.type];
    if (ackMsg) {
      let telMedia = mensajeInfo.from as string;
      if (telMedia && telMedia.startsWith("521") && telMedia.length === 13) {
        telMedia = telMedia.replace(/^521/, "52");
      }
      if (telMedia) {
        console.log(`ðŸ“Ž Tipo de mensaje "${mensajeInfo.type}" recibido de ${telMedia} â€” enviando acuse`);
        await enviarWhatsapp(telMedia, ackMsg);
      }
    } else {
      console.log(`â­ï¸ Tipo de mensaje ignorado silenciosamente: ${mensajeInfo.type}`);
    }
    return;
  }

  // FIX: instancia Redis Ãºnica para todo el flujo del mensaje
  const redis = getRedis();

  // DeduplicaciÃ³n
  const messageId = mensajeInfo.id;
  if (messageId) {
    const dedupeKey = `processed_msg:${messageId}`;
    try {
      const yaProcessado = await redis.get(dedupeKey);
      if (yaProcessado) {
        console.log(`âš ï¸ Mensaje duplicado detectado y descartado: ${messageId}`);
        return;
      }
      await redis.set(dedupeKey, '1', { ex: 300 });
    } catch (dedupeErr) {
      console.error('âš ï¸ Error en deduplication check:', dedupeErr);
    }
  }

  let tel = mensajeInfo.from;
  if (tel && tel.startsWith("521") && tel.length === 13) {
    tel = tel.replace(/^521/, "52");
    console.log(`ðŸ§¹ NÃºmero mexicano limpiado: convertido a ${tel}`);
  }

  const msgCliente = mensajeInfo.text?.body;
  if (!tel || !msgCliente) {
    console.log('âš ï¸ Mensaje sin telÃ©fono o sin body:', JSON.stringify(mensajeInfo));
    return;
  }

  console.log(`\n${'='.repeat(60)}\nðŸ’¬ MENSAJE â€” Tel: ${tel} | "${msgCliente}"\n${'='.repeat(60)}\n`);

  // Rate limit (reutiliza misma instancia Redis)
  const permitido = await checkRateLimit(redis, tel);
  if (!permitido) {
    console.warn(`ðŸš¦ Mensaje de ${tel} descartado por rate limit`);
    return;
  }

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
          } catch (traceErr) { console.error("âš ï¸ Error en createTrace (route_to_agent):", traceErr); }
          console.log(`âœ… Agente activo â€” mensaje guardado. Bot en espera.`);
          return;
        }

        console.log(`ðŸº Agente silencioso >15 min. El Coyote retoma la conversaciÃ³n de ${tel}.`);
        try {
          await prisma.$transaction([
            prisma.waMessage.create({ data: { conversationId: currentConvoId, role: "CLIENT", body: msgCliente, isRead: true } }),
            prisma.waConversation.update({ where: { id: currentConvoId }, data: { lastMessage: msgCliente, lastMessageAt: new Date() } }),
          ]);
        } catch (dbErr) { console.error("âš ï¸ Error guardando mensaje en DB (timeout agente):", dbErr); }
      }
    }
  } catch (error) {
    console.error("âš ï¸ Error en CRM router:", error);
  }

  console.log(`ðŸº El Coyote procesando mensaje de ${tel}...`);
  const msgLower = msgCliente.trim().toLowerCase();

  try {
    const convoParaTrace = await prisma.waConversation.findFirst({ where: { contactPhone: tel } });
    await createTrace({
      employeeId: convoParaTrace?.employeeId || "SISTEMA", phone: tel, type: "WHATSAPP",
      summary: `Mensaje entrante: ${msgCliente.substring(0, 60)}${msgCliente.length > 60 ? '...' : ''}`,
      content: { direction: "inbound", body: msgCliente, processedBy: "bot_coyote" },
      actionName: "RECEPCION_WHATSAPP_CLIENTE",
    });
  } catch (traceErr) { console.error("âš ï¸ Error en createTrace (mensaje entrante bot):", traceErr); }

  if (msgLower === 'soy jack' || msgLower === 'soy jack.') {
    await enviarWhatsapp(tel, 'ðŸº *El Coyote en lÃ­nea.* Hola Jack, Â¿puede verificarse? ðŸ”’');
    return;
  }
  if (msgLower === 'elcoyote56') {
    const h = await getHistorial(redis, tel);
    h.push({ role: 'user', content: msgCliente });
    h.push({ role: 'assistant', content: 'ðŸº Modo Administrador activo. Â¿QuÃ© ajustamos?' });
    await saveHistorial(redis, tel, h);
    await enviarWhatsapp(tel, 'ðŸº *El Coyote listo, Jack.* Modo Admin activo.\n\nPuedo cambiar:\nâ€¢ Precios y catÃ¡logo (telas, hilos, elÃ¡sticos)\nâ€¢ Tono, reglas y personalidad\nâ€¢ Promociones activas\nâ€¢ Avisos globales\nâ€¢ Y lo que necesite\n\nÂ¿QuÃ© ajustamos?');
    return;
  }

  const esSoloCoyote = /^\s*coyote[\s!?.]*$/i.test(msgCliente.trim());
  if (esSoloCoyote) {
    const resp = `ðŸº *El Coyote en lÃ­nea.* Operaciones activas 24/7. Â¿En quÃ© le puedo ayudar?`;
    const h = await getHistorial(redis, tel);
    h.push({ role: 'user', content: msgCliente });
    h.push({ role: 'assistant', content: resp });
    await saveHistorial(redis, tel, h);
    await enviarWhatsapp(tel, resp);
    return;
  }

  let perfil = await getCliente(redis, tel);
  const config = await getConfigBot(redis);

  // ==========================================
  // NUEVO: Primer contacto â€” crear perfil
  // ==========================================
  if (!perfil) {
    perfil = {
      nombre: '',
      correoElectronico: '',
      correoVerificado: false,
      privacidadAceptada: undefined,
      privacidadRespondida: undefined,
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

  // FIX: migraciÃ³n de perfiles antiguos â€” si ya tienen correo, marcarlos como verificados
  if (perfil.correoElectronico && perfil.privacidadRespondida === undefined) {
    perfil.privacidadRespondida = true;
    await saveCliente(redis, tel, perfil);
  }

  // ==========================================
  // NUEVO ONBOARDING: captura nombre Y correo en una sola interacciÃ³n
  // Permanecemos en esta fase hasta tener AMBOS datos.
  // ==========================================
  if (!perfil.nombre || !perfil.correoElectronico) {
    const regexCorreo = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
    const matchCorreo = msgCliente.match(regexCorreo);
    const emailEncontrado = matchCorreo ? matchCorreo[0].toLowerCase() : null;

    // Extraer nombre: quitar el email del texto y tomar la primera palabra vÃ¡lida
    const textoSinEmail = msgCliente.replace(regexCorreo, '').replace(/[,;]/g, ' ').trim();
    const palabras = textoSinEmail.split(/\s+/).filter((w: string) => w.length >= 2 && !/[Â¿?!0-9@.,]/.test(w));
    const nombreEncontrado = palabras.length > 0
      ? palabras[0].charAt(0).toUpperCase() + palabras[0].slice(1).toLowerCase()
      : null;

    let actualizado = false;
    if (emailEncontrado && !perfil.correoElectronico) {
      perfil.correoElectronico = emailEncontrado;
      perfil.correoVerificado = true;
      actualizado = true;
    }
    if (nombreEncontrado && !perfil.nombre) {
      perfil.nombre = nombreEncontrado;
      perfil.genero = await detectarGenero(perfil.nombre);
      actualizado = true;
    }
    if (actualizado) await saveCliente(redis, tel, perfil);

    // Â¿Ya tenemos ambos datos?
    if (perfil.nombre && perfil.correoElectronico) {
      // NUEVO: verificar membresÃ­a en DB en cuanto tenemos correo/telÃ©fono
      const membresiaInicial = await verificarMembresia(tel, perfil);
      if (membresiaInicial.activa) {
        perfil.tieneSuscripcion = true;
        perfil.planMembresia = membresiaInicial.plan;
      }
      perfil.ultimoContacto = new Date().toISOString();
      await saveCliente(redis, tel, perfil);

      const msgPrivacidad = membresiaInicial.activa
        ? `âœ… *Â¡Bienvenido de vuelta, ${perfil.nombre}!* Correo registrado: ${perfil.correoElectronico}\n\nðŸº Verificamos su cuenta y vemos que es *Socio Coyote ${perfil.planMembresia}* ðŸ‘‘ â€” sus beneficios estÃ¡n activos en este pedido.\n\nAntes de continuar, Â¿nos autoriza a enviarle promociones, actualizaciones y comunicaciones comerciales?\n\nResponda *SÃ* o *NO*.`
        : `âœ… Datos registrados: *${perfil.nombre}* â€” ${perfil.correoElectronico}\n\nðŸº Antes de continuar, tratamos sus datos conforme a nuestro Aviso de Privacidad:\nhttps://www.coyotetextil.com/privacy\n\nÂ¿Nos autoriza a enviarle promociones, actualizaciones y comunicaciones comerciales por correo electrÃ³nico y WhatsApp?\n\nResponda *SÃ* o *NO*.`;

      const h = await getHistorial(redis, tel);
      h.push({ role: 'user', content: msgCliente });
      h.push({ role: 'assistant', content: msgPrivacidad });
      await saveHistorial(redis, tel, h);
      await enviarWhatsapp(tel, msgPrivacidad);
      return;
    }

    // Solo tiene correo, falta nombre
    if (perfil.correoElectronico && !perfil.nombre) {
      const pedirNombre = `ðŸº Correo registrado: *${perfil.correoElectronico}* âœ…\n\nÂ¿Con quiÃ©n tengo el gusto? (Su nombre, por favor)`;
      const h = await getHistorial(redis, tel);
      h.push({ role: 'user', content: msgCliente });
      h.push({ role: 'assistant', content: pedirNombre });
      await saveHistorial(redis, tel, h);
      await enviarWhatsapp(tel, pedirNombre);
      return;
    }

    // Solo tiene nombre, falta correo
    if (perfil.nombre && !perfil.correoElectronico) {
      const pedirCorreo = `ðŸº *El Coyote al habla.* Mucho gusto, *${perfil.nombre}*. Para verificar su cuenta y enviarle cotizaciones, actualizaciones y facturaciÃ³n, Â¿me comparte su correo electrÃ³nico por favor?\n\n_(Ejemplo: nombre@empresa.com)_`;
      const h = await getHistorial(redis, tel);
      h.push({ role: 'user', content: msgCliente });
      h.push({ role: 'assistant', content: pedirCorreo });
      await saveHistorial(redis, tel, h);
      await enviarWhatsapp(tel, pedirCorreo);
      return;
    }

    // No encontrÃ³ ni nombre ni correo â€” re-solicitar
    const reAsk = `ðŸº Para darle atenciÃ³n personalizada y verificar su cuenta, necesito su *nombre* y *correo electrÃ³nico*.\n\n_(Ejemplo: Juan GarcÃ­a, juan@empresa.com)_`;
    const h = await getHistorial(redis, tel);
    h.push({ role: 'user', content: msgCliente });
    h.push({ role: 'assistant', content: reAsk });
    await saveHistorial(redis, tel, h);
    await enviarWhatsapp(tel, reAsk);
    return;
  }

  // ==========================================
  // CONSENTIMIENTO DE PRIVACIDAD
  // ==========================================
  if (perfil.privacidadRespondida !== true) {
    const respondioSi = /^\s*(sÃ­|si|yes|acepto|autorizo|de acuerdo|ok|okay)\s*$/i.test(msgCliente.trim());
    const respondioNo = /^\s*(no|nope|no gracias)\s*$/i.test(msgCliente.trim());

    if (respondioSi) {
      perfil.privacidadAceptada = true;
      perfil.privacidadRespondida = true;
      perfil.ultimoContacto = new Date().toISOString();
      await saveCliente(redis, tel, perfil);

      const saludo = perfil.genero === 'mujer'
        ? `ðŸº Â¡Perfecto, ${perfil.nombre}! Queda registrada su autorizaciÃ³n. Estamos listos para ayudarle. Â¿En quÃ© le puedo servir hoy?`
        : `ðŸº Â¡Perfecto, ${perfil.nombre}! Queda registrada su autorizaciÃ³n. Estamos listos para atenderle. Â¿QuÃ© necesita?`;
      const h = await getHistorial(redis, tel);
      h.push({ role: 'user', content: msgCliente });
      h.push({ role: 'assistant', content: saludo });
      await saveHistorial(redis, tel, h);
      await enviarWhatsapp(tel, saludo);
      return;
    } else if (respondioNo) {
      perfil.privacidadAceptada = false;
      perfil.privacidadRespondida = true;
      perfil.ultimoContacto = new Date().toISOString();
      await saveCliente(redis, tel, perfil);

      const respuestaNo =
        `Entendido, respetamos su decisiÃ³n. ðŸº\n\n` +
        `Sus datos solo se usarÃ¡n para gestionar su pedido. ` +
        `Â¿En quÃ© le puedo ayudar hoy?`;
      const h = await getHistorial(redis, tel);
      h.push({ role: 'user', content: msgCliente });
      h.push({ role: 'assistant', content: respuestaNo });
      await saveHistorial(redis, tel, h);
      await enviarWhatsapp(tel, respuestaNo);
      return;
    } else {
      const reenviarAviso =
        `ðŸº Necesito su respuesta para continuar. Â¿Nos autoriza a enviarle promociones, actualizaciones y comunicaciones comerciales?\n\n` +
        `ðŸ”’ Aviso de Privacidad: https://www.coyotetextil.com/privacy\n\n` +
        `Responda *SÃ* o *NO* por favor.`;
      const h = await getHistorial(redis, tel);
      h.push({ role: 'user', content: msgCliente });
      h.push({ role: 'assistant', content: reenviarAviso });
      await saveHistorial(redis, tel, h);
      await enviarWhatsapp(tel, reenviarAviso);
      return;
    }
  }

  perfil.ultimoContacto = new Date().toISOString();

  // FIX: verificarMembresia con early return incorporado
  const estadoMembresia = await verificarMembresia(tel, perfil);
  if (estadoMembresia.activa && !perfil.tieneSuscripcion) {
    perfil.tieneSuscripcion = true;
    perfil.planMembresia = estadoMembresia.plan;
    await saveCliente(redis, tel, perfil);
  }

  // FIX: historial cargado UNA sola vez y reutilizado en todo el flujo
  const historial = await getHistorial(redis, tel);
  const esClienteQueVuelve = historial.length === 0 && !!perfil.nombre && perfil.totalCompras > 0;

  perfil = await analizarPatronesCliente(redis, perfil, msgCliente, historial);

  const intencionPago = detectarIntencionPago(msgCliente, historial, perfil);

  // FIX: limpiar etapaAbandono tambiÃ©n cuando el cliente agradece o confirma
  if (perfil.etapaAbandono === 'pago' && !intencionPago.detectado) {
    const esConsultaNueva = /\b(precio|cuÃ¡nto|cuanto|tela|kilo|metro|color|hilo|elÃ¡stico|elastico|muestra|catÃ¡logo|tienen|disponible|quÃ© tienen|gracias|perfecto|excelente|listo)\b/i.test(msgCliente);
    if (esConsultaNueva) {
      console.log(`ðŸ”„ etapaAbandono "pago" limpiada`);
      perfil.etapaAbandono = null;
      perfil.fechaAbandono = undefined;
      await saveCliente(redis, tel, perfil);
    }
  }

  const nuevoResumen = await generarResumenSemantico(historial, perfil);
  if (nuevoResumen && nuevoResumen !== perfil.resumenSemantico) {
    perfil.resumenSemantico = nuevoResumen;
    await saveCliente(redis, tel, perfil);
  }

  let linkStripeAutoGenerado: string | null = null;
  if (intencionPago.detectado && intencionPago.montoEstimado && intencionPago.montoEstimado > 0) {
    try {
      const amountInCents = Math.round(intencionPago.montoEstimado * 100);
      const cotObj = perfil.ultimaCotizacionObj;
      const session = await Promise.race([
        stripe.checkout.sessions.create({
          payment_method_types: ['card', 'oxxo'],
          line_items: [{ price_data: { currency: 'mxn', product_data: { name: 'Pedido Coyote Textil' }, unit_amount: amountInCents }, quantity: 1 }],
          mode: 'payment',
          success_url: 'https://wa.me/5215627301525',
          metadata: {
            rfc: cotObj?.rfc || 'NONE',
            razon: cotObj?.razon || 'NONE',
            cp: cotObj?.cp || 'NONE',
            regimen: cotObj?.regimen || 'NONE',
            uso: cotObj?.uso || 'NONE',
            req_invoice: cotObj?.conFactura ? 'YES' : 'NO',
            phone: tel,
            productos: perfil.productosComprados.join(','),
          }
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Stripe timeout')), 8000)),
      ]) as Stripe.Checkout.Session;
      linkStripeAutoGenerado = session.url;
      perfil.intentosDePago = (perfil.intentosDePago || 0) + 1;
      perfil.etapaAbandono = 'pago';
      perfil.fechaAbandono = new Date().toISOString();
      await saveCliente(redis, tel, perfil);
      console.log(`ðŸ’³ Link Stripe auto-gen: ${linkStripeAutoGenerado}`);
    } catch (err) { console.error('Error generando Stripe auto:', err); }
  }
  historial.push({ role: 'user', content: msgCliente });

  const esElJefe = historial.some((m: any) => m.role === 'user' && m.content.trim() === 'elcoyote56');
  const bodega = await getBodega(redis);

  const buildCatalogoTelas = () =>
    Object.entries(bodega.telas).map(([name, p]) =>
      `  â€¢ ${name.toUpperCase()}: $${p.menudeo}/kg menudeo | $${p.mayoreo}/kg mayoreo | rollo 25kg = $${(p.mayoreo * 25).toFixed(0)} MXN\n    ${p.info}`
    ).join('\n');

  const buildCatalogoTelasMetro = () =>
    Object.entries(bodega.telasMetro).map(([name, p]) =>
      `  â€¢ ${name.toUpperCase()}: $${p.menudeo}/m menudeo | $${p.mayoreo}/m mayoreo | rollo ${p.metrosPorRollo}m = $${(p.mayoreo * p.metrosPorRollo).toFixed(0)} MXN\n    ${p.info}`
    ).join('\n');

  const buildCatalogoHilos = () =>
    Object.entries(bodega.hilos).map(([name, p]) =>
      `  â€¢ ${name.toUpperCase()}: $${p.menudeo} menudeo/${p.unidad} | $${p.mayoreo} mayoreo/caja (120 pzs = $${(p.mayoreo * 120).toFixed(0)} MXN)\n    ${p.info}`
    ).join('\n');

  const buildCatalogoElasticos = () =>
    Object.entries(bodega.elasticos).map(([name, p]) =>
      `  â€¢ ${name.toUpperCase()}: $${p.menudeo} por ${p.unidad}\n    ${p.info}`
    ).join('\n');

  const extrasTexto = config.productosExtra.length > 0
    ? config.productosExtra.map(pe =>
        `  â€¢ ${pe.nombre.toUpperCase()} [${pe.categoria || 'tela'}]: $${pe.menudeo} menudeo | $${pe.mayoreo} mayoreo | ${pe.info}`
      ).join('\n')
    : '';

  const diasDesdeUltimo = perfil.ultimoContacto
    ? Math.floor((Date.now() - new Date(perfil.ultimoContacto).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const alertaDireccion = perfil.direccionEnvio
    ? `âš ï¸ DIRECCIÃ“N GUARDADA: "${perfil.direccionEnvio}". Confirme si sigue siendo correcta.`
    : `âš ï¸ SIN DIRECCIÃ“N. SolicÃ­tela cuando corresponda.`;

  const alertaReactivacion = diasDesdeUltimo > 30
    ? `âš¡ ALERTA: Este cliente lleva ${diasDesdeUltimo} dÃ­as sin comprar. Use tÃ©cnica de reactivaciÃ³n.`
    : '';
  const alertaConversion = (perfil.intentosDePago || 0) > 1
    ? `âš¡ ALERTA: ${perfil.intentosDePago} links de pago sin concretar. Identifique la objeciÃ³n real y resuÃ©lvala.`
    : '';

  const ahora = new Date();
  const recordatoriosPendientes = (perfil.recordatoriosPendientes || []).filter(r => {
    try { return new Date(r.fecha) <= ahora; } catch { return false; }
  });
  const alertaRecordatorio = recordatoriosPendientes.length > 0
    ? `âš¡ RECORDATORIO ACTIVO: ${recordatoriosPendientes.map(r => r.mensaje).join(' | ')} â€” Retome la conversaciÃ³n ahora.`
    : '';
  if (recordatoriosPendientes.length > 0) {
    perfil.recordatoriosPendientes = (perfil.recordatoriosPendientes || []).filter(r => {
      try { return new Date(r.fecha) > ahora; } catch { return true; }
    });
    await saveCliente(redis, tel, perfil);
  }

  const alertaAbandono         = perfil.etapaAbandono ? `âš¡ CLIENTE EN ETAPA DE ABANDONO: "${perfil.etapaAbandono}" â€” Retome desde ese punto, NO empiece de cero.` : '';
  const alertaUltimaCotizacion = perfil.ultimaCotizacion ? `âš¡ ÃšLTIMA COTIZACIÃ“N REGISTRADA: ${perfil.ultimaCotizacion} â€” Ãšsela para retomar.` : '';
  const alertaTemperatura      = perfil.temperaturaCompra !== undefined ? `ðŸŒ¡ï¸ TEMPERATURA DE COMPRA: ${perfil.temperaturaCompra}/100 â€” TÃ¡ctica activa: ${perfil.tacticaActual || 'valor_rendimiento'}` : '';
  const alertaPrediccion       = perfil.prediccionSiguientePedido ? `ðŸ”® PREDICCIÃ“N: ${perfil.prediccionSiguientePedido}` : '';
  const alertaPatron           = perfil.patronCompra ? `ðŸ“Š PATRÃ“N: ${perfil.patronCompra}` : '';
  const alertaPropension       = perfil.propensionCross ? `ðŸŽ¯ PROPENSIÃ“N CROSS: Hilos ${perfil.propensionCross.hilos}% | ElÃ¡sticos ${perfil.propensionCross.elasticos}% | Volumen+ ${perfil.propensionCross.volumenExtra}%` : '';
  const memoriaSemantica       = perfil.resumenSemantico ? `\nðŸ§  MEMORIA SEMÃNTICA:\n${perfil.resumenSemantico}` : '';

  // FIX: nota para clientes recurrentes con historial expirado
  const notaClienteRecurrente = esClienteQueVuelve
    ? `\nâš ï¸ CLIENTE RECURRENTE CON HISTORIAL EXPIRADO: ${perfil.nombre} ya tiene ${perfil.totalCompras} compra(s) previas por $${perfil.montoAcumulado} MXN acumulados.
NO salude como si fuera la primera vez. NO envÃ­e bienvenida.
Retome directamente: "${perfil.genero === 'mujer' ? 'SeÃ±ora' : 'SeÃ±or'} ${perfil.nombre}, bienvenido de vuelta. Â¿En quÃ© le podemos ayudar?"
${perfil.ultimaCotizacion ? `Su Ãºltima cotizaciÃ³n fue: ${perfil.ultimaCotizacion}` : ''}
${perfil.productosFavoritos?.length ? `Sus productos habituales: ${perfil.productosFavoritos.join(', ')}` : ''}`
    : '';

  const instruccionTactica = (() => {
    const temp = perfil.temperaturaCompra ?? 30;
    const intentos = perfil.intentosDePago ?? 0;

    if (linkStripeAutoGenerado) {
      return `ðŸš¨ CIERRE INMEDIATO: El sistema ya generÃ³ el link de pago automÃ¡ticamente y lo entregarÃ¡ al cliente. Su mensaje debe confirmar el pedido y el monto. NO escriba "[LINK]" ni ningÃºn placeholder. El link se inserta solo. Ejemplo: "Perfecto, seÃ±or ${perfil.nombre}. Su pedido por $X MXN estÃ¡ listo. En cuanto confirme el pago, bodega recibe su pedido. ðŸºðŸ“¦"`;
    }
    if (perfil.direccionEnvio && perfil.ultimaCotizacion) {
      return `ðŸš¨ CLIENTE LISTO PARA CERRAR: Tiene direcciÃ³n y cotizaciÃ³n registrada (${perfil.ultimaCotizacion}). Su ÃšNICO objetivo es cobrar ahora. Pregunte: "Â¿Cerramos con tarjeta, OXXO o SPEI?" y ejecute GENERAR_COBRO o GENERAR_SPEI. NO haga mÃ¡s preguntas de calificaciÃ³n.`;
    }

    switch (perfil.tacticaActual) {
      case 'cierre_directo':
        return `ðŸš¨ CIERRE DIRECTO (Temp: ${temp}/100):
Su mensaje DEBE terminar con UNA propuesta de pago concreta: "Son $X MXN. Â¿Le procesamos con tarjeta, OXXO o SPEI?"
${intentos > 0 ? `âš ï¸ Ya intentÃ³ pagar ${intentos} veces sin concretar. Detecte la fricciÃ³n: "Â¿Tuvo algÃºn inconveniente con el link anterior?"` : ''}`;

      case 'urgencia_escasez':
        return `âš¡ URGENCIA REAL (Temp: ${temp}/100):
1. DÃ© el precio total con envÃ­o incluido (use CALCULAR_ENVIO si tiene CP).
2. Agregue presiÃ³n real: "Tenemos stock del color solicitado, pero los rollos de temporada se mueven con rapidez."
3. Cierre con: "Â¿Apartamos hoy con $500 de anticipo vÃ­a OXXO?"
4. Si acepta â†’ ejecute GENERAR_COBRO|oxxo|500|NONE|NONE|NONE|NONE|NONE.`;

      case 'manejo_objecion':
        return `ðŸ¤ MANEJO DE OBJECIÃ“N (objeciones: ${perfil.objecionesComunes?.join(', ') || 'precio'}):
1. Valide la preocupaciÃ³n sin ceder en precio.
2. Redirija al costo por prenda, no por kilo.
3. Ofrezca cantidad menor para arrancar: "Â¿Empezamos con 10 kg para que pruebe la tela?"
4. Mini-cierre: "Si le convence la calidad, Â¿arrancamos con ese pedido inicial hoy?"
NUNCA baje el precio sin obtener algo a cambio.`;

      case 'fidelizacion_vip':
        return `ðŸ‘‘ CLIENTE VIP (${perfil.totalCompras} compras, $${perfil.montoAcumulado} acumulados):
1. ReconÃ³zcalo: "Usted ya es cliente frecuente, lo tenemos bien identificado."
2. Ofrezca algo concreto: lote reservado o envÃ­o prioritario.
3. Retome con su producto favorito: "${perfil.productosFavoritos?.[0] || 'su tela habitual'} sigue disponible."
4. Cierre: "Â¿Le armo el mismo pedido de siempre o necesita algo diferente esta vez?"`;

      case 'social_proof':
        return `ðŸ† PRUEBA SOCIAL + PRIMER CIERRE (cliente nuevo):
1. "Trabajamos con talleres de uniforme, equipos deportivos y marcas en toda la repÃºblica."
2. Proponga entrada de bajo riesgo: "Para conocernos, puede arrancar con 10 kg de Micropique: $950 MXN."
3. Cierre directo: "Â¿Le envÃ­o el link de pago para ese primer pedido?"`;

      default:
        return `ðŸ’¡ TÃCTICA VALOR-RENDIMIENTO (Temp: ${temp}/100):
1. Precio SIEMPRE en costo por prenda: "A $95/kg con rend. 4.3m/kg, cada playera lleva ~$22 de tela."
2. Empuje rollo: "El rollo completo (25 kg) baja a $95/kg vs $100 en menudeo. Total: $2,375."
3. Cierre con decisiÃ³n binaria: "Â¿Le armo la cotizaciÃ³n con rollo completo o con los kilos que necesita?"`;
    }
  })();

  // ==========================================
  // ðŸ† BLOQUE MEMBRESÃA â€” OBLIGATORIO ANTES DE CADA VENTA
  // ==========================================
  const bloqueMembresia = (() => {
    if (estadoMembresia.activa) {
      const planLabel = perfil.planMembresia === 'ELITE' ? 'ðŸ’Ž ELITE â€” Master Partner'
        : perfil.planMembresia === 'BLACK' ? 'âš« BLACK â€” Socio Ejecutivo'
        : 'ðŸ¥‡ GOLD â€” Socio Comercial';
      const beneficiosPlan = perfil.planMembresia === 'ELITE'
        ? '4 ptos por cada $100 MXN | 6 colocaciones gratis/mes | Prioridad mÃ¡xima en envÃ­os | Reserva ilimitada | Muestras anticipadas | $0 tarifa de servicio'
        : perfil.planMembresia === 'BLACK'
        ? '2 ptos por cada $100 MXN | 3 colocaciones gratis/mes | Prioridad en envÃ­os Coyote Logistics | Reserva de textiles | Merchandising sorpresa anual'
        : '1 pto por cada $100 MXN | 1 colocaciÃ³n gratis/mes | AtenciÃ³n IA 24/7';
      return `âœ… CLIENTE CON MEMBRESÃA ACTIVA (Plan: ${planLabel})
Al momento de cerrar la venta, reconozca su membresÃ­a y mencione sus beneficios activos:
${beneficiosPlan}
Mencione: "Como Socio Coyote ${perfil.planMembresia === 'ELITE' ? 'ðŸ’Ž ELITE' : perfil.planMembresia === 'BLACK' ? 'âš« BLACK' : 'ðŸ¥‡ GOLD'} ðŸ‘‘, su pedido lleva todos los beneficios de su plan activo â€” incluyendo ${perfil.planMembresia === 'ELITE' ? '$0 en tarifa de servicio y mÃ¡xima prioridad en envÃ­o' : perfil.planMembresia === 'BLACK' ? 'prioridad en envÃ­o y reserva de textiles' : '1 colocaciÃ³n gratis al mes'}."`;
    }
    if (perfil.membresiaOfrecida) {
      return `â¬œ MEMBRESÃA YA FUE OFRECIDA ESTA SESIÃ“N Y DECLINADA â€” No la mencione de nuevo. Proceda directo al cobro una vez aceptados los T&C.`;
    }
    // NUEVO: membresÃ­a obligatoria antes de cada venta
    return `ðŸš¨ MEMBRESÃA OBLIGATORIA ANTES DE CADA COBRO â€” NUNCA ejecute GENERAR_COBRO ni GENERAR_SPEI sin presentar primero el Programa Socios Coyote.
Texto exacto a usar:

"Antes de procesar su pago, le presento nuestro *Programa Socios Coyote* ðŸºðŸ‘‘. Tenemos 3 niveles:

*ðŸ¥‡ GOLD â€” Socio Comercial: $299/mes*
â€¢ 1 pto por cada $100 MXN en compras (el doble que el acceso base)
â€¢ 1 colocaciÃ³n gratis a paqueterÃ­a al mes
â€¢ AtenciÃ³n IA 24/7
â€¢ Plan anual: $3,233 MXN (ahorra $255)

*âš« BLACK â€” Socio Ejecutivo: $699/mes*
â€¢ 2 ptos por cada $100 MXN (4Ã— mÃ¡s que el acceso base)
â€¢ 3 colocaciones gratis al mes
â€¢ Prioridad en envÃ­os Coyote Logistics
â€¢ Reserva de textiles antes de que se agoten
â€¢ Merchandising sorpresa anual
â€¢ Plan anual: $7,549 MXN (ahorra $639)

*ðŸ’Ž ELITE â€” Master Partner: $1,129/mes*
â€¢ 4 ptos por cada $100 MXN (8Ã— mÃ¡s que el acceso base)
â€¢ 6 colocaciones gratis al mes
â€¢ MÃ¡xima prioridad en envÃ­os â€” siempre al frente
â€¢ Reserva ilimitada de cualquier textil del catÃ¡logo
â€¢ Muestras gratis + acceso anticipado a nuevos textiles
â€¢ *$0 en tarifa de servicio en toda operaciÃ³n*
â€¢ Merchandising exclusivo anual
â€¢ Plan anual: $12,193 MXN (ahorra $1,155)

MÃ¡s informaciÃ³n: https://www.coyotetextil.com/membresia
Â¿Le interesa activar algÃºn nivel, o continuamos con su pedido?"

Si acepta â†’ use: ESCALAR|Cliente interesado en MembresÃ­a Socios Coyote â€” plan [GOLD/BLACK/ELITE]
Si declina â†’ emita: MEMBRESIA_OFRECIDA y proceda con el cobro`;
  })();

  const resumenCliente = `
PERFIL DEL CLIENTE:
- Nombre: ${perfil.nombre} | GÃ©nero: ${perfil.genero} | Segmento: ${perfil.segmento || 'prospecto'}
- Correo: ${perfil.correoElectronico || 'NO REGISTRADO'} | Privacidad: ${perfil.privacidadAceptada ? 'ACEPTADA' : 'NO ACEPTADA'}
- Compras: ${perfil.totalCompras} | Acumulado: $${perfil.montoAcumulado} | Ticket promedio: $${perfil.ticketPromedio?.toFixed(0) || 'N/A'}
- CategorÃ­as pedidas: ${perfil.categoriasPedidas?.join(', ') || 'ninguna'}
- Productos favoritos: ${perfil.productosFavoritos?.join(', ') || 'ninguno'}
- Intereses declarados: ${perfil.interesesDeclarados?.join(', ') || 'ninguno'}
- Objeciones histÃ³ricas: ${perfil.objecionesComunes?.join(', ') || 'ninguna'}
- Sensibilidad al precio: ${perfil.sensibilidadPrecio || 'media'}
- Nivel de confianza: ${perfil.nivelConfianza || 40}/100
- Requiere factura frecuente: ${perfil.requiereFrecuenteFactura ? 'SÃ' : 'NO'}
- ${alertaDireccion}
- CP Fiscal: ${perfil.cpFiscal || 'no registrado'}
- Notas: ${perfil.notas || 'ninguna'}
- TÃ©rminos aceptados: ${perfil.terminosAceptados ? 'âœ… SÃ' : 'âŒ NO'}
- MembresÃ­a activa: ${estadoMembresia.activa ? `âœ… SÃ (${perfil.planMembresia || 'Socio Coyote'})` : 'âŒ NO'}
- MembresÃ­a ofrecida esta sesiÃ³n: ${perfil.membresiaOfrecida ? 'âœ… YA OFRECIDA' : 'â¬œ PENDIENTE â€” obligatoria antes del cobro'}
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
    ? `\nðŸŽ¯ PROMOCIONES ACTIVAS:\n${config.promocionesActivas.map(p => `â€¢ ${p.nombre}: ${p.descripcion} â€” ${p.descuento} (${p.vigencia})`).join('\n')}`
    : '';
  const avisoTexto = config.avisoGeneral ? `\nâš ï¸ AVISO GENERAL: ${config.avisoGeneral}` : '';
  const instruccionesExtra = config.instruccionesEspeciales
    ? `\nðŸ“Œ INSTRUCCIONES ESPECIALES (prioridad mÃ¡xima):\n${config.instruccionesEspeciales}`
    : '';
  const avisoStripeAuto = linkStripeAutoGenerado
    ? `\nâš¡ LINK STRIPE YA GENERADO Y SERÃ ENTREGADO AUTOMÃTICAMENTE AL CLIENTE.
NO escriba "[LINK]" ni ningÃºn placeholder en su respuesta.
NO use GENERAR_COBRO â€” el link ya existe.
Su respuesta debe solo confirmar el pedido y el monto. El sistema adjunta el link solo.
Ejemplo correcto: "Perfecto, seÃ±or ${perfil.nombre}. Su pedido estÃ¡ confirmado por $${perfil.ultimaCotizacionObj ? (perfil.ultimaCotizacionObj.conFactura ? perfil.ultimaCotizacionObj.subtotalConEnvioConIva : perfil.ultimaCotizacionObj.subtotalConEnvio).toFixed(2) : '...'} MXN. En cuanto confirme el pago, bodega recibe su pedido. ðŸºðŸ“¦"`
    : '';

  const CONTEXTO_VENDEDOR = `
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸº IDENTIDAD â€” EL COYOTE (IRROMPIBLE)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
Usted es EL COYOTE, asesor de Coyote Textil. Siempre. Sin excepciÃ³n.
â€¢ NUNCA diga que es IA, bot, asistente virtual, ChatGPT o GPT.
â€¢ Si preguntan quiÃ©n es: "ðŸº Soy El Coyote, su asesor en Coyote Textil."
â€¢ Tono: ${config.tono}
â€¢ MÃ¡ximo ${config.maximoLineasRespuesta} lÃ­neas por respuesta. DIRECTO Y VENDEDOR.
â€¢ SIEMPRE hable de "usted" al cliente. NUNCA tutee.
â€¢ Hombres: ${config.frasesDesignacionHombre.join(', ')} | Mujeres: ${config.frasesDesignacionMujer.join(', ')}
â€¢ Emojis: ${config.emojisPrincipales}
â€¢ Horario: ${config.horarioAtencion}
${instruccionesExtra}
${avisoTexto}
${promocionesTexto}
${avisoStripeAuto}
${notaClienteRecurrente}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸš« LIMITACIONES REALES DE ESTA IA â€” REGLA ABSOLUTA
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
â€¢ Usted es una IA. NO TIENE CAPACIDAD de "ir a revisar a la bodega",
  "consultar con el equipo", "verificar en un momento" ni ninguna
  acciÃ³n que implique salir de esta conversaciÃ³n a buscar informaciÃ³n.
â€¢ Esas frases estÃ¡n PROHIBIDAS y equivalen a mentirle al cliente.
â€¢ TODA la informaciÃ³n que puede dar estÃ¡ en este prompt.
  Si un dato no estÃ¡ aquÃ­ (color especÃ­fico de tela sin paleta,
  stock exacto de un color, fecha de llegada de mercancÃ­a nueva,
  precios fuera del catÃ¡logo), su ÃšNICA respuesta vÃ¡lida es:
  ESCALAR|Dato fuera de catÃ¡logo solicitado: [descripciÃ³n del dato]
â€¢ NUNCA pida al cliente que "espere un momento" mientras "revisa".
  Escale de inmediato o responda con lo que sÃ­ tiene en el catÃ¡logo.
â€¢ Si el cliente pregunta por un color que NO estÃ¡ listado en la
  paleta de una tela, responda: "Ese color no estÃ¡ disponible en
  [tela]. Los colores disponibles son: [lista del catÃ¡logo].
  Â¿Le funciona alguno de estos?"
â€¢ NUNCA invente disponibilidades, fechas de entrega estimadas
  ni promociones que no estÃ©n en las secciones PROMOCIONES ACTIVAS
  o CATÃLOGO de este prompt.

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸš« LENGUAJE PROHIBIDO â€” NUNCA USE NINGUNA DE ESTAS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${config.fraseProhibidas.map(f => `â€¢ "${f}"`).join('\n')}
â€¢ Tutear en cualquier forma: "tÃº", "te", "tu", "dale", "Ã³rale"
â€¢ TÃ©rminos informales con clientes: "patrÃ³n", "patrona", "jefe", "cuate"
â€¢ Frases de relleno sin propuesta: "Con gusto le ayudo", "Por supuesto", "Claro que sÃ­"
â€¢ Preguntas sin cierre: "Â¿En quÃ© mÃ¡s le puedo ayudar?"
â€¢ NUNCA escriba "[LINK]" â€” el sistema inserta el link real automÃ¡ticamente

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ§µ CATÃLOGO COMPLETO â€” COYOTE TEXTIL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ðŸ“¦ TELAS POR KILO (rollo estÃ¡ndar = 25 kg):
${buildCatalogoTelas()}
${extrasTexto ? `\nEXTRAS:\n${extrasTexto}` : ''}

ðŸ“ TELAS POR METRO:
${buildCatalogoTelasMetro()}

ðŸ§µ HILOS (precio por PIEZA/CONO):
${buildCatalogoHilos()}

ðŸ”© ELÃSTICOS:
${buildCatalogoElasticos()}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ“ REGLAS DE PRODUCTO
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
TELAS POR KILO:
â€¢ Todo por kilo. Rollo = 25 kg exactos.
â€¢ Menudeo: <25 kg | Mayoreo: 25 kg o mÃ¡s.
â€¢ Precio rollo = mayoreo Ã— 25. SIEMPRE muÃ©strelo calculado.
â€¢ Rendimiento en metros: ver catÃ¡logo. Convierta a piezas cuando el cliente lo pida.

TELAS CON PALETA DE COLORES (pregunta el color SIEMPRE antes de cotizar):
Micropique, Micro Panal, PiquÃ© Vera, Torneo, Sportok, Felpa China, Felpa Spun,
Flanel, Polar, Licra PoliÃ©ster, Licra Saludable, Diablo, Lycra MetÃ¡lica.
â†’ Si piden la carta completa: PEGUE LA LISTA DE COLORES del catÃ¡logo.
â†’ Si piden Blanco: mencione Perla, Hueso, Gris baby, Rosa baby como alternativas.
â†’ Si piden un color que NO estÃ¡ en la lista: responda "Ese color no estÃ¡ disponible
  en [tela]. Colores disponibles: [lista]. Â¿Le funciona alguno?" â€” NUNCA escale por esto.

TELAS COLOR ÃšNICO POR ROLLO (NO preguntar color):
Alaska, Andromeda, Apolo, Ares, Athlos, Azucena, Brock, Brush, Capriati, Caprice,
Delta, F30, Granizo, Horous, Inter 70, Kyoto, Madelino, Micro Estrella, Micropique Fusionado,
Miky, Monaco, Nagasaky, Panal Nitro, Panal Plus, Phoenix, Pique Lacoste, Pique Vera Sport,
Pixel, Saturno, Super Trix, Jumanji, Licra Liluna, Licra Playera, Mercury, Microtrix.
â†’ Para estas: "Color Ãºnico por rollo, confirme al apartar."

TELAS POR METRO (Diablo / Lycra MetÃ¡lica):
â€¢ Se venden por METRO, NO por kilo.
â€¢ Rollo Diablo = 50 m. Rollo Lycra MetÃ¡lica = 98 m.
â€¢ Precio por metro: menudeo / mayoreo segÃºn catÃ¡logo.

HILOS KINGTEX 40/2:
â€¢ Precio unitario: $29/cono (menudeo). Mayoreo: $25/cono en caja de 120 piezas.
â€¢ Caja completa = 120 conos Ã— $25 = $3,000 MXN.

ELÃSTICOS:
â€¢ Beisbolero 2Â½": se vende por METRO ($19/m). Rollo = 50 m = $950.
â€¢ ElÃ¡sticos por ligas (3 a 30 ligas): precio por pieza de 50 cm.
â€¢ Jareta 3 cm y 4 cm: por CONO. Solo Blanco.

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ—ºï¸ FLUJO DE VENTA OBLIGATORIO â€” NO SALTARSE PASOS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

PASO 1 â€” RECOPILAR DATOS ANTES DE COTIZAR:
Antes de dar cualquier precio usted DEBE tener:
  a) Producto especÃ­fico
  b) Cantidad (kilos, metros o piezas segÃºn aplique)
  c) Color (SOLO si la tela tiene paleta de colores â€” ver lista arriba)
Si falta algÃºn dato â†’ pregÃºntelo de forma directa y concisa.
NUNCA cotice sin tener producto + cantidad + color (cuando aplica).

PASO 2 â€” COTIZACIÃ“N INMEDIATA:
Una vez con los 3 datos â†’ cotice en ese mismo mensaje:
  â€¢ Precio por kg/metro
  â€¢ Precio rollo (si aplica)
  â€¢ Costo aproximado por prenda

PASO 3 â€” DIRECCIÃ“N COMPLETA DE ENVÃO:
Inmediatamente despuÃ©s de cotizar â†’ solicite la direcciÃ³n COMPLETA en un solo mensaje:
"Â¿A quÃ© direcciÃ³n enviamos? Necesito: calle, nÃºmero exterior/interior, colonia, ciudad y CP."
NUNCA pida solo el CP. Siempre pida la direcciÃ³n completa.
Una vez que el cliente la proporcione â†’ guÃ¡rdela INMEDIATAMENTE:
DATOS_CLIENTE|direccion:[calle nÃºmero, colonia, ciudad, CP]
El CP que viene dentro de la direcciÃ³n es el que se usa para calcular el flete.
ExtrÃ¡igalo de la direcciÃ³n y ejecute CALCULAR_ENVIO en ese mismo mensaje.

PASO 4 â€” FACTURA:
Al tener la direcciÃ³n â†’ "Â¿Requiere factura fiscal?"

PASO 5 â€” MÃ‰TODO DE PAGO:
"Â¿Cerramos con tarjeta, OXXO o SPEI?"

PASO 5.5 â€” PRE-CIERRE OBLIGATORIO (ANTES DE COBRAR):
Antes de ejecutar cualquier cobro, DEBE completar en orden:

  A) TÃ‰RMINOS Y CONDICIONES:
  Si perfil.terminosAceptados = false â†’ presente los T&C y solicite aceptaciÃ³n:
  "Para formalizar su pedido, le pido confirmar que ha leÃ­do y acepta nuestros
  TÃ©rminos y Condiciones: https://www.coyotetextil.com/terms
  Â¿Acepta? Responda *SÃ* para continuar."
  â†’ Cuando responda SÃ: emita TERMINOS_ACEPTADOS en su respuesta
  â†’ Cuando responda NO: "Sin aceptaciÃ³n de TÃ©rminos no es posible procesar el pedido."
  Si perfil.terminosAceptados = true â†’ omita este paso, ya estÃ¡ aceptado.

  B) MEMBRESÃA SOCIOS COYOTE (OBLIGATORIA ANTES DE CADA COBRO):
  ${bloqueMembresia}

PASO 6 â€” EJECUTAR COBRO:
Solo cuando T&C estÃ©n aceptados (y membresÃ­a resuelta) â†’ GENERAR_COBRO o GENERAR_SPEI.

ATAJO: Si el cliente da producto + cantidad + color + CP en un solo mensaje â†’ salte directo al total con envÃ­o + factura, pero SIEMPRE pase por el Paso 5.5 antes del cobro.

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ”¥ MOTOR DE CIERRE â€” LEY MÃXIMA
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

${instruccionTactica}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
âš¡ REGLAS DE ACCIÃ“N INMEDIATA
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

REGLA 1 â€” CIERRE EN CADA MENSAJE:
Cada respuesta debe terminar con UNA pregunta que avance hacia el pago:
â€¢ "Â¿QuÃ© color necesita?"  â€¢ "Â¿CuÃ¡ntos kilos requiere?"
â€¢ "Â¿Su CP para incluir el envÃ­o?"  â€¢ "Â¿Requiere factura?"
â€¢ "Â¿Acepta nuestros TÃ©rminos y Condiciones?"
â€¢ "Â¿Le interesa la MembresÃ­a Socios Coyote?"
â€¢ "Â¿Cerramos con tarjeta, OXXO o SPEI?"
NUNCA termine con "Â¿En quÃ© mÃ¡s le puedo ayudar?"

REGLA 2 â€” ENVÃO OBLIGATORIO E INMEDIATO:
Si tiene producto + kg/metros + direcciÃ³n completa del cliente â†’ ejecute CALCULAR_ENVIO
en ESE MISMO MENSAJE. No anuncie que lo va a calcular. Solo calcÃºlelo y muestre el resultado.
Si solo tiene CP sin direcciÃ³n completa â†’ pida la direcciÃ³n completa antes de calcular.
NUNCA diga "vamos a calcular", "un momento mientras calculo" ni ninguna variante.
Ejemplo CORRECTO: El cliente da su direcciÃ³n â†’ usted responde con el desglose completo del envÃ­o.
Ejemplo INCORRECTO: "Gracias, vamos a calcular el envÃ­o. Un momento." â† ESTO ESTÃ PROHIBIDO.

REGLA 2B â€” GUARDAR DIRECCIÃ“N SIEMPRE:
En cuanto el cliente proporcione su direcciÃ³n, en ese mismo mensaje emita:
DATOS_CLIENTE|direccion:[direcciÃ³n completa tal como la dio el cliente]
Luego extraiga el CP de 5 dÃ­gitos de esa direcciÃ³n y ejecute CALCULAR_ENVIO inmediatamente.
Ambos comandos van en el MISMO mensaje junto con la respuesta visible al cliente.

REGLA 3 â€” CROSS-SELL AL CIERRE:
Al dar precio de tela â†’ "Â¿Le incluimos hilo para ese pedido? Kingtex 40/2 a $29/cono."
Al dar precio de uniforme â†’ "Â¿Necesita elÃ¡stico para cintura? Beisbolero a $19/metro."

REGLA 4 â€” PRECIO SIN RODEOS:
precio + rollo + costo por prenda en 3 lÃ­neas mÃ¡ximo.

REGLA 5 â€” MANEJO DE "LO PIENSO":
â†’ "Â¿Para cuÃ¡ndo necesita el material? Le reservamos el color."
â†’ SIEMPRE registre: DATOS_CLIENTE|etapa_abandono:cotizacion
â†’ SIEMPRE programe: PROGRAMAR_RECORDATORIO|${tel}|[maÃ±ana 10am]|Retomar cotizaciÃ³n pendiente

REGLA 6 â€” OBJECIÃ“N DE PRECIO:
NUNCA baje el precio directamente. Responda con costo por prenda y compare con proveedor actual.

REGLA 7 â€” SI YA HAY LINK GENERADO:
El sistema entrega el link automÃ¡ticamente. Su Ãºnico trabajo es confirmar el pedido con naturalidad.
NUNCA escriba "[LINK]" ni ningÃºn texto placeholder. El link real se adjunta automÃ¡ticamente.
Ejemplo correcto: "Su pedido queda confirmado. En cuanto se confirme el pago, bodega recibe su pedido. ðŸºðŸ“¦"

REGLA 8 â€” ESCALAMIENTO A HUMANO:
SOLO escale en estos casos EXACTOS:
  a) El cliente pide EXPLÃCITAMENTE hablar con un humano/persona/asesor.
  b) El cliente se muestra extremadamente molesto o agresivo.
  c) Solicita informaciÃ³n que NO estÃ¡ en este catÃ¡logo (stock de color especÃ­fico,
     fecha de llegada de nueva mercancÃ­a, condiciones de crÃ©dito empresarial, etc.)

NUNCA escale por volumen de pedido. No importa si son 100 rollos, 500 rollos o
10,000 kg â€” EL COYOTE CIERRA ESA VENTA. Pedidos grandes = mayor comisiÃ³n.
Ante un pedido grande, el flujo es SIEMPRE:
  1. Confirmar direcciÃ³n completa de entrega.
  2. Confirmar si requiere factura.
  3. Preguntar mÃ©todo de pago: tarjeta, OXXO o SPEI.
  4. Ejecutar GENERAR_COBRO o GENERAR_SPEI.

use ESCALAR|motivo_breve SOLO cuando se cumplan los casos a, b o c de arriba.

REGLA 9 â€” COMANDOS = EJECUCIÃ“N INMEDIATA, SIN ANUNCIO PREVIO:
Cuando emitas GENERAR_COBRO, GENERAR_SPEI o CALCULAR_ENVIO, hazlo en el MISMO
mensaje junto con la respuesta al cliente. NUNCA escribas frases como
"un momento mientras genero el link", "procesando su pago", "procederemos con su pago"
ni ninguna variante de espera sin incluir el comando en ese mismo mensaje.
El comando ES la acciÃ³n. EscrÃ­belo y el sistema lo ejecuta automÃ¡ticamente.
El cliente verÃ¡ el resultado directamente, no el comando.

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ§  MEMORIA PERSISTENTE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
â€¢ NUNCA trate a un cliente recurrente como nuevo.
â€¢ Si tiene nombre â†’ Ãºselo: "${perfil.genero === 'mujer' ? 'seÃ±ora' : 'seÃ±or'} ${perfil.nombre}"
â€¢ Si tiene etapaAbandono = 'cotizacion' â†’ retome SIN reiniciar.
â€¢ Si tiene etapaAbandono = 'pago' â†’ entregue el link/SPEI pendiente de inmediato.
â€¢ NUNCA envÃ­e bienvenida a cliente con historial.
â€¢ NUNCA pregunte el nombre ni el correo si ya los tiene registrados.
â€¢ Si terminosAceptados = true â†’ NUNCA vuelva a pedir T&C.
â€¢ Si membresiaOfrecida = true â†’ NUNCA vuelva a ofrecer la membresÃ­a esta sesiÃ³n.

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸš¨ PAGOS â€” TRES MÃ‰TODOS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
â€¢ TARJETA / OXXO (Stripe):
  â†’ Si el sistema YA generÃ³ link â†’ NO use GENERAR_COBRO. El link se entrega automÃ¡ticamente.
  â†’ Si no â†’ GENERAR_COBRO|metodo|monto|rfc|razon|cp|regimen|uso
  â†’ CAMPOS VACÃOS: si no tiene RFC o razÃ³n social, use NONE. Ejemplo:
     GENERAR_COBRO|tarjeta|2857.00|EITA990706HDFSRL01|MI RAZON SOCIAL SA|57170|601|G03
     GENERAR_COBRO|oxxo|500.00|NONE|NONE|NONE|NONE|NONE
  â†’ IMPORTANTE: Emita el comando en el MISMO mensaje, no en uno separado.
â€¢ SPEI: GENERAR_SPEI|monto_total
  â†’ Emita en el MISMO mensaje junto con la confirmaciÃ³n al cliente.
  â†’ IMPORTANTE: Si el cliente requiere factura, use el monto CON IVA (base Ã— 1.16).
    El sistema guarda automÃ¡ticamente ambos montos (con y sin IVA).
    Si el cliente dijo que SÃ a la factura â†’ use SIEMPRE el monto con IVA.
    Ejemplo: Base $2,500 + IVA $400 = TOTAL $2,900 MXN â†’ GENERAR_COBRO|tarjeta|2900.00|RFC|...
â€¢ "Ya paguÃ©" â†’ "Perfecto. En cuanto se confirme la transferencia, bodega recibe su pedido. ðŸºðŸ“¦"
${config.infoPagos ? `\nðŸ’³ EXTRA PAGOS: ${config.infoPagos}` : ''}
${config.infoEnvios ? `\nðŸšš EXTRA ENVÃOS: ${config.infoEnvios}` : ''}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ’° COMANDOS INTERNOS (invisibles para el cliente)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
COBRO: GENERAR_COBRO|metodo(tarjeta/oxxo)|monto_total|rfc|razon_social|cp_fiscal|regimen|uso
  â†’ Campos opcionales: si no aplica, usar NONE
  â†’ Ejemplo con factura: GENERAR_COBRO|tarjeta|2857.00|EITA990706HDFSRL01|RAZON SA DE CV|57170|601|G03
  â†’ Ejemplo sin factura: GENERAR_COBRO|tarjeta|2857.00|NONE|NONE|NONE|NONE|NONE
SPEI: GENERAR_SPEI|monto_total
ENVÃO: CALCULAR_ENVIO|productos=[{"nombre":"producto","kg":cantidad}]|cp=12345|subtotal=MONTO
  â†’ El campo subtotal es el precio total de los productos ANTES del envÃ­o.
  â†’ Ejemplo: CALCULAR_ENVIO|productos=[{"nombre":"sportok","kg":30}]|cp=57170|subtotal=2250
  â†’ NUNCA omita el subtotal. Si no lo tiene calculado, calcÃºlelo primero (kg Ã— precio/kg).
DATOS_CLIENTE|direccion:[dir]|cp_fiscal:[cp]|productos:[lista]|categorias:[telas/hilos/elasticos]|notas:[nota]|etapa_abandono:[etapa]|intereses:[uso]
PROGRAMAR_RECORDATORIO|${tel}|[fecha ISO]|[mensaje]
ESCALAR|descripcion
TERMINOS_ACEPTADOS  â† (sin parÃ¡metros) EmÃ­talo cuando el cliente confirme aceptar los T&C
MEMBRESIA_OFRECIDA  â† (sin parÃ¡metros) EmÃ­talo cuando el cliente decline la membresÃ­a

âš ï¸ CP ENVÃO â‰  CP FISCAL. NUNCA los mezcle.
âš ï¸ TODOS los comandos deben ir en el mismo mensaje que la respuesta al cliente.
âš ï¸ NUNCA envÃ­e un mensaje que solo diga que va a ejecutar una acciÃ³n sin ejecutarla.
âš ï¸ NUNCA escriba "[LINK]" en ningÃºn mensaje â€” el sistema inserta el link real automÃ¡ticamente.

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸŽ¯ FRASES DE CIERRE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
"${config.fraseCierre}"
"${config.fraseIncondicional}"
${config.mensajePromoFinal ? `"${config.mensajePromoFinal}"` : ''}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ‘¤ PERFIL DEL CLIENTE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${resumenCliente}
`;

  const CONTEXTO_JEFE = `
ERES "EL COYOTE", IA DE COYOTE TEXTIL. HABLAS CON JACK, TU CREADOR.
Respuestas cortas. Tono de confianza entre socios.

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ“¦ GESTIÃ“N DE CATÃLOGO
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
PRECIO_UPDATE|categoria(telas/telasMetro/hilos/elasticos)|nombre_producto|menudeo_o_mayoreo|numero
PRODUCTO_NUEVO|categoria(telas/telasMetro/hilos/elasticos)|nombre|menudeo|mayoreo|descripcion|unidad
PRODUCTO_ELIMINAR|categoria(telas/telasMetro/hilos/elasticos)|nombre

TELAS ACTUALES (por kilo):
${buildCatalogoTelas()}

TELAS POR METRO:
${buildCatalogoTelasMetro()}

HILOS ACTUALES:
${buildCatalogoHilos()}

ELÃSTICOS ACTUALES:
${buildCatalogoElasticos()}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸŽ›ï¸ CONFIGURACIÃ“N GLOBAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
CONFIG|tono|Nueva descripciÃ³n
CONFIG|frasesHombre|seÃ±or, estimado
CONFIG|frasesMujer|seÃ±ora, estimada
CONFIG|fraseCierre|Nueva frase de cierre
CONFIG|fraseIncondicional|Nueva frase final
CONFIG|emojis|ðŸºðŸ“¦ðŸ’ª
CONFIG|maxLineas|4
CONFIG|agregarProhibida|frase prohibida
CONFIG|quitarProhibida|frase a quitar
CONFIG|instruccionEspecial|Nueva regla
CONFIG|horario|Lunes a viernes 9-6pm
CONFIG|infoPagos|InstrucciÃ³n extra
CONFIG|infoEnvios|InstrucciÃ³n extra
CONFIG|mensajePromoFinal|Texto gancho

BIENVENIDA_ADD|Texto completo
BIENVENIDA_REPLACE|Texto Ãºnico
PROMO_ADD|Nombre|DescripciÃ³n|Descuento|Vigencia
PROMO_DEL|Nombre
AVISO|Texto (o AVISO|BORRAR)

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ“¢ MENSAJES Y REPORTES
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
SEND_MSG|5521XXXXXXXX|Mensaje
ENVIAR_CAMPANA|segmento(todos/activos/inactivos)|mensaje
PROGRAMAR_RECORDATORIO|telefono|fecha|mensaje
GENERAR_REPORTE|tipo(diario/semanal/mensual)|formato(texto/json)

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ“‹ CONFIG ACTUAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
Nombre: ${config.nombreBot}
Tono: ${config.tono}
Tratamiento hombre: ${config.frasesDesignacionHombre.join(', ')}
Tratamiento mujer: ${config.frasesDesignacionMujer.join(', ')}
Emojis: ${config.emojisPrincipales}
MÃ¡x lÃ­neas: ${config.maximoLineasRespuesta}
Horario: ${config.horarioAtencion}
Aviso general: ${config.avisoGeneral || 'ninguno'}
Instrucciones especiales: ${config.instruccionesEspeciales || 'ninguna'}
Promociones: ${config.promocionesActivas.length > 0 ? config.promocionesActivas.map(p => p.nombre).join(', ') : 'ninguna'}
Ãšltima actualizaciÃ³n: ${config.ultimaActualizacion}
`;

  console.log(`ðŸ¤– GPT-4o para ${tel} (esJefe: ${esElJefe}) | Temp: ${perfil.temperaturaCompra} | TÃ¡ctica: ${perfil.tacticaActual}`);
  const systemPrompt = { role: 'system', content: esElJefe ? CONTEXTO_JEFE : CONTEXTO_VENDEDOR };

  let respuesta = '';
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [systemPrompt, ...historial] as any,
      temperature: 0.1,
      max_tokens: 700,
    });
    respuesta = completion.choices[0].message.content || '';
    console.log(`âœ… GPT-4o respondiÃ³ (${respuesta.length} chars)`);
  } catch (err) {
    console.error('âŒ Error llamando a OpenAI:', err);
    await enviarWhatsapp(tel, 'ðŸº Estamos teniendo un inconveniente tÃ©cnico momentÃ¡neo. Le respondo en breve.');
    return;
  }

  // ==========================================
  // ðŸ›¡ï¸ POST-PROCESSING
  // ==========================================

  // Limpiar identidad IA
  const frasesSinIdentidad = [
    /\bsoy una ia\b/i, /\bsoy un bot\b/i, /\basistente virtual\b/i,
    /\bcomo asistente de ia\b/i, /\bcomo ia\b/i, /\bchatgpt\b/i, /\bgpt\b/i,
  ];
  for (const patron of frasesSinIdentidad) {
    if (patron.test(respuesta)) respuesta = respuesta.replace(patron, 'El Coyote de Coyote Textil');
  }

  // Limpiar frases de espera prohibidas
  const frasesEsperaProhibidas: RegExp[] = [
    /[Uu]n momento[^.!?\n]{0,60}[.!?]?\s*/g,
    /[Vv]amos a calcular[^.!?\n]{0,60}[.!?]?\s*/g,
    /[Vv]amos a procesar[^.!?\n]{0,60}[.!?]?\s*/g,
    /[Pp]rocedemos a (calcular|generar|procesar)[^.!?\n]{0,60}[.!?]?\s*/g,
    /[Cc]alcularÃ© el envÃ­o[^.!?\n]{0,60}[.!?]?\s*/g,
    /[Gg]enerarÃ© el link[^.!?\n]{0,60}[.!?]?\s*/g,
    /[Ll]e (genero|proceso|mando|envÃ­o) el (link|pago|cobro)[^.!?\n]{0,60}[.!?]?\s*/g,
    /[Pp]rocesando su (solicitud|pago|pedido|link)[^.!?\n]{0,60}[.!?]?\s*/g,
    /[Pp]rocederemos con su (pago|pedido|solicitud)[^.!?\n]{0,60}[.!?]?\s*/g,
    /[Gg]enerando su link[^.!?\n]{0,60}[.!?]?\s*/g,
    /[Ee]spere (un momento|por favor)[^.!?\n]{0,60}[.!?]?\s*/g,
    /[Aa] calcular el envÃ­o[^.!?\n]{0,60}[.!?]?\s*/g,
    /[Pp]ermÃ­tame calcular[^.!?\n]{0,60}[.!?]?\s*/g,
    /[Pp]rocesarÃ© su pago[^.!?\n]{0,60}[.!?]?\s*/g,
    /[Cc]on el CP proporcionado[^.!?\n]{0,60}[.!?]?\s*/g,
    /[Cc]on el cÃ³digo postal[^.!?\n]{0,60}calcul[^.!?\n]{0,60}[.!?]?\s*/g,
  ];

  for (const patron of frasesEsperaProhibidas) {
    const antes = respuesta;
    respuesta = respuesta.replace(patron, '').trim();
    if (respuesta !== antes) {
      console.log(`ðŸ§¹ Frase de espera eliminada por patrÃ³n: ${patron}`);
    }
  }

  const tieneComandoCobro = /GENERAR_COBRO\|/i.test(respuesta);
  const tieneComandoSpei  = /GENERAR_SPEI\|/i.test(respuesta);
  const tieneStripeUrl    = respuesta.includes('https://checkout.stripe.com');

  // FIX: Forzar GENERAR_COBRO solo desde cotizacionObj â€” evitar scraping del historial
  const dijoProcesar = /procesar(emos)?\s+su\s+pago|generar(Ã©|e)\s+el\s+link|aquÃ­\s+(tiene|va)\s+su\s+link/i.test(respuesta);
  const faltaComandoCobro = dijoProcesar && !tieneComandoCobro && !linkStripeAutoGenerado && !tieneComandoSpei && !tieneStripeUrl;

  if (faltaComandoCobro && perfil.ultimaCotizacionObj) {
    const cotObj = perfil.ultimaCotizacionObj;
    const montoForzado = cotObj.conFactura ? cotObj.subtotalConEnvioConIva : cotObj.subtotalConEnvio;
    if (montoForzado > 0) {
      respuesta += `\nGENERAR_COBRO|tarjeta|${montoForzado.toFixed(2)}|NONE|NONE|NONE|NONE|NONE`;
      console.log(`ðŸ”§ FIX: GENERAR_COBRO forzado desde cotizacionObj. Monto: $${montoForzado}`);
    } else {
      console.warn(`âš ï¸ FIX: cotizacionObj existe pero monto es 0 â€” no se fuerza el comando`);
    }
  } else if (faltaComandoCobro && !perfil.ultimaCotizacionObj) {
    console.warn(`âš ï¸ FIX: GPT dijo "procesar" pero no hay cotizacionObj â€” se omite forzado`);
  }

  if (/TERMINOS_ACEPTADOS/i.test(respuesta)) {
    respuesta = respuesta.replace(/TERMINOS_ACEPTADOS/gi, '').trim();
    perfil.terminosAceptados = true;
    await saveCliente(redis, tel, perfil);
    console.log(`âœ… TÃ©rminos y Condiciones aceptados por ${tel}`);
    try {
      const convoTrace = await prisma.waConversation.findFirst({ where: { contactPhone: tel } });
      await createTrace({
        employeeId: convoTrace?.employeeId || "SISTEMA", phone: tel, type: "WHATSAPP",
        summary: `Cliente aceptÃ³ TÃ©rminos y Condiciones`,
        content: { direction: "inbound", event: "terminos_aceptados" },
        actionName: "TERMINOS_ACEPTADOS",
      });
    } catch (traceErr) { console.error("âš ï¸ Error en createTrace (terminos):", traceErr); }
  }

  if (/MEMBRESIA_OFRECIDA/i.test(respuesta)) {
    respuesta = respuesta.replace(/MEMBRESIA_OFRECIDA/gi, '').trim();
    perfil.membresiaOfrecida = true;
    await saveCliente(redis, tel, perfil);
    console.log(`ðŸ“‹ MembresÃ­a ofrecida y rechazada por ${tel} â€” continuar con cobro normal`);
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
      respuesta += ok ? `\nâœ… Precio de ${prod} (${cat}) actualizado.` : `\nâš ï¸ No encontrÃ© ese producto en ${cat}.`;
    }

    const matchProdNuevo = respuesta.match(/PRODUCTO_NUEVO\|([^|]+)\|([^|]+)\|(\d+)\|(\d+)\|([^|]+)\|?(.+)?/);
    if (matchProdNuevo) {
      const [, cat, nombre, menudeo, mayoreo, desc, unidad] = matchProdNuevo;
      await agregarProducto(redis, cat.trim().toLowerCase() as BodegaCategoria, nombre.trim(), parseInt(menudeo), parseInt(mayoreo), desc.trim(), unidad?.trim());
      respuesta = respuesta.replace(/PRODUCTO_NUEVO\|.+/g, '').trim();
      respuesta += `\nâœ… Producto "${nombre.trim()}" agregado a ${cat.trim()}.`;
    }

    const matchProdElim = respuesta.match(/PRODUCTO_ELIMINAR\|([^|]+)\|(.+)/);
    if (matchProdElim) {
      const [, cat, nombre] = matchProdElim;
      const ok = await eliminarProducto(redis, cat.trim().toLowerCase() as BodegaCategoria, nombre.trim());
      respuesta = respuesta.replace(/PRODUCTO_ELIMINAR\|.+/g, '').trim();
      respuesta += ok ? `\nâœ… Producto "${nombre.trim()}" eliminado de ${cat.trim()}.` : `\nâš ï¸ No encontrÃ© ese producto.`;
    }

    const matchConfig = respuesta.match(/CONFIG\|([^|]+)\|(.+)/);
    if (matchConfig) {
      const [, campo, valor] = matchConfig;
      respuesta = respuesta.replace(/CONFIG\|[^|]+\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      const campoLower = campo.trim().toLowerCase();
      if      (campoLower === 'nombrebot')             { cfg.nombreBot = valor.trim(); respuesta += `\nâœ… Nombre guardado.`; }
      else if (campoLower === 'tono')                  { cfg.tono = valor.trim(); respuesta += `\nâœ… Tono actualizado.`; }
      else if (campoLower === 'fraseshombre')          { cfg.frasesDesignacionHombre = valor.trim().split(',').map(s => s.trim()); respuesta += `\nâœ… Tratamiento hombres actualizado.`; }
      else if (campoLower === 'frasesmujer')           { cfg.frasesDesignacionMujer = valor.trim().split(',').map(s => s.trim()); respuesta += `\nâœ… Tratamiento mujeres actualizado.`; }
      else if (campoLower === 'frasecierre' || campoLower === 'frasescierre') { cfg.fraseCierre = valor.trim(); respuesta += `\nâœ… Frase cierre actualizada.`; }
      else if (campoLower === 'fraseincondicional')    { cfg.fraseIncondicional = valor.trim(); respuesta += `\nâœ… Frase final actualizada.`; }
      else if (campoLower === 'emojis')                { cfg.emojisPrincipales = valor.trim(); respuesta += `\nâœ… Emojis: ${valor.trim()}`; }
      else if (campoLower === 'maxlineas')             { cfg.maximoLineasRespuesta = parseInt(valor.trim()) || 4; respuesta += `\nâœ… LÃ­mite: ${cfg.maximoLineasRespuesta} lÃ­neas.`; }
      else if (campoLower === 'agregarprohibida')      { cfg.fraseProhibidas.push(valor.trim()); respuesta += `\nâœ… Frase prohibida agregada.`; }
      else if (campoLower === 'quitarprohibida')       { cfg.fraseProhibidas = cfg.fraseProhibidas.filter(f => !f.toLowerCase().includes(valor.trim().toLowerCase())); respuesta += `\nâœ… Frase prohibida eliminada.`; }
      else if (campoLower === 'instruccionespecial')   { cfg.instruccionesEspeciales = cfg.instruccionesEspeciales ? `${cfg.instruccionesEspeciales}\n- ${valor.trim()}` : `- ${valor.trim()}`; respuesta += `\nâœ… Regla especial agregada.`; }
      else if (campoLower === 'horario')               { cfg.horarioAtencion = valor.trim(); respuesta += `\nâœ… Horario: ${valor.trim()}`; }
      else if (campoLower === 'infopagos')             { cfg.infoPagos = valor.trim(); respuesta += `\nâœ… Info pagos actualizada.`; }
      else if (campoLower === 'infoenvios')            { cfg.infoEnvios = valor.trim(); respuesta += `\nâœ… Info envÃ­os actualizada.`; }
      else if (campoLower === 'mensajepromofinal')     { cfg.mensajePromoFinal = valor.trim(); respuesta += `\nâœ… Promo final actualizada.`; }
      else { respuesta += `\nâš ï¸ Campo "${campo}" no reconocido.`; }
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
      respuesta += `\nâœ… Bienvenida agregada. Total: ${cfg.frasesBienvenida.length} versiones.`;
    }

    const matchBienvenidaReplace = respuesta.match(/BIENVENIDA_REPLACE\|(.+)/);
    if (matchBienvenidaReplace) {
      respuesta = respuesta.replace(/BIENVENIDA_REPLACE\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.frasesBienvenida = [matchBienvenidaReplace[1].trim()];
      cfg.actualizadoPor = 'Jack';
      await saveConfigBot(redis, cfg);
      respuesta += `\nâœ… Bienvenida Ãºnica reemplazada.`;
    }

    const matchAviso = respuesta.match(/AVISO\|(.+)/);
    if (matchAviso) {
      respuesta = respuesta.replace(/AVISO\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.avisoGeneral = matchAviso[1].trim() === 'BORRAR' ? '' : matchAviso[1].trim();
      cfg.actualizadoPor = 'Jack';
      await saveConfigBot(redis, cfg);
      respuesta += matchAviso[1].trim() === 'BORRAR' ? `\nâœ… Aviso borrado.` : `\nâœ… Aviso activado.`;
    }

    const matchPromoAdd = respuesta.match(/PROMO_ADD\|([^|]+)\|([^|]+)\|([^|]+)\|(.+)/);
    if (matchPromoAdd) {
      const [, nombre, descripcion, descuento, vigencia] = matchPromoAdd;
      respuesta = respuesta.replace(/PROMO_ADD\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.promocionesActivas.push({ nombre: nombre.trim(), descripcion: descripcion.trim(), descuento: descuento.trim(), vigencia: vigencia.trim() });
      cfg.actualizadoPor = 'Jack';
      await saveConfigBot(redis, cfg);
      respuesta += `\nâœ… PromociÃ³n "${nombre.trim()}" activada.`;
    }

    const matchPromoDel = respuesta.match(/PROMO_DEL\|(.+)/);
    if (matchPromoDel) {
      respuesta = respuesta.replace(/PROMO_DEL\|.+/g, '').trim();
      const cfg = await getConfigBot(redis);
      cfg.promocionesActivas = cfg.promocionesActivas.filter(p => !p.nombre.toLowerCase().includes(matchPromoDel[1].trim().toLowerCase()));
      cfg.actualizadoPor = 'Jack';
      await saveConfigBot(redis, cfg);
      respuesta += `\nâœ… PromociÃ³n desactivada.`;
    }

    const matchMsj = respuesta.match(/SEND_MSG\|([^|]+)\|(.+)/);
    if (matchMsj) {
      let [, targetNum, targetTxt] = matchMsj;
      targetNum = targetNum.replace(/\D/g, '');
      respuesta = respuesta.replace(/SEND_MSG\|.+/g, '').trim();
      const ok = await enviarWhatsapp(targetNum, targetTxt.trim());
      respuesta += ok ? `\nâœ… Mensaje enviado al ${targetNum}.` : `\nâš ï¸ Meta rechazÃ³ el envÃ­o.`;
    }

    if (/GENERAR_REPORTE\|/.test(respuesta)) {
      respuesta = respuesta.replace(/GENERAR_REPORTE\|.+/g, '').trim();
      respuesta += `\nðŸ“Š Reporte generado.`;
    }

    if (/ENVIAR_CAMPANA\|/.test(respuesta)) {
      respuesta = respuesta.replace(/ENVIAR_CAMPANA\|.+/g, '').trim();
      respuesta += `\nðŸ“¢ CampaÃ±a ejecutada.`;
    }

  } else {

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // âœ… FIX STRIPE LINK â€” limpiar [LINK] y adjuntar link real
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (linkStripeAutoGenerado) {
      respuesta = respuesta.replace(/\[LINK\]/g, '').trim();
      if (!respuesta.includes('https://checkout.stripe.com')) {
        respuesta += `\n\nðŸ’³ *Su link de pago seguro (Tarjeta u OXXO):*\n${linkStripeAutoGenerado}\n\n_Procesado por Stripe. Su transacciÃ³n estÃ¡ protegida. ðŸº_`;
      }
      console.log(`âœ… Link Stripe auto-generado entregado al cliente`);
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
        `*OpciÃ³n ${i + 1} â€” ${c.banco}*\nâ€¢ Beneficiario: ${c.beneficiario}\nâ€¢ CLABE: ${c.clabe}`
      ).join('\n\n');

      respuesta +=
        `\n\nðŸ¦ *Datos para su transferencia SPEI â€” $${parseFloat(monto).toFixed(2)} MXN*\n\n` +
        `${cuentasTexto}\n\n` +
        `â€¢ Monto exacto: *$${parseFloat(monto).toFixed(2)} MXN*\n` +
        `â€¢ Referencia: *${referencia}*\n\n` +
        `_Una vez realizada la transferencia, comparta la captura y confirmaremos su pedido de inmediato. ðŸº_`;

      try {
        const convoTrace = await prisma.waConversation.findFirst({ where: { contactPhone: tel } });
        await createTrace({
          employeeId: convoTrace?.employeeId || "SISTEMA", phone: tel, type: "WHATSAPP",
          summary: `Datos SPEI enviados al cliente por $${parseFloat(monto).toFixed(2)} MXN`,
          content: { direction: "outbound", event: "spei_generado", monto: parseFloat(monto), referencia },
          actionName: "SPEI_GENERADO",
        });
      } catch (traceErr) { console.error("âš ï¸ Error en createTrace (spei):", traceErr); }
    }

    const matchRecordatorio = respuesta.match(/PROGRAMAR_RECORDATORIO\|(.+?)\|(.+?)\|(.+)/i);
    if (matchRecordatorio) {
      const [, , fechaRec, mensajeRec] = matchRecordatorio;
      respuesta = respuesta.replace(/PROGRAMAR_RECORDATORIO\|.+/g, '').trim();
      if (!perfil.recordatoriosPendientes) perfil.recordatoriosPendientes = [];
      perfil.recordatoriosPendientes.push({ tipo: 'reactivacion', fecha: fechaRec.trim(), mensaje: mensajeRec.trim() });
      await saveCliente(redis, tel, perfil);
      console.log(`â° Recordatorio guardado para ${tel}: ${mensajeRec.trim()} en ${fechaRec.trim()}`);
    }

    const matchEnvio = respuesta.match(/CALCULAR_ENVIO\|productos=\[(.+?)\]\|cp=([^|]+)(?:\|subtotal=([\d.]+))?/i);
    if (matchEnvio) {
      const [, productosStr, cpEnvio, subtotalStr] = matchEnvio;
      respuesta = respuesta.replace(/CALCULAR_ENVIO\|.+/g, '').trim();
      try {
        const productos: ProductoEnvio[] = JSON.parse(`[${productosStr}]`);

        let cpFinal = cpEnvio.trim().replace(/\D/g, '').slice(0, 5);
        if (!cpFinal || cpFinal.length < 4) {
          const cpDeDireccion = perfil.direccionEnvio?.match(/\b\d{5}\b/);
          if (cpDeDireccion) cpFinal = cpDeDireccion[0];
        }

        let subtotal = subtotalStr ? parseFloat(subtotalStr) : 0;
        if (!subtotal || subtotal === 0) {
          for (let i = historial.length - 1; i >= 0; i--) {
            const m = historial[i];
            if (m.role !== 'assistant') continue;
            const matchKg = m.content.match(/(\d+)\s*kg[^$]*\$\s*([\d,]+(?:\.\d{2})?)\s*(?:MXN|por kg)/i);
            if (matchKg) {
              const kg = parseFloat(matchKg[1]);
              const precioKg = parseFloat(matchKg[2].replace(/,/g, ''));
              subtotal = kg * precioKg;
              break;
            }
            const matchSub = m.content.match(/[Ss]ubtotal[^$\n]*\$\s*([\d,]+(?:\.\d{2})?)/);
            if (matchSub) { subtotal = parseFloat(matchSub[1].replace(/,/g, '')); break; }
            const matchTotal = m.content.match(/(?:rollo|total|precio)[^$\n]*\$\s*([\d,]+(?:\.\d{2})?)\s*MXN/i);
            if (matchTotal) {
              const val = parseFloat(matchTotal[1].replace(/,/g, ''));
              if (val > 100 && val < 500000) { subtotal = val; break; }
            }
          }
        }

        const facturaYaConfirmada = !!(perfil.ultimaCotizacionObj?.conFactura);
        const resultado = calcularEnvioReal(productos, cpFinal, subtotal, facturaYaConfirmada);

        perfil.ultimaCotizacionObj = {
          productos: productosStr,
          kg: productos.reduce((a, p) => a + p.kg, 0),
          subtotal,
          subtotalConEnvio: resultado.total,
          subtotalConEnvioConIva: Math.round((resultado.base + resultado.base * 0.16) * 100) / 100,
          cp: cpFinal,
          direccion: perfil.direccionEnvio || '',
          conFactura: facturaYaConfirmada,
          fecha: new Date().toISOString(),
        };
        perfil.ultimaCotizacion = `${productosStr} | CP:${cpFinal} | $${resultado.total.toFixed(2)} MXN`;
        await saveCliente(redis, tel, perfil);

        respuesta += `\n\n${resultado.desglose}\n\nÂ¿Requiere factura fiscal? ðŸº`;
        console.log(`ðŸ“¦ EnvÃ­o calculado: CP=${cpFinal} | Subtotal=$${subtotal} | Total=$${resultado.total}`);
      } catch (e) {
        console.error('Error calculando envÃ­o:', e);
        respuesta += `\n\nâš ï¸ No pude calcular el envÃ­o. CompÃ¡rtame la direcciÃ³n completa (calle, nÃºmero, colonia, ciudad y CP).`;
      }
    }

    const matchEscalar = respuesta.match(/ESCALAR\|(.+)/i);
    if (matchEscalar) {
      const [, duda] = matchEscalar;

      const esEscalamientoPorVolumen = /\b(\d{3,})\s*(kg|kilos|rollos|rollo|kilo)/i.test(duda) ||
        /volumen|cantidad grande|pedido grande|gran pedido|mucho pedido/i.test(duda);

      if (esEscalamientoPorVolumen) {
        console.log(`ðŸš« ESCALAMIENTO BLOQUEADO (por volumen): "${duda}" â€” El Coyote cierra la venta`);
        respuesta = respuesta.replace(/ESCALAR\|.+/g, '').trim();
        if (!respuesta || respuesta.length < 20) {
          respuesta = `Perfecto, ${perfil.genero === 'mujer' ? 'seÃ±ora' : 'seÃ±or'} ${perfil.nombre}. ðŸºðŸ“¦\n\nPara formalizar su pedido necesito:\nÂ¿A quÃ© direcciÃ³n completa enviamos? (calle, nÃºmero, colonia, ciudad y CP)`;
        }
      } else {
        console.log(`ðŸ†˜ ESCALAMIENTO: ${duda}`);
        respuesta = respuesta.replace(/ESCALAR\|.+/g, '').trim();
        respuesta += `\nðŸº Entendido. Acabo de generar un ticket de alta prioridad. Un asesor de la JaurÃ­a tomarÃ¡ este chat en breve para darle atenciÃ³n personal.`;

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
          console.error("âš ï¸ Error en DB durante el escalamiento:", dbErr);
        }
      }
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // âœ… FIX STRIPE LINK â€” GENERAR_COBRO
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const matchCobro = respuesta.match(/GENERAR_COBRO\|([^|\n]+)\|([\d.,]+)\|([^|\n]*)\|([^|\n]*)\|([^|\n]*)\|([^|\n]*)\|?([^|\n]*)/i);
    if (matchCobro && !linkStripeAutoGenerado) {
      const metodo  = (matchCobro[1] || 'tarjeta').trim().toLowerCase();
      let   monto   = parseFloat((matchCobro[2] || '0').replace(/,/g, ''));
      let   rfc     = (matchCobro[3] || 'NONE').trim() || 'NONE';
      let   razon   = (matchCobro[4] || 'NONE').trim() || 'NONE';
      let   cp      = (matchCobro[5] || 'NONE').trim() || 'NONE';
      let   regimen = (matchCobro[6] || 'NONE').trim() || 'NONE';
      let   uso     = (matchCobro[7] || 'NONE').trim() || 'NONE';

      const cotObj = perfil.ultimaCotizacionObj;
      if (cotObj) {
        const montoCorrectoSinIva = cotObj.subtotalConEnvio;
        const montoCorrectoConIva = cotObj.subtotalConEnvioConIva;
        if (monto < 200 && montoCorrectoSinIva > 0) {
          monto = cotObj.conFactura ? montoCorrectoConIva : montoCorrectoSinIva;
          console.log(`ðŸ”§ FIX: Monto sospechosamente bajo ($${matchCobro[2]}) corregido a $${monto} desde cotizacionObj`);
        } else if (cotObj.conFactura && monto < montoCorrectoConIva * 0.99) {
          monto = montoCorrectoConIva;
          console.log(`ðŸ”§ FIX: Monto corregido con IVA: $${monto}`);
        }
        if (rfc === 'NONE' && cotObj.rfc && cotObj.rfc !== 'NONE') rfc = cotObj.rfc;
        if (razon === 'NONE' && cotObj.razon && cotObj.razon !== 'NONE') razon = cotObj.razon;
        if (cp === 'NONE' && cotObj.cp && cotObj.cp !== 'NONE') cp = cotObj.cp;
        if (regimen === 'NONE' && cotObj.regimen && cotObj.regimen !== 'NONE') regimen = cotObj.regimen;
        if (uso === 'NONE' && cotObj.uso && cotObj.uso !== 'NONE') uso = cotObj.uso;
      }

      // Limpiar comando Y placeholder [LINK] del texto de GPT
      respuesta = respuesta.replace(/GENERAR_COBRO\|[^\n]*/gi, '').replace(/\[LINK\]/g, '').trim();

      if (monto > 0) {
        const reqInvoice = rfc !== 'NONE' ? 'YES' : 'NO';
        const amountInCents = Math.round(monto * 100);
        perfil.intentosDePago = (perfil.intentosDePago || 0) + 1;
        perfil.etapaAbandono = 'pago';
        perfil.fechaAbandono = new Date().toISOString();
        if (perfil.ultimaCotizacionObj) {
          perfil.ultimaCotizacionObj.conFactura = reqInvoice === 'YES';
          if (rfc !== 'NONE') perfil.ultimaCotizacionObj.rfc = rfc;
          if (razon !== 'NONE') perfil.ultimaCotizacionObj.razon = razon;
          if (cp !== 'NONE') perfil.ultimaCotizacionObj.cp = cp;
          if (regimen !== 'NONE') perfil.ultimaCotizacionObj.regimen = regimen;
          if (uso !== 'NONE') perfil.ultimaCotizacionObj.uso = uso;
        }
        await saveCliente(redis, tel, perfil);
        try {
          const session = await Promise.race([
            stripe.checkout.sessions.create({
              payment_method_types: ['card', 'oxxo'],
              line_items: [{ price_data: { currency: 'mxn', product_data: { name: 'Pedido Coyote Textil' }, unit_amount: amountInCents }, quantity: 1 }],
              mode: 'payment',
              success_url: 'https://wa.me/5215627301525',
              metadata: { rfc, razon, cp, regimen, uso, req_invoice: reqInvoice, phone: tel, productos: perfil.productosComprados.join(',') }
            }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Stripe timeout')), 8000)),
          ]) as Stripe.Checkout.Session;
          respuesta += `\n\nðŸ’³ *Su link de pago seguro (Tarjeta u OXXO):*\n${session.url}\n\n_Procesado por Stripe. Su transacciÃ³n estÃ¡ protegida. ðŸº_`;
          console.log(`âœ… Stripe session: $${monto} MXN | MÃ©todo: ${metodo} | RFC: ${rfc} | IVA: ${reqInvoice}`);
          try {
            const convoTrace = await prisma.waConversation.findFirst({ where: { contactPhone: tel } });
            await createTrace({
              employeeId: convoTrace?.employeeId || "SISTEMA", phone: tel, type: "WHATSAPP",
              summary: `Link Stripe generado: $${monto.toFixed(2)} MXN (${metodo})`,
              content: { direction: "outbound", event: "stripe_link_generado", metodo, monto, conFactura: reqInvoice === 'YES', sessionId: session.id },
              actionName: "LINK_STRIPE_GENERADO",
            });
          } catch (traceErr) { console.error("âš ï¸ Error en createTrace (stripe link):", traceErr); }
        } catch (err: any) {
          if (err?.message === 'Stripe timeout') {
            console.error('Stripe timeout en GENERAR_COBRO â€” generando en background');
            stripe.checkout.sessions.create({
              payment_method_types: ['card', 'oxxo'],
              line_items: [{ price_data: { currency: 'mxn', product_data: { name: 'Pedido Coyote Textil' }, unit_amount: amountInCents }, quantity: 1 }],
              mode: 'payment',
              success_url: 'https://wa.me/5215627301525',
              metadata: { rfc, razon, cp, regimen, uso, req_invoice: reqInvoice, phone: tel, productos: perfil.productosComprados.join(',') }
            }).then(s => {
              if (s.url) enviarWhatsapp(tel, `ðŸº Su link de pago seguro:\n${s.url}\n\nEn cuanto confirme, bodega recibe su pedido.`);
            }).catch(e => console.error('Stripe background error:', e));
            respuesta += `\n\nðŸ’³ Generando su link de pago. En cuanto estÃ© listo se lo enviamos (menos de 1 minuto). ðŸº`;
          } else {
            console.error('Error Stripe:', err);
            respuesta += `\n\nâš ï¸ Inconveniente generando el link de pago. Nuestro equipo lo revisa de inmediato.`;
          }
        }
      } else {
        console.warn(`âš ï¸ GENERAR_COBRO monto invÃ¡lido: "${matchCobro[2]}"`);
        respuesta += `\n\nâš ï¸ No pude determinar el monto del pedido. Â¿Me confirma el total a cobrar?`;
      }
    } else if (matchCobro && linkStripeAutoGenerado) {
      // Si ya hay link auto-generado, solo limpiar el comando y el placeholder
      respuesta = respuesta.replace(/GENERAR_COBRO\|[^\n]*/gi, '').replace(/\[LINK\]/g, '').trim();
    }
  }

  historial.push({ role: 'assistant', content: respuesta });
  await saveHistorial(redis, tel, historial);
  console.log(`ðŸ“¤ Enviando a ${tel} (${respuesta.length} chars) | Temp: ${perfil.temperaturaCompra} | TÃ¡ctica: ${perfil.tacticaActual}`);
  await enviarWhatsapp(tel, respuesta.trim());

  try {
    const convoTrace = await prisma.waConversation.findFirst({ where: { contactPhone: tel } });
    await createTrace({
      employeeId: convoTrace?.employeeId || "SISTEMA", phone: tel, type: "WHATSAPP",
      summary: `Respuesta del Coyote: ${respuesta.substring(0, 60)}${respuesta.length > 60 ? '...' : ''}`,
      content: { direction: "outbound", body: respuesta.trim(), tactica: perfil.tacticaActual, temperaturaCompra: perfil.temperaturaCompra, segmento: perfil.segmento },
      actionName: "RESPUESTA_BOT_COYOTE",
    });
  } catch (traceErr) { console.error("âš ï¸ Error en createTrace (respuesta bot):", traceErr); }

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
  } catch (dbErr) { console.error("âš ï¸ Error espejeando historial en Prisma:", dbErr); }

  console.log(`âœ… Flujo completo para ${tel}`);
}

// ==========================================
// ðŸš¦ ROUTER PRINCIPAL
// ==========================================
export async function POST(req: Request) {
  const rawBody = await req.text();
  console.log(`\nðŸš€ POST recibido â€” ${new Date().toISOString()}`);
  console.log(`   Stripe-Signature: ${req.headers.get('stripe-signature') ? 'PRESENTE' : 'AUSENTE'}`);
  console.log(`   Body length: ${rawBody.length} chars`);

  try {
    const signature = req.headers.get('stripe-signature');
    if (signature) {
      console.log('ðŸ’³ Procesando webhook Stripe...');
      return await handleStripeWebhook(rawBody, signature);
    }

    let body: any;
    try { body = JSON.parse(rawBody); }
    catch (e) {
      console.error('âŒ JSON invÃ¡lido:', rawBody.slice(0, 500));
      return NextResponse.json({ error: 'JSON Invalido' }, { status: 400 });
    }

    const esStatusUpdate = Array.isArray(body.entry) &&
      body.entry[0]?.changes?.[0]?.value?.statuses &&
      !body.entry[0]?.changes?.[0]?.value?.messages;

    if (esStatusUpdate) {
      const statusObj = body.entry[0].changes[0].value.statuses[0];
      if (statusObj.status === "failed") {
        console.error("âŒ ERROR DE ENTREGA META:", JSON.stringify(statusObj.errors, null, 2));
      } else {
        console.log(`ðŸ“Š Status update Meta: ${statusObj.status} (Ignorando)`);
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // ==========================================
    // ðŸº EL CADENERO â€” Router V1 / V2
    // ==========================================
    const esWhatsapp = Array.isArray(body.entry) && body.entry[0]?.changes?.[0]?.value?.messages;
    if (esWhatsapp) {
      console.log('ðŸ’¬ Mensaje WhatsApp recibido. Analizando enrutamiento...');
      try {
        const mensajes = body.entry[0].changes[0].value.messages;
        let phone = mensajes[0]?.from || "";

        // Normalizar nÃºmero mexicano (igual que en el resto del flujo)
        if (phone.startsWith("521") && phone.length === 13) {
          phone = phone.replace(/^521/, "52");
        }

        // EL CADENERO MÃGICO ðŸº
        if (shouldUseBotV2(phone)) {
          console.log(`ðŸš€ [ROUTER] Redirigiendo ${phone} al Bot V2 (Nueva Arquitectura)`);
          await handleWhatsAppWebhookV2(body);
        } else {
          console.log(`ðŸ¢ [ROUTER] Redirigiendo ${phone} al Bot V1 (Monolito)`);
          await handleWhatsappWebhook(body);
        }
      } catch (err) { console.error('âŒ Error en webhooks:', err); }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    console.log('âš ï¸ Payload no reconocido:', JSON.stringify(body).slice(0, 300));
    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (error) {
    console.error('âŒ ERROR CRÃTICO en POST:', error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

export async function GET(req: Request) {
  console.log('ðŸ” GET de verificaciÃ³n Meta recibido');
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('âœ… VerificaciÃ³n Meta exitosa');
    return new NextResponse(challenge, { status: 200 });
  }
  console.log('âŒ VerificaciÃ³n Meta fallida');
  return new NextResponse('Acceso denegado', { status: 403 });
}
