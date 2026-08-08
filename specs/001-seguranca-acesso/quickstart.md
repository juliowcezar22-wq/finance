# Quickstart de validação — 001-seguranca-acesso

Guia para provar a feature de ponta a ponta. Referências:
[contracts/http-e-sessao.md](./contracts/http-e-sessao.md) ·
[data-model.md](./data-model.md).

## Pré-requisitos

```bash
# 1. Segredos obrigatórios (sem fallback — o boot falha sem eles)
#    Gerar: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
#    .env / .env.test:  SESSION_SECRET=<gerado>   CRON_SECRET=<gerado>

# 2. Migration (guarda APP_ENV via with-env)
npm run db:migrate          # dev
npm run db:test:migrate:deploy  # banco de testes

# 3. Dependências de teste
npm install                 # traz vitest (devDependency nova)
```

## Suíte automatizada (SC-001..003, SC-005..008)

```bash
npm run test:security
```

Esperado: 100% verde. Cobre intrusão 2 usuários em todas as actions de escrita
(incluindo `payInvoice`/`setInvoiceStatus`), órfãos inacessíveis, revogação
pós-logout, lockout 5/15min, webhook 401 anônimo, remetente forjado ignorado e
dedupe por `providerMessageId`.

## Verificações manuais

### Boot sem segredo (SC-004)

```bash
SESSION_SECRET= npm run dev   # esperado: erro explícito no boot/1º request
```

### Revogação no logout (SC-003)

1. Login no navegador; copiar o cookie `bugia_session` (DevTools).
2. Logout.
3. Reapresentar o cookie antigo em um request (curl ou extensão):
   esperado redirect/tratamento como não autenticado.

### Lockout (SC-005)

Errar a senha 5×; a 6ª tentativa (mesmo com senha certa) responde o erro
genérico; após 15 min, senha certa entra normalmente.

### Webhook (SC-006, SC-007)

```bash
# anônimo → 401, nada criado
curl -si -X POST localhost:3000/api/whatsapp/webhook -H 'content-type: application/json' -d '{}'

# com token válido e mesma mensagem 2× → segunda responde ignored:"duplicate"
curl -s -X POST localhost:3000/api/whatsapp/webhook \
  -H 'content-type: application/json' -H "client-token: $CLIENT_TOKEN" \
  -d '{"messageId":"qs-teste-1","phone":"5511...","text":{"message":"ping"}}'
```

### Reminders

```bash
curl -si "localhost:3000/api/whatsapp/reminders?secret=qualquer"          # 401 (query ignorada)
curl -si localhost:3000/api/whatsapp/reminders -H "Authorization: Bearer $CRON_SECRET"  # 200
```

## Pós-deploy (produção)

1. Configurar `SESSION_SECRET` e `CRON_SECRET` na Vercel ANTES do deploy.
2. Atualizar o cron da Vercel para chamar reminders sem `?secret=` (o header
   Bearer é injetado automaticamente pela plataforma quando `CRON_SECRET` existe).
3. Configurar o Client-Token no painel do gateway (Z-API) = valor salvo em
   `/whatsapp`.
4. Avisar usuários: todos precisam refazer login uma vez (tokens antigos caem).
5. Re-rodar o teste de intrusão manual com 2 usuários reais (roteiro do
   `docs/PLANO-DE-ACAO.md`, Módulo 1) e marcar as checkboxes M1–M3.
