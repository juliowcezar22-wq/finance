# Bugia Finance — projeto paralelo (dev/test)

App de finanças pessoais: Next.js 14 (App Router) + Prisma 5 + Postgres
(Supabase). Este repositório é o **clone paralelo** do projeto original —
a produção vive no projeto/Vercel original e **não é tocada daqui**.

## Ambientes

- `.env` → banco de DESENVOLVIMENTO (Supabase próprio). Usado por `npm run dev`
  e pelos scripts `db:*`.
- `.env.test` → banco de TESTES (descartável). Usado pelos scripts `db:test:*`.
- Produção: só no projeto original. Credenciais de prod nunca entram aqui.

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
