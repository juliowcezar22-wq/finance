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
- ⚠️ Achado: contagens erradas no rate-limit vinham de SUÍTES DE TESTE
  CONCORRENTES no banco compartilhado (dois agentes rodando vitest ao mesmo
  tempo). Rate-limit reescrito como 1 statement SQL (superior de qualquer
  forma). Regra do harness: NUNCA rodar duas suítes vitest em paralelo.
- revisao-forte da 008: 18 confirmados, 0 refutados. Corrigidos: falso-sucesso
  sistêmico nos dialogs (agente aplicou captura de err em ~14); lost update de
  saldo de caixa (increment atômico em cashboxes+agent); deactivateGuarded
  movida p/ módulo sem "use server" (não é mais endpoint); mensagens de erro
  internas não vazam (SAFE_ERRORS); seed não imprime senha; texto do simulador
  só em dev; prune com await; delete condicional de fatura no import;
  comentário do rate-limit corrigido; row-actions/quick-rename surfam erro.
  ACEITOS (documentados): parseIncoming sem zod (parser tolerante multi-gateway
  por design; validação é o client-token + isAllowedSender + dedupe); redução
  de any nos dialogs de UI fica com a 010 (serão tocados lá de novo).
