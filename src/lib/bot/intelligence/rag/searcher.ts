/**
 * Búsqueda semántica del catálogo (RAG).
 *
 * Pipeline:
 *   1. Recibe la query del cliente (su mensaje completo o extracto)
 *   2. Genera embedding de la query
 *   3. Búsqueda híbrida en pgvector (vectorial + exact match)
 *   4. Recupera productos completos desde catalog-repo (con overlays aplicados)
 *   5. Filtra los que están "hidden" en el overlay
 *
 * El paso 4 es importante: pgvector devuelve IDs y similarity scores, pero el
 * orquestador necesita los productos COMPLETOS con precios actuales (que
 * vienen del overlay de Redis, no del SQL). Por eso pegamos las dos fuentes.
 */
import type OpenAI from "openai";
import { getCatalog } from "../../repositories/catalog-repo";
import { searchHybrid } from "../../repositories/vector-repo";
import { getEmbedding } from "../../services/openai/embeddings";
import { getLogger } from "../../observability/logger";
import type { Producto } from "../../types/domain";

const log = getLogger({ module: "rag/searcher" });

// ── Tipos ──────────────────────────────────────────────────────────

export interface SearchResult {
  producto: Producto;
  similarity: number;
  matchType: "vector" | "exact";
}

export interface SearchOptions {
  /** Top K resultados. Default 5. */
  k?: number;
  /** Threshold mínimo de similitud (0-1). Default 0.5. */
  threshold?: number;
}

// ── Función principal ─────────────────────────────────────────────

/**
 * Búsqueda híbrida de productos según el mensaje del cliente.
 *
 * Si la búsqueda vectorial falla por cualquier motivo (Supabase caído,
 * índice vacío), devuelve TODO el catálogo como fallback. El bot prefiere
 * tener exceso de información antes que cero.
 */
export async function searchProducts(
  queryText: string,
  options: SearchOptions = {},
  openaiClient?: OpenAI
): Promise<SearchResult[]> {
  const { k = 5, threshold = 0.5 } = options;
  const cleaned = queryText.trim();
  if (!cleaned) {
    log.debug({}, "Query vacía, devolviendo []");
    return [];
  }

  try {
    // 1. Embed de la query del cliente
    const queryVector = await getEmbedding(cleaned, openaiClient);

    // 2. Búsqueda híbrida en pgvector
    const vectorResults = await searchHybrid(queryVector, cleaned, {
      matchThreshold: threshold,
      matchCount: k,
    });

    if (vectorResults.length === 0) {
      log.info({ query: cleaned }, "Sin resultados de vector search");
      return [];
    }

    // 3. Recuperar productos completos desde catalog-repo (con overlays)
    const fullCatalog = await getCatalog();
    const catalogById = new Map(fullCatalog.map((p) => [p.id, p]));

    // 4. Mapear y filtrar los hidden (no están en fullCatalog porque catalog-repo
    //    ya aplica el overlay y filtra los hiddenProductIds)
    const results: SearchResult[] = [];
    for (const v of vectorResults) {
      const producto = catalogById.get(v.productId);
      if (!producto) {
        // El producto está en pgvector pero ya no en el catálogo (Jack lo ocultó o eliminó).
        // Se skipea silenciosamente.
        continue;
      }
      results.push({
        producto,
        similarity: v.similarity,
        matchType: v.matchType ?? "vector",
      });
    }

    log.debug(
      { query: cleaned.slice(0, 50), found: results.length },
      "RAG search completado"
    );
    return results;
  } catch (err) {
    log.error({ err, query: cleaned.slice(0, 50) }, "Error en RAG search");
    // Fail-open: devolvemos vacío, el orchestrator decidirá si hace fallback
    // al catálogo completo
    return [];
  }
}

/**
 * Decide si vale la pena hacer RAG para el mensaje actual.
 *
 * Heurística simple: solo hacemos RAG cuando el mensaje parece tener
 * intención de producto (menciona unidades, telas, características).
 * Mensajes tipo "hola" o "gracias" no necesitan búsqueda.
 *
 * Esto ahorra latencia + costo de embeddings en saludos y small talk.
 */
export function shouldUseRag(message: string): boolean {
  if (!message || message.trim().length < 5) return false;

  const productHints =
    /tela|hilo|el[áa]stic|kilo|metro|rollo|cono|caja|pieza|precio|costo|cotiz|color|gramaje|peso|para\s+(hacer|fabricar|coser|confeccionar)|me\s+sirve|necesito|quiero|busco|tienen|hay/i;

  return productHints.test(message);
}
