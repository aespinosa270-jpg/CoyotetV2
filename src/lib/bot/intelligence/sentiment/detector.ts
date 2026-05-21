/**
 * Sentiment Detector — análisis de tono del último mensaje del cliente.
 *
 * NO usa GPT (sería un round-trip extra carísimo por turno). Solo regex
 * sobre keywords + emojis comunes. Suficiente para guiar el tono del bot
 * sin afectar latencia.
 *
 * Niveles (de + a -):
 *   - "entusiasta"  → cliente caliente, listo para cerrar
 *   - "positivo"    → receptivo, buena vibra
 *   - "neutral"     → default, sin señales fuertes
 *   - "dudoso"      → tiene reservas, está evaluando
 *   - "frustrado"   → cansado, algo no le late
 *   - "enojado"     → MUY molesto, en riesgo de queja formal
 */

export type SentimentLevel =
  | "entusiasta"
  | "positivo"
  | "neutral"
  | "dudoso"
  | "frustrado"
  | "enojado";

export interface SentimentDetection {
  level: SentimentLevel;
  signals: string[]; // Frases o keywords que dispararon la detección
  score: number; // -3 (enojado) a +3 (entusiasta)
}

// ── Patrones ──────────────────────────────────────────────────────

// Patrones MUY positivos
const ENTUSIASTA_PATTERNS: RegExp[] = [
  /\b(perfect[oa]|excelente|me\s+encanta|s[uú]per|brutal|chido|padr[ií]simo|genial)\b/i,
  /\b(ya\s+me\s+decid[ií]|lo\s+quiero|me\s+lo\s+llevo|va\s+pedido|hagamos\s+el)\b/i,
  /(🔥|✅|💯|🙌|🚀|⚡)/u,
];

// Patrones positivos suaves
const POSITIVO_PATTERNS: RegExp[] = [
  /\b(gracias|claro|s[ií]\s+por\s+favor|de\s+acuerdo|bien|me\s+sirve)\b/i,
  /\b(ok\b|va\b|listo|cool|aja)/i,
  /(😊|👍|🙂|💪|😄)/u,
];

// Patrones de duda / objeción suave
const DUDOSO_PATTERNS: RegExp[] = [
  /\b(pero|el\s+problema|no\s+s[ée]\s+si|hmm|mmm|d[ée]jame\s+ver|d[ée]jame\s+pensar)\b/i,
  /\b(est[aá]\s+caro|sale\s+caro|un\s+poco\s+caro|m[aá]s\s+barato|el\s+precio)\b/i,
  /\b(no\s+me\s+convence|no\s+estoy\s+seguro|despu[eé]s|m[aá]s\s+tarde|lo\s+pienso)\b/i,
  /\b(otra\s+marca|otro\s+proveedor|estoy\s+viendo|comparando)\b/i,
];

// Patrones frustrados
const FRUSTRADO_PATTERNS: RegExp[] = [
  /\b(ya\s+van\s+\d+|otra\s+vez|nuevamente|de\s+nuevo)\b/i,
  /\b(no\s+(me\s+)?entiend[ea]s?|no\s+es\s+lo\s+que\s+ped[ií]|no\s+es\s+eso)\b/i,
  /\b(carisim[oa]|car[ií]simo|demasiado\s+caro|exagerad[oa])\b/i,
  /\b(tarda(s|ndo)|se\s+est[aá]\s+tardando|much[oa]\s+tiempo|llevo\s+(esperando|aqu[ií]))\b/i,
  /\b(no\s+sirves?|in[uú]til|p[ée]simo|hart[oa])\b/i,
  /(😤|😩|😒|🤦|🙄)/u,
];

// Patrones MUY negativos / enojados (riesgo queja formal)
const ENOJADO_PATTERNS: RegExp[] = [
  /\b(estafa|fraude|robo|enga[ñn]o|profeco|condusef|abogad[oa]|demand[aoé])\b/i,
  /\b(verg[üu]enza|asco|basura|horrible|miserable|miser[aá]ble)\b/i,
  /\b(p[ée]nde[jo]|cabr[oó]n|mam[ÓóOo]n|chinga|verga|culer[oa]|imb[eé]cil)\b/i,
  /\b(furios[oa]|enojad[oa]\s+much[ií]simo)\b/i,
  /(😡|🤬|💢|👿)/u,
];

// ── Detección ─────────────────────────────────────────────────────

function matchesAny(text: string, patterns: RegExp[]): string[] {
  const matches: string[] = [];
  for (const p of patterns) {
    const m = p.exec(text);
    if (m) matches.push(m[0]);
  }
  return matches;
}

export function detectSentiment(text: string): SentimentDetection {
  if (!text || text.trim().length === 0) {
    return { level: "neutral", signals: [], score: 0 };
  }

  // Orden importa: chequear ENOJADO primero (más severo gana)
  const enojado = matchesAny(text, ENOJADO_PATTERNS);
  if (enojado.length > 0) {
    return { level: "enojado", signals: enojado, score: -3 };
  }

  const frustrado = matchesAny(text, FRUSTRADO_PATTERNS);
  if (frustrado.length > 0) {
    return { level: "frustrado", signals: frustrado, score: -2 };
  }

  const entusiasta = matchesAny(text, ENTUSIASTA_PATTERNS);
  const positivo = matchesAny(text, POSITIVO_PATTERNS);
  const dudoso = matchesAny(text, DUDOSO_PATTERNS);

  // Si hay duda Y positivo → gana duda (más informativo para el bot)
  if (dudoso.length >= 2 || (dudoso.length === 1 && entusiasta.length === 0 && positivo.length === 0)) {
    return { level: "dudoso", signals: dudoso, score: -1 };
  }

  if (entusiasta.length > 0) {
    return { level: "entusiasta", signals: entusiasta, score: 3 };
  }

  if (positivo.length > 0) {
    return { level: "positivo", signals: positivo, score: 1 };
  }

  return { level: "neutral", signals: [], score: 0 };
}