# Research — 007-segredos-resiliencia-ia (Phase 0)

## R1. Cifra de segredos: AES-256-GCM com `SECRETS_KEY`

**Decision**: `src/lib/crypto/secrets.ts` com Node `crypto` nativo (sem dep):
- `encryptSecret(plain: string): string` → `iv(12B) || tag(16B) || ciphertext`,
  serializado como `v1:<base64>`. Chave: `SECRETS_KEY` (env), 32 bytes
  (aceitar base64/hex), obrigatória — lançar no load se ausente/curta (padrão
  do `SESSION_SECRET`).
- `decryptSecret(v: string): string` → valida prefixo `v1:`, decifra; se o
  formato/tag falha, lança erro controlado (chamador trata como credencial
  inválida). `isEncrypted(v)` detecta o prefixo (idempotência da migração).

**Rationale**: GCM é cifragem autenticada (confidencialidade + integridade). Node
nativo evita dependência. Versão no prefixo permite rotação/algoritmo futuro.

**Alternatives**: libsodium/`@noble` (dep extra, desnecessária); mover chaves p/
env (perde gestão pela UI — rejeitado no clarify).

## R2. Leitura/escrita transparente

**Decision**: decifrar na **borda de leitura** — `getAISettings`
(`ai/provider.ts:23`) e `getWhatsAppSettings` (`whatsapp/provider.ts:16`)
retornam os segredos já decifrados em memória. Cifrar na **borda de escrita** —
`actions/ai.ts:128` e `actions/whatsapp.ts:49-50` cifram antes do `upsert`,
mantendo a máscara `•` (só re-cifra quando o usuário digita valor novo). O
webhook/reminders e o `agent.ts` consomem os settings já decifrados.

**Rationale**: confina cifra/decifra a 2 pontos de leitura + 2 de escrita; o
resto do código não muda.

**Cuidado**: valores legados (texto plano) — `decryptSecret` deve detectar
ausência do prefixo `v1:` e, na transição, tratar como texto plano (ou o script
de migração cifra tudo antes). Decisão: o script R6 cifra tudo primeiro; a
leitura assume cifrado, com fallback tolerante a legado só até a migração rodar.

## R3. Headers de segurança + CSP report-only

**Decision**: `next.config.mjs` → `async headers()` aplicando a todas as rotas:
`Strict-Transport-Security` (só efetivo em HTTPS/prod), `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` restritiva, e `Content-Security-Policy-Report-Only` com uma
política inicial (self + o necessário). Enforce da CSP fica para depois, com base
nos relatórios.

**Rationale**: ganho imediato dos headers "duros" sem risco à UI redesenhada; a
CSP amadurece em report-only (clarify).

**Alternatives**: CSP enforce imediato (risco de quebrar o redesign); headers via
middleware (o `headers()` do next é mais simples e cobre estático também).

## R4. Resiliência da IA: timeout + retry

**Decision**: no core de `ai/provider.ts`, extrair um `resilientFetch(url, init,
{ timeoutMs=30000, retries=2 })`:
- **Timeout**: `AbortController` + `setTimeout(abort, timeoutMs)`; ao abortar,
  erro amigável ("provedor demorou a responder").
- **Retry**: em erro de rede, 5xx e 429, re-tenta com backoff exponencial
  (ex.: 500ms, 1500ms) até `retries`; 4xx (exceto 429) não re-tenta (erro do
  cliente/chave). `openAiChat`/`anthropicChat` e o `visionComplete`
  (`whatsapp/agent.ts:270`) passam a usar esse core.

**Rationale**: fecha o "pendura sem timeout" e a "falha transitória sem retry"
do M6. Só chamadas de GERAÇÃO (idempotentes) são retentadas — a gravação de
lançamentos (feita depois, pelo agente) fica fora do retry, sem duplicar.

## R5. Teto de custo por usuário/dia (`AiUsage`)

**Decision**: modelo `AiUsage { ownerId, day (date), promptTokens, completionTokens,
calls }` com `@@unique([ownerId, day])`, em OWNED_MODELS. `ai/usage.ts`:
- `assertUnderDailyCap(ownerId)` — soma tokens do dia; se ≥ teto, lança
  `AiBudgetExceededError` ANTES de qualquer fetch (0 custo).
- `recordUsage(ownerId, usage)` — incrementa (upsert) após a resposta.
Teto default: **100.000 tokens/usuário/dia** (configurável por env
`AI_DAILY_TOKEN_CAP`). Chamado no `chatComplete`/`visionComplete` com o owner do
contexto (via `resolveOwnerId`/owner do agente).

**Rationale**: durável (tabela), escopado por dono (extensão Prisma), bloqueia
antes de gastar. Dia no fuso `America/Sao_Paulo` (constituição V).

**Alternatives**: contagem em memória (não sobrevive serverless); custo em R$
(exigiria tabela de preços por modelo — tokens é proxy suficiente).

## R6. Migração dos segredos legados

**Decision**: `scripts/encrypt-secrets.ts` (dry-run padrão, `--apply`, backup
JSON): lê `AISetting`/`WhatsAppSetting`, para cada segredo não-`v1:` cifra e
grava. Idempotente (pula os já `v1:`). Rodar em dev/test; go-live roda em prod.

## R7. Não vazar corpo de erro do provedor

**Decision**: `prettyHttpError` (`ai/provider.ts:157`) deixa de incluir
`detail`/`body.slice(0,300)`. Mensagens por status permanecem genéricas
(401/403/404/429) e o caso default vira "Erro do provedor (NNN). Tente novamente
mais tarde." O corpo cru é `console.error` no servidor (observabilidade real é a
feature de testes/observabilidade).

## R8. Upload: validar MIME/tamanho

**Decision**: em `actions/import-pdf.ts` (e no `previewImport`/CSV se aplicável),
validar `file.type` (whitelist: `application/pdf`, `text/csv`, planilhas) e
`file.size` (≤ limite, ex.: 10 MB, alinhado ao `bodySizeLimit`) na action, antes
de `readFileBuffer`/parse. Rejeitar com mensagem clara. zod para o restante do
formData.

## R9. Markdown do assistente

**Decision**: `src/app/assistente/markdown.tsx` (74 linhas) NÃO usa
`dangerouslySetInnerHTML` (confirmado por grep) — é um renderer que constrói
elementos React (o React escapa por padrão). Task: **confirmar** por leitura que
nenhum caminho injeta HTML cru e adicionar um teste/nota; só introduzir
sanitização (ex.: DOMPurify) se surgir um caminho de HTML cru. Sem dep nova se
já for seguro.
