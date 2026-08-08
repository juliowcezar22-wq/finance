# Plano de Ação — Auditoria pré-produção Bugia Finance

Gerado a partir da auditoria completa do código em 2026-08-07 (commit `99d1bcc`).
Cada módulo é uma task; os itens internos são as subtasks, na ordem de execução.
Marque `[x]` conforme concluir. Trabalhe **um módulo por vez**, sempre em dev/test
(`npm run db:migrate`, `npm run db:test:reset`) — nunca em prod.

**Prioridades:** 🔴 P0 = bloqueia produção · 🟠 P1 = antes do primeiro usuário
real · 🟡 P2 = primeiras semanas · ⚪ P3 = melhoria contínua.

## Estado atual das features (auditoria 2026-08-07)

| Feature / rota | Estado | Observação |
|---|---|---|
| Login / sessão | ⚠️ Funciona, com riscos | Fallback de `SESSION_SECRET` hardcoded; logout não revoga token (30 dias) |
| Dashboard, Despesas, Receitas, Transações, Caixa, Cartões, Pessoas, Metas, Regras, Configurações | ⚠️ Funcionam | IDOR nas server actions (11 arquivos sem guard); sem paginação (trunca em 200–500) |
| Importar (PDF/extrato) | ⚠️ Funciona | Sem validação de MIME/tamanho na action; parsers por banco + fallback IA |
| Assistente (IA) | ⚠️ Funciona | Sem timeout, sem retry, chave em texto plano no banco, custo sem teto |
| WhatsApp | 🔴 Inseguro | Webhook aberto (sem assinatura); qualquer um pode criar lançamentos e gastar tokens |
| `/faturas`, `/receber`, `/fluxo-de-caixa` | 🪦 Mortas | Só redirecionam; remover |
| Testes automatizados | ❌ Não existem | Zero runner, zero specs |
| ESLint / Prettier | ❌ Não configurados | `next lint` cairia em prompt interativo |
| Toasts / feedback de erro | ❌ Não existem | `@radix-ui/react-toast` instalado e nunca usado; 15 `window.confirm()` |
| Observabilidade | ❌ Não existe | Sem Sentry, sem logs estruturados |

---

## MÓDULO 1 — 🔴 Autorização: fechar IDOR nas Server Actions

O maior risco do sistema: um usuário logado pode alterar/apagar dados de outro.

- [x] Estender a extensão do Prisma (`src/lib/prisma.ts`) para escopar também
      `update`, `delete` e `upsert` por `ownerId`. **Feito** (feature 001): usa
      `extendedWhereUnique` — injeta `ownerId` no `where` de
      findUnique/update/delete/upsert, virando um único `... WHERE id=? AND
      ownerId=?` (atômico, sem TOCTOU). Registro órfão (`ownerId NULL`) não casa
      → bloqueado. Sem match na escrita → P2025 traduzido para erro genérico.
- [x] Adicionar `getViewer()` no topo de TODAS as actions dos 11 arquivos sem
      guard. **Feito** no commit `fbcd86c` + `payInvoice`/`setInvoiceStatus`
      (`invoices.ts`) na feature 001.
- [x] Corrigir as chamadas diretas por id sem escopo (`incomes`, `cards`,
      `people`, `cashboxes`, `invoices`). **Feito**: agora todas passam pelo
      escopo atômico da extensão; `payInvoice` também virou transação
      (read-modify-write do valor pago) com validação zod.
- [x] Decidir o modelo de `Category`. **Decisão (feature 001): catálogo GLOBAL**,
      `name @unique` global, sem `ownerId`; escrita restrita a ADMIN via
      `requireAdmin()` nas actions de `src/lib/actions/categories.ts` (commit
      `fbcd86c`). Motivo: categorias são um vocabulário compartilhado de
      classificação, não dado financeiro privado; por usuário traria duplicação
      e atrito sem ganho. Leitura permanece disponível a todos.
- [x] Teste de intrusão automatizado: `tests/security/owner-scope.test.ts` cobre
      2 usuários em leitura/lista/update/delete cruzados + faturas + órfãos
      (feature 001). ⏳ Falta o teste manual com 2 usuários reais no go-live
      (roteiro no `specs/001-seguranca-acesso/quickstart.md`).

## MÓDULO 2 — 🔴 Sessão e segredos de autenticação

- [x] Remover o fallback hardcoded de `SESSION_SECRET`. **Feito** (feature 001):
      sem fallback em nenhum ambiente — `session.ts` falha no boot se ausente
      ou < 32 chars; `middleware.ts` trata como fail-closed (redirect a /login).
- [x] Revogação de sessão: campo `sessionVersion` no `User`, embutido no token
      e validado em `getUserFromToken()`; logout incrementa (derruba todas as
      sessões). **Feito** (feature 001). TTL mantido em 30 dias por decisão do
      dono (aceitável agora que há revogação — ver clarify da 001).
- [x] Desativar usuário derruba a sessão: `getUserFromToken()` rejeita usuário
      `active=false`. **Feito** (feature 001).
- [ ] Trocar a senha default do seed (`prisma/seed.ts:6-10`, `admin123`):
      exigir `ADMIN_PASSWORD` via env, sem default. ⏳ **Pendente** (não coberto
      pela feature 001; candidato à feature 003).
- [x] Rate limit no login: 5 falhas / 15 min por e-mail (tabela `LoginAttempt`
      no Postgres, fail-closed). **Feito** (feature 001); IP só auditoria.

## MÓDULO 3 — 🔴 WhatsApp: autenticar o webhook

- [x] Segredo de webhook: header `client-token` conferido timing-safe contra
      `WhatsAppSetting.clientToken` em `webhook/route.ts`; sem token configurado
      → 501, token errado/ausente → 401 (antes de gravar ou chamar IA).
      **Feito** (feature 001).
- [x] Reminders via `Authorization: Bearer <CRON_SECRET>` timing-safe; segredo
      em query string ignorado; POST removido (Vercel Cron usa GET). **Feito**
      (feature 001) — `vercel.json` ganhou o cron diário.
- [x] `isAllowedSender`: igualdade exata do número canônico BR (remove DDI 55,
      insere 9º dígito), sem `endsWith`. **Feito** (feature 001).
- [x] Deduplicação por `providerMessageId` (`@unique` em `WhatsAppMessage`):
      reentrega → P2002 → ignorada. **Feito** (feature 001).
- [ ] Rate limit no webhook (ex.: 30 req/min). ⏳ **Pendente** — defesa em
      profundidade; o webhook já exige o Client-Token, então abuso anônimo está
      fechado. Candidato à feature 003.
- [ ] Remover `src/app/whatsapp/simulator.tsx` de produção (ou atrás de flag de
      dev). ⏳ **Pendente** (feature 004 — limpeza de arquitetura).

## MÓDULO 4 — 🟠 Segredos de IA/WhatsApp e hardening web

- [ ] Criptografar `AISetting.apiKey`, `WhatsAppSetting.token/clientToken/
      remindersSecret` no banco (AES-256-GCM com chave em env `SECRETS_KEY`),
      ou migrar as chaves para env e deixar no banco só configuração não-sensível.
- [ ] Headers de segurança em `next.config.mjs` (`headers()`): HSTS,
      `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
      `Referrer-Policy: strict-origin-when-cross-origin`, CSP básica.
- [ ] Completar validação zod nas actions sem ela: `ai.ts`, `whatsapp.ts`,
      `import.ts`, `import-pdf.ts`, `invoices.ts`.
- [ ] Upload (`src/lib/actions/import-pdf.ts:114+`): validar MIME e tamanho
      máximo na action (não confiar só no `bodySizeLimit` global).
- [ ] Revisar `src/app/assistente/markdown.tsx` contra XSS (conteúdo vem do
      LLM): garantir que nunca injeta HTML cru.
- [ ] Não repassar corpo de erro do provider de IA ao usuário
      (`prettyHttpError` inclui até 300 chars do body) — logar no servidor,
      mostrar mensagem genérica.

## MÓDULO 5 — 🟠 Banco de dados

- [x] **Dinheiro:** 18 campos monetários migrados de `Float` para
      `Decimal(12,2)` (feature 002). `AISetting.temperature` fica Float.
      `calculations.ts` e ~21 arquivos convertem Decimal→number na borda com
      `toNum`; golden de caracterização prova que nenhum valor mudou (ao centavo).
      **Bônus (FR-013):** split de parcela agora fecha exato (resíduo na última).
- [x] **`ownerId` NOT NULL:** os 17 modelos owned agora exigem dono. Órfãos
      (zero no dev) são apagados na própria migração (antes do NOT NULL);
      `@default("__no_owner__")` mantém o input de create opcional (a extensão
      injeta o dono real) e o FK rejeita o sentinela (fail-closed).
- [x] **`onDelete`:** as 17 relações `Owner*` passaram a `Restrict`; `deleteUser`
      agora **desativa** (preserva dados, guarda de "último admin ativo"). As
      demais FKs (Cascade em AccountCard/Installment/Invoice/... e Restrict em
      Receivable) foram mantidas como estavam.
- [x] Migração aplica limpa: `prisma migrate diff` vazio pós-migração (SC-006).
      ⏳ `db:test:reset` num banco vazio fica para o go-live (dev/test é o mesmo
      banco com dados; não resetar).
- [x] Unificar campos legados: `Income.date/source` removidos (eram write-only).
      Os dois mecanismos de parcela (Installment vs metadados de Transaction)
      **mantidos** — servem propósitos distintos, não são redundância.
- [x] Rodar `prisma/security/rls-hardening.sql` nos bancos dev/test/prod novos
      (fecha REST público do Supabase; documentado que RLS não isola tenants —
      o isolamento é a extensão do Prisma).

## MÓDULO 6 — 🟠 IA: resiliência e custo

- [ ] Timeout em todos os `fetch` de LLM (`src/lib/ai/provider.ts`,
      `src/lib/whatsapp/agent.ts:263-298`): `AbortSignal.timeout(30_000)`.
- [ ] Retry com backoff (1 retentativa em 429/5xx/rede; jamais em 4xx de auth).
- [ ] Limite de input: truncar contexto/histórico por tamanho estimado antes de
      enviar (hoje só existe `max_tokens` de saída).
- [ ] Orçamento de custo: teto diário de tokens por usuário (somar
      `AIMessage.promptTokens/completionTokens` do dia; bloquear com mensagem
      amigável ao exceder).
- [ ] `visionComplete` só fala formato OpenAI — ou suportar Anthropic vision,
      ou validar/avisar na configuração quando provider=anthropic.
- [ ] Logs estruturados de cada chamada (provider, modelo, latência, tokens,
      erro) — base para o Módulo 12.
- [ ] Testar cenários: chave inválida, 429, timeout, resposta não-JSON do
      agente WhatsApp (`parseJson`), provider fora do ar.

## MÓDULO 7 — 🟡 Limpeza de arquitetura

- [ ] Remover rotas-stub e órfãos: `src/app/faturas/` (incl. `pay-dialog.tsx`),
      `src/app/receber/`, `src/app/fluxo-de-caixa/` (redirects via
      `next.config.mjs` `redirects()` se quiser preservar URLs antigas).
- [ ] Remover `src/components/unlinked-banner.tsx` e `isUnlinkedUser()` de
      `src/lib/auth/viewer.ts` (nunca usados).
- [ ] Desinstalar deps não usadas: `react-hook-form`, `@hookform/resolvers`,
      `date-fns`, `@radix-ui/react-toast`*, `@radix-ui/react-popover`,
      `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`
      (*manter react-toast se o Módulo 10 implementar toasts com ele).
- [ ] Criar alias de import `@/` no `tsconfig.json` (se ainda não usado em
      100% dos imports) e padronizar.
- [ ] Varredura de comentários obsoletos e código comentado.

## MÓDULO 8 — 🟡 Qualidade: lint, formatação, tipos

- [ ] Instalar e configurar ESLint (`eslint`, `eslint-config-next`) +
      `.eslintrc.json`; rodar `next lint` e zerar errors/warnings.
- [ ] Adicionar Prettier + `prettier-plugin-tailwindcss`; formatar o repo
      inteiro num commit isolado ("chore: format").
- [ ] Reduzir os 128 `: any` começando pelos hotspots:
      `src/lib/whatsapp/agent.ts` (7), `src/lib/ai/provider.ts` (6),
      `src/lib/actions/ai.ts` (5), `transacoes/transaction-dialog.tsx` (5),
      `transacoes/row-actions.tsx` (5), `importar/import-form.tsx` (5).
      Tipar payloads de webhook/LLM com zod (parse na borda).
- [ ] Resolver os 2 `@ts-ignore` de `src/middleware.ts:29,36`.
- [ ] Tipar retorno das server actions (um tipo `ActionResult<T>` padrão).
- [ ] Revisar promises sem `await` (`no-floating-promises` via
      `@typescript-eslint`) e try/catch que engolem erro sem log.
- [ ] Script `npm run check` = lint + `tsc --noEmit` + prettier check; rodar
      antes de todo commit.

## MÓDULO 9 — 🟡 Performance e paginação

- [ ] Paginação real (cursor ou skip/take + UI) nas listas que hoje truncam
      silenciosamente: `transacoes` (200), `despesas` (300), `receitas` (200),
      `cartoes/[id]` (500), `importar`, `caixa`, `whatsapp`.
      Mostrar contagem total e aviso quando houver mais registros.
- [ ] Revisar N+1 e `include` largos nas páginas mais pesadas
      (`pessoas/[id]/page.tsx` 686 linhas, `cartoes/[id]/page.tsx` 564);
      usar `select` enxuto onde der.
- [ ] Conferir se os 9 índices de `Transaction` cobrem os filtros reais das
      páginas (`filters.tsx` usa mês/categoria/status) — adicionar índice
      composto se necessário (e checar com `EXPLAIN ANALYZE` no Supabase).
- [ ] Lazy-load dos dialogs pesados (`invoice-import-dialog.tsx` 671 linhas,
      `import-form.tsx` 654) com `next/dynamic`.
- [ ] Memoização apenas onde medir re-render real (React DevTools Profiler) —
      não espalhar `memo` às cegas.

## MÓDULO 10 — 🟡 UX

- [ ] Implementar toasts (`components/ui/toast.tsx` + `<Toaster>` no layout,
      com o `@radix-ui/react-toast` já instalado): sucesso/erro de toda action.
- [ ] Substituir os 15 `window.confirm()` por dialog de confirmação do design
      system (destrutivos em vermelho, nome do item no texto).
- [ ] Adicionar `loading.tsx` nas 5 rotas sem: `/assistente`, `/regras`,
      `/usuarios`, `/configuracoes`, `/whatsapp`.
- [ ] Revisar empty states das telas restantes e padronizar tom/CTA.
- [ ] Passada de responsividade em todas as telas (safe-areas iOS, tabelas com
      scroll horizontal, dialogs em viewport pequena).
- [ ] Revisar fluxos com "menos cliques": lançamento rápido de despesa/receita
      do dashboard; atalhos no assistente.

## MÓDULO 11 — 🟡 Regras financeiras + testes automatizados

Instalar **Vitest** (unit/integration, usando o banco `.env.test`) e cobrir o
coração do sistema — na ordem:

- [ ] `src/lib/services/calculations.ts`: saldo, totais por mês, percentuais.
- [ ] Parcelamento: criação, `installmentGroupKey`, edição e exclusão de
      parcela única vs grupo.
- [ ] Estorno/reembolso/cancelamento: efeito no saldo e no dashboard.
- [ ] Transferência entre caixas (`CashBoxMovement`): dupla entrada consistente.
- [ ] Exclusão em cadeia: apagar cartão/pessoa/caixa com lançamentos — conferir
      o comportamento definido no Módulo 5.
- [ ] Importação (`src/lib/services/import-engine.ts` + parsers): fixtures de
      PDF/CSV reais anonimizados por banco (nubank, itau, inter, c6, generic);
      dedupe por `Transaction.hash` (e resolver `hash: null` do agente WhatsApp).
- [ ] Regras de categorização (`src/lib/services/rules.ts`): aplicação e
      precedência.
- [ ] Smoke E2E com Playwright (login → lança despesa → vê no dashboard →
      apaga) rodando contra o banco de teste.

## MÓDULO 12 — 🟡 Observabilidade

- [ ] Sentry (`@sentry/nextjs`): erros de server actions, route handlers e
      client; source maps no build da Vercel.
- [ ] Logger estruturado (JSON) nos pontos críticos: login falho, webhook
      rejeitado, chamada de IA (latência/tokens), importação, erros de action.
- [ ] Alertas: erro 5xx no webhook, taxa de erro de IA, falha de build/deploy.
- [ ] Health check simples (`/api/health` com `SELECT 1`) para uptime monitor
      (UptimeRobot ou similar) — o GET do webhook não serve para isso.
- [ ] Analytics de produto (Vercel Analytics ou Plausible) — pageviews e
      funil de cadastro.

## MÓDULO 13 — ⚪ Dashboard: conferência dos números

Depois dos testes do Módulo 11 (que já validam o cálculo), conferir na UI:

- [ ] Saldo geral = soma de caixas + receitas − despesas do período.
- [ ] Cards de receita/despesa batem com as listas filtradas pelo mesmo mês.
- [ ] Gráficos (`bar-chart.tsx`) e percentuais somam 100% / batem com tabelas.
- [ ] Comparativos mês-a-mês consistentes na virada de mês (fuso America/
      Sao_Paulo — atenção a `new Date()` vs data local).
- [ ] Cenário vazio (usuário novo, sem dados) não quebra nenhum card.

## MÓDULO 14 — ⚪ Teste manual E2E (roteiro do primeiro usuário)

Executar no ambiente de teste, como se fosse um usuário real:

- [ ] Cadastro → aguardando aprovação → admin aprova em `/usuarios` → login.
- [ ] Troca de senha; logout; sessão expira/derrubada (validar Módulo 2).
- [ ] CRUD completo: despesa, receita, transação, caixa, cartão, pessoa, meta,
      regra, categoria — criar, editar, apagar cada um.
- [ ] Importar extrato PDF de cada banco suportado; conferir dedupe importando
      duas vezes; exportar (se existir; se não, decidir se entra no escopo).
- [ ] WhatsApp real (gateway configurado): texto, imagem de comprovante Pix,
      nota fiscal, comprovante cortado/ilegível, dois comprovantes numa foto,
      duplicado. Conferir valor/categoria/data/estabelecimento extraídos.
- [ ] Casos extremos de infra: derrubar a rede no meio de um envio; IA fora do
      ar; upload interrompido; PDF corrompido (arquivo truncado à mão).

## MÓDULO 15 — ⚪ Deploy e produção (Vercel — sem Docker/PM2)

O deploy é Vercel + Supabase; Docker/PM2/SSL manual não se aplicam
(HTTPS/CDN/compressão a Vercel já dá). O que resta:

- [ ] Projeto Vercel novo (não reutilizar o original) com envs de produção
      novos: banco Supabase de prod novo, `SESSION_SECRET` forte, `SECRETS_KEY`.
- [ ] Backup: ativar PITR/backup diário no Supabase de prod e **testar restore**
      no banco de teste (restaurar dump e subir o app contra ele).
- [ ] Domínio próprio + `metadataBase`/OG tags/robots básicos no layout (SEO).
- [ ] Cron da Vercel para `reminders` (`vercel.json` → `crons`) com o header
      secreto do Módulo 3.
- [ ] Checklist go-live: migrations aplicadas, seed de admin com senha forte,
      RLS-hardening rodado, Sentry ativo, uptime monitor ativo, teste de
      restore feito.
- [ ] Pós-go-live: monitorar Sentry/logs na primeira semana; janela de rollback
      (deploy anterior da Vercel + backup do banco).

---

## Ordem recomendada de execução

1. **Semana 1 — segurança que bloqueia produção:** Módulos 1, 2, 3 (P0).
2. **Semana 2 — hardening e dados:** Módulos 4, 5, 6.
3. **Semana 3 — base de engenharia:** Módulos 7, 8 e início do 11 (testes das
   regras financeiras — pré-requisito para mexer em cálculo com confiança).
4. **Semana 4 — produto:** Módulos 9, 10, 13.
5. **Semana 5 — validação e lançamento:** Módulos 11 (E2E), 12, 14, 15.

Regra permanente: nenhum item de segurança P0 pode ser "deixado para depois
do lançamento". Se o prazo apertar, corta-se feature, não segurança.
