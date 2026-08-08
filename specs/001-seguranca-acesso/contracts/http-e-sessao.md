# Contracts — 001-seguranca-acesso (Phase 1)

Contratos das superfícies expostas tocadas pela feature. Formatos de payload
interno (Prisma) estão em [data-model.md](../data-model.md).

## 1. Token de sessão (cookie `bugia_session`)

Formato: `base64url(JSON).assinatura` — HMAC-SHA256 com `SESSION_SECRET`
(obrigatório, ≥ 32 chars; sem fallback).

```jsonc
// payload v2
{
  "uid": "cuid do usuário",
  "role": "ADMIN" | "USER",
  "sv": 0,          // NOVO: sessionVersion do usuário no momento do login
  "exp": 1765000000 // epoch seconds (30 dias)
}
```

Regras de validação (ordem):

| Camada | Valida | Falha → |
|---|---|---|
| Middleware (Edge) | formato, HMAC, `exp` | redirect `/login` |
| `getCurrentUser` (Node) | usuário existe, `active`, **`sv === user.sessionVersion`** | sessão tratada como ausente |

Compatibilidade: token sem `sv` = inválido (relogin único após deploy).

## 2. `POST /api/whatsapp/webhook`

| Aspecto | Contrato |
|---|---|
| Autenticação | Header `client-token: <WhatsAppSetting.clientToken>` — comparação timing-safe |
| Sem `clientToken` configurado | `501 { ok:false, error:"webhook_not_configured" }` — fail-closed |
| Header ausente/inválido | `401 { ok:false }` — nada gravado, IA não acionada |
| `enabled: false` | `200 { ok:true, ignored:"disabled" }` (após auth) |
| Remetente ≠ `myNumber` (igualdade exata normalizada, tolerância BR 9º dígito) | `200 { ok:true, ignored:"sender_not_allowed" }` |
| `providerMessageId` repetido | `200 { ok:true, ignored:"duplicate" }` — efeito único (FR-011) |
| Sucesso | `200 { ok:true, action:"<intent>" }` |

`GET /api/whatsapp/webhook` (healthcheck): `200 { ok:true }` — público, sem
nome interno do serviço.

## 3. `GET /api/whatsapp/reminders`

| Aspecto | Contrato |
|---|---|
| Autenticação | `Authorization: Bearer <CRON_SECRET>` (env da Vercel) — timing-safe |
| `CRON_SECRET` não configurado | `501` — fail-closed |
| Header ausente/inválido | `401` |
| `?secret=` na query | **Ignorado** (não autentica mais); documentar migração do cron |
| `POST` | `405` (removido; Vercel Cron usa GET) |

## 4. Server actions de fatura

`payInvoice(formData)` — pré-condições: viewer autenticado (`getViewer()`),
`amount` = decimal BR válido, finito, > 0 (zod após `parseBRL`). Recalculo de
`paid`/`status` dentro de `$transaction`. Fatura de outro dono → erro genérico
"Registro não encontrado." (via extensão).

`setInvoiceStatus(id, status)` — pré-condições: viewer autenticado; `status`
∈ whitelist dos status de fatura usados no app (enum conferido na
implementação). Mesmo comportamento de erro genérico.

## 5. `loginAction` / `logoutAction`

| Caso | Resposta |
|---|---|
| Credenciais válidas + conta ativa | cookie de sessão v2 + redirect `/dashboard` |
| Credenciais inválidas (qualquer motivo) | `{ error: "E-mail ou senha incorretos" }` |
| ≥ 5 falhas / 15 min (por e-mail, pós-último-sucesso) | mesmo erro genérico + nota de aguardar alguns minutos; tentativa NÃO processada |
| Conta inativa | mensagem atual de aprovação pendente (inalterada) |
| `logoutAction` | `sessionVersion++` no usuário, cookie apagado, redirect `/login` |

Toda tentativa (sucesso/falha) gera registro `LoginAttempt`.
