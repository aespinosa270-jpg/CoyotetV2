/**
 * Validador post-respuesta del bot.
 *
 * Defensa en profundidad: aunque el system prompt de Fase 5 le diga a GPT
 * que NO mencione telas que no vende, a veces se le va. Este validador
 * escanea cada respuesta del bot por palabras de telas prohibidas (popelina,
 * lino, mezclilla, etc.) y devuelve un veredicto.
 *
 * El orquestador puede:
 *  - Bloquear la respuesta y forzar retry con instrucción correctiva
 *  - Loguear como métrica para tracking de hallucinations
 *  - Mandar pero alertar a Jack vía admin
 *
 * Decisión recomendada: BLOQUEAR + retry con prompt correctivo. Es mejor
 * tardar 1-2 segundos extra que mandar al cliente "le recomiendo popelina".
 */
import { getLogger } from "../observability/logger";
import { TELAS_PROHIBIDAS } from "../intelligence/prompts/catalog-block";

const log = getLogger({ module: "postprocessing/product-validator" });

export interface ValidationResult {
  /** True si la respuesta no menciona ninguna tela prohibida. */
  ok: boolean;
  /** Telas prohibidas detectadas (palabras exactas que matchearon). */
  prohibidasMencionadas: string[];
  /** Texto evaluado (mismo que el input). */
  texto: string;
}

/**
 * Construye una regex que matchea cualquier tela prohibida con word boundary.
 * Cacheada como variable de módulo para no rearmarla en cada llamada.
 */
const PROHIBIDAS_REGEX = new RegExp(
  `\\b(${TELAS_PROHIBIDAS.map(escapeRegex).join("|")})\\b`,
  "gi"
);

/**
 * Valida una respuesta del bot. Devuelve `ok: true` si está limpia,
 * `ok: false` con la lista de telas prohibidas detectadas si no.
 */
export function validateBotResponse(texto: string): ValidationResult {
  if (!texto || texto.trim() === "") {
    return { ok: true, prohibidasMencionadas: [], texto };
  }

  PROHIBIDAS_REGEX.lastIndex = 0;
  const matches = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = PROHIBIDAS_REGEX.exec(texto)) !== null) {
    matches.add(m[1].toLowerCase());
  }

  const prohibidasMencionadas = Array.from(matches);
  const ok = prohibidasMencionadas.length === 0;

  if (!ok) {
    log.warn(
      { prohibidas: prohibidasMencionadas, sample: texto.slice(0, 200) },
      "🚨 HALLUCINATION detectada — respuesta menciona tela no-catálogo"
    );
  }

  return { ok, prohibidasMencionadas, texto };
}

/**
 * Genera un mensaje correctivo para mandarle a GPT como retry.
 * Uso típico:
 *   const validation = validateBotResponse(response.text);
 *   if (!validation.ok) {
 *     messages.push({ role: "user", content: buildCorrectiveMessage(validation) });
 *     response = await chat(messages, { tools }); // retry
 *   }
 */
export function buildCorrectiveMessage(result: ValidationResult): string {
  const telas = result.prohibidasMencionadas.join(", ");
  return `IMPORTANTE: tu respuesta anterior mencionó "${telas}". Coyote Textil NO vende ese tipo de telas. Reescribe tu respuesta sin mencionar "${telas}" — explícale al cliente con honestidad que no manejamos esas telas y redirígelo a productos del catálogo (Sportok, Micropique, Felpa, Alaska, Kyoto, etc.) que sí podemos ofrecerle.`;
}

// ── Helpers ────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
