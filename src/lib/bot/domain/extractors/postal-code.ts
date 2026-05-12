/**
 * Extractor de códigos postales mexicanos.
 *
 * Detecta CPs (5 dígitos) en mensajes de cliente, manejando:
 *  - CP suelto: "06000"
 *  - CP con prefijo: "CP 06000", "C.P. 06000", "código postal 06000"
 *  - CP con separadores: "06,000", "06.000"
 *  - CP en contexto: "vivo en CDMX 06000", "Cuauhtémoc 06000"
 *  - Múltiples CPs en un mensaje (raro pero pasa con direcciones de oficina)
 *
 * NO detecta:
 *  - 4 dígitos pegados (no son CP válido en México)
 *  - Más de 5 dígitos contiguos (sería un teléfono)
 *  - Números que excedan el rango válido de CPs mexicanos (01000-99999)
 *
 * Esto se llama desde el orquestador ANTES de la llamada a GPT, para
 * extraer y guardar el CP en `perfil.codigoPostalEnvio` automáticamente.
 * Así el bot ya tiene el CP cuando arma su respuesta, sin depender de
 * que GPT lo pida explícitamente con un tool call.
 */

export interface ExtractedCp {
  /** El código postal de 5 dígitos. */
  codigo: string;
  /** Posición en el mensaje original donde se encontró. */
  position: number;
  /** Texto alrededor del match (para debugging y heurísticas). */
  context: string;
  /** Confianza heurística: 'high' (con prefijo CP/código postal) o 'medium' (suelto). */
  confidence: "high" | "medium";
}

// Patrón con prefijo explícito (alta confianza)
const CP_WITH_PREFIX =
  /(?:c\.?\s*p\.?|c[oó]digo\s+postal|zip|postal)[\s:.-]*?(\d{5})\b/gi;

// Patrón suelto: 5 dígitos con word boundary (confianza media)
const CP_BARE = /(?<!\d)(\d{5})(?!\d)/g;

// Rango válido de CPs en México
const CP_MIN = 1000;
const CP_MAX = 99999;

/**
 * Extrae todos los CPs encontrados en el mensaje, dedupeados.
 * Si hay match con prefijo y match suelto del mismo CP, prefiere el de alta confianza.
 */
export function extractCps(message: string): ExtractedCp[] {
  if (!message) return [];

  // Normalización: remover separadores entre dígitos para que "06,000" → "06000"
  const normalized = message.replace(/(\d)[,.\s](\d{3})\b/g, "$1$2");

  const found = new Map<string, ExtractedCp>();

  // Primera pasada: con prefijo (alta confianza)
  CP_WITH_PREFIX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CP_WITH_PREFIX.exec(normalized)) !== null) {
    const codigo = m[1];
    if (!isValidCp(codigo)) continue;
    found.set(codigo, {
      codigo,
      position: m.index,
      context: extractContext(normalized, m.index, m[0].length),
      confidence: "high",
    });
  }

  // Segunda pasada: suelto. Solo agregamos si no está ya con alta confianza.
  CP_BARE.lastIndex = 0;
  while ((m = CP_BARE.exec(normalized)) !== null) {
    const codigo = m[1];
    if (!isValidCp(codigo)) continue;
    if (found.has(codigo)) continue;
    found.set(codigo, {
      codigo,
      position: m.index,
      context: extractContext(normalized, m.index, codigo.length),
      confidence: "medium",
    });
  }

  return Array.from(found.values()).sort((a, b) => a.position - b.position);
}

/**
 * Devuelve el primer CP detectado, o null si no hay ninguno.
 * Si hay varios, prefiere los de alta confianza sobre los sueltos.
 */
export function firstCp(message: string): string | null {
  const cps = extractCps(message);
  if (cps.length === 0) return null;

  // Si hay alguno con alta confianza, ese gana
  const high = cps.find((c) => c.confidence === "high");
  if (high) return high.codigo;

  return cps[0].codigo;
}

/**
 * Valida si un string parece un CP mexicano válido.
 * NO verifica que el CP exista en el padrón de Sepomex — solo formato y rango.
 */
export function isValidCp(maybeCp: string): boolean {
  if (!/^\d{5}$/.test(maybeCp)) return false;
  const num = parseInt(maybeCp, 10);
  return num >= CP_MIN && num <= CP_MAX;
}

// ── Helpers internos ───────────────────────────────────────────────

function extractContext(text: string, pos: number, len: number, window = 25): string {
  const start = Math.max(0, pos - window);
  const end = Math.min(text.length, pos + len + window);
  return text.slice(start, end).trim();
}
