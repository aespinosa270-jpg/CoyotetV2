/**
 * Repository de configuración del bot.
 *
 * La `ConfigBot` es lo que Jack edita por WhatsApp con comandos `CONFIG|...`
 * (en el futuro también desde el dashboard admin). Vive en una sola key de
 * Redis y se lee en cada request del bot.
 */
import type { Redis } from "@upstash/redis";
import { getRedis } from "./redis";
import { keys } from "./keys";
import { getLogger } from "../observability/logger";
import type { ConfigBot } from "../types/domain";

const log = getLogger({ module: "config-repo" });

// ── Default que se siembra si Redis está vacío ─────────────────────

export const CONFIG_DEFAULT: ConfigBot = {
  nombreBot: "El Coyote",
  tono: `Vendedor consultivo de alto rendimiento. Siempre hablar de "usted". 
Tono: profesional con energía y dinamismo B2B. Directo, resolutivo y con urgencia comercial genuina.
Estilo: frases cortas y contundentes. Cada mensaje debe empujar hacia el cierre.
PROHIBIDO: tutear al cliente, lenguaje coloquial, frases de relleno.
OBLIGATORIO: precio en cada cotización, propuesta concreta al final de cada mensaje.`,

  frasesBienvenida: [
    "Bienvenido a *Coyote Textil*. Soy *El Coyote* 🐺, su asesor especializado disponible 24/7.\n\n📋 Términos: https://www.coyotetextil.com/terms\n🔒 Privacidad: https://www.coyotetextil.com/privacy\n\nPara darle una atención precisa y verificar su cuenta, ¿me comparte su *nombre* y *correo electrónico*?\n\n_(Ejemplo: Juan García, juan@empresa.com)_",
  ],

  frasesDesignacionHombre: ["señor", "estimado", "licenciado"],
  frasesDesignacionMujer: ["señora", "señorita", "estimada"],

  fraseCierre:
    "Vestimos la fuerza de México en cada hilo. Ha sido un placer atenderle — El Coyote y todo el equipo de Coyote Textil quedan a su entera disposición. 🐺",
  fraseIncondicional:
    "Nuestras operaciones no se detienen. Soy El Coyote y permanezco siempre activo para respaldar la logística de su negocio, a cualquier hora. 🐺",

  emojisPrincipales: "🐺📦🤝",
  maximoLineasRespuesta: 4,

  fraseProhibidas: [
    "Te enviaré los detalles",
    "Enviaré la cotización",
    "Procederé",
    "¿Algo más en lo que pueda asistirte?",
    "te mando",
    "te envío",
    "te hago llegar",
    "tú",
    "oye",
    "dale",
    "órale",
    "patrón",
    "patrona",
    "jefe",
    "cuate",
    "Como asistente de IA",
    "Como IA",
    "soy una inteligencia artificial",
    "soy un bot",
    "soy un asistente virtual",
    "Con gusto le ayudo",
    "Por supuesto",
    "Claro que sí",
    "voy a revisar",
    "déjeme verificar",
    "permítame consultar",
    "voy a confirmar",
    "en un momento le confirmo",
    "déme un momento",
    "espere un momento",
    "Un momento mientras",
    "Procesando su solicitud",
    "Procesando su pago",
    "Generando su link",
    "Vamos a calcular",
    "vamos a procesar",
    "Procedemos a calcular",
    "Procedemos a generar",
    "calcularé el envío",
    "generaré el link",
    "le genero el link",
    "le proceso el pago",
  ],

  instruccionesEspeciales: "",
  promocionesActivas: [],
  infoPagos: "",
  infoEnvios: "",
  mensajePromoFinal: "",
  avisoGeneral: "",
  horarioAtencion: "24/7 los 365 días del año",
  ultimaActualizacion: new Date().toISOString(),
  actualizadoPor: "sistema",
};

// ── API ────────────────────────────────────────────────────────────

export async function getConfig(
  redis: Redis = getRedis()
): Promise<ConfigBot> {
  try {
    const stored = await redis.get<ConfigBot>(keys.config());
    if (!stored) {
      // Sembrar el default la primera vez
      await redis.set(keys.config(), CONFIG_DEFAULT);
      return CONFIG_DEFAULT;
    }
    // Mergear con default para que nuevos campos no rompan
    return { ...CONFIG_DEFAULT, ...stored };
  } catch (err) {
    log.error({ err }, "Error leyendo config; usando default");
    return CONFIG_DEFAULT;
  }
}

export async function saveConfig(
  config: ConfigBot,
  updatedBy: string,
  redis: Redis = getRedis()
): Promise<void> {
  const updated: ConfigBot = {
    ...config,
    ultimaActualizacion: new Date().toISOString(),
    actualizadoPor: updatedBy,
  };
  await redis.set(keys.config(), updated);
  log.info(
    { updatedBy, lastUpdated: updated.ultimaActualizacion },
    "Config actualizada"
  );
}

export async function patchConfig(
  patch: Partial<ConfigBot>,
  updatedBy: string,
  redis: Redis = getRedis()
): Promise<ConfigBot> {
  const current = await getConfig(redis);
  const merged: ConfigBot = { ...current, ...patch };
  await saveConfig(merged, updatedBy, redis);
  return merged;
}
