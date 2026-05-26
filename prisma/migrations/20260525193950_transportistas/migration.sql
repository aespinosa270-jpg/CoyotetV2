-- ============================================================
-- Tabla Transportista (paqueterias agrupadas por zona CDMX)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Transportista" (
  "id"        TEXT PRIMARY KEY,
  "nombre"    TEXT NOT NULL,
  "zona"      TEXT NOT NULL,
  "direccion" TEXT,
  "telefono"  TEXT,
  "destinos"  TEXT[] NOT NULL DEFAULT '{}',
  "notas"     TEXT,
  "activo"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Transportista_zona_idx"   ON "Transportista"("zona");
CREATE INDEX IF NOT EXISTS "Transportista_activo_idx" ON "Transportista"("activo");