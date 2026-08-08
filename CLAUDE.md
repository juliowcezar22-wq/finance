# Nummiq (ex-Bugia Finance)

App de finanças pessoais: Next.js 14 (App Router) + Prisma 5 + Postgres
(Supabase). Nasceu como clone paralelo do projeto original e foi promovido a
produto próprio (**Nummiq**), com produção independente na Vercel.

## Ambientes

- `.env` → Supabase **Nummiq Dev**. Usado por `npm run dev` e scripts `db:*`.
- `.env.test` → **mesmo banco** Nummiq Dev (limite do plano free). Scripts
  `db:test:*`; ⚠️ `db:test:reset` apaga os dados de dev junto.
- Produção → Supabase **Nummiq Prod**, migrada só pelo build da Vercel.
  Credenciais de prod nunca entram neste repositório.

Detalhes, bootstrap e papéis: `docs/AMBIENTES.md`.

## Regras para o agente

- Todo comando de banco passa por `scripts/with-env.ts` (guarda que exige
  `APP_ENV` = `development` ou `test`). Não contornar a guarda chamando
  `prisma` direto com URLs no shell.
- Mudanças de schema: `npm run db:migrate` (gera migration em
  `prisma/migrations/`). `db:push` só para protótipo rápido.
- Experimentos destrutivos: usar o banco de testes (`db:test:reset` zera e
  re-semeia).
- Scripts de manutenção de dados ficam em `scripts/` (ver `scripts/README.md`);
  todos têm dry-run por padrão — manter esse padrão em scripts novos.
