/*
  Warnings:

  - The `status` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[orderNumber]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[hashId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - The required column `orderNumber` was added to the `Order` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `userId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('ADMIN', 'SUPERVISOR', 'VENDEDORA', 'LOGISTICA', 'CONTABILIDAD');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "LogisticsType" AS ENUM ('COYOTE_LOCAL', 'SKYDROPX_NACIONAL');

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "freightCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "invoiceStatus" TEXT,
ADD COLUMN     "logisticsType" "LogisticsType" NOT NULL DEFAULT 'SKYDROPX_NACIONAL',
ADD COLUMN     "orderNumber" TEXT NOT NULL,
ADD COLUMN     "paymentMethod" TEXT NOT NULL DEFAULT 'card',
ADD COLUMN     "serviceFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "taxIVA" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "trackingNumber" TEXT,
ADD COLUMN     "trackingUrl" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL,
ADD COLUMN     "vehiclesNeeded" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "wantsInvoice" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "color" TEXT,
ADD COLUMN     "sku" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cfdiUse" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "consentDate" TIMESTAMP(3),
ADD COLUMN     "hashId" TEXT NOT NULL DEFAULT concat('CL-', substr(gen_random_uuid()::text, 1, 6)),
ADD COLUMN     "ltv" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "optOutDate" TIMESTAMP(3),
ADD COLUMN     "optedIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "rfc" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "suppressed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxRegime" TEXT,
ADD COLUMN     "zipCode" TEXT;

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "EmployeeRole" NOT NULL DEFAULT 'VENDEDORA',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_hashId_key" ON "User"("hashId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
