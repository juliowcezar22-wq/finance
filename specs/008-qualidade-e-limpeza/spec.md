# Feature Specification: Qualidade e Limpeza de Arquitetura

**Feature Branch**: `008-qualidade-e-limpeza`

**Created**: 2026-08-15

**Status**: Draft

**Input**: Módulos 7 e 8 do PLANO-DE-ACAO + resíduos: rotas mortas, código/deps
não usados, ESLint/Prettier/`npm run check`, reduzir `any`, `ActionResult<T>`,
senha default do seed, remoção do simulador WhatsApp de produção, rate-limit no
webhook.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Base de engenharia confiável (Priority: P1)

Como quem mantém o Nummiq, tenho um portão de qualidade automatizado
(`npm run check`) que roda lint + typecheck + formatação e que eu posso executar
antes de cada commit, pegando erros e inconsistências antes de irem para produção.

**Why this priority**: Sem lint/format padronizados, cada mudança acumula dívida
e o risco de regressão cresce. É a fundação para as features seguintes.

**Independent Test**: Rodar `npm run check` num checkout limpo retorna sucesso
(0 erros de lint, 0 de tipo, formatação consistente).

**Acceptance Scenarios**:

1. **Given** o repositório, **When** `npm run check` roda, **Then** conclui sem
   erros (lint + typecheck + prettier check).
2. **Given** um erro de lint introduzido, **When** `npm run check` roda, **Then**
   falha apontando o arquivo/linha.

---

### User Story 2 - Código sem peso morto (Priority: P2)

Como mantenedor, o projeto não carrega rotas que só redirecionam, componentes
nunca usados, nem dependências que ninguém importa — o que reduz confusão,
tamanho de bundle e superfície de bug.

**Why this priority**: Peso morto engana quem lê o código e infla o build.

**Independent Test**: As rotas-stub não existem mais (ou viram redirect
declarado); `depcheck`/grep não encontra as deps removidas; o app compila e
navega sem essas rotas.

**Acceptance Scenarios**:

1. **Given** as rotas `faturas`, `receber`, `fluxo-de-caixa` (só redirect),
   **When** o app é navegado, **Then** as URLs antigas continuam levando ao
   destino certo (redirect preservado) sem páginas-stub no código.
2. **Given** as dependências não importadas, **When** removidas, **Then** o
   build e os testes seguem verdes.
3. **Given** componentes/funções nunca referenciados (`unlinked-banner`,
   `isUnlinkedUser`), **When** removidos, **Then** nada quebra.

---

### User Story 3 - Tipagem forte e retornos padronizados (Priority: P2)

Como mantenedor, as entradas externas (formulários, webhook, respostas de LLM)
são validadas na borda e o código tem muito menos `any`, e as server actions
retornam um formato de resultado padronizado, de modo que erros são tratados de
forma consistente em vez de explodirem crus na interface.

**Why this priority**: `any` esconde bugs; retornos não padronizados levam a
erros não tratados no cliente (já visto na auditoria).

**Independent Test**: Contagem de `any` cai substancialmente (foco nos
hotspots); as actions tocadas retornam `ActionResult<T>`; entradas externas
passam por validação de esquema.

**Acceptance Scenarios**:

1. **Given** os hotspots de `any` (agent, provider, ações de IA, dialogs de
   transação/importação), **When** tipados, **Then** o número de `any` cai e o
   typecheck segue verde.
2. **Given** uma action que hoje pode lançar erro cru, **When** adota
   `ActionResult<T>`, **Then** falhas viram resultado tratado (sem exceção não
   capturada no cliente).

---

### User Story 4 - Resíduos de segurança fechados (Priority: P1)

Como responsável, não existe senha padrão embutida no seed, o simulador de
WhatsApp não fica exposto em produção, e o webhook do WhatsApp tem um limite de
taxa que impede abuso mesmo por um remetente autenticado.

**Why this priority**: São itens P0/P1 remanescentes da auditoria; segurança
não se adia.

**Independent Test**: Seed sem `ADMIN_PASSWORD` não cria admin com senha
conhecida; o simulador não é acessível em produção; rajada de requisições ao
webhook é limitada.

**Acceptance Scenarios**:

1. **Given** o seed sem `ADMIN_PASSWORD` definido, **When** executado, **Then**
   ele NÃO usa uma senha padrão embutida (falha explícita ou exige a env).
2. **Given** o ambiente de produção, **When** o simulador de WhatsApp é
   acessado, **Then** ele não está disponível (removido ou atrás de flag de dev).
3. **Given** muitas requisições ao webhook em curta janela, **When** excedem o
   limite, **Then** as excedentes são recusadas (rate-limit).

---

### Edge Cases

- Remoção de rota com URL antiga em uso: preservar via redirect declarado para
  não quebrar links/bookmarks.
- Formatação em massa (Prettier) num commit isolado, para não poluir os diffs
  de lógica.
- Reduzir `any` sem alterar comportamento: a tipagem não pode mudar valores nem
  fluxo (a suíte deve seguir idêntica).
- Remover dep ainda referenciada indiretamente: verificar imports antes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Deve existir um comando único de verificação (`npm run check`) que
  roda lint + typecheck + checagem de formatação e falha em qualquer erro.
- **FR-002**: Lint (ESLint) e formatação (Prettier) devem estar configurados; o
  repositório deve estar formatado de forma consistente.
- **FR-003**: Rotas que apenas redirecionam devem deixar de existir como páginas,
  preservando as URLs antigas via redirect declarado.
- **FR-004**: Componentes e funções nunca referenciados devem ser removidos.
- **FR-005**: Dependências não importadas por nenhum código devem ser removidas
  do projeto, sem quebrar build/testes.
- **FR-006**: A quantidade de `any` deve ser reduzida, priorizando os hotspots;
  entradas externas (webhook/LLM/forms) validadas por esquema na borda.
- **FR-007**: As server actions tocadas devem retornar um resultado padronizado
  (`ActionResult<T>`), com erros tratados em vez de exceções cruas.
- **FR-008**: O seed não deve embutir senha padrão; sem a variável de ambiente
  de senha do admin, não cria credencial previsível.
- **FR-009**: O simulador de WhatsApp não deve estar acessível em produção.
- **FR-010**: O webhook do WhatsApp deve aplicar um limite de taxa que recuse
  requisições em excesso.
- **FR-011**: Nenhuma das mudanças pode alterar comportamento/valor observável;
  a suíte de testes existente permanece verde.

### Key Entities

- **Portão de qualidade**: o pipeline `check` (lint + tipos + formato).
- **Rota morta**: página que só redireciona; vira redirect declarado.
- **Resultado de action**: formato padronizado de retorno com sucesso/erro.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `npm run check` conclui com sucesso num checkout limpo.
- **SC-002**: 0 rotas-stub restantes; URLs antigas ainda resolvem (redirect).
- **SC-003**: As 5 dependências não usadas removidas; build e testes verdes.
- **SC-004**: `any` reduzido em ≥ 40% nos arquivos hotspot listados.
- **SC-005**: Seed sem senha padrão embutida (verificável por inspeção/teste).
- **SC-006**: Simulador inacessível em produção.
- **SC-007**: Webhook recusa requisições acima do limite de taxa.
- **SC-008**: Suíte de testes 100% verde e `next build` verde após todas as
  mudanças (nenhuma regressão).

## Assumptions

- **Decisões abertas (para o clarify):** severidade do ESLint (bloquear em
  warnings ou só errors); formatar o repo inteiro agora (diff grande) vs
  incremental; adotar `ActionResult<T>` em TODAS as actions agora vs só nas
  tocadas + padrão para novas; simulador — remover de vez vs flag de dev;
  rate-limit do webhook — em memória vs tabela no banco (como o lockout de login).
- Prettier com `prettier-plugin-tailwindcss` para ordenar classes Tailwind.
- Redução de `any` é incremental e sem mudar comportamento; a suíte trava isso.
- Fora de escopo: paginação (009), toasts/loading (010), Sentry/health (011).

## Clarifications

### Session 2026-08-15
- Q: Escopo do `ActionResult<T>`? → A: Criar o padrão e aplicar nas actions que
  hoje lançam erro cru no cliente + padrão para novas (não refatorar todas agora).
- Q: Prettier? → A: Formatar o repo inteiro num commit isolado ("chore: format").
- Q: Simulador do WhatsApp? → A: Manter atrás de flag de dev (some em produção).
- Q: Rate-limit do webhook? → A: Tabela no Postgres (mesmo padrão do lockout).
