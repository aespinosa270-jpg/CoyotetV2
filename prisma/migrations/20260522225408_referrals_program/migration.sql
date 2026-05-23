-- ============================================================
-- Programa de Referidos
-- ============================================================

-- 1. Extender tabla User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode"   TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCredit" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredById"   TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");

-- 2. Extender tabla Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "referralId"    TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "creditApplied" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- 3. Crear tabla Referral
CREATE TABLE IF NOT EXISTS "Referral" (
    "id"           TEXT PRIMARY KEY,
    "referrerId"   TEXT NOT NULL,
    "refereeId"    TEXT,
    "refereePhone" TEXT,
    "refereeName"  TEXT,
    "codeUsed"     TEXT NOT NULL,
    "status"       TEXT NOT NULL DEFAULT 'pending',
    "orderId"      TEXT,
    "orderTotal"   DOUBLE PRECISION,
    "creditEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt"  TIMESTAMP(3),
    "notifiedAt"   TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "Referral_referrerId_idx"   ON "Referral"("referrerId");
CREATE INDEX IF NOT EXISTS "Referral_refereeId_idx"    ON "Referral"("refereeId");
CREATE INDEX IF NOT EXISTS "Referral_refereePhone_idx" ON "Referral"("refereePhone");
CREATE INDEX IF NOT EXISTS "Referral_codeUsed_idx"     ON "Referral"("codeUsed");
CREATE INDEX IF NOT EXISTS "Referral_status_idx"       ON "Referral"("status");

-- 4. Foreign keys (con ON DELETE/UPDATE apropiados)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Referral_referrerId_fkey') THEN
    ALTER TABLE "Referral"
      ADD CONSTRAINT "Referral_referrerId_fkey"
      FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Referral_refereeId_fkey') THEN
    ALTER TABLE "Referral"
      ADD CONSTRAINT "Referral_refereeId_fkey"
      FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;