-- #1 Unificar movimentações: receitas passam a viver em Transaction (type=receita).
-- A tabela Income é MANTIDA como backup (não é lida/escrita pelo app após esta feature).

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "incomeType" TEXT;

-- Migração de dados: copia cada Income para Transaction (idempotente via id 'inc_<id>').
-- Mapeamentos:
--   receivedAt -> date | sourceType -> origin | status(RECEIVED->pago, CANCELED->cancelado, else pendente)
--   personId -> responsibleId | belongsTo := 'pessoal' | incomeType preservado
INSERT INTO "Transaction" (
  "id", "date", "description", "amount", "type", "incomeType", "origin",
  "accountId", "categoryId", "responsibleId", "belongsTo", "status", "notes",
  "ownerId", "createdAt", "updatedAt"
)
SELECT
  'inc_' || i."id",
  i."receivedAt",
  i."description",
  i."amount",
  'receita',
  i."incomeType",
  CASE i."sourceType" WHEN 'PIX' THEN 'pix' WHEN 'CASH' THEN 'dinheiro' ELSE 'debito' END,
  i."accountId",
  i."categoryId",
  i."personId",
  'pessoal',
  CASE i."status" WHEN 'RECEIVED' THEN 'pago' WHEN 'CANCELED' THEN 'cancelado' ELSE 'pendente' END,
  i."notes",
  i."ownerId",
  i."createdAt",
  NOW()
FROM "Income" i
WHERE i."ownerId" IN (SELECT "id" FROM "User")   -- ignora órfãos (sentinela sem User)
ON CONFLICT ("id") DO NOTHING;
