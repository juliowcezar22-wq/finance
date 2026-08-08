# Ambientes, bancos de dados e papéis — Nummiq (ex-Bugia Finance)

Este repositório nasceu como clone paralelo do projeto de finanças original e
foi **promovido a projeto próprio (Nummiq)**, com produção independente.
O projeto original e sua produção antiga seguem intocados, em separado.

## 1. Mapa de ambientes

| Ambiente | Projeto Supabase | Arquivo de env | Uso | Pode ser apagado? |
|---|---|---|---|---|
| **Produção** | `Nummiq Prod` (ref `gqokfjvaaneivzccdnlu`) | Nenhum aqui — envs só na Vercel | App publicado | ❌ Nunca |
| **Desenvolvimento** | `Nummiq Dev` (ref `xryrusjctdnkiljnomlw`) | `.env` | `npm run dev` + scripts `db:*` | Com cuidado |
| **Testes locais** | `Nummiq Dev` — **mesmo banco de dev** | `.env.test` | scripts `db:test:*` | ⚠️ ver aviso |

> ⚠️ **Dev e testes compartilham o MESMO banco** (limite de 2 projetos do
> plano gratuito do Supabase). `npm run db:test:reset` **apaga também os
> dados de desenvolvimento**. Quando o projeto for para o plano Pro, criar
> um terceiro projeto só para testes e separar o `.env.test`.

Regras de ouro:

1. **Credenciais de produção NUNCA entram neste repositório** — vivem apenas
   nas Environment Variables da Vercel (e num gerenciador de senhas seu).
2. Todo comando de banco passa por `scripts/with-env.ts`, que **recusa
   executar** se `APP_ENV` não for `development` ou `test`. Produção só é
   migrada pelo build da Vercel (`prisma migrate deploy`) ou por você.
3. RLS hardening (`prisma/security/rls-hardening.sql`) deve estar aplicado em
   todos os bancos (fecha a API REST pública do Supabase).

## 2. Comandos por ambiente

Desenvolvimento (usa `.env`):

| Comando | O que faz |
|---|---|
| `npm run db:migrate` | Cria/aplica migrations no banco de dev (`prisma migrate dev`) |
| `npm run db:migrate:deploy` | Aplica migrations pendentes |
| `npm run db:push` | Empurra o schema sem migration (protótipos) |
| `npm run db:seed` | Popula dados iniciais |
| `npm run db:studio` | Abre o Prisma Studio |
| `npm run db:diagnose` / `db:fix-imported` / `db:multiuser` | Scripts de manutenção (ver `scripts/README.md`) |

Testes (usa `.env.test` — hoje o mesmo banco de dev):

| Comando | O que faz |
|---|---|
| `npm run db:test:migrate:deploy` | Aplica migrations |
| `npm run db:test:seed` | Roda o seed |
| `npm run db:test:reset` | **Zera o banco** (⚠️ apaga dev junto!), reaplica migrations e semeia |
| `npm run db:test:studio` | Prisma Studio |

## 3. Produção (Nummiq Prod)

- Projeto Supabase `Nummiq Prod`, dedicado — criado vazio; as migrations são
  aplicadas automaticamente pelo primeiro deploy da Vercel (o script `build`
  roda `prisma generate && prisma migrate deploy && next build`).
- Hardening pré-aplicado (revogações + default privileges do papel `postgres`);
  **re-rodar o `rls-hardening.sql` completo após o primeiro deploy** para
  ligar RLS nas tabelas recém-criadas (item do checklist de go-live).
- Envs necessárias na Vercel: `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`
  (do Nummiq Prod), `SESSION_SECRET` forte (**obrigatório, ≥ 32 chars — sem ele
  o app não sobe**), `CRON_SECRET` (para o cron de lembretes via header Bearer)
  e, para o seed manual inicial, `ADMIN_NAME/ADMIN_EMAIL/ADMIN_PASSWORD`.
- Checklist de go-live: ver Módulo 15 de `docs/PLANO-DE-ACAO.md` (inclui
  rodar o `rls-hardening.sql` no SQL Editor do Nummiq Prod, backups e monitor).

### Segredos obrigatórios e sessão (feature 001)

- `SESSION_SECRET` e `CRON_SECRET` não têm mais fallback no código: em qualquer
  ambiente, a ausência de `SESSION_SECRET` (ou < 32 chars) faz o app falhar no
  boot; o webhook/cron recusam sem os respectivos segredos. Configure-os em
  `.env`, `.env.test` e na Vercel (ver `.env.example`).
- **Relogin único após o deploy desta feature:** os tokens de sessão passaram a
  carregar `sv` (sessionVersion). Tokens antigos (sem `sv`) são rejeitados —
  todos os usuários precisam entrar de novo uma vez. Logout agora revoga de
  fato (incrementa `sessionVersion`, invalidando todas as sessões do usuário).

## 4. Papéis e responsabilidades

### Você (dono do produto / administrador)

- Guardar credenciais: senhas dos bancos, `SESSION_SECRET`, tokens.
  Segredos passam por você, nunca pelo repositório.
- Ações no dashboard do Supabase que a automação não pode fazer
  (deletar/criar projetos quando o classificador bloquear, resets de senha).
- Configurar as envs na Vercel e disparar o primeiro deploy.
- Decidir o que é promovido a produção; executar o checklist de go-live.

### Claude Code (desenvolvimento)

- Escrever código, migrations, seeds e testes neste repositório.
- Rodar comandos de banco somente via `db:*` / `db:test:*` (guarda de env).
- Gerenciar os projetos Supabase via Management API quando autorizado
  (criação, rename, SQL não-destrutivo), sempre relatando o que fez.
- Jamais armazenar credenciais de produção no repositório.

### Fluxo de trabalho

1. Desenvolver e testar no Nummiq Dev (`npm run dev`, `db:test:reset` à vontade
   — lembrando que dev e teste são o mesmo banco por enquanto).
2. Commit + push para `github.com/juliowcezar22-wq/finance` (branch `main`).
3. Deploy: Vercel conectada ao repositório aplica migrations no Nummiq Prod
   automaticamente a cada deploy de `main`.
