-- Feature 002: integridade de dados.
-- (1) Remover registros ÓRFÃOS (ownerId NULL) ANTES de aplicar NOT NULL.
--     Ordem folha→raiz para respeitar FKs entre entidades owned. No-op em
--     bancos sem órfãos (ex.: produção nova) — reproduzível no migrate deploy.
DELETE FROM "CashBoxMovement" WHERE "ownerId" IS NULL;
DELETE FROM "PersonPayment"   WHERE "ownerId" IS NULL;
DELETE FROM "Receivable"      WHERE "ownerId" IS NULL;
DELETE FROM "Installment"     WHERE "ownerId" IS NULL;
DELETE FROM "Transaction"     WHERE "ownerId" IS NULL;
DELETE FROM "CreditCardInvoice" WHERE "ownerId" IS NULL;
DELETE FROM "AccountCard"     WHERE "ownerId" IS NULL;
DELETE FROM "CashBox"         WHERE "ownerId" IS NULL;
DELETE FROM "Goal"            WHERE "ownerId" IS NULL;
DELETE FROM "Income"          WHERE "ownerId" IS NULL;
DELETE FROM "CategorizationRule" WHERE "ownerId" IS NULL;
DELETE FROM "ImportBatch"     WHERE "ownerId" IS NULL;
DELETE FROM "AIMemory"        WHERE "ownerId" IS NULL;
DELETE FROM "AIConversation"  WHERE "ownerId" IS NULL;
DELETE FROM "CreditCard"      WHERE "ownerId" IS NULL;
DELETE FROM "Account"         WHERE "ownerId" IS NULL;
DELETE FROM "Person"          WHERE "ownerId" IS NULL;

-- (2) Alterações estruturais geradas pelo Prisma (tipos Decimal já arredondam
--     para 2 casas no cast; SET NOT NULL; FKs de owner passam a ON DELETE RESTRICT;
--     DROP das colunas legadas de Income).
-- DropForeignKey
ALTER TABLE "AIConversation" DROP CONSTRAINT "AIConversation_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "AIMemory" DROP CONSTRAINT "AIMemory_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "AccountCard" DROP CONSTRAINT "AccountCard_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "CashBox" DROP CONSTRAINT "CashBox_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "CashBoxMovement" DROP CONSTRAINT "CashBoxMovement_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "CategorizationRule" DROP CONSTRAINT "CategorizationRule_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "CreditCard" DROP CONSTRAINT "CreditCard_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "CreditCardInvoice" DROP CONSTRAINT "CreditCardInvoice_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "ImportBatch" DROP CONSTRAINT "ImportBatch_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Income" DROP CONSTRAINT "Income_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Installment" DROP CONSTRAINT "Installment_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Person" DROP CONSTRAINT "Person_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "PersonPayment" DROP CONSTRAINT "PersonPayment_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Receivable" DROP CONSTRAINT "Receivable_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_ownerId_fkey";

-- AlterTable
ALTER TABLE "AIConversation" ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "AIMemory" ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "AccountCard" ALTER COLUMN "limit" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "CashBox" ALTER COLUMN "currentAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "targetAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "CashBoxMovement" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "CategorizationRule" ALTER COLUMN "amountGreaterThan" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "amountLessThan" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "CreditCard" ALTER COLUMN "limitTotal" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "CreditCardInvoice" ALTER COLUMN "total" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "paid" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "declaredTotal" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Goal" ALTER COLUMN "targetAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "currentAmount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ImportBatch" ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Income" DROP COLUMN "date",
DROP COLUMN "source",
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Installment" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Person" ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "PersonPayment" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Receivable" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "ownerId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCard" ADD CONSTRAINT "CreditCard_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountCard" ADD CONSTRAINT "AccountCard_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditCardInvoice" ADD CONSTRAINT "CreditCardInvoice_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBox" ADD CONSTRAINT "CashBox_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonPayment" ADD CONSTRAINT "PersonPayment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBoxMovement" ADD CONSTRAINT "CashBoxMovement_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorizationRule" ADD CONSTRAINT "CategorizationRule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMemory" ADD CONSTRAINT "AIMemory_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

