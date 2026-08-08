# Data Model — 002-integridade-dados (Phase 1)

Mudanças de schema, geradas com `npm run db:migrate` e a migração **editada** para
a ordem de [research R5](./research.md). Nome sugerido:
`integridade_decimal_ownerid_restrict`.

## 1. Colunas monetárias → `Decimal(12,2)` (18)

| Modelo | Campo | Nulável |
|---|---|---|
| Account | balance | não (default 0) |
| CreditCard | limitTotal | não (default 0) |
| AccountCard | limit | não (default 0) |
| Transaction | amount | não |
| Installment | amount | não |
| CreditCardInvoice | total | não (default 0) |
| CreditCardInvoice | paid | não (default 0) |
| CreditCardInvoice | declaredTotal | **sim** |
| Receivable | amount | não |
| Income | amount | não |
| CashBox | currentAmount | não (default 0) |
| CashBox | targetAmount | **sim** |
| PersonPayment | amount | não |
| CashBoxMovement | amount | não |
| Goal | targetAmount | não |
| Goal | currentAmount | não (default 0) |
| CategorizationRule | amountGreaterThan | **sim** |
| CategorizationRule | amountLessThan | **sim** |

`AISetting.temperature` **permanece `Float`**. Conversão:
`... TYPE numeric(12,2) USING (round("col"::numeric, 2))`.

## 2. `ownerId` → NOT NULL (17 modelos)

Person, Account, CreditCard, AccountCard, Transaction, Installment,
CreditCardInvoice, Receivable, Income, CashBox, PersonPayment, CashBoxMovement,
Goal, ImportBatch, CategorizationRule, AIConversation, AIMemory.

Pré-condição: **DELETE dos órfãos** (`ownerId IS NULL`) na própria migração,
ordem folha→raiz para respeitar FKs entre owned:
`CashBoxMovement, PersonPayment, Receivable, Installment` → `Transaction,
CreditCardInvoice, AccountCard, CashBox, Goal, Income, CategorizationRule,
ImportBatch, AIMemory, AIConversation, CreditCard, Account` → `Person`.
(No-op onde não há órfão.)

## 3. FKs Owner* → `ON DELETE RESTRICT` (17)

Hoje `ON DELETE SET NULL` (default do Prisma para relação opcional). Passam a
`Restrict`. No schema, cada relação Owner* ganha `onDelete: Restrict`:

```prisma
owner User @relation("OwnerX", fields: [ownerId], references: [id], onDelete: Restrict)
```

(o `User?` vira `User` porque `ownerId` é NOT NULL.) Efeito: excluir um usuário
com dados vinculados é bloqueado pelo banco → a aplicação usa desativação.

## 4. Drop de campos legados de Income (2)

`ALTER TABLE "Income" DROP COLUMN "date", DROP COLUMN "source";`
Fonte canônica preservada: `receivedAt` (DateTime) e `sourceType` (String).
Código: remover a escrita espelhada em `src/lib/actions/incomes.ts:66-68`.

**Não** tocar: modelo `Installment` e metadados de parcela em `Transaction`
(`installmentNumber/Total/GroupKey`) — mecanismos distintos, mantidos.

## 5. Invariantes de valor (não-schema)

| Invariante | Onde |
|---|---|
| Soma das parcelas == total do grupo (resíduo na última) | `money.ts:splitAmount`; escrita em `expenses.ts`, `whatsapp/agent.ts`; recompute dos existentes via script |
| `_sum` (Decimal) convertido a `number` na saída dos services | `calculations.ts`, `DashboardSummary`, `history.ts`, `ai/context.ts` |
| Chave de dedupe de importação inalterada | `hash.ts`, `import-engine.ts` (teste de regressão) |
| Filtros de limiar de regra comparam Decimal | actions/services que aplicam `CategorizationRule` |

## Estados e transições

### Usuário (exclusão)

```
ativo ──(setUserActive false / "excluir")──► inativo (dados preservados; sessão cai)
inativo ──(reativar)──► ativo
excluir de fato ──► BLOQUEADO pelo banco (Restrict) enquanto houver dados vinculados
                    (garante que não sobra dado órfão; e não deixa sistema sem admin ativo)
```

### Migração (ordem, uma transação de migração)

```
DELETE órfãos (17, folha→raiz)
  → ALTER TYPE numeric(12,2) (18 colunas)
  → SET NOT NULL ownerId (17)
  → DROP/ADD FK ON DELETE RESTRICT (17)
  → DROP Income.date, Income.source
```

## Backup e reprodutibilidade

- Backup antes: dump das tabelas afetadas (o script de recompute já salva JSON em
  `./backups/`; para a migração estrutural, snapshot do banco de teste antes de
  aplicar).
- A migração é reproduzível: no `migrate deploy` da Vercel (prod, sem órfãos) os
  DELETEs são no-op e o resto aplica limpo.
