/**
 * Indexer del catálogo en pgvector.
 *
 * Genera embeddings de cada producto del catálogo (source-of-truth desde
 * lib/products.ts via catalog-repo) y los sube a Supabase.
 *
 * El embedding se construye a partir del NOMBRE + DESCRIPCIÓN + CATEGORÍA
 * + USOS del producto. NO se embeden precios ni stock porque cambian
 * frecuentemente y no aportan a la similitud semántica.
 *
 * Cuándo invocarlo:
 *  - Una vez al deploy inicial (`npm run reindex:catalog`)
 *  - Cuando Jack agrega un producto custom completamente nuevo via overlay
 *  - Manualmente desde el dashboard admin si sospecha que el índice está stale
 */
import type OpenAI from "openai";
import { getCatalog } from "../../repositories/catalog-repo";
import {
  upsertEmbeddingsBatch,
  type CatalogEmbedding,
} from "../../repositories/vector-repo";
import { getEmbeddingsBatch } from "../../services/openai/embeddings";
import { getLogger } from "../../observability/logger";
import type { Producto } from "../../types/domain";

const log = getLogger({ module: "rag/indexer" });

// ── Generador del texto a embed ────────────────────────────────────

/**
 * Convierte un producto en el texto que va a ser embedido.
 *
 * Incluye: nombre, categoría, usos, gramaje (si aplica), info descriptiva.
 * NO incluye: precios (cambian), stock (cambia), IDs internos.
 */
export function productToEmbedText(p: Producto): string {
  const parts: string[] = [];
  parts.push(p.nombre);
  parts.push(`Categoría: ${p.categoria}`);
  if (p.categoriaLibre) parts.push(`Tipo: ${p.categoriaLibre}`);
  if (p.info) parts.push(p.info);

  // Specs específicas según tipo de producto
  if (p.categoria === "telas") {
    const tela = p as any;
    if (tela.rendimientoMxKg) {
      parts.push(`Rendimiento: ${tela.rendimientoMxKg} metros por kilo`);
    }
    if (tela.kgPorRollo) {
      parts.push(`Presentación: rollo de ${tela.kgPorRollo} kg`);
    }
  }

  return parts.join(". ");
}

// ── Indexación ────────────────────────────────────────────────────

export interface IndexResult {
  /** Cuántos productos se indexaron exitosamente. */
  count: number;
  /** Tiempo total en ms. */
  durationMs: number;
  /** Tokens estimados consumidos (1 ~= 4 chars). */
  estimatedTokens: number;
}

/**
 * Indexa el catálogo entero. Genera embeddings en batch (más barato que loop)
 * y sube todo a pgvector con UPSERT.
 *
 * Idempotente: si ya hay embeddings, los reemplaza.
 */
export async function indexCatalog(
  openaiClient?: OpenAI
): Promise<IndexResult> {
  const start = Date.now();
  log.info({}, "Iniciando indexación del catálogo");

  const catalog = await getCatalog();
  if (catalog.length === 0) {
    log.warn({}, "Catálogo vacío, nada que indexar");
    return { count: 0, durationMs: Date.now() - start, estimatedTokens: 0 };
  }

  // Generar texts a embed
  const texts = catalog.map(productToEmbedText);
  const totalChars = texts.reduce((acc, t) => acc + t.length, 0);
  const estimatedTokens = Math.ceil(totalChars / 4);

  log.info(
    { products: catalog.length, estimatedTokens },
    "Llamando OpenAI embeddings en batch"
  );

  // Una sola llamada para todos los productos (batch endpoint)
  const vectors = await getEmbeddingsBatch(texts, openaiClient);

  if (vectors.length !== catalog.length) {
    log.error(
      { expected: catalog.length, got: vectors.length },
      "Mismatch entre productos y embeddings recibidos"
    );
    throw new Error("Embedding count mismatch");
  }

  // Construir registros
  const embeddings: CatalogEmbedding[] = catalog.map((producto, i) => ({
    productId: producto.id,
    content: texts[i],
    embedding: vectors[i],
    metadata: {
      nombre: producto.nombre,
      slug: producto.slug,
      categoria: producto.categoria,
      categoriaLibre: producto.categoriaLibre ?? null,
    },
  }));

  // UPSERT en batch
  const written = await upsertEmbeddingsBatch(embeddings);

  const durationMs = Date.now() - start;
  log.info(
    { written, durationMs, estimatedTokens },
    "Catálogo indexado en pgvector"
  );

  return { count: written, durationMs, estimatedTokens };
}

/**
 * Indexa UN solo producto. Útil para cuando Jack agrega un custom product
 * via overlay y no quiere esperar a un reindex completo.
 */
export async function indexSingleProduct(
  producto: Producto,
  openaiClient?: OpenAI
): Promise<void> {
  const text = productToEmbedText(producto);
  const [vector] = await getEmbeddingsBatch([text], openaiClient);

  await upsertEmbeddingsBatch([
    {
      productId: producto.id,
      content: text,
      embedding: vector,
      metadata: {
        nombre: producto.nombre,
        slug: producto.slug,
        categoria: producto.categoria,
        categoriaLibre: producto.categoriaLibre ?? null,
      },
    },
  ]);

  log.info(
    { productId: producto.id, nombre: producto.nombre },
    "Producto individual indexado"
  );
}
