# Feature Specification: Revisão de usabilidade e clareza dos fluxos

**Feature Branch**: `004-revisao-usabilidade`

**Created**: 2026-08-09

**Status**: Draft — em debate com o dono do produto

**Input**: "Revisão de usabilidade e clareza dos fluxos das features do sistema,
com olhar de usuário (não de desenvolvedor)."

## Contexto e achado estrutural

Auditoria de UX de todas as seções (retrato factual em
`docs/audit-usabilidade.md` — resumo abaixo). A raiz de quase todos os atritos
é a **modelagem de dados exposta como interface**:

- Dinheiro é gravado em **duas tabelas paralelas**: `Transaction` (alimenta
  Transações, Despesas e Cartões) e `Income` (alimenta só Receitas). Efeito:
  uma **despesa aparece em 2 telas** (Despesas e Transações) e uma **receita
  NÃO aparece** em Transações. O usuário não entende por que há 3 lugares nem
  por que o "histórico de todas as transações" não tem receitas.
- **"Cartões" é, no código, uma conta bancária** (`CreditCard` rotulado como
  "conta bancária" em toda a UI); os cartões reais são `AccountCard` aninhados.
  Mistura conta + cartão + fatura num só lugar.
- **Reservas e Metas se sobrepõem** (ambos têm valor alvo/atual + progresso).
- **Nomes inconsistentes** para a mesma coisa e **jargão** de desenvolvedor
  espalhados na interface.

> ⚠️ Este spec é uma **revisão** — várias decisões são de produto e estão
> marcadas `[NEEDS CLARIFICATION]` para debate antes de virar plano/tarefas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — "Onde está meu dinheiro?" (movimentações coerentes) (Priority: P1)

Como usuário, quero que entradas e saídas de dinheiro vivam num modelo
consistente, para eu não ver o mesmo gasto em dois lugares nem uma receita
"sumir" do histórico.

**Why this priority**: é a maior fonte de confusão e mina a confiança nos
números — o problema central do produto.

**Independent Test**: cadastrar 1 receita e 1 despesa e verificar que ambas
aparecem de forma coerente no "histórico" e nos totais, sem duplicar.

**Acceptance Scenarios**:
1. **Given** uma receita cadastrada, **When** abro Transações, **Then** ela
   aparece (hoje não aparece — `Income` é tabela separada).
2. **Given** uma despesa cadastrada, **When** navego entre Despesas e
   Transações, **Then** entendo que é o mesmo lançamento (não dois).
3. **Given** o dashboard, **When** vejo "Distribuição por categoria",
   **Then** ela mostra CATEGORIA de verdade (hoje mostra `belongsTo`).

`[NEEDS CLARIFICATION]`: unificar num único conceito "Movimentação"
(receita/despesa como tipos) OU manter Receitas/Despesas separadas mas fazer
Transações refletir as duas? (afeta modelo `Transaction`/`Income`).

### User Story 2 — Cartões que fazem sentido (conta × cartão × fatura) (Priority: P1)

Como usuário, quero cadastrar um cartão de crédito sem precisar entender
"conta bancária", "conta vinculada" ou dois níveis de cadastro.

**Why this priority**: é o atrito conceitual mais grave; o dono já pediu
"Novo cartão" (feito) e escopo "só cartões de crédito".

**Independent Test**: um usuário leigo cadastra um cartão de crédito e lança
uma compra sem consultar ajuda.

**Acceptance Scenarios**:
1. **Given** a seção Cartões, **When** cadastro um cartão, **Then** o rótulo é
   "cartão" em todo lugar (hoje "conta bancária" em vários pontos:
   `cartoes/page.tsx:105`, `cartoes/[id]/page.tsx:186`, `import-form.tsx:269`).
2. **Given** o form, **When** vejo os campos, **Then** só peço o essencial
   (nome, banco/bandeira, limite, fechamento, vencimento) — sem "conta vinculada".

`[NEEDS CLARIFICATION]`: o modelo tem 2 níveis (`CreditCard` como "conta" +
`AccountCard` como cartão real). Simplificar para 1 nível "Cartão"? O que fazer
com contas bancárias de verdade (débito/pix) que hoje se escondem aí?
`[NEEDS CLARIFICATION]`: manter "dia de fechamento/vencimento" (exige
conhecimento) ou oferecer presets por banco?

### User Story 3 — Reservas e Metas sem duplicação (Priority: P2)

Como usuário, quero um lugar claro para "dinheiro guardado" e outro para
"objetivos", sem tipos repetidos entre eles.

**Why this priority**: duplicação confunde onde registrar "minha reserva".

**Independent Test**: criar uma reserva de emergência e uma meta e não
encontrar campos/tipos redundantes entre as duas telas.

**Acceptance Scenarios**:
1. **Given** Reservas e Metas, **Then** "Reserva" não aparece como tipo nos
   dois + como "Objetivo específico" no caixa (hoje aparece nos três).
2. **Given** uma meta, **When** defino "valor atual", **Then** ele idealmente
   reflete uma reserva vinculada (hoje é digitado à mão, não puxa de Reservas).

`[NEEDS CLARIFICATION]`: fundir Metas dentro de Reservas (uma reserva COM alvo
vira meta) ou manter separado com papéis bem definidos?

### User Story 4 — Linguagem de usuário, não de sistema (Priority: P2)

Como usuário, quero rótulos claros e um nome por conceito.

**Why this priority**: jargão e nomes duplicados quebram a percepção premium.

**Acceptance Scenarios** (correções de baixo risco, sem mudar lógica):
1. **Reservas/Caixa/"Novo caixa"** → um nome só (rota `caixa`, menu "Reservas",
   título "Caixa", botão "Novo caixa" — `nav-items.ts:40`, `caixa/page.tsx`).
2. **"Agente IA" vs "Assistente IA"** → nomes distintos e claros
   (`nav-items.ts:45-46`).
3. **"Configurações"** que só gerencia Categorias → renomear para "Categorias"
   ou expandir o escopo (`configuracoes/`).
4. Jargão a traduzir/explicar: "Pertence a" (`belongsTo`), "Sobra real",
   "Taxa de endividamento", "Reembolsável/Devendo", "Conta vinculada",
   "Origem × Tipo" (receitas).

### User Story 5 — Transações: histórico OU editável, sem meio-termo (Priority: P3)

Hoje Transações é **somente-leitura** (o `row-actions.tsx` com editar/excluir
existe mas está **órfão** — não é usado). Ou assume-se "histórico" (e some o
botão/coluna de ações de vez), ou habilita-se criar/editar ali.

`[NEEDS CLARIFICATION]`: Transações deve permitir criar/editar (religar as
ações órfãs) ou ser explicitamente um histórico consolidado só-leitura?

### User Story 6 — Importar simples e num lugar só (Priority: P3)

Importar existe em **dois lugares** (página Importar e dentro do Cartão) com
títulos diferentes, e o preview expõe diagnóstico técnico ("layout: ai",
"duplicata/reconhecida", "motivo técnico", "primeiros bytes (hex)").

**Acceptance Scenarios**:
1. **Given** importar, **Then** há um fluxo único e o destino se chama "cartão".
2. **Given** o preview, **Then** o diagnóstico técnico fica oculto (ou num
   "ver detalhes"), mostrando ao usuário só banco, mês e compras.

### Edge Cases
- Usuário leigo vs power-user (Regras, Assistente, WhatsApp são admin/técnicos).
- Categorias são **globais** (compartilhadas entre usuários) — comportamento
  esperado ou bug de multiusuário? `[NEEDS CLARIFICATION]`.
- Migração de dados existentes se o modelo de Cartões/Transações mudar.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: O histórico de "Transações" MUST refletir de forma coerente
  entradas e saídas (resolver a ausência de receitas). `[NEEDS CLARIFICATION:
  unificar modelo vs. apenas unir na exibição]`
- **FR-002**: O usuário MUST NOT ver o mesmo lançamento como se fossem dois
  (Despesas × Transações).
- **FR-003**: A seção de cartões MUST usar o termo "cartão" consistentemente e
  pedir apenas campos essenciais para cartão de crédito.
- **FR-004**: O sistema MUST oferecer um único conceito para "dinheiro
  guardado" vs "objetivo", sem tipos duplicados. `[NEEDS CLARIFICATION]`
- **FR-005**: Todo rótulo visível ao usuário MUST usar linguagem comum
  (sem `belongsTo`, "conta vinculada", "sobra real" sem explicação).
- **FR-006**: Cada conceito MUST ter um nome único na navegação e nas telas
  (Reservas/Caixa; Assistente/Agente).
- **FR-007**: A importação MUST existir num fluxo único, com jargão técnico
  oculto por padrão.
- **FR-008**: "Configurações" MUST refletir seu escopo real (categorias) ou
  ganhar escopo de configurações de fato. `[NEEDS CLARIFICATION]`

### Key Entities
- **Movimentação (Transaction/Income)**: entrada/saída de dinheiro — hoje em 2
  tabelas; núcleo do debate.
- **Cartão (CreditCard/AccountCard)**: hoje 2 níveis (conta + cartão).
- **Reserva (CashBox) / Meta (Goal)**: sobrepostos.
- **Pessoa (Person) / Recebível (Receivable)**: mantidos (decisão do dono);
  `Receivable` é criado automaticamente — pode surpreender o usuário.
- **Categoria (Category)**: global (sem `ownerId`).

## Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: um usuário leigo cadastra cartão + lança compra sem ajuda em < 2 min.
- **SC-002**: 0 lançamentos aparecendo como duplicados entre telas.
- **SC-003**: 100% dos rótulos visíveis sem jargão técnico não explicado.
- **SC-004**: 1 nome por conceito na navegação (0 sinônimos concorrentes).
- **SC-005**: receita cadastrada aparece no histórico consolidado.

## Assumptions
- Pessoas **permanece** (decisão do dono) — recebíveis/responsável mantidos.
- Cartões = foco em **cartão de crédito** (decisão do dono).
- Mudanças de modelo (Transaction/Income, Cartão) exigem migração e são as de
  maior risco — só avançam após decisão explícita no debate.
- A repaginação visual (feature 003) é a base; esta revisão ajusta fluxo/lógica
  sobre ela.
