# Roteiro de testes em produção — Nummiq

Para você rodar **no sistema em produção**, com dados reais, depois do go-live.
Objetivo: validar a experiência ponta a ponta e **conferir se os cálculos estão
certos** — a base para modelar as melhorias seguintes.

Cada teste tem: o que fazer, o que deve acontecer, e o que anotar se falhar.
Sugestão: faça na ordem; leva ~40 minutos.

---

## Bloco A — Acesso e segurança (5 min)

| # | Teste | Esperado |
|---|-------|----------|
| A1 | Login com senha **errada** 6× seguidas | Da 6ª em diante: "Muitas tentativas. Aguarde alguns minutos" (a mensagem não muda se o e-mail existe ou não) |
| A2 | Aguardar 15 min e logar com a senha certa | Entra normalmente |
| A3 | Login → copiar o cookie `nummiq/bugia_session` (DevTools) → **Logout** → recolar o cookie e recarregar | Vai para o login (sessão revogada de verdade) |
| A4 | Abrir `/api/health` | `{"ok":true,"db":"up","latencyMs":…}` |
| A5 | `POST` em `/api/whatsapp/webhook` sem header (ex.: pelo terminal) | `401` e **nada** criado no app |
| A6 | Criar um 2º usuário (`/usuarios`), logar com ele em outra janela anônima | Vê **zero** dados do primeiro usuário (listas vazias) |
| A7 | Tentar desativar o **último admin ativo** | Recusa com "Não é possível remover o último administrador ativo" |

## Bloco B — Lançamentos e cálculo (15 min) ⚠️ o mais importante

Faça com **valores conhecidos** para conferir a matemática.

| # | Teste | Esperado |
|---|-------|----------|
| B1 | Criar despesa **R$ 100,00**, pix, hoje, status *pago* | Toast "Despesa salva"; aparece na lista |
| B2 | Criar despesa **R$ 50,50**, pendente, hoje | Aparece como "A vencer" |
| B3 | Dashboard → **Despesas do mês** | **R$ 150,50** (soma das duas) |
| B4 | Dashboard → **Despesas pagas** vs **previstas** | Pagas R$ 100,00 · Previstas R$ 50,50 |
| B5 | Criar receita **R$ 1.000,00** recebida hoje | Dashboard → Receitas do mês = R$ 1.000,00 |
| B6 | Dashboard → **Sobra real** | R$ 1.000,00 − R$ 100,00 (pagas) − faturas pagas = **R$ 900,00** |
| B7 | Criar despesa **R$ 100,00 em 3×** (parcelada) | 3 parcelas: **33,33 + 33,33 + 33,34** — a soma fecha **exatamente R$ 100,00** (correção da feature 002) |
| B8 | Editar a despesa de B1 para R$ 120,00 | Dashboard atualiza para R$ 170,50 |
| B9 | Excluir as despesas de teste | Dialog com o **nome** do item + toast; dashboard volta ao valor anterior |

**Se algum número divergir:** anote (a) o valor esperado, (b) o mostrado, (c) a
tela. Os cálculos têm 23 testes automatizados travando o comportamento — uma
divergência aqui é um caso que os testes não cobrem, e vale virar teste.

## Bloco C — Cartões e faturas (10 min)

| # | Teste | Esperado |
|---|-------|----------|
| C1 | Criar cartão com limite **R$ 5.000** | Aparece em `/cartoes` |
| C2 | Importar um PDF de fatura real | Preview com as linhas; confirmar importa |
| C3 | Reimportar **o mesmo PDF** | Duplicatas detectadas (não duplica lançamentos) |
| C4 | Abrir o cartão → conferir **total da fatura** vs o PDF | Bate com o total declarado |
| C5 | "Resumo por pessoa" | Soma **o mês inteiro**, não só os 50 visíveis (corrigido na 009) |
| C6 | Registrar pagamento parcial da fatura | Status vira *parcial*; "em aberto" = total − pago |
| C7 | Limite disponível do cartão | 5.000 − (faturas em aberto) |

## Bloco D — Listas e paginação (5 min)

| # | Teste | Esperado |
|---|-------|----------|
| D1 | Lista com > 50 itens (transações) | Mostra "Mostrando 50 de N" + botão **Carregar mais** |
| D2 | Aplicar filtro (mês/pessoa) e clicar Carregar mais | Filtro **preservado**; carrega +50 |
| D3 | Voltar (botão do navegador) | Volta ao estado anterior sem quebrar |

## Bloco E — WhatsApp / IA (5 min, se for usar)

| # | Teste | Esperado |
|---|-------|----------|
| E1 | Mandar "gastei 30 no mercado" do **seu número** | Cria a despesa e responde confirmando |
| E2 | Mandar do **outro número** | Ignorado (remetente não autorizado) |
| E3 | Reenviar a mesma mensagem (retry do gateway) | **Não** duplica o lançamento |
| E4 | Configurar chave de IA em `/assistente` e salvar | Ao reabrir, a chave aparece **mascarada** (cifrada no banco) |

## Bloco F — Interface (5 min)

| # | Teste | Esperado |
|---|-------|----------|
| F1 | Salvar um formulário com campo inválido (ex.: valor 0,00 em pagamento) | Erro **dentro do dialog** (vermelho), dialog **não fecha** |
| F2 | Qualquer exclusão | Dialog de confirmação do design system (não o alerta do navegador) |
| F3 | Navegar entre telas | Skeleton de carregamento (sem tela branca) |
| F4 | Celular: dashboard, listas e dialogs | Legível e usável (sem corte lateral) |
| F5 | URLs antigas `/faturas`, `/receber`, `/fluxo-de-caixa` | Redirecionam (não dão 404) |

---

## Como reportar

Para cada falha, anote: **tela · o que fiz · esperado · aconteceu · print**.
Com isso eu transformo em correção + teste automatizado (para não voltar).

## O que já está coberto por teste automático (não precisa testar à exaustão)

- Isolamento entre usuários (leitura/escrita/exclusão cruzadas) — 001
- Sessão, revogação no logout, lockout de login — 001
- Webhook: 401 sem token, remetente exato, deduplicação, rate-limit — 001/008
- Precisão monetária e todos os cálculos do dashboard (23 casos golden) — 002
- Split de parcela fechando exato — 002
- Guarda de último admin — 002
- Regras de categorização e recálculo de fatura — 011
