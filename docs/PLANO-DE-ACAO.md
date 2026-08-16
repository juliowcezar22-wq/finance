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

- [x] Criptografar `AISetting.apiKey`, `WhatsAppSetting.token/clientToken/
      remindersSecret` no banco (AES-256-GCM, `SECRETS_KEY` sem fallback).
      **Feito** (feature 007): `crypto/secrets.ts`; decifra na leitura, cifra na
      escrita; script `db:encrypt-secrets` migra legados.
- [x] Headers de segurança em `next.config.mjs`: HSTS (prod), nosniff,
      X-Frame-Options DENY, Referrer-Policy, Permissions-Policy (enforce) + CSP
      em **report-only** (não quebra a UI redesenhada). **Feito** (feature 007).
- [x] Upload (`import-pdf.ts`): valida MIME/extensão e tamanho na action antes
      de processar (`upload/validate.ts`). **Feito** (feature 007). ⏳ zod amplo
      nas demais actions fica para a feature de engenharia.
- [x] `markdown.tsx`: confirmado seguro (sem `dangerouslySetInnerHTML`; React
      escapa; comentário de guarda adicionado). **Feito** (feature 007).
- [x] `prettyHttpError` deixou de incluir o corpo do provider — loga no servidor,
      devolve mensagem genérica. **Feito** (feature 007).

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

- [x] Timeout em todos os `fetch` de LLM (`ai/provider.ts` e o `visionComplete`
      de `whatsapp/agent.ts`) via `resilientFetch` (AbortController ~30s).
      **Feito** (feature 007).
- [x] Retry com backoff (rede/5xx/429; nunca 4xx de auth). **Feito** (007).
- [x] Orçamento de custo: teto diário de tokens por usuário (tabela `AiUsage`);
      bloqueia ANTES de contatar o provider (0 custo). **Feito** (007).
- [x] Cenários testados: chave inválida (401), timeout, retry (503→200), teto
      excedido sem chamar provider, erro não vaza corpo. **Feito** (007).
- [ ] Limite de input (truncar contexto por tamanho) — ⏳ pendente.
- [ ] `visionComplete` suportar Anthropic vision — ⏳ pendente.
- [ ] Logs estruturados de cada chamada — ⏳ feature de observabilidade (M12).

## MÓDULO 7 — 🟡 Limpeza de arquitetura

- [x] Rotas-stub removidas (`faturas`, `receber`, `fluxo-de-caixa`) com
      `redirects()` no `next.config.mjs`; `pay-dialog.tsx` movido para
      `importar/` (quem o usa). **Feito (feature 008).**
- [x] `unlinked-banner.tsx` e `isUnlinkedUser()` removidos. **Feito (008).**
- [x] Deps não usadas desinstaladas: `react-hook-form`, `@hookform/resolvers`,
      `date-fns`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`.
      Mantidos: `react-toast` (Módulo 10) e `react-popover` (importado 2×).
      **Feito (008).**
- [x] Alias `@/` já era padrão (tsconfig) — conferido. **Feito.**
- [x] Varredura na 008 (lint `prefer-const`/`no-var` + prettier em massa). **Feito.**

## MÓDULO 8 — 🟡 Qualidade: lint, formatação, tipos

- [x] ESLint configurado (`next/core-web-vitals` + regras extras) e zerado.
      **Feito (008).**
- [x] Prettier + tailwind plugin; repo formatado em commit isolado. **Feito (008).**
- [x] `any` zerado nos hotspots de lib (agent 7→0, ai/provider 5→0,
      actions/ai 5→0) com bordas de LLM/JSON tipadas; hotspots de UI ficam
      para quando os dialogs forem tocados (010). **Feito (008, parcial UI).**
- [x] `@ts-ignore` já zerados (001). **Feito.**
- [x] `ActionResult<T>` criado (types/action.ts) e aplicado em 14 arquivos de
      actions (45 actions: safeParse + ok/err; throws de negócio viraram err).
      **Feito (008).**
- [ ] Revisar promises sem `await` (`no-floating-promises` exige parser TS
      dedicado — adiado; os `void action()` atuais são intencionais).
- [x] `npm run check` = lint + tsc + prettier check. **Feito (008).**

## MÓDULO 9 — 🟡 Performance e paginação

- [x] Paginação "Carregar mais" (lotes de 50, searchParam `limit`, filtros
      preservados) + contagem total nas 4 listas grandes; listas fixas
      rotuladas ("últimas N"). **Feito (feature 009).**
- [x] Selects enxutos em `pessoas/[id]` (relações só com name/bank; include
      de transaction removido de receivables); resumo por pessoa do cartão em
      query própria (select mínimo). **Feito (009).**
- [x] Índice composto `(ownerId, date)` em Transaction (toda query passa por
      ownerId via extensão + mês). **Feito (009)** — EXPLAIN em prod fica p/ 012.
- [x] Lazy via `next/dynamic`: InvoiceImportDialog (3 consumers) e ImportForm.
      **Feito (009).**
- [ ] Memoização apenas onde medir re-render real — **aceito/adiado**: sem
      medição de profiler nesta fase; nada de memo às cegas (decisão da 009).

## MÓDULO 10 — 🟡 UX

- [x] Toasts: sucesso em salvar/excluir (14 dialogs + row-actions); erro via
      toast fora de dialog; erro inline nos formulários (008). **Feito (010).**
- [x] 16 `window.confirm()` → ConfirmDialog do design system (nome do item,
      botão destrutivo, busy state). Zero confirm/alert no app. **Feito (010).**
- [x] `loading.tsx` nas 5 rotas (PageSkeleton). **Feito (010).**
- [ ] Empty states — **pós-lançamento** (decisão da 010): calibrar com uso real.
- [ ] Responsividade fina — **pós-lançamento** (decisão da 010).
- [ ] Fluxos "menos cliques" — **pós-lançamento** (decisão da 010).

## MÓDULO 11 — 🟡 Regras financeiras + testes automatizados

> **Estado (features 001-011):** suíte Vitest com 131 testes — segurança
> (intrusão/sessão/lockout/webhook), golden de calculations (23), split de
> parcela, hash/dedupe, admin-guard, regras de categorização e recálculo de
> fatura. Playwright DESCARTADO por decisão (clarify 011): E2E de navegador é
> o roteiro manual do go-live (012).

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

- [x] Vendor de erros: **decisão (clarify 011) — sem Sentry por ora**; logger
      estruturado + global-error + digest prontos para plugar `@sentry/nextjs`
      depois (1 pacote + 1 env). Não bloqueia o lançamento.
- [x] Logger estruturado JSON (`src/lib/log.ts`) aplicado: webhook
      rejeitado/rate-limited, erros de provedores de IA/visão, revogação de
      logout falha, import de PDF, CSP. **Feito (011).**
- [ ] Alertas externos (uptime/5xx) — **pós-lançamento**: plugar UptimeRobot
      no /api/health e alertas da Vercel (exige contas suas).
- [x] `/api/health` (SELECT 1, 503 se banco fora, público no middleware).
      **Feito (011)** + coletor `/api/csp-report` + `global-error.tsx`.
- [ ] Analytics de produto — **pós-lançamento** (decisão de produto/conta).

## MÓDULO 13 — ⚪ Dashboard: conferência dos números

> **Estado (012):** os números do dashboard são travados por 23 testes golden
> (`tests/characterization`) desde a 002; a conferência com dados reais está no
> Bloco B de `docs/TESTES-PRODUCAO.md` (roteiro do dono).

Depois dos testes do Módulo 11 (que já validam o cálculo), conferir na UI:

- [ ] Saldo geral = soma de caixas + receitas − despesas do período.
- [ ] Cards de receita/despesa batem com as listas filtradas pelo mesmo mês.
- [ ] Gráficos (`bar-chart.tsx`) e percentuais somam 100% / batem com tabelas.
- [ ] Comparativos mês-a-mês consistentes na virada de mês (fuso America/
      Sao_Paulo — atenção a `new Date()` vs data local).
- [ ] Cenário vazio (usuário novo, sem dados) não quebra nenhum card.

## MÓDULO 14 — ⚪ Teste manual E2E (roteiro do primeiro usuário)

> **Estado (012):** roteiro manual completo em `docs/TESTES-PRODUCAO.md`
> (blocos A-F: acesso, cálculo, cartões, listas, WhatsApp, interface).

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

> **Estado (012):** checklist executável em `docs/GO-LIVE.md` (pré-deploy,
> deploy, pós-deploy, smoke, rollback). Itens de painel são do dono.

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
