/**
 * Merger de hechos episódicos — funciones puras.
 *
 * Cuando el extractor saca hechos nuevos, hay que mezclarlos con los que ya
 * teníamos guardados sin duplicar. La estrategia:
 *
 *  1. Si el hecho nuevo es CASI IDÉNTICO a uno existente (substring o
 *     similitud léxica alta), descartamos el nuevo y subimos la confianza
 *     del viejo (significa que se confirmó dos veces).
 *  2. Si es nuevo de verdad, lo agregamos.
 *  3. Cap a MAX_HECHOS: si nos pasamos, descartamos los de menor confianza.
 *
 * No es matching semántico real (eso requeriría embeddings) pero es bueno
 * suficiente para evitar duplicados obvios y barato.
 */
import { MAX_HECHOS, type HechoEpisodico, type MemoriaEpisodica } from "./types";

/** Threshold para considerar dos hechos "el mismo": 70% de palabras compartidas. */
const SIMILARITY_THRESHOLD = 0.7;

// ── API principal ─────────────────────────────────────────────────

export function mergeHechos(
  existentes: HechoEpisodico[],
  nuevos: HechoEpisodico[]
): HechoEpisodico[] {
  if (nuevos.length === 0) return existentes;

  const merged: HechoEpisodico[] = existentes.map((h) => ({ ...h }));

  for (const nuevo of nuevos) {
    const idx = findSimilarIndex(merged, nuevo);
    if (idx >= 0) {
      // Mismo hecho ya existe — subir confianza y refrescar timestamp
      const existing = merged[idx];
      merged[idx] = {
        ...existing,
        confianza: Math.min(1, existing.confianza + 0.1),
        timestamp: nuevo.timestamp,
        evidencia: nuevo.evidencia ?? existing.evidencia,
      };
    } else {
      merged.push(nuevo);
    }
  }

  return capByConfianza(merged, MAX_HECHOS);
}

/**
 * Construye el bloque de memoria para inyectar al system prompt.
 * Solo incluye hechos con confianza >= threshold para evitar inyectar ruido.
 *
 * Formato compacto, agrupado por categoría.
 */
export function buildMemoryBlock(
  memoria: MemoriaEpisodica,
  options: { minConfianza?: number; maxHechos?: number } = {}
): string {
  const minConfianza = options.minConfianza ?? 0.5;
  const maxHechos = options.maxHechos ?? 15;

  const utiles = memoria.hechos
    .filter((h) => h.confianza >= minConfianza)
    .sort((a, b) => b.confianza - a.confianza)
    .slice(0, maxHechos);

  if (utiles.length === 0) return "";

  const lines: string[] = ["LO QUE SABES DEL CLIENTE (de conversaciones anteriores):"];
  for (const h of utiles) {
    lines.push(`- [${h.categoria}] ${h.hecho}`);
  }
  return lines.join("\n");
}

// ── Helpers ────────────────────────────────────────────────────────

function findSimilarIndex(hechos: HechoEpisodico[], target: HechoEpisodico): number {
  for (let i = 0; i < hechos.length; i++) {
    const sim = textSimilarity(hechos[i].hecho, target.hecho);
    if (sim >= SIMILARITY_THRESHOLD) return i;
  }
  return -1;
}

/**
 * Similitud léxica simple: % de palabras significativas compartidas.
 * No usa embeddings — es barato y suficiente para deduplicar.
 */
function textSimilarity(a: string, b: string): number {
  const wordsA = tokenize(a);
  const wordsB = tokenize(b);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let shared = 0;
  for (const w of wordsA) if (wordsB.has(w)) shared++;

  // Jaccard: intersección / unión
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : shared / union;
}

const STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas",
  "de", "del", "a", "al", "en", "con", "por", "para",
  "que", "y", "o", "u", "e", "es", "son", "ser", "está",
  "su", "sus", "se", "lo", "le", "les", "me", "te", "nos",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\wáéíóúñ\s]/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

function capByConfianza(
  hechos: HechoEpisodico[],
  max: number
): HechoEpisodico[] {
  if (hechos.length <= max) return hechos;
  // Ordenar por confianza desc y cortar
  return [...hechos]
    .sort((a, b) => b.confianza - a.confianza)
    .slice(0, max);
}
