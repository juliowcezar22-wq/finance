# Tasks: Integridade de Dados — Precisão Monetária, Isolamento e Referências

**Input**: Design de `/specs/002-integridade-dados/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md)

**Tests**: INCLUÍDOS e OBRIGATÓRIOS — caracterização (golden) ANTES da migração
(FR-004), testes do split (FR-013) e regressão do hash de dedupe.

**Ordem crítica**: a rede de segurança (caracterização) vem ANTES de qualquer
mudança de schema. A migração só roda com o golden verde no estado Float.

## Phase 1: Setup

- [ ] T001 Snapshot/backup do banco de teste antes de tudo (dump das tabelas afetadas) e confirmar `tests/setup/` da 001 reutilizável (prefixo `test-002-`)
- [ ] T002 [P] Criar `src/lib/services/money.ts` (vazio com assinaturas): `splitAmount(total, n)`, `toNum(decimal)` — alvo único da aritmética monetária

## Phase 2: Rede de segurança (BLOCKING — antes de tocar schema)

**Purpose**: provar que a migração não muda nenhum número (FR-003, FR-004).

- [ ] T003 Escrever `tests/characterization/calculations.golden.test.ts`: semear dataset fixo (`test-002-`) com contas/cartões/faturas/transações/receitas/caixas/metas com valores conhecidos (incluir casos de dízima) e capturar o resultado atual de TODAS as funções exportadas de `src/lib/services/calculations.ts` + `getDashboardSummary` como golden. AUTO-CONTIDO (semeia+assere+limpa numa execução); comparar dinheiro AO CENTAVO e razões arredondadas como a UI — NÃO igualdade bruta de float (ver [research R7](./research.md))
- [ ] T004 Rodar `npm run test -- tests/characterization` no estado ATUAL (Float) → deve passar VERDE (baseline). Congelar os golden.
- [ ] T005 [P] Escrever `tests/money/hash-dedupe.test.ts`: para um conjunto de valores conhecidos, capturar a chave de dedupe atual de `src/lib/services/hash.ts` (baseline, estado Float)

**Checkpoint**: golden e baseline de hash verdes em Float. Só então mexer no schema.

## Phase 3: Correção do split de parcela (US5 / FR-013)

- [ ] T006 [P] Implementar `splitAmount(totalCents, n)` em `src/lib/services/money.ts` trabalhando em CENTAVOS inteiros (representação-agnóstica, funciona antes e depois da migração): n-1 = floor, última = total − soma(anteriores)
- [ ] T007 [P] Escrever `tests/money/split.test.ts`: 100/3→[33.33,33.33,33.34]; 90/3→[30,30,30]; 10/3; 0.01/2; valores grandes; soma sempre == total
- [ ] T008 Trocar o split em `src/lib/actions/expenses.ts:38` e `src/lib/whatsapp/agent.ts:122` para usar `splitAmount` (remover `Number((amount/count).toFixed(2))`)
- [ ] T009 Criar `scripts/recompute-installments.ts` (dry-run padrão, `-- --apply`, backup JSON em `./backups/`): reagrupa parcelas manuais e recalcula com `splitAmount` os grupos cuja soma ≠ total

## Phase 4: Migração de schema (BLOCKING)

- [ ] T010 Editar `prisma/schema.prisma`: 18 campos → `Decimal @db.Decimal(12,2)` (ver data-model; NÃO tocar `AISetting.temperature`); `ownerId` String (NOT NULL) nos 17 modelos; `onDelete: Restrict` nas 17 relações Owner* (e `User?`→`User`); remover `Income.date` e `Income.source`
- [ ] T011 Gerar a migração com `prisma migrate diff` (create-only, como na 001) e EDITAR o `migration.sql` para a ordem de [research R5](./research.md): DELETE órfãos (folha→raiz) → ALTER TYPE `numeric(12,2) USING round(...,2)` → SET NOT NULL → DROP/ADD FK `ON DELETE RESTRICT` → DROP colunas de Income
- [ ] T012 Aplicar via `npm run db:migrate:deploy`; regenerar client (`prisma generate`); conferir `prisma migrate diff` VAZIO (SC-006)

## Phase 5: Adaptar o código à representação Decimal

- [ ] T013 `src/lib/services/calculations.ts`: `_sum`/`groupBy` retornam `Prisma.Decimal|null` → converter na borda com `toNum()`; manter retornos e `DashboardSummary` em `number`; aritmética JS inalterada
- [ ] T014 [P] `src/lib/services/invoices.ts`: `recalcInvoiceTotal` soma/subtrai em Decimal (ou centavos) e grava; `declaredTotal` tratado como Decimal|null
- [ ] T015 [P] `src/lib/services/history.ts` e `src/lib/ai/context.ts`: converter Decimal→number na borda (os `toFixed`/razões existentes seguem em number)
- [ ] T016 `src/lib/services/hash.ts`: `Math.round(amount.toNumber()*100)` (ou equivalente) — MESMO inteiro de centavos; validar contra `tests/money/hash-dedupe.test.ts`
- [ ] T017 [P] Filtros de limiar de regra (`CategorizationRule.amountGreaterThan/LessThan`): comparar com `new Prisma.Decimal(x)` no `where` nas actions/services que aplicam regras
- [ ] T018 [P] Revisar `src/lib/format.ts` (`formatBRL` já tolera via `Number()`; conferir `parseBRL`) e os pontos de UI que fazem `.toFixed` sobre valores (dashboard/cartões/metas) — converter na borda se necessário

## Phase 6: Integridade referencial e exclusão de usuário (US2, US3)

- [ ] T019 `src/lib/actions/users.ts`: `deleteUser` passa a DESATIVAR (`setUserActive(id,false)`), com guarda de "não desativar o último admin ativo"; remover o `person.updateMany` desnecessário; atualizar a UI/rótulo em `src/app/usuarios/` de "excluir" para "desativar"
- [ ] T020 [P] Escrever `tests/security/user-deletion.test.ts`: desativar usuário com dados → ok, dados preservados, sessão inválida (via `getUserFromToken`); `prisma.user.delete` de usuário com dados → rejeitado (Restrict); não permite ficar sem admin ativo
- [ ] T021 [P] Remover a escrita espelhada de `Income.date/source` em `src/lib/actions/incomes.ts:66-68`

## Phase 7: Infra e limpeza

- [ ] T022 [P] Aplicar `prisma/security/rls-hardening.sql` no banco dev/test (idempotente); registrar no `docs/AMBIENTES.md` a re-execução em prod no go-live
- [ ] T023 [P] Revisar `prisma/seed.ts` (limitTotal/balance) — compila com Decimal? Ajustar para `new Prisma.Decimal(...)` só se o strict reclamar

## Phase 8: Validação final

- [ ] T024 Rodar de novo `npm run test -- tests/characterization` (agora em Decimal) → golden IDÊNTICO (SC-001)
- [ ] T025 Rodar `npm run test` inteiro (caracterização + split + hash + isolamento da 001 + user-deletion) → 100% verde (SC-007)
- [ ] T026 `npm run build` verde; conferência manual do dashboard (números batem) e amostra de valores lidos ao centavo (SC-002)
- [ ] T027 [P] Marcar o Módulo 5 em `docs/PLANO-DE-ACAO.md`; anotar itens de go-live (recompute em prod, rls em prod, backup/PITR)

## Dependencies & Execution Order

- **Setup (T001-T002)** → **Rede de segurança (T003-T005, BLOCKING)** → split (T006-T009) → **Migração (T010-T012, BLOCKING)** → adaptação de código (T013-T018) → integridade/exclusão (T019-T021) → infra (T022-T023) → validação (T024-T027).
- **Regra de ouro**: T004 (golden verde em Float) é pré-condição de T010 (mexer no schema). A migração (T012) é pré-condição de toda a Phase 5.
- Split (Phase 3) pode ser feito em paralelo à escrita dos golden, mas T008 (trocar o split no código) muda comportamento → rodar depois que o golden capturou o estado antigo do resto (o golden NÃO cobre o split).

### Parallel opportunities

- T002 ∥ T003 ∥ T005; T006 ∥ T007; T014 ∥ T015 ∥ T017 ∥ T018; T020 ∥ T021; T022 ∥ T023.

## Implementation Strategy

1. **Rede de segurança**: caracterização verde em Float (não avançar sem isso).
2. **Split**: helper + testes + recompute (isola a única mudança de valor).
3. **Migração**: schema + migração editada + diff vazio.
4. **Adaptação**: Decimal→number na borda; hash e invoices conferidos por teste.
5. **Integridade**: Restrict + desativação; remover legados de Income; RLS.
6. **Fechamento**: golden idêntico pós-Decimal + suíte + build; revisão adversarial (como na 001) antes do merge.
