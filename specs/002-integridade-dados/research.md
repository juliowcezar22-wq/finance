# Research — 002-integridade-dados (Phase 0)

Decisões técnicas. Linhas de código conferidas pela exploração do escopo.

## R1. Precisão: `Decimal(12,2)` para 18 colunas monetárias

**Decision**: `numeric(12,2)` (até 9.999.999.999,99) em: `Account.balance`,
`CreditCard.limitTotal`, `AccountCard.limit`, `Transaction.amount`,
`Installment.amount`, `CreditCardInvoice.total|paid|declaredTotal`,
`Receivable.amount`, `Income.amount`, `CashBox.currentAmount|targetAmount`,
`PersonPayment.amount`, `CashBoxMovement.amount`, `Goal.targetAmount|currentAmount`,
`CategorizationRule.amountGreaterThan|amountLessThan`. `AISetting.temperature`
permanece `Float` (temperatura de LLM). Nulos (`declaredTotal`, `targetAmount`,
os limiares) permanecem opcionais.

**Rationale**: 2 casas cobrem BRL; 12 dígitos dão folga ampla para finanças
pessoais/familiares. Incluir os limiares de regra evita comparação
`Decimal vs Float` (o Prisma exige `Prisma.Decimal` no filtro `gt/lt`).

**Alternatives**: `Decimal(14,2)` (folga maior — desnecessário); inteiro de
centavos no banco (mudaria toda a leitura, mais invasivo).

## R2. Conversão de tipo: preservar valores (cast seguro)

**Decision**: no `ALTER COLUMN ... TYPE numeric(12,2) USING (round("col"::numeric, 2))`.
O `float8`→`numeric` no Postgres é exato para o valor armazenado; o `round(...,2)`
canonicaliza o "lixo" de ponto flutuante (ex.: 0.30000000000000004 → 0.30),
cumprindo FR-003 (o valor de negócio prevalece).

**Rationale**: sem `round`, um float com resíduo viraria `numeric` com muitas
casas; com `round(...,2)` o número exibido hoje (formatado em 2 casas) é
preservado bit-a-bit no sentido de negócio.

**Verificação**: os testes de caracterização (R7) leem valores conhecidos antes
e depois; SC-002 checa amostra ao centavo.

## R3. Consumo no código: `Decimal→number` na borda dos services

**Decision**: `_sum.<campo>` passa a retornar `Prisma.Decimal | null`. Converter
para `number` na **saída** de cada função de `calculations.ts` (e no
`DashboardSummary`), mantendo a aritmética JS e a UI em `number`. Um helper
`toNum(d)` (`d?.toNumber() ?? 0`) centraliza a conversão. `Prisma.Decimal` é
usado apenas onde há **escrita/comparação no banco**: split de parcela,
`recalcInvoiceTotal` (`invoices.ts`), e filtros de limiar de regra
(`amountGreaterThan/LessThan` viram `new Prisma.Decimal(x)` no `where`).

**Rationale**: confina a mudança de tipo ao backend (~5 arquivos), sem tocar
~20-30 componentes. O erro de float residual na aritmética JS de métricas
derivadas (taxaEndividamento, sobraReal) é desprezível após formatação em 2
casas — e é exatamente o que os testes de caracterização travam.

**Alternatives**: `Decimal` ponta-a-ponta (superfície enorme na UI); manter tudo
`number` convertendo logo na leitura (perde a exatidão da soma no banco — pior).

## R4. `hash.ts` — dedupe de importação intacto

**Decision**: `hash.ts:23` faz `Math.round(amount * 100)` para compor a chave de
dedupe. `amount` passa a ser `Decimal`. Trocar por
`Math.round(amount.toNumber() * 100)` (ou `amount.times(100).round().toNumber()`)
produzindo o MESMO inteiro de centavos de antes para valores de 2 casas. Um teste
de regressão (`hash-dedupe.test.ts`) garante que a chave gerada não muda para um
conjunto de valores conhecidos → importações já deduplicadas continuam batendo.

**Rationale**: mudar a chave de hash quebraria a deduplicação de dados já
importados — risco alto sinalizado na exploração. O teste trava o comportamento.

## R5. Ordem da migração estrutural (uma migração)

**Decision**: gerar via `prisma migrate diff` e **editar a migração** para a ordem
correta e reproduzível:

1. `DELETE FROM "<tabela>" WHERE "ownerId" IS NULL;` para os 17 modelos
   (apaga órfãos — no-op em banco sem órfãos, ex.: prod novo). **Antes** do NOT NULL.
2. `ALTER COLUMN "col" TYPE numeric(12,2) USING (round("col"::numeric, 2))` nas 18 colunas.
3. `ALTER COLUMN "ownerId" SET NOT NULL` nos 17 modelos.
4. `ALTER TABLE ... DROP CONSTRAINT <fk>_fkey, ADD CONSTRAINT ... ON DELETE RESTRICT`
   nas 17 FKs Owner* (hoje `SET NULL`).
5. `ALTER TABLE "Income" DROP COLUMN "date", DROP COLUMN "source";`

**Rationale**: o `SET NOT NULL` exige zero nulos em todo ambiente; embutir o
DELETE na própria migração garante reprodutibilidade no `migrate deploy` da
Vercel. FKs alteradas por `DROP/ADD CONSTRAINT` (Prisma gera isso ao mudar
`onDelete`).

**Cuidado**: a ordem de DELETE respeita FKs entre entidades owned (ex.: apagar
`Receivable`/`Installment`/`PersonPayment` antes de `Person`; movimentos antes de
`CashBox`). A migração lista os DELETEs em ordem folha→raiz.

**Alternatives**: script de limpeza separado (não roda no deploy → NOT NULL
falharia em prod); `SET DEFAULT`/data-fix manual (não reproduzível).

## R6. `deleteUser` → desativação; `onDelete: Restrict`

**Decision**: as 17 relações Owner* passam a `onDelete: Restrict`. `deleteUser`
(`src/lib/actions/users.ts:114`) deixa de excluir e passa a **desativar**
(`setUserActive(id, false)` já existe, `users.ts:108`), com guarda para não
desativar o último admin ativo. A UI que hoje "exclui" passa a "desativar". Se
uma exclusão dura for mesmo necessária no futuro, exigirá remover/reatribuir os
dados antes (o `Restrict` bloqueia até lá).

**Rationale**: preserva histórico financeiro (decisão do clarify); elimina a
orfanização silenciosa que o `SET NULL` causa hoje. `getUserFromToken` (feature
001) já derruba a sessão de usuário `active=false`.

**Ponto de atenção**: `deleteUser` hoje faz `person.updateMany` escopado pelo
admin logado (`users.ts:117`) — na desativação isso deixa de ser necessário
(não removemos o usuário); revisar para não mexer em Person à toa.

## R7. Testes de caracterização (golden) primeiro

**Decision**: antes de qualquer mudança de schema, escrever
`tests/characterization/calculations.golden.test.ts`: semear um dataset fixo
(1 usuário de teste, contas/cartões/faturas/transações/receitas/caixas/metas com
valores conhecidos, incluindo casos com dízima) e gravar o resultado atual de
todas as funções exportadas de `calculations.ts` + `getDashboardSummary` como
"golden". Rodar verde no estado Float. Após a migração e a adaptação do código,
rodar de novo: cada valor deve ser idêntico (tolerância zero para valores em 2
casas; para métricas de razão, comparar arredondado como a UI exibe).

**Rationale**: é a rede de segurança que prova FR-003/SC-001. Usa o mesmo
mecanismo de banco de teste e limpeza da 001 (`tests/setup/`), com prefixo
`test-002-`.

**Comparação na precisão exibida**: o golden compara valores em dinheiro **ao
centavo** (2 casas) e razões/percentuais **arredondados como a UI mostra** —
NÃO igualdade bruta de `number`. Isso é essencial: a soma no banco pode mudar do
"ruído" de float (0,1+0,2 = 0,30000000000000004 em float8) para o valor exato do
Decimal (0,30); ambos exibem "0,30", então não é regressão. Igualdade bruta
falharia espúrio.

**Auto-contido**: o teste semeia + assere + limpa numa única execução; roda uma
vez em Float (baseline) e outra em Decimal (verificação), sem persistir estado
entre elas. Seu dataset não sobrepõe o `recompute-installments` (o golden de
`calculations.ts` não testa somas de parcela).

**Nota**: o split de parcela NÃO entra no golden de "não muda" — ele muda de
propósito (FR-013) e tem testes próprios (R8).

## R8. Split de parcela: resíduo na última (FR-013)

**Decision**: `src/lib/services/money.ts` expõe `splitAmount` trabalhando em
**centavos inteiros** (representação-agnóstica — funciona igual antes e depois da
migração Decimal, então a Phase 3 pode preceder a migração da Phase 4):
`splitAmount(totalCents: number, n: number): number[]` onde as `n-1` primeiras
são `Math.floor(totalCents/n)` e a última é `totalCents - soma(anteriores)`;
os callers convertem seu valor (Float agora, Decimal depois) para centavos na
entrada e de volta na saída. `expenses.ts:38` e `whatsapp/agent.ts:122` passam a
usar `splitAmount` em vez de `Number((amount/count).toFixed(2))`. Testes em
`split.test.ts` (100/3, 90/3, 10/3, 0,01/2, valores grandes).

Recompute dos existentes: `scripts/recompute-installments.ts` (dry-run padrão,
`-- --apply` para efetivar, com backup JSON em `./backups/` como os outros
scripts de manutenção): agrupa `Installment` por `installmentGroupKey`/transação,
recalcula com `splitAmount` sobre o total do grupo, e atualiza as parcelas cuja
soma não bate. Rodar em dev/test; go-live roda em prod uma vez (checklist).

**Rationale**: correção idempotente e testável; isola a mudança de valor num
script com dry-run (padrão do projeto, `scripts/README.md`).

## R9. RLS

**Decision**: aplicar `prisma/security/rls-hardening.sql` nos bancos dev/test (é
idempotente; fecha a REST pública do Supabase). Documentar no go-live a
re-execução em prod após o deploy (já consta em `AMBIENTES.md`). Sem mudança de
código — RLS não isola tenants (isolamento é a extensão do Prisma).

## R10. Seed

**Decision**: `prisma/seed.ts` grava `limitTotal`/`balance` como `number` no
`create` — o Prisma coage `number→Decimal` no input, então o seed continua
compilando. Revisar apenas se algum lint de tipo reclamar; opcionalmente
envolver em `new Prisma.Decimal(...)` para clareza. Sem valores em
Transaction/Income/etc. no seed.
