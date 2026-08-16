# Feature Specification: UX Final — Feedback e Confirmações
**Branch**: `010-ux-final` | **Status**: Draft | **Input**: M10 essencial.

## Clarifications — Session 2026-08-15
- Toasts: SUCESSO discreto em salvar/excluir; ERRO via toast só fora de dialog
  (row-actions/inline; substitui os alert() provisórios). Erros de formulário
  permanecem inline no dialog (008).
- Confirmações destrutivas: dialog do design system (botão vermelho, nome do
  item). Sem confirm() nativo.
- Escopo: só o essencial (toasts + confirmações + loading.tsx). Empty states,
  responsividade fina e fluxos rápidos = pós-lançamento (documentado).

## FRs
- FR-001: Toda action de salvar/excluir concluída MUST mostrar toast de sucesso.
- FR-002: Falha em action SEM dialog MUST mostrar toast de erro (nunca alert()).
- FR-003: As 16 confirmações destrutivas MUST usar o dialog padrão com o nome
  do item e ação em vermelho.
- FR-004: As 5 rotas sem loading.tsx MUST ganhá-lo (assistente, regras,
  usuarios, configuracoes, whatsapp).
- FR-005: Comportamento das actions inalterado (só apresentação); suíte verde.

## SCs
- SC-001: 0 window.confirm/alert() em src/app.
- SC-002: salvar/excluir em qualquer tela → feedback visível ≤ 1s.
- SC-003: check + suíte + build verdes.
