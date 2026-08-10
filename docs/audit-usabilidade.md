# Auditoria de usabilidade — retrato factual por seção

Base do spec `specs/004-revisao-usabilidade/`. Olhar de usuário, não de dev.

## Achado estrutural (raiz dos atritos)
- Dinheiro em **duas tabelas paralelas** (`prisma/schema.prisma`):
  `Transaction` (Transações, Despesas, Cartões) e `Income` (só Receitas).
- `CreditCard` é usado na UI como **"conta bancária"**; os cartões reais são
  `AccountCard` aninhados.
- `Category` é **global** (sem `ownerId`), ao contrário de todo o resto.

## Seção a seção

**1. Visão Geral** (`dashboard/page.tsx`, `services/calculations.ts`) — painel
só-leitura. Problemas: "Distribuição por categoria" mostra `belongsTo`
(Pessoal/Empresa/Terceiros/Família), não categoria; "Saldo em caixa" = soma de
CashBox (Reservas), engana quem pensa "banco"; "Sobra real" expõe fórmula;
"Taxa de endividamento" é jargão.

**2. Transações** (`transacoes/page.tsx`, `transaction-dialog.tsx`,
`row-actions.tsx`) — lista só-leitura de toda a tabela `Transaction` (limite
200). **Sem botão criar**; `row-actions.tsx` (editar/excluir) é **órfão** (não
importado). Receitas (`Income`) **não aparecem** aqui. Dialog tem 3 campos de
pessoa (responsável, quem pagou, pertence a).

**3. Receitas** (`receitas/page.tsx`, `income-dialog.tsx`, `actions/incomes.ts`)
— grava em `Income`. Dois seletores sobrepostos: "Origem" (`sourceType`) e
"Tipo" (`incomeType`). Some do histórico de Transações.

**4. Despesas** (`despesas/page.tsx`, `expense-dialog.tsx`,
`actions/expenses.ts`) — grava em `Transaction` (type=despesa, cardId=null).
**Mesma linha aparece em Transações** (duplicação percebida). `belongsTo`
fixado em "pessoal" no código.

**5. Cartões** (`cartoes/page.tsx`, `card-dialog.tsx`, `[id]/…`,
`actions/cards.ts`) — `CreditCard` rotulado "conta bancária" (empty state
"Nenhuma conta bancária", link "Voltar para contas bancárias",
`createBankAccountQuick`). Cartões reais = `AccountCard` (físico/virtual,
últimos 4 dígitos, limite individual). Form pede dia de fechamento/vencimento
(conhecimento financeiro). `accountId` existe no schema/action mas não no form.

**6. Reservas** (`caixa/page.tsx`, `cashbox-dialog.tsx`, `movement-dialog.tsx`)
— `CashBox` + `CashBoxMovement`. **3 nomes**: rota `caixa`, menu "Reservas",
título "Caixa", botão "Novo caixa". Sobrepõe Metas (valor alvo + progresso;
tipo "Objetivo específico").

**7. Metas** (`metas/page.tsx`, `goal-dialog.tsx`) — `Goal`. Duplica Reservas
(valor alvo/atual + progresso). "Prioridade (1-5)" numérica; "valor atual"
digitado à mão.

**8. Pessoas** (`pessoas/…`, `actions/people.ts`, `receivables.ts`) — controla
terceiros: quanto devem (`Receivable`, criado **automática e invisivelmente**
em `setTransactionResponsible` quando responsável ≠ titular), pagamentos
(`PersonPayment`), cobrança por WhatsApp. Dependem de "Pessoa": Transações
(responsável/pagador), Cartões (titular), Receitas, Despesas, Usuários
(vínculo), Dashboard. **Mantida por decisão do dono.**

**9. Importar** (`importar/…`, `services/import-engine.ts`) + **duplicado** em
`cartoes/invoice-import-dialog.tsx`. Fluxo PDF ~3 passos, mas afogado em
diagnóstico técnico ("layout: ai", "duplicata/reconhecida", "motivo técnico",
"primeiros bytes hex"). Destino chamado "conta bancária". CSV separa "Cartão de
origem" e "Conta de origem".

**10. Regras** (`regras/…`, `services/rules.ts`) — categorização automática
(condição→ação). Power-user: "Responsável" é **texto livre** (precisa bater com
nome de Person), "Prioridade" numérica.

**11. Assistente** (`assistente/…`, `actions/ai.ts`) — copiloto IA. Config só
admin (Provedor/URL base/Modelo/Temperatura/Chave).

**12. Agente IA / WhatsApp** (`whatsapp/…`) — gateway Z-API/Evolution, só admin.
Jargão: webhook, instanceId, clientToken, remindersSecret, cron. Nome colide
com "Assistente IA".

**13. Usuários** (`usuarios/…`) — contas + vínculo com Person. Senha em
`type="text"` (visível). Dualidade usuário × pessoa financeira.

**14. Configurações** (`configuracoes/…`) — apesar do nome, **só gerencia
categorias**. `Category.name` é `@unique` global sem `ownerId`.

## Jargão a corrigir (com arquivo)
"Pertence a"/`belongsTo` (`transaction-dialog.tsx:162`); "conta bancária" p/
cartão (`cartoes/page.tsx:105`); "Sobra real" (`dashboard/page.tsx:151`);
"Taxa de endividamento" (`calculations.ts:88`); "Reembolsável/Devendo"
(`pessoas/[id]/page.tsx:289`); "Conta vinculada" (`cashbox-dialog.tsx:84`);
"Reservas"×"Caixa" (`nav-items.ts:40`); "Agente IA"×"Assistente IA"
(`nav-items.ts:45-46`); "Origem"×"Tipo" em receitas (`income-dialog.tsx:84`).
