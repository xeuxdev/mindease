-- CreateEnum
CREATE TYPE "CrisisSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "crisis_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "severity" "CrisisSeverity" NOT NULL,
    "keywords" TEXT[],
    "context" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crisis_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crisis_resources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contact" TEXT,
    "available" TEXT,
    "country" TEXT NOT NULL DEFAULT 'NG',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crisis_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crisis_alerts_userId_idx" ON "crisis_alerts"("userId");

-- CreateIndex
CREATE INDEX "crisis_alerts_conversationId_idx" ON "crisis_alerts"("conversationId");

-- CreateIndex
CREATE INDEX "crisis_resources_country_idx" ON "crisis_resources"("country");

-- CreateIndex
CREATE INDEX "crisis_resources_type_idx" ON "crisis_resources"("type");
