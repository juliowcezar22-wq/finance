# Tasks: Segredos Cifrados, Hardening Web e Resiliência da IA

**Input**: Design de `/specs/007-segredos-resiliencia-ia/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md)

**Tests**: INCLUÍDOS e OBRIGATÓRIOS (FR-013; constituição VI).

## Phase 1: Setup

- [ ] T001 Gerar `SECRETS_KEY` (32 bytes base64) em `.env` e `.env.test`; documentar em `.env.example`/`.env.test.example` (obrigatório, sem fallback); opcional `AI_DAILY_TOKEN_CAP`
- [ ] T002 [P] Adicionar `AiUsage` ao `prisma/schema.prisma` (dono `@default("__no_owner__")` + `onDelete: Restrict`, `@@unique([ownerId, day])`, `day @db.Date`) e a relação inversa no `User`; incluir `AiUsage` em `OWNED_MODELS` de `src/lib/prisma.ts`
- [ ] T003 Gerar e aplicar migração `ai_usage` via `npm run db:migrate` (dev) + `db:test:migrate:deploy`; `prisma generate`; conferir `migrate diff` vazio

## Phase 2: Cifra de segredos (US1) 🎯

- [ ] T004 [P] Escrever `tests/crypto/secrets.test.ts`: round-trip encrypt→decrypt; `isEncrypted`; texto adulterado → erro controlado; import do módulo sem `SECRETS_KEY` (stub de env) lança
- [ ] T005 Implementar `src/lib/crypto/secrets.ts`: `encryptSecret`/`decryptSecret`/`isEncrypted` (AES-256-GCM, `v1:` + iv+tag+ciphertext base64; `SECRETS_KEY` obrigatório no load)
- [ ] T006 Decifrar na leitura: `getAISettings` (`src/lib/ai/provider.ts`) e `getWhatsAppSettings` (`src/lib/whatsapp/provider.ts`) retornam segredos decifrados usando guarda `isEncrypted(v) ? decryptSecret(v) : v` — robusto à janela entre deploy e migração (legado texto plano é devolvido como está)
- [ ] T007 Cifrar na escrita: `src/lib/actions/ai.ts` (apiKey) e `src/lib/actions/whatsapp.ts` (token/clientToken/remindersSecret) cifram antes do upsert, preservando a máscara `•` (só re-cifra valor novo)
- [ ] T008 [P] `scripts/encrypt-secrets.ts` (dry-run padrão, `--apply`, backup JSON, idempotente por prefixo `v1:`) + npm script `db:encrypt-secrets`; rodar `--apply` em dev/test
- [ ] T009 Rodar `tests/crypto` verde + verificar no banco que os segredos ficaram `v1:…` e que testar IA/WhatsApp ainda funciona (SC-001, SC-002)

## Phase 3: Resiliência + teto de custo da IA (US3)

- [ ] T010 [P] Escrever `tests/ai/usage.test.ts`: `assertUnderDailyCap` bloqueia no teto SEM chamar o provedor (mock não invocado); `recordUsage` acumula por dia/usuário
- [ ] T011 [P] Escrever `tests/ai/resilience.test.ts`: timeout (provedor lento → aborta ≤ limite); retry (503→200 entrega); 4xx não retenta; erro do provedor NÃO contém corpo cru
- [ ] T012 Implementar `src/lib/ai/usage.ts`: `assertUnderDailyCap(ownerId)` (soma tokens do dia, fuso America/Sao_Paulo; lança `AiBudgetExceededError`) e `recordUsage(ownerId, usage)` (upsert em `AiUsage`)
- [ ] T013 Implementar `resilientFetch` em `src/lib/ai/provider.ts` (AbortController timeout ~30s; retry backoff em rede/5xx/429; 4xx não); `openAiChat`/`anthropicChat` passam a usá-lo
- [ ] T014 Integrar teto+consumo no `chatComplete`: `assertUnderDailyCap` antes do fetch; `recordUsage` após sucesso; propagar `AiBudgetExceededError` como mensagem clara ao usuário
- [ ] T015 `prettyHttpError` (`src/lib/ai/provider.ts`) deixa de incluir o corpo do provedor; loga o corpo no servidor (`console.error`) e devolve mensagem genérica
- [ ] T016 `visionComplete` em `src/lib/whatsapp/agent.ts` passa a usar `resilientFetch` + decifra apiKey + `assertUnderDailyCap`/`recordUsage` no dono do agente
- [ ] T017 Rodar `tests/ai` verde (SC-004, SC-005, SC-006, SC-007)

## Phase 4: Hardening web (US2, US4)

- [ ] T018 [P] `next.config.mjs`: `async headers()` com HSTS (prod), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy (enforce) + `Content-Security-Policy-Report-Only` inicial
- [ ] T019 [P] Escrever `tests/security/upload.test.ts`: arquivo de MIME não permitido / acima do tamanho → rejeitado antes do processamento
- [ ] T020 Validar upload em `src/lib/actions/import-pdf.ts` (e preview CSV se aplicável): whitelist de MIME + tamanho máximo antes de `readFileBuffer`/parse; mensagem clara
- [ ] T021 [P] Revisar `src/app/assistente/markdown.tsx`: confirmar que não injeta HTML cru (sem `dangerouslySetInnerHTML`); adicionar nota/teste; sanitizar só se houver caminho de HTML cru

## Phase 5: Validação

- [ ] T022 `npx tsc --noEmit` limpo; `npm run test` inteiro verde (crypto + ai + upload + suíte 001/002)
- [ ] T023 `npm run build` verde; `curl -I` mostra os headers (SC-003)
- [ ] T024 [P] Atualizar `docs/AMBIENTES.md` (SECRETS_KEY obrigatório + rotação + encrypt-secrets no go-live) e marcar Módulos 4 e 6 em `docs/PLANO-DE-ACAO.md`

## Dependencies & Execution Order

- Setup (T001-T003) → Cifra (T004-T009) → Resiliência/teto (T010-T017) → Hardening web (T018-T021) → Validação (T022-T024).
- Cifra (Phase 2) antes da resiliência? Independentes, mas T006 (decifra em getAISettings) deve preceder T013/T016 (que consomem settings). Fazer Phase 2 antes de Phase 3.
- Testes [P] escritos antes da implementação de cada bloco.

### Parallel opportunities

- T002 ∥ T004; T010 ∥ T011; T018 ∥ T019; T008/T021/T024 [P].

## Implementation Strategy

1. Schema/env primeiro (AiUsage + SECRETS_KEY).
2. Cifra com testes → migrar segredos legados → confirmar uso real.
3. Resiliência + teto com testes (mock provedor).
4. Headers + upload + markdown.
5. Validação + revisão adversarial (como 001/002) antes do merge.
