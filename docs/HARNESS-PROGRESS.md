# Harness de Finalização — Ledger de Progresso

> Fonte de verdade do loop autônomo que finaliza os módulos restantes do
> `docs/PLANO-DE-ACAO.md` via fluxo Speckit. Resumível entre janelas de contexto.

## Política

- Fluxo Speckit por feature: specify → clarify (única pausa p/ o usuário) → plan →
  tasks → analyze → implement → revisao-forte → correções → validar → merge.
- Gates de merge: `tsc` 0 erros · suíte verde · `next build` verde · revisão sem
  achados confirmados abertos.
- Sem pausa entre features. Só paro em `clarify` e decisão crucial-irreversível.

## Fila e status

| # | Feature | Módulos | Fase atual | Status |
|---|---------|---------|-----------|--------|
| 008 | qualidade-e-limpeza | M7, M8, resíduos M2/M3 | specify | 🔵 em curso |
| 009 | performance-paginacao | M9 | — | ⏳ fila |
| 010 | ux-final | M10 (resíduo) | — | ⏳ fila |
| 011 | testes-observabilidade | M11, M12 | — | ⏳ fila |
| 012 | conferencia-go-live | M13, M14, M15 | — | ⏳ fila |

## Entregáveis finais

- [ ] Artifact no Claude (o que foi feito + lista de testes de produção)
- [x] Skill `revisao-forte` criada (`.claude/skills/revisao-forte/`)

## Log

- 008 iniciada. Base: `main` @ 298a106 (0 erros tsc, 120 testes, build verde).
- 008: clarify respondido (ActionResult padrão+explodem; prettier repo inteiro;
  simulador flag dev; rate-limit Postgres). T001-T010 feitos. Lote 2 de
  ActionResult concluído (23 actions); aguardando lote 1.
- ⚠️ Achado: `$transaction([...])` batch com client estendido + fire-and-forget
  concorrente produziu creates duplicados no rate-limit (36 hits/32 esperados);
  rate-limit reescrito como 1 statement SQL (CTE modificadora). Batch puro
  isolado NÃO duplica (testado). revisao-forte da 008 deve olhar os batches
  existentes (invoices.ts:88, cashboxes.ts:101/130, import.ts:275, agent.ts:189).
