# Feature Specification: Testes e Observabilidade
**Branch**: `011-testes-observabilidade` | **Status**: Draft | **Input**: M11+M12.

## Clarifications — Session 2026-08-15
- Sentry: NÃO agora — logger estruturado próprio + /api/health + captura global,
  pronto para plugar vendor depois (1 env). Não bloqueia lançamento.
- Playwright: NÃO — Vitest ampliado; E2E de navegador = roteiro manual (012).

## FRs
- FR-001: Regras financeiras com testes: aplicação de regras de categorização
  (rules.ts) e recálculo de fatura (invoices.ts) cobertos por Vitest.
- FR-002: Logger estruturado JSON (nível, evento, contexto) substituindo os
  console.* esparsos nos caminhos críticos (webhook, IA, auth).
- FR-003: /api/health respondendo status do app + banco (para uptime monitor).
- FR-004: Erros de renderização capturados por global-error com tela amigável
  (sem stack para o usuário) e log estruturado.
- FR-005: Coletor /api/csp-report (a CSP report-only do next.config aponta p/
  observabilidade) registrando violações via logger.
- FR-006: Suíte inteira verde; nenhum comportamento de negócio alterado.

## SCs
- SC-001: `npm run test` cobre rules + invoice recalc além do que já existe.
- SC-002: /api/health retorna ok com banco saudável e 503 com banco fora.
- SC-003: check + suíte + build verdes.
