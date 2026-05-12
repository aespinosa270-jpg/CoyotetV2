// Cargar .env ANTES de importar nada que use process.env
import "dotenv/config";

/**
 * Script de reindex del catálogo en pgvector.
 *
 * Cómo correr:
 *   npx tsx scripts/reindex-catalog.ts
 *
 * O agregar al package.json:
 *   "reindex:catalog": "tsx scripts/reindex-catalog.ts"
 *
 * Cuándo correrlo:
 *  - Primera vez después de aplicar MIGRATION.sql
 *  - Cada vez que Jack agregue productos custom completamente nuevos
 *  - Si el índice se desincroniza por algún bug
 *
 * El script es idempotente: lo puedes correr 100 veces sin riesgo.
 */
import { indexCatalog } from "../src/lib/bot/intelligence/rag/indexer";
import { countEmbeddings } from "../src/lib/bot/repositories/vector-repo";

async function main() {
  console.log("🔄 Reindex del catálogo iniciando...");

  const before = await countEmbeddings();
  console.log(`📊 Embeddings actuales en pgvector: ${before}`);

  const result = await indexCatalog();

  console.log("");
  console.log("✅ Reindex completado");
  console.log(`   Productos indexados: ${result.count}`);
  console.log(`   Tiempo: ${result.durationMs}ms`);
  console.log(`   Tokens estimados: ~${result.estimatedTokens}`);
  console.log(`   Costo aprox: $${(result.estimatedTokens * 0.00000002).toFixed(6)}`);

  const after = await countEmbeddings();
  console.log(`📊 Embeddings ahora en pgvector: ${after}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error en reindex:", err);
    process.exit(1);
  });
