# Data Model — 001-seguranca-acesso (Phase 1)

Mudanças de schema desta feature. Migration única gerada com
`npm run db:migrate` (nome sugerido: `seguranca_sessao_lockout_dedupe`).
Nenhum campo monetário é tocado (Float→Decimal é a feature 002).

## Alterações em modelos existentes

### `User` — revogação de sessão

```prisma
model User {
  // ... campos existentes ...
  sessionVersion Int @default(0)   // NOVO — incrementa no logout; token carrega sv
}
```

- Tokens embutem `sv`; `getCurrentUser` rejeita `payload.sv !== user.sessionVersion`.
- Tokens antigos (sem `sv`) são tratados como inválidos → relogin único pós-deploy.
- Backfill: `@default(0)` cobre todas as linhas existentes; sem script manual.

### `WhatsAppMessage` — deduplicação

```prisma
model WhatsAppMessage {
  // ... campos existentes ...
  providerMessageId String? @unique  // NOVO — id da mensagem no gateway (dedupe)
}
```

- Só mensagens `direction: "in"` recebem o id; `out` fica `null` (múltiplos
  `null` não violam unicidade no Postgres).
- Violação de unicidade (P2002) no insert = mensagem duplicada → ignorar.
- Backfill: nenhum (linhas antigas ficam `null`).

### `WhatsAppSetting` — aposentadoria de campo

- `remindersSecret` deixa de ser lido (substituído por `CRON_SECRET` em env —
  [research R7](./research.md)). A coluna NÃO é removida nesta migration
  (remoção fica para a feature 002, junto das demais mudanças de schema), mas
  o código não a referencia mais.
- `clientToken` passa de opcional-na-prática a obrigatório operacionalmente:
  webhook recusa tudo enquanto ele estiver vazio (fail-closed). Sem mudança de
  schema.

## Novo modelo

### `LoginAttempt` — lockout de login

```prisma
model LoginAttempt {
  id        String   @id @default(cuid())
  email     String                     // normalizado (trim + lowercase)
  ip        String?                    // primeiro hop de x-forwarded-for
  success   Boolean
  createdAt DateTime @default(now())

  @@index([email, createdAt])
}
```

- **Global** (não entra em `OWNED_MODELS` de `src/lib/prisma.ts`): registra
  tentativas antes de existir sessão; acessado apenas pelo fluxo de auth.
- Regra de bloqueio: ≥ 5 falhas nos últimos 15 min para o e-mail (contadas
  apenas após o último sucesso) → bloquear a 6ª; mesmo erro genérico da senha
  errada (não revela existência de conta).
- Retenção: limpeza best-effort de linhas > 24h no próprio fluxo de login.

## Invariantes de isolamento (extensão Prisma — sem mudança de schema)

Reforços na extensão de `src/lib/prisma.ts` ([research R4](./research.md)):

| Operação | Regra nova |
|---|---|
| `update`/`delete` (modelo com dono) | Executa como `updateMany`/`deleteMany` com `ownerId` no `where` (atômico); `count === 0` → erro "Registro não encontrado." |
| `upsert` | `updateMany` escopado; se nada atualizado e o `where` único não existe → `create` com `ownerId` injetado, em `$transaction` interativa |
| `findUnique(OrThrow)` | Pós-filtro passa a ocultar também órfãos: `res.ownerId !== ownerId` → `null`/erro (hoje órfão vaza) |
| Registro órfão (`ownerId NULL`) | Nunca casa com o `where` escopado → inacessível a usuário comum; saneamento só via `runWithoutScope` em scripts |

## Estados e transições

### Sessão

```
login ──► ativa (sv = User.sessionVersion, exp = +30d)
ativa ──► inválida  quando: exp vencido | sv ≠ sessionVersion (logout) | HMAC inválido
logout ──► sessionVersion++  (todas as sessões do usuário caem)
```

### Tentativa de login (por e-mail)

```
< 5 falhas em 15min ──► login processado normalmente
≥ 5 falhas em 15min ──► bloqueado (erro genérico) até a janela esvaziar
sucesso            ──► zera a contagem efetiva (falhas anteriores ignoradas)
```

### Mensagem WhatsApp (entrada)

```
sem auth ──► 401 (nada gravado)
auth ok + remetente inválido ──► ignorada (logada sem processamento)
auth ok + providerMessageId já visto ──► ignorada como duplicata
auth ok + inédita ──► gravada ──► processada (agente IA) ──► resposta
```
