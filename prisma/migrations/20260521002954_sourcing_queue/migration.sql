-- Migration: sourcing_queue
ALTER TABLE "Product"
  ADD COLUMN "cantidadInmediataKg" DOUBLE PRECISION;

ALTER TABLE "Order"
  ADD COLUMN "requiresSourcing" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sourcingStatus" TEXT,
  ADD COLUMN "sourcingDays" INTEGER,
  ADD COLUMN "sourcingPromisedAt" TIMESTAMP(3),
  ADD COLUMN "sourcingResolvedAt" TIMESTAMP(3),
  ADD COLUMN "sourcingInternalNotes" TEXT;

CREATE INDEX IF NOT EXISTS "Order_sourcingStatus_idx"
  ON "Order"("sourcingStatus")
  WHERE "requiresSourcing" = true;