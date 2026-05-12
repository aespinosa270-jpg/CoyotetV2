-- ════════════════════════════════════════════════════════════════════
-- COYOTE BOT v2 — RAG con pgvector
-- ════════════════════════════════════════════════════════════════════
--
-- Cómo aplicar:
--   1. Abre el SQL Editor de Supabase (en supabase.com/dashboard)
--   2. Pega TODO este archivo
--   3. Click "Run"
--   4. Verifica que las 3 funciones se crearon (al fondo)
--
-- Idempotente: lo puedes correr varias veces sin romper nada.
-- ════════════════════════════════════════════════════════════════════


-- 1. Habilitar la extensión pgvector
-- ────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;


-- 2. Tabla de embeddings del catálogo
-- ────────────────────────────────────────────────────────────────────
-- product_id: matchea el id de Producto en src/lib/bot/types/domain.ts
-- content: el texto que se vectorizó (nombre + descripción + categoría)
-- embedding: 1536 dimensiones (text-embedding-3-small)
-- updated_at: cuándo se reindexó

CREATE TABLE IF NOT EXISTS bot_catalog_embeddings (
  product_id  text PRIMARY KEY,
  content     text NOT NULL,
  embedding   vector(1536) NOT NULL,
  metadata    jsonb DEFAULT '{}'::jsonb,
  updated_at  timestamptz DEFAULT now()
);


-- 3. Índice IVFFlat para búsqueda rápida por similitud de coseno
-- ────────────────────────────────────────────────────────────────────
-- 100 listas es razonable para hasta ~10K productos. Para tu catálogo
-- de ~50 productos, esto es overkill pero no hace daño.

CREATE INDEX IF NOT EXISTS bot_catalog_embeddings_vector_idx
  ON bot_catalog_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);


-- 4. Índice de texto para búsqueda exact-match (la parte "híbrida")
-- ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS bot_catalog_embeddings_content_idx
  ON bot_catalog_embeddings
  USING gin (to_tsvector('spanish', content));


-- 5. Función RPC: búsqueda vectorial pura
-- ────────────────────────────────────────────────────────────────────
-- Llamada desde Node: supabase.rpc('match_catalog', {...})

CREATE OR REPLACE FUNCTION match_catalog (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  product_id text,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT
    bot_catalog_embeddings.product_id,
    bot_catalog_embeddings.content,
    1 - (bot_catalog_embeddings.embedding <=> query_embedding) as similarity,
    bot_catalog_embeddings.metadata
  FROM bot_catalog_embeddings
  WHERE 1 - (bot_catalog_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY bot_catalog_embeddings.embedding <=> query_embedding
  LIMIT match_count;
$$;


-- 6. Función RPC: búsqueda híbrida (vectorial + texto exacto)
-- ────────────────────────────────────────────────────────────────────
-- Combina similitud de coseno con coincidencia de texto. Los resultados
-- de match exacto se marcan con similarity > 1.0 para que siempre ganen
-- en el orden final.

CREATE OR REPLACE FUNCTION match_catalog_hybrid (
  query_embedding vector(1536),
  query_text text,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  product_id text,
  content text,
  similarity float,
  match_type text,
  metadata jsonb
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  -- Parte vectorial
  SELECT
    e.product_id,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity,
    'vector'::text as match_type,
    e.metadata
  FROM bot_catalog_embeddings e
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold

  UNION

  -- Parte exact-match: si el texto del cliente menciona literalmente un producto
  SELECT
    e.product_id,
    e.content,
    1.5 as similarity,  -- score alto para que ganen
    'exact'::text as match_type,
    e.metadata
  FROM bot_catalog_embeddings e
  WHERE
    query_text IS NOT NULL
    AND length(trim(query_text)) > 0
    AND to_tsvector('spanish', e.content) @@ plainto_tsquery('spanish', query_text)

  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;


-- 7. Función para limpieza (útil para reindex completo)
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION clear_catalog_embeddings()
RETURNS void
LANGUAGE sql
AS $$
  TRUNCATE TABLE bot_catalog_embeddings;
$$;


-- ════════════════════════════════════════════════════════════════════
-- Verificación: corre estas 3 queries para confirmar que todo quedó
-- ════════════════════════════════════════════════════════════════════
-- SELECT extname FROM pg_extension WHERE extname = 'vector';
-- SELECT * FROM pg_tables WHERE tablename = 'bot_catalog_embeddings';
-- SELECT proname FROM pg_proc WHERE proname IN ('match_catalog', 'match_catalog_hybrid', 'clear_catalog_embeddings');
