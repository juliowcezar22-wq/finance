-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL DEFAULT '__no_owner__',
    "day" DATE NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsage_ownerId_idx" ON "AiUsage"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_ownerId_day_key" ON "AiUsage"("ownerId", "day");

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

