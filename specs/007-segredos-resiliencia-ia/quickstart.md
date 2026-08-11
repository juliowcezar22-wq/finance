# Quickstart de validação — 007-segredos-resiliencia-ia

## Pré-requisitos

```bash
# Segredo mestre (32 bytes) em .env / .env.test / Vercel — obrigatório, sem fallback.
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
#   SECRETS_KEY=<gerado>
#   (opcional) AI_DAILY_TOKEN_CAP=100000
npm run db:migrate          # cria a tabela AiUsage
npm install
```

## Suíte automatizada

```bash
npm run test -- tests/crypto tests/ai tests/security/upload.test.ts
```

Esperado: cifra/decifra round-trip; import do crypto sem `SECRETS_KEY` lança;
teto de custo bloqueia sem chamar o provedor (mock não é invocado); timeout e
retry; erro do provedor não vaza corpo; upload inválido rejeitado.

## Verificações

### Segredos cifrados (SC-001, SC-002)

```bash
# migrar segredos legados (dry-run → apply)
npm run db:encrypt-secrets            # dry-run
npm run db:encrypt-secrets -- --apply # aplica (backup em ./backups/)
```
- Ler `AISetting.apiKey` no banco → valor `v1:…` (cifrado), não a chave.
- Configurações → testar conexão de IA / enviar WhatsApp → funciona (decifra ok).
- Boot sem `SECRETS_KEY` → cifra/decifra falham explícito.

### Headers (SC-003)

```bash
curl -sI http://localhost:3000/dashboard | grep -iE "x-frame|content-type-options|referrer|strict-transport|content-security"
```
- Headers duros presentes; `Content-Security-Policy-Report-Only` presente; UI ok.

### Resiliência IA (SC-004, SC-005, SC-007)

- Mock provedor lento → erro amigável em ≤ timeout; app não trava.
- Mock 503 → 200 → retry entrega a resposta.
- Erro do provedor → mensagem genérica; corpo cru só no log do servidor.

### Teto de custo (SC-006)

- Semear consumo do dia no teto; próxima chamada → recusada, provedor NÃO
  contatado (asserção de mock não chamado).

### Upload (SC-008)

- Enviar `.exe`/arquivo grande no import → rejeitado antes do parse.

## Pós-deploy (produção)

1. `SECRETS_KEY` na Vercel ANTES do deploy (senão IA/WhatsApp param).
2. Rodar `db:encrypt-secrets --apply` em prod uma vez (cifra os legados).
3. Conferir headers com `curl -I` no domínio de prod.
4. Monitorar os relatórios de CSP (report-only) antes de endurecer para enforce.
