# Implementation Plan: Integridade de Dados — Precisão Monetária, Isolamento e Referências

**Branch**: `002-integridade-dados` | **Date**: 2026-08-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-integridade-dados/spec.md`

## Summary

Endurecer a base de dados do Nummiq (Módulo 5) em quatro frentes, na ordem de
menor risco de perda de valor:

1. **Rede de segurança primeiro** — testes de caracterização (golden) de
   `src/lib/services/calculations.ts` capturando os resultados atuais sobre um
   dataset fixo, para provar que a migração Float→Decimal não muda nenhum número.
2. **Precisão monetária** — 18 colunas `Float` → `Decimal(12,2)`; o código
   converte `Decimal→number` na **borda de saída** dos services (a UI segue em
   `number`), e usa `Decimal`/inteiro-de-centavos só nos caminhos de escrita
   sensíveis (split de parcela, `recalcInvoiceTotal`, filtros de limiar de regra,
   `hash.ts`).
3. **Integridade referencial e isolamento** — apagar órfãos, `ownerId NOT NULL`
   nos 17 modelos, FKs Owner* de `SET NULL`→`Restrict`, `deleteUser` passa a
   desativar.
4. **Limpeza e infra** — remover `Income.date/source` (write-only); aplicar
   `rls-hardening.sql` em dev/test.

Além disso, correção intencional do split de parcela (FR-013): a última parcela
absorve o resíduo, e os parcelamentos manuais existentes são recalculados.

Decisões (clarify): órfãos **apagados**; onDelete **Restrict + desativação**;
split **corrigido**; legados **só Income**. Detalhes em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node 18+; Prisma 5.22

**Primary Dependencies**: Prisma (tipo `Decimal` / `Prisma.Decimal`), zod, Vitest (já instalado na 001). Sem novas deps de runtime.

**Storage**: Postgres (Supabase). Mudanças: 18 colunas `numeric(12,2)`; `ownerId NOT NULL` em 17 tabelas; 17 FKs `ON DELETE RESTRICT`; drop de `Income.date` e `Income.source`.

**Testing**: Vitest — testes de caracterização (golden) de `calculations.ts` + testes do novo split + regressão de `hash.ts` (dedupe de importação), contra o banco de `.env.test`.

**Target Platform**: Vercel serverless + Supabase. A migração roda em dev/test via canal guardado; prod é migrada pelo build da Vercel (a migração é reproduzível — o DELETE de órfãos é no-op num banco sem órfãos).

**Project Type**: Web app, projeto único.

**Performance Goals**: sem regressão perceptível; agregações continuam no banco (`_sum` sobre `numeric` é exato).

**Constraints**: `SET NOT NULL` exige zero nulos → o DELETE de órfãos vem ANTES na mesma migração (reproduzível em qualquer ambiente); backup antes de rodar; nada contra prod diretamente; banco dev/test compartilhado (o recálculo de parcelas usa dados próprios/backup).

**Scale/Scope**: 18 colunas monetárias, 17 modelos/FKs, ~5 arquivos de service com aritmética densa (`calculations.ts`, `invoices.ts`, `history.ts`, `ai/context.ts`, splits) + `hash.ts`; ~20-30 componentes de UI que só recebem `number` na borda (sem mudança de tipo).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano cumpre |
|---|---|
| I. Segurança P0 nunca adiada | Não é P0 novo; reforça o isolamento da 001 (fecha órfãos na origem). |
| II. Isolamento pela extensão Prisma | `ownerId NOT NULL` + FKs `Restrict` fortalecem a invariante da extensão; nenhum filtro manual novo. |
| III. Banco só por canais guardados | Migração via `npm run db:migrate`; scripts de dados (recompute de parcelas) com dry-run em `scripts/`; nada contra prod. |
| IV. Nenhum segredo hardcoded | N/A (feature de dados). |
| V. **Precisão financeira** | É o objetivo central: `Decimal(12,2)`, fuso mantido; split fecha exato. |
| VI. Testes em lógica financeira | Caracterização de `calculations.ts` ANTES da migração + testes do split + regressão de dedupe (FR-004, FR-013). |
| VII. TypeScript estrito | Conversão `Decimal→number` explícita na borda; sem `any` novo; zod nos filtros de limiar. |

**Resultado**: PASS. Sem violações a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/002-integridade-dados/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/  (não há interface externa nova — omisso)
├── checklists/requirements.md
└── tasks.md   (gerado por /speckit-tasks)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                 # 18 Float→Decimal; ownerId NOT NULL x17;
│                                 # onDelete Restrict x17; drop Income.date/source
├── migrations/<nova>/migration.sql  # DELETE órfãos → NOT NULL → ALTER type → ALTER FK → DROP cols
└── security/rls-hardening.sql    # aplicar em dev/test (já pronto, idempotente)
src/lib/
├── services/
│   ├── money.ts                  # NOVO: helpers (splitAmount c/ resíduo na última; toNumber de borda)
│   ├── calculations.ts           # _sum Decimal → converter na borda; retornos seguem number
│   ├── invoices.ts               # recalcInvoiceTotal em Decimal/centavos
│   └── hash.ts                   # manter integer-cents idêntico (dedupe intacto)
├── actions/
│   ├── expenses.ts               # split via money.ts (resíduo na última parcela)
│   ├── users.ts                  # deleteUser → desativação (Restrict)
│   └── ...                       # filtros de limiar de regra: comparar como Decimal
├── whatsapp/agent.ts             # split via money.ts
└── format.ts                     # formatBRL já tolera (Number()); revisar parseBRL
scripts/
└── recompute-installments.ts     # NOVO: recalcula parcelamentos manuais (dry-run padrão)
tests/
├── characterization/
│   └── calculations.golden.test.ts  # golden ANTES da migração; verde depois
└── money/
    ├── split.test.ts             # FR-013: soma exata, resíduo na última
    └── hash-dedupe.test.ts       # regressão: hash de dedupe inalterado
docs/
├── PLANO-DE-ACAO.md              # marcar Módulo 5
└── AMBIENTES.md                  # nota de go-live (recompute + rls em prod)
```

**Structure Decision**: introduz `src/lib/services/money.ts` como ponto único da
aritmética monetária sensível (split, conversão de borda), reduzindo a
duplicação de `toFixed`/`Math.round` espalhada e dando um alvo testável.

## Complexity Tracking

| Desvio | Por quê | Alternativa mais simples rejeitada porque |
|--------|---------|--------------------------------------------|
| DELETE de órfãos embutido na migração (não num script dry-run) | `SET NOT NULL` precisa de zero nulos em TODO ambiente, inclusive no `migrate deploy` da Vercel | Um script de limpeza separado não roda no deploy de prod → o `NOT NULL` falharia lá. No-op em banco sem órfãos, então é seguro e reproduzível. |
| Recompute de parcelas como script (não na migração) | A lógica "resíduo na última parcela" por grupo é complexa/erro-prone em SQL puro e é correção de VALOR, não de schema | Fazer em SQL na migração aumentaria muito o risco da migração estrutural; o script isola a correção de dados com dry-run + backup. |
| Conversão `Decimal→number` na borda (UI segue number) | Confina a mudança de tipo ao backend; evita tocar ~20-30 componentes | Propagar `Decimal` até a UI multiplicaria a superfície e o risco sem ganho perceptível (valores exibidos têm 2 casas). |
