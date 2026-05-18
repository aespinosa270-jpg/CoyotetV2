-- Feature 4: Sistema de Escalaciones del Bot
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS "BotEscalation" (
  "id"          TEXT PRIMARY KEY,
  "phone"       TEXT NOT NULL,
  "nombre"      TEXT,
  "razon"       TEXT NOT NULL,
  "contexto"    TEXT NOT NULL,
  "ultimoMsg"   TEXT NOT NULL,
  "estado"      TEXT NOT NULL DEFAULT 'pendiente',
  "atendidaPor" TEXT,
  "atendidaAt"  TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "BotEscalation_phone_idx" ON "BotEscalation"("phone");
CREATE INDEX IF NOT EXISTS "BotEscalation_estado_idx" ON "BotEscalation"("estado");
CREATE INDEX IF NOT EXISTS "BotEscalation_createdAt_idx" ON "BotEscalation"("createdAt");
CREATE INDEX IF NOT EXISTS "BotEscalation_razon_idx" ON "BotEscalation"("razon");

COMMENT ON TABLE "BotEscalation" IS 'Casos escalados automáticamente por el bot v2 al admin humano';
