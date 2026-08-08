# Implementation Plan: Hardening de Segurança P0 — Acesso, Sessão e Canal WhatsApp

**Branch**: `001-seguranca-acesso` | **Date**: 2026-08-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-seguranca-acesso/spec.md`

## Summary

Fechar as três brechas P0 remanescentes do `docs/PLANO-DE-ACAO.md` (Módulos 1–3):

1. **IDOR residual** — `payInvoice`/`setInvoiceStatus` sem guard e sem validação
   de entrada; checagem de dono da extensão Prisma não atômica (TOCTOU) e
   permissiva com registros órfãos (`ownerId == null`).
2. **Sessão** — fallback hardcoded de `SESSION_SECRET` em dois arquivos; logout
   que não revoga (token segue válido por 30 dias); login sem limite de
   tentativas.
3. **WhatsApp** — webhook aberto a POST anônimo; secret de reminders em query
   string sem comparação timing-safe; autorização de remetente por sufixo
   (forjável); sem deduplicação de mensagens.

Abordagem técnica (decisões no [research.md](./research.md)): revogação por
`sessionVersion` no `User` embutida no token (validada em `getCurrentUser`, que
já consulta o banco; middleware Edge continua só HMAC+exp); lockout persistido
em tabela `LoginAttempt` (5 falhas/15 min por conta+origem); dedupe por coluna
única `providerMessageId` em `WhatsAppMessage` (unicidade do banco = atômica);
escrita com escopo de dono via `updateMany`/`deleteMany` com `ownerId` no
`where` (uma instrução SQL = sem TOCTOU); webhook autenticado por header
`client-token` timing-safe e fail-closed; reminders via `Authorization: Bearer`
(padrão Vercel Cron). Vitest entra como runner mínimo para a suíte de segurança
(princípio VI da constituição).

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node 18+ (server) + Edge runtime (middleware)

**Primary Dependencies**: Next.js 14 (App Router, server actions), Prisma 5, zod, bcryptjs — sem novas deps de runtime; Vitest entra como devDependency

**Storage**: Postgres (Supabase Nummiq Dev/Prod) via Prisma; mudanças: campo `User.sessionVersion`, tabela `LoginAttempt`, coluna única `WhatsAppMessage.providerMessageId`

**Testing**: Vitest (novo, devDependency) + suíte de integração contra o banco de `.env.test` via `scripts/with-env.ts`; testes de unidade puros para token/comparações

**Target Platform**: Vercel serverless (instâncias efêmeras — nada de estado em memória) + Edge middleware sem acesso a banco

**Project Type**: Web app, projeto único (`src/`)

**Performance Goals**: overhead ≤ 1 query extra por login (contagem de tentativas); revogação sem query extra (aproveita o `findUnique` de `getCurrentUser`); dedupe sem query extra (constraint de unicidade no insert já existente)

**Constraints**: middleware Edge não consulta banco (revogação validada no Node runtime); toda migration via `npm run db:migrate` (guarda `APP_ENV`); `.env.test` compartilha o banco de dev — testes destrutivos usam dados próprios prefixados

**Scale/Scope**: instância pessoal/familiar (< 50 usuários); 10 arquivos de código tocados + schema + suíte de testes nova

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano cumpre |
|---|---|
| I. Segurança P0 nunca adiada | A feature É o P0; merge bloqueado até SC-001..008 passarem. |
| II. Isolamento pela extensão Prisma | Correções de atomicidade/órfãos acontecem NA extensão (`src/lib/prisma.ts`), não em filtros manuais; actions ganham `getViewer()` no topo (guard de autenticação, não de escopo). |
| III. Banco só por canais guardados | `sessionVersion`, `LoginAttempt` e `providerMessageId` entram por `npm run db:migrate`; testes usam `db:test:*`; nada roda contra prod. |
| IV. Nenhum segredo hardcoded | Fallback de `SESSION_SECRET` removido dos 2 arquivos; boot falha explícito; comparações timing-safe no webhook/reminders. Cifrar segredos persistidos (`AISetting.apiKey` etc.) fica na feature 003 — fora do escopo declarado da spec, não é violação. |
| V. Precisão financeira | Nenhum campo monetário novo. `payInvoice` segue no `Float` existente — conversão global a `Decimal` é a feature 002 (ver Complexity Tracking). |
| VI. Testes em lógica de autorização | Vitest instalado nesta feature; suíte cobre intrusão 2 usuários, revogação, lockout, webhook e dedupe (FR-012). |
| VII. TypeScript estrito na borda | Entradas de `payInvoice`/`setInvoiceStatus` ganham schema zod (valor monetário e whitelist de status); nenhum `any` novo. |

**Resultado**: PASS (pré-Phase 0) · re-avaliado PASS (pós-Phase 1) — única
pendência justificada na Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-seguranca-acesso/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões técnicas
├── data-model.md        # Phase 1 — mudanças de schema
├── quickstart.md        # Phase 1 — guia de validação
├── contracts/
│   └── http-e-sessao.md # Phase 1 — contratos de webhook/cron/sessão
├── checklists/
│   └── requirements.md  # Checklist de qualidade da spec
└── tasks.md             # Gerado por /speckit-tasks (não por este comando)
```

### Source Code (repository root)

```text
src/
├── middleware.ts                      # remover fallback do SECRET (falha explícita)
├── lib/
│   ├── prisma.ts                      # extensão: escrita atômica c/ ownerId; órfãos bloqueados
│   ├── auth/
│   │   ├── session.ts                 # sem fallback; payload ganha sv (sessionVersion)
│   │   ├── current-user.ts            # valida sv contra User.sessionVersion
│   │   └── viewer.ts                  # (sem mudança; já usado como guard)
│   ├── actions/
│   │   ├── auth.ts                    # lockout no login; logout incrementa sessionVersion
│   │   └── invoices.ts                # getViewer + zod em payInvoice/setInvoiceStatus
│   └── whatsapp/
│       ├── provider.ts                # isAllowedSender: igualdade exata normalizada
│       └── parse.ts                   # extrair providerMessageId do payload
├── app/api/whatsapp/
│   ├── webhook/route.ts               # auth por header timing-safe; dedupe; fail-closed
│   └── reminders/route.ts             # Authorization: Bearer; timing-safe; sem query string
prisma/
├── schema.prisma                      # User.sessionVersion; LoginAttempt; providerMessageId
└── migrations/<nova>/                 # via npm run db:migrate
tests/
└── security/
    ├── owner-scope.test.ts            # intrusão 2 usuários (todas as actions de escrita)
    ├── session.test.ts                # revogação, boot sem segredo, expiração
    ├── login-lockout.test.ts          # 5 falhas → bloqueio → recuperação
    └── whatsapp.test.ts               # 401 anônimo, remetente, dedupe
docs/
└── PLANO-DE-ACAO.md                   # marcar checkboxes M1–M3 + decisão Category
```

**Structure Decision**: projeto único existente (`src/`); testes nascem em
`tests/security/` na raiz (padrão Vitest), preparando o terreno para a feature
005 expandir a suíte.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `payInvoice` continua operando sobre campos `Float` (princípio V pede `Decimal`) | Conversão Float→Decimal é migration de TODOS os campos monetários com backfill e testes de caracterização — escopo da feature `002-integridade-dados` | Converter só `CreditCardInvoice` agora criaria schema misto (Float em `Transaction`, Decimal em fatura) e duas migrations arriscadas em vez de uma planejada |
| Actions fora do escopo seguem sem `ActionResult<T>` (princípio VII) | Padronizar retorno das 18 actions é refactor transversal da feature `004-base-de-engenharia` | Fazê-lo aqui dobraria o diff da feature de segurança e misturaria refactor com hardening, quebrando a rastreabilidade do converge |
