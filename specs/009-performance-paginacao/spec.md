# Feature Specification: Performance e Paginação

**Feature Branch**: `009-performance-paginacao` | **Created**: 2026-08-15 | **Status**: Draft
**Input**: Módulo 9 do PLANO-DE-ACAO.

## Clarifications
### Session 2026-08-15
- Q: Modelo de paginação? → A: Botão **"Carregar mais"** (lotes), preservando filtros.
- Q: Tamanho de página? → A: **50** por lote.

## User Stories
### US1 — Listas sem truncamento silencioso (P1)
Como usuário, vejo quantos registros existem no total e carrego mais 50 por vez;
nunca mais uma lista "some" registros sem avisar (hoje: despesas 300, transações
200, receitas 200, extrato do cartão 500).
**AC**: (1) contagem total visível; (2) botão "Carregar mais" aparece quando há
mais; (3) filtros (mês/categoria/status) preservados ao carregar mais; (4) sem
registros além do lote → botão some.

### US2 — Páginas pesadas mais leves (P2)
Como usuário, as páginas de pessoa e cartão carregam rápido mesmo com muitos
dados (selects enxutos, sem N+1) e os dialogs gigantes (importação) não pesam o
carregamento inicial (lazy).
**AC**: include/select revisados nas 2 páginas mais pesadas; dialogs de
importação carregados sob demanda; comportamento idêntico.

## Functional Requirements
- FR-001: As 4 listas grandes (despesas, transações, receitas, extrato do
  cartão) MUST paginar em lotes de 50 com "Carregar mais" e contagem total.
- FR-002: Carregar mais MUST preservar todos os filtros ativos.
- FR-003: A consulta MUST buscar apenas o necessário (select enxuto) nas
  páginas pesadas revisadas; nenhum N+1 novo.
- FR-004: Dialogs pesados de importação MUST ser lazy (não entram no bundle
  inicial da página).
- FR-005: Índice composto iniciando por dono MUST existir para a consulta mais
  quente (transações por dono+data), aplicado por migração guardada.
- FR-006: Nenhuma mudança de valor/comportamento além da paginação; suíte verde.

## Success Criteria
- SC-001: Nenhuma lista trunca silenciosamente (as 4 mostram total e carregam mais).
- SC-002: Filtros preservados ao paginar (verificável manualmente).
- SC-003: Suíte 100% verde; build verde.
- SC-004: Índice (ownerId, date) presente no banco após migração.

## Assumptions
- "Carregar mais" via searchParam `limit` incremental (Server Components; Link
  preserva filtros; back/forward funcionam). Sem estado client.
- Memoização de componentes: FORA do escopo (exige medição com profiler — M9
  manda não espalhar memo às cegas); fica documentado.
- Listas menores (importar 10/36, caixa 10, whatsapp 20, dashboard 6) mantêm
  seus takes atuais — são "últimos N" por design, não truncamento enganoso;
  ganham rótulo "últimos N" quando ausente.
