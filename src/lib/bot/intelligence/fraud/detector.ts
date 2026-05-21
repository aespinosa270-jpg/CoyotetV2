/**
 * Fraud Detector — patrones sospechosos en mensajes de cliente.
 *
 * NO bloquea ventas. Solo MARCA banderas para que el bot:
 *  1. Sea más prudente (NO ofrezca COD, NO use métodos raros, NO acepte cambios inusuales)
 *  2. Escale a humano si el cliente insiste
 *
 * Patrones detectados:
 *  - cod_alto_valor: pide "pago al recibir" en montos altos
 *  - metodo_pago_raro: menciona Bizum, criptomonedas, Western Union, MoneyGram
 *  - urgencia_sospechosa: "URGENTE pásame todo HOY", combinado con descuentos
 *  - direccion_extranjera: pide envío fuera de México sin contexto
 *  - cambio_datos_ultima_hora: "mejor mándamelo a OTRA dirección, OTRO nombre"
 *  - precio_negociacion_agresiva: "te lo pago 50% menos o nada"
 *  - phishing_dato: pide datos bancarios del vendedor "para verificar"
 */

export type RedFlag =
  | "cod_alto_valor"
  | "metodo_pago_raro"
  | "urgencia_sospechosa"
  | "direccion_extranjera"
  | "cambio_datos_ultima_hora"
  | "negociacion_agresiva"
  | "phishing_dato";

export interface FraudDetection {
  hayRiesgo: boolean;
  flags: RedFlag[];
  signals: Array<{ flag: RedFlag; texto: string }>;
  nivel: "ninguno" | "bajo" | "medio" | "alto";
}

const EMPTY: FraudDetection = {
  hayRiesgo: false,
  flags: [],
  signals: [],
  nivel: "ninguno",
};

// ── Patrones de detección ─────────────────────────────────────────

const COD_PATTERNS: RegExp[] = [
  /\b(pago\s+al?\s+(recibir|entregar|llegar)|contraentrega|contra[\s-]?entrega|cash\s+on\s+delivery|COD\b)/i,
  /\b(pago\s+(en|al)\s+efectivo\s+al\s+(recibir|llegar))/i,
];

const METODOS_PAGO_RAROS: RegExp[] = [
  /\b(bizum)/i,                                        // No existe en México
  /\b(bitcoin|btc|ethereum|usdt|tether|crypto|criptomoneda)/i,
  /\b(western\s+union|moneygram|ria\s+envia)/i,
  /\b(zelle|paypal\s+amigos|venmo|cashapp)/i,         // Apps no comerciales en MX
  /\b(transferencia\s+internacional|swift|iban)/i,
];

const URGENCIA_PATTERNS: RegExp[] = [
  /\b(URGENTE|URGENTÍSIMO|YA\s+YA\s+YA|hoy\s+mismo|en\s+las\s+pr[oó]ximas\s+horas)/i,
  /\b(necesito\s+(ya|ahorita|inmediato)|s[uú]per\s+r[aá]pido|express)/i,
];

const URGENCIA_DESCUENTO: RegExp[] = [
  /\b(urgente\s+.*\s+descuento|descuento\s+.*\s+urgente|r[aá]pido\s+.*\s+(promo|oferta|barato))/i,
  /\b(si\s+me\s+(haces|das)\s+(descuento|precio)\s+.*\s+(hoy|ya))/i,
];

const DIRECCION_EXTRANJERA: RegExp[] = [
  /\b(estados?\s+unidos|usa\s|america\s+del\s+norte|texas|california|miami|los\s+angeles|chicago)/i,
  /\b(colombia|peru\b|argentina|chile|brasil|venezuela|guatemala|honduras|panama|nicaragua|costa\s+rica)/i,
  /\b(espa[ñn]a\b|madrid|barcelona|francia|reino\s+unido|inglaterra|alemania)/i,
];

const CAMBIO_DATOS: RegExp[] = [
  /\b(mejor\s+m[aá]ndamelo\s+a\s+otr[ao]|cambiarlo\s+a\s+otr[ao]\s+(direcci[oó]n|nombre|domicilio))/i,
  /\b(otro\s+contacto|mi\s+(primo|amigo|hermano)\s+lo\s+recibe|env[íi]alo\s+a\s+nombre\s+de)/i,
  /\b(cambia\s+el\s+(nombre|destinatario|recibe)\s+por)/i,
];

const NEGOCIACION_AGRESIVA: RegExp[] = [
  /\b(te\s+(lo\s+|la\s+)?pago\s+(\d{1,2})%?\s+menos)/i,
  /\b(mi\s+precio\s+es|m[aá]ximo\s+pago|no\s+pago\s+m[aá]s\s+de)/i,
  /\b(o\s+lo\s+tomas\s+(as[íi]\s+)?o\s+(nada|no|nos\s+vamos)|esto\s+(es|son)\s+lo\s+(que|m[aá]s))/i,
];

const PHISHING_PATTERNS: RegExp[] = [
  /\b(me\s+(das|pasas|env[íi]as?)\s+(tu\s+|sus?\s+)?(numero\s+de\s+tarjeta|tarjeta|cuenta|clabe|nip|cvv))/i,
  /\b(necesito\s+(verificar|confirmar)\s+(tu|su)\s+(cuenta|tarjeta|datos))/i,
  /\b(mejor\s+m[aá]ndame\s+tu\s+(qr|c[oó]digo|cuenta\s+personal))/i,
];

// ── Parser ────────────────────────────────────────────────────────

function detectMatches(text: string, patterns: RegExp[]): string[] {
  const matches: string[] = [];
  for (const p of patterns) {
    const m = p.exec(text);
    if (m) matches.push(m[0]);
  }
  return matches;
}

/**
 * Detecta red flags en un mensaje. Opcional: pasar montoTotalCotizado
 * para evaluar si COD es de alto valor.
 */
export function detectFraud(
  text: string,
  montoTotalCotizado?: number
): FraudDetection {
  if (!text || text.trim().length === 0) return EMPTY;

  const signals: Array<{ flag: RedFlag; texto: string }> = [];

  // COD — solo flag si monto es alto (>$5,000)
  const codMatches = detectMatches(text, COD_PATTERNS);
  if (codMatches.length > 0 && (montoTotalCotizado === undefined || montoTotalCotizado > 5000)) {
    signals.push({ flag: "cod_alto_valor", texto: codMatches[0] });
  }

  // Métodos raros
  const metodoMatches = detectMatches(text, METODOS_PAGO_RAROS);
  for (const m of metodoMatches) {
    signals.push({ flag: "metodo_pago_raro", texto: m });
  }

  // Urgencia sospechosa: solo si urgencia + (descuento O monto alto)
  const urgenciaMatches = detectMatches(text, URGENCIA_PATTERNS);
  const urgenciaDescuento = detectMatches(text, URGENCIA_DESCUENTO);
  if (
    (urgenciaMatches.length > 0 && urgenciaDescuento.length > 0) ||
    (urgenciaMatches.length > 0 && montoTotalCotizado && montoTotalCotizado > 10000)
  ) {
    signals.push({ flag: "urgencia_sospechosa", texto: urgenciaMatches[0] });
  }

  // Dirección extranjera
  const dirMatches = detectMatches(text, DIRECCION_EXTRANJERA);
  for (const m of dirMatches) {
    signals.push({ flag: "direccion_extranjera", texto: m });
  }

  // Cambio de datos
  const cambioMatches = detectMatches(text, CAMBIO_DATOS);
  for (const m of cambioMatches) {
    signals.push({ flag: "cambio_datos_ultima_hora", texto: m });
  }

  // Negociación agresiva
  const negMatches = detectMatches(text, NEGOCIACION_AGRESIVA);
  for (const m of negMatches) {
    signals.push({ flag: "negociacion_agresiva", texto: m });
  }

  // Phishing
  const phishMatches = detectMatches(text, PHISHING_PATTERNS);
  for (const m of phishMatches) {
    signals.push({ flag: "phishing_dato", texto: m });
  }

  // Calcular nivel
  const flags = Array.from(new Set(signals.map((s) => s.flag)));
  let nivel: FraudDetection["nivel"] = "ninguno";
  if (flags.includes("phishing_dato") || flags.includes("cambio_datos_ultima_hora")) {
    nivel = "alto";
  } else if (flags.length >= 2 || flags.includes("metodo_pago_raro") || flags.includes("direccion_extranjera")) {
    nivel = "medio";
  } else if (flags.length >= 1) {
    nivel = "bajo";
  }

  return {
    hayRiesgo: flags.length > 0,
    flags,
    signals,
    nivel,
  };
}