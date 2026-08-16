# Tasks: 008-qualidade-e-limpeza

## Fase 1 — Portão de qualidade
- [ ] T001 Instalar eslint + eslint-config-next + prettier + prettier-plugin-tailwindcss
- [ ] T002 `.eslintrc.json` (next/core-web-vitals + @typescript-eslint) e `.prettierrc`
- [ ] T003 Scripts `lint`, `format`, `check` no package.json
- [ ] T004 Rodar lint e corrigir erros bloqueantes

## Fase 2 — Peso morto
- [ ] T005 Remover rotas `faturas`,`receber`,`fluxo-de-caixa` + pay-dialog órfão; redirects em next.config.mjs
- [ ] T006 Remover unlinked-banner.tsx e isUnlinkedUser de viewer.ts
- [ ] T007 Desinstalar 5 deps não usadas; build/testes verdes

## Fase 3 — Segurança resíduo
- [ ] T008 Seed: sem senha default (exige ADMIN_PASSWORD)
- [ ] T009 Simulador WhatsApp atrás de flag de dev
- [ ] T010 Rate-limit do webhook: modelo WebhookHit + migração + checagem na rota + teste

## Fase 4 — Tipagem
- [ ] T011 ActionResult<T> em src/lib/types/action.ts + aplicar nas actions que lançam cru
- [ ] T012 Reduzir any nos hotspots (agent, ai/provider, actions/ai, dialogs) com zod na borda

## Fase 5 — Formatação + validação
- [ ] T013 prettier --write . (commit isolado)
- [ ] T014 npm run check + suíte + next build verdes
- [ ] T015 revisao-forte + correções; marcar M7/M8 no PLANO
