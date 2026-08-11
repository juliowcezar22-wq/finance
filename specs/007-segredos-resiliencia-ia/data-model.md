# Data Model — 007-segredos-resiliencia-ia (Phase 1)

## Novo modelo: `AiUsage` (consumo diário por usuário)

```prisma
model AiUsage {
  id               String   @id @default(cuid())
  ownerId          String   @default("__no_owner__")
  owner            User     @relation("OwnerAiUsage", fields: [ownerId], references: [id], onDelete: Restrict)
  day              DateTime @db.Date            // dia (fuso America/Sao_Paulo)
  promptTokens     Int      @default(0)
  completionTokens Int      @default(0)
  calls            Int      @default(0)
  updatedAt        DateTime @updatedAt @default(now())

  @@unique([ownerId, day])
  @@index([ownerId])
}
```

- Entra em `OWNED_MODELS` de `src/lib/prisma.ts` (dono obrigatório, escopado).
- `User` ganha a relação inversa `ownedAiUsage AiUsage[] @relation("OwnerAiUsage")`.
- Segue o padrão da 002: `ownerId String @default("__no_owner__")` + `onDelete: Restrict`.
- Migração via `npm run db:migrate`.

## Colunas de segredo (sem mudança de schema — mudança de CONTEÚDO)

| Modelo | Campo | Antes | Depois |
|---|---|---|---|
| AISetting | apiKey | texto plano | ciphertext `v1:…` (AES-256-GCM) |
| WhatsAppSetting | token | texto plano | ciphertext `v1:…` |
| WhatsAppSetting | clientToken | texto plano | ciphertext `v1:…` |
| WhatsAppSetting | remindersSecret | texto plano | ciphertext `v1:…` |

Tipo permanece `String?`. A migração de CONTEÚDO é feita por
`scripts/encrypt-secrets.ts` (não por migration SQL).

## Contratos internos (helpers novos)

- `crypto/secrets.ts`: `encryptSecret(plain) → "v1:…"`, `decryptSecret("v1:…") → plain`,
  `isEncrypted(v) → boolean`. Dependem de `SECRETS_KEY` (env, obrigatório).
- `ai/usage.ts`: `assertUnderDailyCap(ownerId)` (lança `AiBudgetExceededError`),
  `recordUsage(ownerId, { promptTokens, completionTokens })`.
- `ai/provider.ts`: `resilientFetch(url, init, { timeoutMs, retries })`.

## Invariantes

| Invariante | Onde |
|---|---|
| Segredo nunca gravado em texto plano | actions/ai.ts, actions/whatsapp.ts (cifram) |
| Segredo decifrado só em memória, no uso | getAISettings, getWhatsAppSettings |
| Sem `SECRETS_KEY` → cifra/decifra falham explícito | crypto/secrets.ts (load) |
| Teto checado ANTES de contatar o provedor | ai/usage.ts → chamado antes do fetch |
| Retry só em chamada de geração idempotente | resilientFetch (não envolve gravação) |
| Erro do provedor não vaza corpo ao cliente | prettyHttpError |

## Estados/fluxo de uma chamada de IA

```
assertUnderDailyCap(owner)  ──(excedeu)──► AiBudgetExceededError (0 custo, sem fetch)
        │ (ok)
        ▼
resilientFetch (timeout + retry em rede/5xx/429)
        │ sucesso                         │ falha final
        ▼                                 ▼
recordUsage(owner, usage)          prettyHttpError (genérico; corpo logado no servidor)
        ▼
resposta ao usuário
```
