# Implementation Plan: Segredos Cifrados, Hardening Web e Resiliência da IA

**Branch**: `007-segredos-resiliencia-ia` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-segredos-resiliencia-ia/spec.md`

## Summary

Fechar os Módulos 4 e 6 do `docs/PLANO-DE-ACAO.md`:

1. **Segredos cifrados** — `AISetting.apiKey`, `WhatsAppSetting.token/clientToken/
   remindersSecret` deixam de ser texto plano. Cifragem AES-256-GCM com segredo
   mestre `SECRETS_KEY` (env, sem fallback), num helper `src/lib/crypto/secrets.ts`.
   Decifra no ponto de uso (`getAISettings`/`getWhatsAppSettings`), cifra no
   ponto de escrita (`actions/ai.ts`, `actions/whatsapp.ts`), preservando o
   mascaramento por `•` já existente. Script de migração cifra as legadas.
2. **Hardening web** — `next.config.mjs` ganha `headers()`: HSTS (prod),
   X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy em **enforce**;
   **CSP em report-only** (não quebra a UI redesenhada). Upload de import valida
   MIME/tamanho na action antes de processar. `prettyHttpError` deixa de vazar o
   corpo do provedor (loga no servidor, devolve genérico). Markdown do assistente
   verificado contra HTML cru.
3. **Resiliência da IA** — `chatComplete`/`visionComplete` ganham **timeout**
   (AbortController ~30s) e **retry com backoff** (rede/5xx/429; só chamadas de
   geração, nunca a gravação). **Teto de custo diário por usuário** (tabela
   `AiUsage`): checa antes de chamar o provedor, contabiliza depois, bloqueia ao
   exceder sem contatar o provedor.

Decisões (clarify): cifra no banco (AES-256-GCM); teto **bloqueia**; CSP
report-only + demais headers enforce; higiene web (upload/markdown) incluída.
Detalhes em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node 18+ (Node crypto)

**Primary Dependencies**: Next.js 14, Prisma 5, zod, Node `crypto` (AES-256-GCM nativo — sem dep nova); Vitest (testes). Avaliar `isomorphic-dompurify` só se o markdown precisar sanitizar HTML cru.

**Storage**: Postgres. Mudança: nova tabela `AiUsage` (consumo diário por usuário). As colunas de segredo permanecem (guardam ciphertext).

**Testing**: Vitest — unit de cifra/decifra e falha sem chave; teto bloqueando sem chamar provedor (mock); timeout/retry (mock provider); não-vazamento de erro; validação de upload.

**Target Platform**: Vercel serverless + Supabase. `SECRETS_KEY` nas envs (dev/test/prod). Contadores de consumo em tabela (durável, serverless-safe).

**Project Type**: Web app, projeto único.

**Performance Goals**: overhead desprezível (1 checagem/contagem de consumo por chamada de IA); cifra/decifra em memória é O(µs).

**Constraints**: `SECRETS_KEY` obrigatório (sem fallback) — cifra/decifra falham explícito sem ele; migração de segredos via script guardado (dry-run + backup); retry nunca sobre operação com efeito de escrita.

**Scale/Scope**: 2 modelos de segredo + 2 rotas de IA (`ai/provider.ts`, `whatsapp/agent.ts`), `next.config.mjs`, 1 action de upload, 1 componente de markdown; + tabela `AiUsage`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Como o plano cumpre |
|---|---|
| I. Segurança P0 nunca adiada | M4/M6 são P1; não bloqueiam, mas fecham risco de dados sensíveis. |
| II. Isolamento pela extensão Prisma | `AiUsage` é modelo com dono (entra em OWNED_MODELS); consumo escopado por usuário. |
| III. Banco só por canais guardados | Migração de `AiUsage` via `db:migrate`; script de cifra via `with-env` (dry-run+backup); nada contra prod. |
| IV. **Nenhum segredo hardcoded/fallback** | É o objetivo central: `SECRETS_KEY` obrigatório sem fallback; segredos cifrados em repouso. |
| V. Precisão financeira | N/A (sem valores monetários novos). |
| VI. Testes em lógica sensível | Cifra/decifra, teto de custo, timeout/retry, não-vazamento — todos com teste (FR-013). |
| VII. TypeScript estrito | zod no upload; sem `any` novo; helpers tipados. |

**Resultado**: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/007-segredos-resiliencia-ia/
├── plan.md · research.md · data-model.md · quickstart.md
├── checklists/requirements.md
└── tasks.md   (/speckit-tasks)
```

### Source Code (repository root)

```text
src/lib/
├── crypto/
│   └── secrets.ts            # NOVO: encryptSecret/decryptSecret (AES-256-GCM, SECRETS_KEY)
├── ai/
│   ├── provider.ts           # decifra apiKey; timeout+retry; prettyHttpError sem corpo; contabiliza consumo
│   └── usage.ts              # NOVO: checa teto diário + registra consumo (AiUsage)
├── whatsapp/
│   ├── provider.ts           # getWhatsAppSettings decifra token/clientToken/remindersSecret
│   └── agent.ts              # visionComplete usa o core resiliente + decifra
├── actions/
│   ├── ai.ts                 # cifra apiKey ao gravar (mantém máscara •)
│   ├── whatsapp.ts           # cifra token/clientToken/remindersSecret ao gravar
│   └── import-pdf.ts         # valida MIME/tamanho antes de processar
next.config.mjs               # headers() de segurança + CSP report-only
src/app/assistente/markdown.tsx  # verificar/garantir render sem HTML cru
prisma/
├── schema.prisma             # modelo AiUsage (dono, dia, tokens)
└── migrations/<nova>/        # via db:migrate
scripts/
└── encrypt-secrets.ts        # NOVO: cifra segredos legados (dry-run + backup, idempotente)
tests/
├── crypto/secrets.test.ts    # round-trip + falha sem SECRETS_KEY
├── ai/usage.test.ts          # teto bloqueia sem chamar provedor
├── ai/resilience.test.ts     # timeout + retry + erro não vaza corpo
└── security/upload.test.ts   # rejeita MIME/tamanho inválidos
docs/
├── AMBIENTES.md              # SECRETS_KEY obrigatório + rotação
└── PLANO-DE-ACAO.md          # marcar Módulos 4 e 6
```

**Structure Decision**: helper único de cifra (`crypto/secrets.ts`) e módulo de
consumo (`ai/usage.ts`) isolam as duas capacidades novas; a resiliência vive no
core de `ai/provider.ts` reusado pelo `visionComplete` do WhatsApp.

## Complexity Tracking

| Desvio | Por quê | Alternativa rejeitada porque |
|--------|---------|------------------------------|
| CSP em report-only (não enforce) | A UI foi redesenhada (feature 003) e pode ter estilos/scripts inline; enforce agora arriscaria quebrar telas | Enforce imediato exigiria varrer e ajustar toda a UI nova neste momento — fora do foco (segredos/IA); report-only coleta violações reais para endurecer depois com segurança |
| Segredos cifrados no banco (não migrados p/ env) | O dono gere as chaves pela tela sem redeploy | Mover p/ env tiraria a gestão pela UI e exigiria redeploy a cada troca de chave |
