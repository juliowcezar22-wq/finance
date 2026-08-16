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
