# Tasks: Hardening de Segurança P0 — Acesso, Sessão e Canal WhatsApp

**Input**: Design documents from `/specs/001-seguranca-acesso/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/http-e-sessao.md](./contracts/http-e-sessao.md)

**Tests**: INCLUÍDOS — a spec exige testes automatizados explicitamente (FR-012;
constituição princípio VI). Testes escritos ANTES da implementação em cada
story (vermelho → verde).

**Organization**: tasks agrupadas por user story da spec (US1 = isolamento/IDOR,
US2 = sessão/login, US3 = WhatsApp), cada uma independentemente testável.

## Phase 1: Setup

**Purpose**: runner de testes mínimo (primeiro da história do projeto)

- [ ] T001 Instalar Vitest como devDependency, criar `vitest.config.ts` (alias `@/*` → `./src/*`, testes em `tests/**`) e adicionar scripts `test` e `test:security` em `package.json`
- [ ] T002 Criar infraestrutura de teste em `tests/setup/env.ts` (carrega `.env.test` reutilizando o padrão de `scripts/env.ts` — nunca `.env` de dev direto) e `tests/setup/db.ts` (helpers: criar/remover 2 usuários de teste prefixo `test-001-`, `runWithOwner` importado de `src/lib/auth/owner-scope.ts`; limpeza em `afterAll` — o banco é compartilhado com dev, proibido truncar tabelas)

**Checkpoint**: `npm run test` executa (0 testes) sem erro.

## Phase 2: Foundational (BLOCKING)

**Purpose**: mudanças de schema exigidas pelas 3 stories ([data-model.md](./data-model.md))

- [ ] T003 Adicionar ao `prisma/schema.prisma`: campo `sessionVersion Int @default(0)` no `User`; modelo `LoginAttempt` (id, email, ip?, success, createdAt, `@@index([email, createdAt])`); coluna `providerMessageId String? @unique` no `WhatsAppMessage`
- [ ] T004 Gerar e aplicar a migration `seguranca_sessao_lockout_dedupe` via `npm run db:migrate` (dev) e `npm run db:test:migrate:deploy` (teste) — NUNCA `prisma` direto no shell (constituição III); conferir `prisma migrate diff` vazio depois

**Checkpoint**: migration aplicada nos dois bancos; `prisma generate` ok. Nenhuma user story pode começar antes daqui.

## Phase 3: User Story 1 — Isolamento total entre usuários (P1) 🎯 MVP

**Goal**: nenhuma operação (incluindo faturas) lê/escreve registro de outro dono; checagem atômica; órfãos bloqueados; decisão Category documentada.

**Independent Test**: `npm run test:security -- owner-scope` — intrusão A↔B em todas as actions de escrita.

### Tests for User Story 1 (escrever primeiro — devem FALHAR)

- [ ] T005 [P] [US1] Escrever `tests/security/owner-scope.test.ts`: com 2 usuários de teste, para cada action de escrita exposta (as 11 já guardadas + `payInvoice`/`setInvoiceStatus`), tentar operar registro do outro dono → erro genérico "Registro não encontrado." e banco intacto; sem sessão → redirect/guard; registro órfão (`ownerId null`) invisível a `findUnique`/`findMany` e imune a `update`/`delete` de usuário comum

### Implementation for User Story 1

- [ ] T006 [US1] Reescrever a checagem de dono em `src/lib/prisma.ts` ([research R4](./research.md)): `update`/`delete` → `updateMany`/`deleteMany` no client base com `ownerId` no `where` (atômico; `count === 0` → erro genérico; buscar registro pós-escrita quando o call site usa o retorno); `upsert` → decomposição em `$transaction` interativa com `ownerId` injetado no create; pós-filtro de `findUnique(OrThrow)` passa a ocultar órfãos (`res.ownerId !== ownerId` → null/erro)
- [ ] T007 [US1] Auditar call sites de `update`/`upsert` com nested writes ou dependência do valor de retorno (`grep -rn "\.update(\|\.upsert(" src/`) e ajustar o fallback transacional da extensão em `src/lib/prisma.ts` para os casos encontrados
- [ ] T008 [US1] Proteger `src/lib/actions/invoices.ts`: `await getViewer()` na 1ª linha de `payInvoice` e `setInvoiceStatus`; zod (`amount` finito > 0 após `parseBRL`; `status` na whitelist real dos call sites); recálculo de `paid`/`status` de `payInvoice` dentro de `prisma.$transaction`
- [ ] T009 [P] [US1] Registrar a decisão "Category = catálogo global, escrita só admin" em `docs/PLANO-DE-ACAO.md` (Módulo 1, item da decisão) com referência a `src/lib/actions/categories.ts`
- [ ] T010 [US1] Rodar `npm run test:security -- owner-scope` até verde (SC-001, SC-002)

**Checkpoint**: intrusão 2 usuários 100% negada — MVP da feature entregue.

## Phase 4: User Story 2 — Sessão confiável e login resistente a abuso (P2)

**Goal**: sem fallback de segredo; logout revoga (sessionVersion); lockout 5/15min persistido.

**Independent Test**: `npm run test:security -- session login-lockout`.

### Tests for User Story 2 (escrever primeiro — devem FALHAR)

- [ ] T011 [P] [US2] Escrever `tests/security/session.test.ts`: unit de `createSessionToken`/`verifySessionToken` (v2 com `sv`); token com `sv` divergente do `User.sessionVersion` rejeitado por `getCurrentUser`; token sem `sv` (formato antigo) rejeitado; expirado rejeitado; módulo `session.ts` importado sem `SESSION_SECRET` lança erro (usar `vi.resetModules` + stub de env)
- [ ] T012 [P] [US2] Escrever `tests/security/login-lockout.test.ts`: 5 falhas consecutivas → 6ª bloqueada com o MESMO erro genérico (senha certa incluída); sucesso anterior zera contagem; janela de 15 min expira e libera; tentativas registradas em `LoginAttempt` (IP gravado, mas bloqueio só por e-mail); falha simulada do armazenamento de tentativas → login negado (fail-closed, FR-013)

### Implementation for User Story 2

- [ ] T013 [US2] Em `src/lib/auth/session.ts`: remover fallback (linhas 11–14), lançar erro no load do módulo se `SESSION_SECRET` ausente ou < 32 chars; payload ganha `sv: number`; `createSessionToken` recebe `sv`
- [ ] T014 [P] [US2] Em `src/middleware.ts`: remover fallback (linhas 14–16); sem segredo definido → toda sessão inválida (fail-closed, redirect `/login`); eliminar os 2 `@ts-ignore` se trivial no caminho
- [ ] T015 [US2] Em `src/lib/auth/current-user.ts`: rejeitar sessão quando `payload.sv !== user.sessionVersion`
- [ ] T016 [US2] Em `src/lib/actions/auth.ts`: `loginAction` conta falhas de `LoginAttempt` (15 min, pós-último-sucesso, por e-mail normalizado; IP de `x-forwarded-for` só registrado) e bloqueia na 5ª+ com erro genérico + nota de aguardar; erro na consulta/gravação de `LoginAttempt` → login negado com erro genérico (fail-closed, FR-013); registra toda tentativa; limpeza best-effort > 24h; `logoutAction` incrementa `sessionVersion` antes de apagar o cookie; token emitido no login carrega `sv` atual
- [ ] T017 [P] [US2] Atualizar `.env.example` e `.env.test.example` (SESSION_SECRET obrigatório ≥ 32 chars com instrução de geração, CRON_SECRET) e `docs/AMBIENTES.md` (segredos obrigatórios, relogin único pós-deploy)
- [ ] T018 [US2] Rodar `npm run test:security -- session login-lockout` até verde (SC-003, SC-004, SC-005)

**Checkpoint**: logout mata token antigo; boot sem segredo falha; força bruta bloqueada.

## Phase 5: User Story 3 — Canal WhatsApp fechado para estranhos (P3)

**Goal**: webhook autenticado fail-closed; reminders via Bearer; remetente exato; dedupe atômico.

**Independent Test**: `npm run test:security -- whatsapp` + curls do [quickstart.md](./quickstart.md).

### Tests for User Story 3 (escrever primeiro — devem FALHAR)

- [ ] T019 [P] [US3] Escrever `tests/security/whatsapp.test.ts`: POST sem/with header errado → 401 e zero registros/zero IA; `clientToken` não configurado → 501; unit de `isAllowedSender` (igualdade exata, canonicalização BR 9º dígito, sufixo forjado rejeitado); unit de extração de `providerMessageId` (payload Z-API e Evolution); mensagem duplicada → `ignored: "duplicate"` e efeito único

### Implementation for User Story 3

- [ ] T020 [P] [US3] Em `src/lib/whatsapp/parse.ts`: extrair `providerMessageId` (Z-API `messageId`; Evolution `key.id`; fallback `null`)
- [ ] T021 [P] [US3] Em `src/lib/whatsapp/provider.ts`: `isAllowedSender` por igualdade exata de números normalizados com canonicalização BR (inserir 9º dígito quando 55+DDD+8) — remover `endsWith`/sufixo
- [ ] T022 [US3] Em `src/app/api/whatsapp/webhook/route.ts`: exigir header `client-token` comparado timing-safe com `WhatsAppSetting.clientToken` (501 se não configurado, 401 se inválido — antes de qualquer leitura de settings adicionais/gravação/IA); gravar log de entrada com `providerMessageId` ANTES de processar e tratar P2002 como `{ok:true, ignored:"duplicate"}`; GET healthcheck sem nome interno ([contracts §2](./contracts/http-e-sessao.md))
- [ ] T023 [US3] Em `src/app/api/whatsapp/reminders/route.ts`: autenticar por `Authorization: Bearer` vs `process.env.CRON_SECRET` timing-safe (501 sem env, 401 inválido); ignorar `?secret=`; remover POST; parar de ler `WhatsAppSetting.remindersSecret` ([contracts §3](./contracts/http-e-sessao.md))
- [ ] T024 [P] [US3] Conferir `vercel.json`: se o cron de reminders passa `?secret=`, trocar para chamada limpa (header Bearer é injetado pela Vercel via env `CRON_SECRET`); documentar no `docs/AMBIENTES.md`
- [ ] T025 [US3] Rodar `npm run test:security -- whatsapp` até verde + curls do quickstart (SC-006, SC-007)

**Checkpoint**: perímetro externo fechado; todas as stories entregues.

## Phase 6: Polish & Cross-Cutting

- [ ] T026 [P] Marcar as checkboxes concluídas dos Módulos 1, 2 e 3 em `docs/PLANO-DE-ACAO.md` (incluindo as já entregues no commit `fbcd86c`)
- [ ] T027 Validação final: suíte completa `npm run test` verde, `npm run build` verde, roteiro manual do [quickstart.md](./quickstart.md) executado (boot sem segredo, logout revoga, lockout, curls de webhook/reminders) — SC-008

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T004, bloqueante)** → stories em ordem de prioridade → Polish.
- US1 (T005–T010): só depende da Foundational. **É o MVP.**
- US2 (T011–T018): independente de US1 em código (arquivos distintos), mas executar depois por prioridade; T013 ⟶ T015/T016 (payload primeiro).
- US3 (T019–T025): independente de US1/US2 em código; T020/T021 podem rodar antes de T022.
- Dentro de cada story: tests ([P]) primeiro → implementação → task de suite verde por último.

### Parallel opportunities

- T001 ∥ T002 (arquivos distintos)
- T005, T011, T012, T019: todos os arquivos de teste podem ser escritos em paralelo após T004
- US2: T013 ∥ T014 ∥ T017; US3: T020 ∥ T021 ∥ T024
- T009 e T026 (docs) paralelos a qualquer implementação

## Implementation Strategy

1. **MVP primeiro**: Setup + Foundational + US1 → intrusão 2 usuários 100% negada (maior risco eliminado). Commit por checkpoint.
2. **Incremento 2**: US2 (sessão/lockout) — inclui aviso de relogin único.
3. **Incremento 3**: US3 (WhatsApp) — exige configurar Client-Token no gateway e `CRON_SECRET` na Vercel antes do deploy.
4. Encerramento: Polish + `speckit-converge` (critério mecânico: convergiu quando não appendar nenhuma task nova).
