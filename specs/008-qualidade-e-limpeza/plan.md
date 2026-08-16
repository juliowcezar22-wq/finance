# Plan: 008-qualidade-e-limpeza

**Branch**: 008-qualidade-e-limpeza | **Base**: main @ 298a106

## Abordagem (ordem)
1. **Portão de qualidade**: instalar ESLint (`eslint` + `eslint-config-next`) +
   Prettier (+ `prettier-plugin-tailwindcss`); `.eslintrc.json`, `.prettierrc`;
   scripts `lint`, `format`, `check` (= lint + `tsc --noEmit` + prettier --check).
2. **Peso morto**: remover rotas-stub `faturas`/`receber`/`fluxo-de-caixa` +
   `faturas/pay-dialog.tsx`; redirects em `next.config.mjs`. Remover
   `unlinked-banner.tsx` e `isUnlinkedUser`. Desinstalar 5 deps não usadas
   (react-hook-form, @hookform/resolvers, date-fns, @radix-ui/react-dropdown-menu,
   @radix-ui/react-select).
3. **Segurança resíduo**: seed sem senha default; simulador atrás de
   `process.env.NODE_ENV !== "production"`; rate-limit do webhook via tabela
   `WebhookHit` (Postgres) — janela curta por remetente/global.
4. **Tipagem**: `src/lib/types/action.ts` com `ActionResult<T>`; aplicar nas
   actions que hoje dão `.parse()` cru (auth já ok; expenses/incomes/transactions/
   etc. que lançam). Reduzir `any` nos hotspots (agent, ai/provider, actions/ai,
   dialogs) com zod na borda de webhook/LLM.
5. **Formatação**: `prettier --write .` num commit isolado por último.

## Gates
tsc 0 · suíte verde · `next build` verde · `npm run check` verde · revisao-forte limpa.

## Constituição
Princípio VII (TS estrito, sem any novo, ActionResult) é o coração aqui;
III (migração da tabela de rate-limit via db:migrate); VI (suíte segue verde).
