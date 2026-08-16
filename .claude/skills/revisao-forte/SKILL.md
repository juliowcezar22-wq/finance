---
name: revisao-forte
description: Revisão adversarial FORTE de um diff, branch ou codebase — múltiplas lentes independentes procuram erros, regressões, requisitos ignorados e brechas; cada achado é verificado adversarialmente antes de reportar. Use antes de mergear qualquer feature e para auditar trabalho já feito.
---

# Revisão Forte (adversarial, multi-lente)

Objetivo: encontrar o que a implementação **errou ou ignorou** — não confirmar que
está certo. Rode antes de todo merge e em auditorias amplas. O padrão é
**encontrar → verificar adversarialmente → só então reportar**. Nada de "parece ok".

## Entrada

- **Alvo**: um diff (`git diff main...HEAD`), uma branch, ou um conjunto de arquivos.
- **Contexto**: a spec/plan/tasks da feature (o que ELA prometeu), para detectar
  requisitos declarados mas não implementados ("ignorações").

## Processo (obrigatório)

1. **Levante o alvo**: `git diff --stat` + a lista de arquivos tocados + a spec
   correspondente. Nunca revise de memória — LEIA o código real.
2. **Fan-out por lentes** (rode como Workflow/subagentes independentes, um por
   lente; cada um sem ver os outros). Mínimo de lentes abaixo — adicione conforme
   o domínio.
3. **Verificação adversarial**: para CADA achado, um verificador independente tenta
   REFUTAR lendo o código real. Só sobরevive o que tiver caminho concreto de falha
   (arquivo:linha + cenário). Na dúvida → `uncertain` (não conta como confirmado,
   mas é reportado).
4. **Reporte** ranqueado por severidade (critical → low), com: arquivo:linha,
   cenário de falha concreto, e fix sugerido. Liste também `uncertain` e o que foi
   `refuted` (para dar confiança do que foi checado).
5. **Dry-count honesto**: se alguma lente não achou nada, diga "limpo" — não invente.

## Lentes obrigatórias (as que já pegaram bugs reais neste projeto)

- **Correção/lógica**: off-by-one, condições invertidas, guardas ausentes, ordem de
  operações, casos de borda (0, nulo, negativo, vazio, N grande).
- **Segurança**: autorização por action (`getViewer`/`requireAdmin` no topo?),
  **fail-closed** (falha de dependência NEGA, não libera?), enumeração (mensagens/
  timing distintos revelam existência?), timing-safe em segredos, IDOR/escopo de dono.
- **Preservação de valor (dinheiro)**: nenhuma mudança de valor não-intencional;
  `Decimal` vs `number`; arredondamento; somas que devem fechar exato.
- **⚠️ Serialização RSC (Server→Client)**: `Prisma.Decimal`, `Date`, `BigInt` e
  instâncias de classe **viram string/objeto plano** ao cruzar de Server Component
  para Client Component (props/`JSON.stringify`). Procure: aritmética (`+`, reduce)
  ou `.toNumber()`/`.getTime()` sobre prop que na verdade chegou como string no
  cliente. O typecheck NÃO pega isso.
- **Concorrência/corridas**: TOCTOU (check-then-act não atômico), advisory lock que
  não executa (CTE `SELECT` não referenciado é PODADO pelo Postgres), READ COMMITTED
  não serializa updates de linhas diferentes (precisa SERIALIZABLE/lock).
- **Regressão**: a mudança quebrou comportamento existente? (call sites, tipos de
  retorno, contratos, chaves de hash/dedupe, migrations que mudam dado).
- **Requisitos ignorados (scope-drop)**: compare a spec/tasks com o código —
  algum FR/AC declarado que NÃO foi implementado, ou implementado pela metade,
  ou silenciosamente reduzido? Guardas aplicadas em 2 de 3 caminhos?
- **Cobertura de teste**: caminho crítico sem teste; teste que passa por acaso
  (ex.: por `connection_limit=1`) e não exercita o que afirma; asserções fracas.
- **Segurança de migração**: reprodutível no deploy de prod? ordem (FK, NOT NULL
  precisa de zero nulos antes)? perda de dado? `prisma migrate diff` vazio depois?
- **Fronteira de entrada**: zod na borda de todo input externo (form/webhook/LLM)?
  `.parse` que explode no cliente vs retorno tratado?

## Padrão de Workflow sugerido (adversarial)

```
FINDERS (1 por lente, em paralelo) → cada finding → VERIFIER adversarial (refutar) →
manter só verdict=confirmed → sintetizar ranqueado. Para achados sensíveis, 3
verificadores com lentes distintas e maioria.
```

## Saída

- Tabela ranqueada de **confirmados** (severidade, arquivo:linha, cenário, fix).
- Lista de **uncertain** (checar manualmente).
- Nota de **cobertura**: quais lentes rodaram e o que veio limpo.
- Se rodada antes de merge: **bloqueia o merge** enquanto houver confirmado ≥ medium
  em aberto.

## Regras

- LEIA o código real; nunca reporte de memória.
- Prefira falso-positivo investigado a falso-negativo silencioso, MAS só reporte como
  confirmado o que tiver caminho concreto.
- Severidade honesta: não infle nem minimize.
- Se o alvo é uma migração/dado, considere prod (reprodutibilidade, irreversibilidade).
