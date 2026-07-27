# Ambientes, bancos de dados e papéis — Bugia Finance (projeto paralelo)

Este repositório é um **clone paralelo** do projeto de finanças original.
O original continua sendo o dono da **produção** (Vercel + Supabase atuais).
Aqui se desenvolve e testa com bancos próprios, sem nenhum risco para prod.

## 1. Mapa de ambientes

| Ambiente | Onde vive | Banco (Supabase) | Arquivo de env | Pode ser apagado? |
|---|---|---|---|---|
| **Produção** | Projeto/Vercel **original** | Supabase original (existente) | Só na Vercel original | ❌ Nunca |
| **Desenvolvimento** | Este repositório | Projeto Supabase **novo** (ex.: `bugia-finance-dev`) | `.env` (a partir de `.env.example`) | Com cuidado |
| **Testes** | Este repositório | Projeto Supabase **novo** (ex.: `bugia-finance-test`) | `.env.test` (a partir de `.env.test.example`) | ✅ Descartável |

Regras de ouro:

1. **Credenciais de produção NUNCA entram neste repositório** — nem em
   `.env`, nem em `.env.test`, nem exportadas no shell enquanto trabalha aqui.
2. Todo comando de banco passa por `scripts/with-env.ts`, que **recusa
   executar** se `APP_ENV` não for `development` ou `test`.
3. O banco de testes é descartável: `db:test:reset` apaga tudo e re-semeia.

## 2. Comandos por ambiente

Desenvolvimento (usa `.env`):

| Comando | O que faz |
|---|---|
| `npm run db:migrate` | Cria/aplica migrations no banco de dev (`prisma migrate dev`) |
| `npm run db:migrate:deploy` | Aplica migrations pendentes |
| `npm run db:push` | Empurra o schema sem migration (protótipos) |
| `npm run db:seed` | Popula dados iniciais |
| `npm run db:studio` | Abre o Prisma Studio no banco de dev |
| `npm run db:diagnose` / `db:fix-imported` / `db:multiuser` | Scripts de manutenção (ver `scripts/README.md`) |

Testes (usa `.env.test`):

| Comando | O que faz |
|---|---|
| `npm run db:test:migrate:deploy` | Aplica migrations no banco de testes |
| `npm run db:test:seed` | Semeia o banco de testes |
| `npm run db:test:reset` | **Zera** o banco de testes, reaplica migrations e roda o seed |
| `npm run db:test:push` | Empurra o schema sem migration |
| `npm run db:test:studio` | Prisma Studio no banco de testes |

> `npm run db:baseline` só existe para bancos que já tinham dados antes das
> migrations (caso da prod original). Bancos novos e vazios **não** precisam:
> `db:migrate:deploy` aplica tudo desde `0_init`.

## 3. Bootstrap — o que fazer uma única vez

### 3.1 Criar os dois bancos (papel: **você**, no dashboard do Supabase)

Para cada um — `bugia-finance-dev` e `bugia-finance-test`:

1. [supabase.com](https://supabase.com) → **New project** (org sua, região
   `sa-east-1 / São Paulo`, senha forte — guarde-a).
2. Em **Settings → Database → Connection string**, copie:
   - **Transaction pooler** (porta `6543`) → vai em `POSTGRES_PRISMA_URL`
     (acrescente `?pgbouncer=true&connection_limit=1`);
   - **Direct connection** (porta `5432`) → vai em `POSTGRES_URL_NON_POOLING`.

### 3.2 Configurar os envs locais (papel: **você** — são segredos)

```bash
cp .env.example .env            # preencha com o banco DEV
cp .env.test.example .env.test  # preencha com o banco TEST
```

### 3.3 Inicializar os bancos (papel: **Claude ou você**, no terminal)

```bash
npm install
npm run db:migrate:deploy && npm run db:seed          # dev
npm run db:test:migrate:deploy && npm run db:test:seed # test
npm run dev                                            # app local no banco dev
```

### 3.4 Publicar o projeto paralelo (papel: **você** — contas GitHub/Vercel)

Opcional, quando quiser um ambiente de homologação online:

1. Crie um repositório novo no GitHub (ex.: `bugia-finance`) e faça o push.
2. Na Vercel, **Add New Project** importando esse repositório — **não**
   reutilize o projeto Vercel original.
3. Em Environment Variables do projeto novo, cadastre `POSTGRES_PRISMA_URL`,
   `POSTGRES_URL_NON_POOLING` (do banco **dev**) e `SESSION_SECRET` novo.
   O build já roda `prisma migrate deploy` sozinho.

## 4. Papéis e responsabilidades

### Você (dono do produto / administrador)

- Criar e guardar credenciais: projetos Supabase, senhas, `SESSION_SECRET`,
  contas GitHub/Vercel. Segredos passam por você, nunca pelo repositório.
- Preencher `.env` e `.env.test` localmente.
- Decidir **o que** vira feature e **quando** algo é promovido para produção.
- Executar qualquer ação em produção (sempre no projeto original, manualmente
  e com backup antes).
- Manter o projeto original intocado enquanto este evolui.

### Claude Code (desenvolvimento)

- Escrever código, migrations, seeds e testes **neste repositório**.
- Rodar comandos de banco somente via `db:*` (dev) e `db:test:*` (test).
- Jamais pedir, armazenar ou usar credenciais de produção.
- Preparar, quando for a hora, o passo a passo de promoção para prod
  (diff de migrations + checklist) para **você** executar no projeto original.

### O processo (fluxo de trabalho)

1. Desenvolver aqui, com o banco de dev.
2. Validar no banco de testes (resetável à vontade).
3. Quando uma leva de mudanças estiver estável, decidir o caminho de
   promoção: portar as migrations/código para o projeto original, **ou**
   promover este repositório a novo prod (criando um Supabase de produção
   novo e migrando os dados). Essa decisão é sua; o checklist é feito aqui.
