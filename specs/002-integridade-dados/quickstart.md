# Quickstart de validação — 002-integridade-dados

Guia para validar a feature de ponta a ponta. Referências:
[data-model.md](./data-model.md) · [research.md](./research.md).

## Pré-requisitos

```bash
# Banco de teste = mesmo banco de dev (plano free). Faça um snapshot/backup antes.
npm install         # (nada novo; Vitest já veio na 001)
```

## Ordem de execução (a rede de segurança vem primeiro)

```bash
# 1. Caracterização no estado ATUAL (Float) — deve passar verde ANTES de migrar.
npm run test -- tests/characterization

# 2. Aplicar a migração estrutural (dev + test apontam pro mesmo banco).
npm run db:migrate           # gera/edita e aplica a migração
#    conferir a ordem no migration.sql (DELETE órfãos → TYPE → NOT NULL → FK → DROP)

# 3. Recalcular parcelamentos manuais existentes (dry-run primeiro!).
npx tsx scripts/with-env.ts .env -- tsx scripts/recompute-installments.ts        # dry-run
npx tsx scripts/with-env.ts .env -- tsx scripts/recompute-installments.ts -- --apply

# 4. Caracterização de novo (agora em Decimal) — deve continuar idêntica.
npm run test -- tests/characterization

# 5. Suíte inteira (inclui isolamento da 001 + split + dedupe).
npm run test
```

## Verificações de aceitação

### Precisão preservada (SC-001, SC-002)

- `tests/characterization/calculations.golden.test.ts` verde antes e depois
  (zero diferença).
- Amostra manual: escolher 3-4 valores conhecidos no banco e conferir que leem
  idênticos após a migração (`prisma studio` ou query).

### Zero órfãos e vínculo obrigatório (SC-003, SC-004)

```bash
# nenhum registro com ownerId null nos 17 modelos:
npx tsx scripts/with-env.ts .env -- tsx -e "/* contar ownerId null por tabela = 0 */"
```
- Tentar criar registro sem dono (via `runWithoutScope` num teste) → rejeitado
  pela constraint NOT NULL / FK.

### Migração limpa (SC-006)

```bash
npx tsx scripts/with-env.ts .env -- prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --script    # esperado: vazio
```

### Exclusão de usuário (SC-005)

- Desativar um usuário de teste com dados vinculados → conclui sem erro; sessão
  dele cai; dados preservados.
- Tentar `prisma.user.delete` de um usuário com dados → bloqueado por FK
  (Restrict) — comportamento esperado.

### Split de parcela (SC-008)

- `tests/money/split.test.ts` verde: 100/3 = 33,33+33,33+33,34 = 100,00; 90/3
  todas 30,00; soma sempre igual ao total.
- Após o recompute, nenhum grupo de parcelas manuais soma ≠ total.

### Dedupe de importação intacto

- `tests/money/hash-dedupe.test.ts` verde: a chave de hash de um conjunto de
  valores conhecidos é idêntica à de antes.

## Pós-deploy (produção)

1. Backup/PITR do Nummiq Prod antes do deploy que aplica esta migração.
2. Deploy da Vercel aplica a migração (DELETEs de órfãos são no-op em prod novo).
3. Rodar o recompute de parcelas em prod uma vez, se houver parcelamentos manuais
   afetados (checklist de go-live).
4. Re-executar `prisma/security/rls-hardening.sql` no SQL Editor do Nummiq Prod
   (pega as tabelas atuais).
5. Conferência rápida do dashboard (números batem com o pré-migração).
