# Feature Specification: Conferência e Go-Live
**Branch**: `012-conferencia-go-live` | **Status**: Draft | **Input**: M13+M14+M15.

## Clarifications
Sem ambiguidades críticas a clarificar: a feature é verificação + documentação
executável (nenhuma decisão de produto nova; as decisões de infra — Vercel +
Supabase Prod — já existem em docs/AMBIENTES.md). Registrado conforme o fluxo.

## FRs
- FR-001: Checklist de go-live executável (docs/GO-LIVE.md): pré-deploy (envs,
  backup/PITR), deploy, pós-deploy (rls-hardening, recompute, cron, gateway),
  smoke — cada item com comando/URL e critério de pronto.
- FR-002: Roteiro manual do primeiro usuário (M14) — passo a passo com
  resultados esperados, incluindo a conferência dos números do dashboard (M13)
  com um mini-cenário de valores conhecidos.
- FR-003: M13 automatizado onde possível: os cálculos do dashboard já são
  travados pelo golden (23 casos) — referenciar como evidência.
- FR-004: Entregável final: artifact no Claude com o consolidado do que foi
  feito + a lista de testes de produção.

## SCs
- SC-001: GO-LIVE.md cobre 100% dos itens do M15 com critério verificável.
- SC-002: Roteiro cobre login→lançamentos→dashboard→WhatsApp→logout.
- SC-003: check + suíte + build verdes; PLANO 100% resolvido (feito, adiado
  documentado, ou manual-do-dono listado).
