-- Migration: aftercare_trust_score

ALTER TABLE "User"
  ADD COLUMN "trustScore" INTEGER NOT NULL DEFAULT 70,
  ADD COLUMN "trustEvents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastAftercareAt" TIMESTAMP(3);

CREATE TABLE "AftercareEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "contactId" TEXT,
  "orderId" TEXT,
  "type" TEXT NOT NULL,
  "channel" TEXT,
  "messageSent" TEXT,
  "outcome" TEXT,
  "responseText" TEXT,
  "trustDelta" INTEGER NOT NULL DEFAULT 0,
  "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  "notas" TEXT,
  CONSTRAINT "AftercareEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AftercareEvent"
  ADD CONSTRAINT "AftercareEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AftercareEvent"
  ADD CONSTRAINT "AftercareEvent_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "ContactoOutbound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AftercareEvent"
  ADD CONSTRAINT "AftercareEvent_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AftercareEvent_userId_idx" ON "AftercareEvent"("userId");
CREATE INDEX "AftercareEvent_contactId_idx" ON "AftercareEvent"("contactId");
CREATE INDEX "AftercareEvent_orderId_idx" ON "AftercareEvent"("orderId");
CREATE INDEX "AftercareEvent_type_idx" ON "AftercareEvent"("type");
CREATE INDEX "AftercareEvent_triggeredAt_idx" ON "AftercareEvent"("triggeredAt");