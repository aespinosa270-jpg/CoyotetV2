-- CreateEnum
CREATE TYPE "PickupLocation" AS ENUM ('GUATEMALA_97', 'PLOMO_203');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('PROSPECTO', 'COTIZANDO', 'NEGOCIACION', 'CERRADO_GANADO', 'CERRADO_PERDIDO');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('LLAMADA', 'WHATSAPP', 'CORREO', 'PRESENCIAL');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ABIERTO', 'EN_REVISION', 'RESUELTO', 'CERRADO');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "MembershipTier" AS ENUM ('NONE', 'GOLD', 'BLACK', 'ELITE');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'IN_REPAIR', 'RETIRED');

-- CreateEnum
CREATE TYPE "VehicleLogType" AS ENUM ('GASOLINA', 'SERVICIO', 'REPARACION');

-- CreateEnum
CREATE TYPE "RouteOrderType" AS ENUM ('RECOLECCION', 'RESTOCK_INTERNO', 'RESTOCK_PROVEEDOR', 'ENTREGA_PAQUETERIA', 'ENTREGA_DOMICILIO');

-- CreateEnum
CREATE TYPE "RouteOrderStatus" AS ENUM ('PENDIENTE', 'ASIGNADA', 'EN_CAMINO', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('KILO', 'METRO', 'PIEZA');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDIENTE', 'APROBADA', 'PAGADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "WaMessageRole" AS ENUM ('AGENT', 'CLIENT');

-- CreateEnum
CREATE TYPE "BreakType" AS ENUM ('BANO', 'LUNCH', 'PEDIDO', 'ENTRENAMIENTO');

-- CreateEnum
CREATE TYPE "ChatHandler" AS ENUM ('BOT', 'AGENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "TelaSolicitadaStatus" AS ENUM ('NUEVA', 'EN_EVALUACION', 'APROBADA', 'RECHAZADA', 'AGREGADA_AL_CATALOGO');

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "employeeId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.03,
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'offline',
ADD COLUMN     "suspendedFunctions" TEXT[];

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "botConversationId" TEXT,
ADD COLUMN     "botPhone" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveryLat" DOUBLE PRECISION,
ADD COLUMN     "deliveryLng" DOUBLE PRECISION,
ADD COLUMN     "evidenceUrl" TEXT,
ADD COLUMN     "pickupConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "pickupConfirmedBy" TEXT,
ADD COLUMN     "pickupIdPhotoUrl" TEXT,
ADD COLUMN     "pickupLocation" "PickupLocation" NOT NULL DEFAULT 'GUATEMALA_97',
ADD COLUMN     "pickupPlateNumber" TEXT,
ADD COLUMN     "preparedAt" TIMESTAMP(3),
ADD COLUMN     "preparedBy" TEXT,
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "shippedBy" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "vehicleId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "company" TEXT,
ADD COLUMN     "membershipColocacionesUsadas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "membershipExpiry" TIMESTAMP(3),
ADD COLUMN     "membershipTier" "MembershipTier" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "stripeSubscriptionStatus" TEXT,
ALTER COLUMN "role" SET DEFAULT 'USER',
ALTER COLUMN "hashId" SET DEFAULT concat('CL-', substr(gen_random_uuid()::text, 1, 6));

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unit" "UnitType" NOT NULL DEFAULT 'KILO',
    "thumbnail" TEXT,
    "description" TEXT,
    "composicion" TEXT,
    "gramaje" TEXT,
    "ancho" TEXT,
    "rendimiento" DOUBLE PRECISION,
    "priceMenudeo" DOUBLE PRECISION NOT NULL,
    "priceMayoreo" DOUBLE PRECISION NOT NULL,
    "hasRollo" BOOLEAN NOT NULL DEFAULT true,
    "unidadesPorRollo" DOUBLE PRECISION,
    "singleColor" BOOLEAN NOT NULL DEFAULT true,
    "origin" TEXT,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductColor" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "ProductColor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "colorId" TEXT,
    "location" "PickupLocation" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "rollCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "colorId" TEXT,
    "location" "PickupLocation" NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "rollCount" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT,
    "authorizedBy" TEXT NOT NULL,
    "notes" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "userId" TEXT,
    "employeeId" TEXT NOT NULL,
    "productId" TEXT,
    "color" TEXT,
    "quantity" DOUBLE PRECISION,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "PipelineStatus" NOT NULL DEFAULT 'PROSPECTO',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDIENTE',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOut" TIMESTAMP(3),
    "horasTrabajadas" DOUBLE PRECISION,
    "ipAddress" TEXT,
    "location" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "checkOutLat" DOUBLE PRECISION,
    "checkOutLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceBreak" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "type" "BreakType" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "duration" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceBreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "userId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "summary" TEXT NOT NULL,
    "content" JSONB,
    "status" TEXT NOT NULL DEFAULT 'open',
    "pipelineStatus" "PipelineStatus",
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextFollowUp" TIMESTAMP(3),

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zipCodes" TEXT[],
    "baseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedDays" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL DEFAULT concat('TK-', substr(gen_random_uuid()::text, 1, 6)),
    "userId" TEXT NOT NULL,
    "employeeId" TEXT,
    "orderId" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'ABIERTO',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "employeeId" TEXT,
    "userId" TEXT,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "lastMaintenance" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextMaintenance" TIMESTAMP(3) NOT NULL,
    "mileage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Telemetry" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "isSpeeding" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleLog" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "VehicleLogType" NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "VehicleLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteOrder" (
    "id" TEXT NOT NULL,
    "type" "RouteOrderType" NOT NULL,
    "status" "RouteOrderStatus" NOT NULL DEFAULT 'PENDIENTE',
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "address" TEXT NOT NULL,
    "addressLat" DOUBLE PRECISION,
    "addressLng" DOUBLE PRECISION,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "employeeId" TEXT,
    "originLocation" TEXT,
    "destLocation" TEXT,
    "carrier" TEXT,
    "sucursalNombre" TEXT,
    "signatureOrigin" TEXT,
    "signatureDestination" TEXT,
    "photoDropoff" TEXT[],
    "completedAt" TIMESTAMP(3),
    "deliveryLat" DOUBLE PRECISION,
    "deliveryLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteOrderItem" (
    "id" TEXT NOT NULL,
    "routeOrderId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "description" TEXT,
    "qtyDispatched" INTEGER NOT NULL,
    "qtyDelivered" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueLog" (
    "id" TEXT NOT NULL,
    "routeOrderId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "hasDelta" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaConversation" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "userId" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "handledBy" "ChatHandler" NOT NULL DEFAULT 'BOT',
    "lastAdminMessageAt" TIMESTAMP(3),
    "aiResumePausedUntil" TIMESTAMP(3),
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaMessage" (
    "id" TEXT NOT NULL,
    "waId" TEXT,
    "conversationId" TEXT NOT NULL,
    "role" "WaMessageRole" NOT NULL,
    "body" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelaNoManejada" (
    "id" TEXT NOT NULL,
    "clientePhone" TEXT NOT NULL,
    "clienteNombre" TEXT,
    "clienteUserId" TEXT,
    "telaIdentificada" TEXT NOT NULL,
    "descripcionExtra" TEXT,
    "imagenUrl" TEXT,
    "cantidadKg" DOUBLE PRECISION,
    "frecuencia" TEXT,
    "usoFinal" TEXT,
    "status" "TelaSolicitadaStatus" NOT NULL DEFAULT 'NUEVA',
    "notasInternas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelaNoManejada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramacionVolumen" (
    "id" TEXT NOT NULL,
    "clientePhone" TEXT NOT NULL,
    "clienteNombre" TEXT,
    "clienteUserId" TEXT,
    "telaSku" TEXT,
    "telaTitulo" TEXT NOT NULL,
    "kgPorPeriodo" DOUBLE PRECISION NOT NULL,
    "periodo" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "duracionMeses" INTEGER NOT NULL DEFAULT 1,
    "estado" TEXT NOT NULL DEFAULT 'propuesta',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramacionVolumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactoOutbound" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "nombre" TEXT,
    "empresa" TEXT,
    "notas" TEXT,
    "agregadoPor" TEXT,
    "plantillaEnviada" BOOLEAN NOT NULL DEFAULT false,
    "plantillaEnviadaAt" TIMESTAMP(3),
    "plantillaResponse" TEXT,
    "clienteRespondio" BOOLEAN NOT NULL DEFAULT false,
    "primeraRespuestaAt" TIMESTAMP(3),
    "coldReason" TEXT,
    "engagementScore" INTEGER NOT NULL DEFAULT 0,
    "reactivationPriority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assignedToEmployeeId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "nextFollowUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactoOutbound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotEscalation" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "nombre" TEXT,
    "razon" TEXT NOT NULL,
    "contexto" TEXT NOT NULL,
    "ultimoMsg" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "atendidaPor" TEXT,
    "atendidaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesAgentAttempt" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "messageSent" TEXT NOT NULL,
    "strategy" TEXT,
    "agentVersion" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentByEmployeeId" TEXT,
    "outcome" TEXT,
    "respondedAt" TIMESTAMP(3),
    "responseText" TEXT,

    CONSTRAINT "SalesAgentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesAgentFeedback" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesAgentFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_userId_key" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "ProductColor_productId_idx" ON "ProductColor"("productId");

-- CreateIndex
CREATE INDEX "Inventory_location_idx" ON "Inventory"("location");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_productId_colorId_location_key" ON "Inventory"("productId", "colorId", "location");

-- CreateIndex
CREATE INDEX "InventoryMovement_productId_idx" ON "InventoryMovement"("productId");

-- CreateIndex
CREATE INDEX "InventoryMovement_createdAt_idx" ON "InventoryMovement"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Deal_employeeId_idx" ON "Deal"("employeeId");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_dealId_key" ON "Commission"("dealId");

-- CreateIndex
CREATE INDEX "Commission_employeeId_idx" ON "Commission"("employeeId");

-- CreateIndex
CREATE INDEX "Commission_status_idx" ON "Commission"("status");

-- CreateIndex
CREATE INDEX "Attendance_employeeId_idx" ON "Attendance"("employeeId");

-- CreateIndex
CREATE INDEX "Attendance_createdAt_idx" ON "Attendance"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "AttendanceBreak_attendanceId_idx" ON "AttendanceBreak"("attendanceId");

-- CreateIndex
CREATE INDEX "Interaction_userId_idx" ON "Interaction"("userId");

-- CreateIndex
CREATE INDEX "Interaction_employeeId_idx" ON "Interaction"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");

-- CreateIndex
CREATE INDEX "TicketMessage_createdAt_idx" ON "TicketMessage"("createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE INDEX "Telemetry_employeeId_idx" ON "Telemetry"("employeeId");

-- CreateIndex
CREATE INDEX "Telemetry_timestamp_idx" ON "Telemetry"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "VehicleLog_vehicleId_idx" ON "VehicleLog"("vehicleId");

-- CreateIndex
CREATE INDEX "RouteOrder_employeeId_idx" ON "RouteOrder"("employeeId");

-- CreateIndex
CREATE INDEX "RouteOrder_status_idx" ON "RouteOrder"("status");

-- CreateIndex
CREATE INDEX "RouteOrder_scheduledAt_idx" ON "RouteOrder"("scheduledAt");

-- CreateIndex
CREATE INDEX "RouteOrderItem_routeOrderId_idx" ON "RouteOrderItem"("routeOrderId");

-- CreateIndex
CREATE INDEX "IssueLog_routeOrderId_idx" ON "IssueLog"("routeOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WaConversation_contactPhone_key" ON "WaConversation"("contactPhone");

-- CreateIndex
CREATE INDEX "WaConversation_employeeId_idx" ON "WaConversation"("employeeId");

-- CreateIndex
CREATE INDEX "WaConversation_handledBy_idx" ON "WaConversation"("handledBy");

-- CreateIndex
CREATE INDEX "WaConversation_updatedAt_idx" ON "WaConversation"("updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "WaMessage_waId_key" ON "WaMessage"("waId");

-- CreateIndex
CREATE INDEX "WaMessage_conversationId_idx" ON "WaMessage"("conversationId");

-- CreateIndex
CREATE INDEX "WaMessage_sentAt_idx" ON "WaMessage"("sentAt" DESC);

-- CreateIndex
CREATE INDEX "TelaNoManejada_telaIdentificada_idx" ON "TelaNoManejada"("telaIdentificada");

-- CreateIndex
CREATE INDEX "TelaNoManejada_status_idx" ON "TelaNoManejada"("status");

-- CreateIndex
CREATE INDEX "TelaNoManejada_createdAt_idx" ON "TelaNoManejada"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProgramacionVolumen_clientePhone_idx" ON "ProgramacionVolumen"("clientePhone");

-- CreateIndex
CREATE INDEX "ProgramacionVolumen_estado_idx" ON "ProgramacionVolumen"("estado");

-- CreateIndex
CREATE INDEX "ProgramacionVolumen_fechaInicio_idx" ON "ProgramacionVolumen"("fechaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "ContactoOutbound_phone_key" ON "ContactoOutbound"("phone");

-- CreateIndex
CREATE INDEX "ContactoOutbound_phone_idx" ON "ContactoOutbound"("phone");

-- CreateIndex
CREATE INDEX "ContactoOutbound_plantillaEnviada_idx" ON "ContactoOutbound"("plantillaEnviada");

-- CreateIndex
CREATE INDEX "ContactoOutbound_status_idx" ON "ContactoOutbound"("status");

-- CreateIndex
CREATE INDEX "ContactoOutbound_reactivationPriority_idx" ON "ContactoOutbound"("reactivationPriority" DESC);

-- CreateIndex
CREATE INDEX "ContactoOutbound_assignedToEmployeeId_idx" ON "ContactoOutbound"("assignedToEmployeeId");

-- CreateIndex
CREATE INDEX "ContactoOutbound_nextFollowUpAt_idx" ON "ContactoOutbound"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "BotEscalation_phone_idx" ON "BotEscalation"("phone");

-- CreateIndex
CREATE INDEX "BotEscalation_estado_idx" ON "BotEscalation"("estado");

-- CreateIndex
CREATE INDEX "BotEscalation_createdAt_idx" ON "BotEscalation"("createdAt");

-- CreateIndex
CREATE INDEX "BotEscalation_razon_idx" ON "BotEscalation"("razon");

-- CreateIndex
CREATE INDEX "SalesAgentAttempt_contactId_idx" ON "SalesAgentAttempt"("contactId");

-- CreateIndex
CREATE INDEX "SalesAgentAttempt_sentAt_idx" ON "SalesAgentAttempt"("sentAt" DESC);

-- CreateIndex
CREATE INDEX "SalesAgentAttempt_outcome_idx" ON "SalesAgentAttempt"("outcome");

-- CreateIndex
CREATE INDEX "SalesAgentFeedback_contactId_idx" ON "SalesAgentFeedback"("contactId");

-- CreateIndex
CREATE INDEX "SalesAgentFeedback_employeeId_idx" ON "SalesAgentFeedback"("employeeId");

-- CreateIndex
CREATE INDEX "AuditLog_employeeId_idx" ON "AuditLog"("employeeId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductColor" ADD CONSTRAINT "ProductColor_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "ProductColor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "ProductColor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceBreak" ADD CONSTRAINT "AttendanceBreak_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Telemetry" ADD CONSTRAINT "Telemetry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleLog" ADD CONSTRAINT "VehicleLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteOrder" ADD CONSTRAINT "RouteOrder_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteOrderItem" ADD CONSTRAINT "RouteOrderItem_routeOrderId_fkey" FOREIGN KEY ("routeOrderId") REFERENCES "RouteOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueLog" ADD CONSTRAINT "IssueLog_routeOrderId_fkey" FOREIGN KEY ("routeOrderId") REFERENCES "RouteOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaConversation" ADD CONSTRAINT "WaConversation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaConversation" ADD CONSTRAINT "WaConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaMessage" ADD CONSTRAINT "WaMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WaConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactoOutbound" ADD CONSTRAINT "ContactoOutbound_assignedToEmployeeId_fkey" FOREIGN KEY ("assignedToEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAgentAttempt" ADD CONSTRAINT "SalesAgentAttempt_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "ContactoOutbound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAgentAttempt" ADD CONSTRAINT "SalesAgentAttempt_sentByEmployeeId_fkey" FOREIGN KEY ("sentByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAgentFeedback" ADD CONSTRAINT "SalesAgentFeedback_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "ContactoOutbound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAgentFeedback" ADD CONSTRAINT "SalesAgentFeedback_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
