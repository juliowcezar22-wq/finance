-- CreateTable
CREATE TABLE "WebhookHit" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookHit_createdAt_idx" ON "WebhookHit"("createdAt");

