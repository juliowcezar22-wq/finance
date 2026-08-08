# Feature Specification: Integridade de Dados — Precisão Monetária, Isolamento e Referências

**Feature Branch**: `002-integridade-dados`

**Created**: 2026-08-08

**Status**: Draft

**Input**: User description: "Integridade de dados do Nummiq (Módulo 5): Float→Decimal em todos os campos monetários (sem mudar nenhum valor exibido), ownerId NOT NULL nos 17 modelos (com backfill), onDelete explícito nas 17 relações Owner*, limpeza de campos legados de Income/Installment, e RLS aplicado. Testes de caracterização de calculations.ts verdes antes e depois da migração."

## Clarifications

### Session 2026-08-08

- Q: Ao excluir usuário com dados vinculados, o que acontece? → A: **Restrict +
  desativação**. O banco bloqueia excluir usuário que ainda tem dados; o botão
  "excluir" passa a desativar (`active=false`, já existe). Preserva histórico e
  impede deixar o sistema sem administrador.
- Q: Destino dos registros órfãos (sem dono) pré-existentes? → A: **Apagar** as
  linhas órfãs (resíduo pré-multiusuário) antes de aplicar dono obrigatório.
- Q: Split de parcela perde 1 centavo (100÷3 = 33,33×3 = 99,99) — corrigir? →
  A: **Corrigir agora**: a última parcela absorve o resíduo
  (33,33+33,33+33,34 = 100,00). É uma mudança de comportamento INTENCIONAL — as
  parcelas manuais já gravadas serão recalculadas para somar exatamente o total.
- Q: Escopo dos campos legados? → A: **Só remover date/source de Income**
  (write-only, ninguém lê). MANTER o modelo Installment e os metadados de
  parcela em Transaction — são mecanismos distintos (parcelas manuais vs
  projeção de fatura importada), não redundância.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Valores financeiros exatos (Priority: P1)

Como titular de uma conta no Nummiq, os valores em dinheiro que eu vejo e registro
(saldos, faturas, parcelas, metas, movimentações de caixa) são sempre exatos ao
centavo — sem os pequenos erros de arredondamento que a representação de ponto
flutuante introduz ao somar, subtrair ou dividir. Depois desta mudança, todos os
números que eu já tinha continuam idênticos aos de antes; nada "muda de valor"
por causa da migração.

**Why this priority**: É o coração de um app financeiro. Ponto flutuante acumula
erro em somatórios e divisões (ex.: dividir uma compra em parcelas), o que pode
fazer um saldo fechar em R$ 0,01 errado. A migração precisa ser feita de forma
que os dados existentes sejam preservados exatamente — um valor exibido errado
depois da migração seria pior do que o problema original.

**Independent Test**: Testes de caracterização de todos os cálculos monetários
(saldo, totais de fatura, parcelamento, comparativos, movimentações) rodam sobre
um conjunto fixo de dados e produzem exatamente os mesmos resultados antes e
depois da troca de representação numérica; um conjunto de valores gravados é lido
de volta idêntico.

**Acceptance Scenarios**:

1. **Given** os cálculos monetários cobertos por testes de caracterização com
   valores conhecidos, **When** a representação numérica dos campos monetários é
   migrada, **Then** cada teste produz o mesmo resultado **na precisão exibida
   (ao centavo)** — entendido que a representação decimal pode legitimamente
   eliminar o "ruído" de ponto flutuante (ex.: 0,30000000000000004 → 0,30), o
   que é melhoria, não regressão, pois o valor exibido não muda.
2. **Given** um valor monetário existente no banco (ex.: uma fatura de
   R$ 1.234,56), **When** lido após a migração, **Then** é exatamente
   R$ 1.234,56 (nenhum arredondamento ou drift).
3. **Given** uma compra dividida em parcelas cuja soma não é exata em ponto
   flutuante, **When** as parcelas são somadas, **Then** a soma bate com o total
   original ao centavo.
4. **Given** qualquer tela que exibe dinheiro, **When** renderizada após a
   migração, **Then** os valores aparecem com a mesma formatação e o mesmo valor
   de antes.

---

### User Story 2 - Nenhum dado sem dono (Priority: P2)

Como responsável pelos dados, todo registro financeiro pertence obrigatoriamente
a um usuário — não existe mais "registro órfão" (sem dono) no banco, que a
feature 001 identificou como um risco de vazamento. Registros pré-existentes sem
dono (resíduo pré-multiusuário) são **removidos** com backup prévio antes de a
regra passar a valer.

**Why this priority**: A feature 001 fechou o acesso a órfãos na aplicação, mas o
banco ainda permite criá-los. Tornar o vínculo obrigatório elimina a classe de
problema na origem. Depende de US1 apenas por ordem operacional (uma migração de
schema coordenada).

**Independent Test**: Após a migração, uma varredura nas tabelas de dados de
usuário retorna zero registros sem dono, e uma tentativa de gravar um registro
sem dono é rejeitada pelo banco.

**Acceptance Scenarios**:

1. **Given** registros de dados de usuário sem dono, **When** o saneamento roda
   (com backup prévio), **Then** eles são removidos e a contagem de órfãos
   fica em zero.
2. **Given** a regra de vínculo obrigatório aplicada, **When** o sistema tenta
   persistir um registro de dados de usuário sem dono, **Then** a operação é
   rejeitada.
3. **Given** o banco após a migração, **When** varrido, **Then** há zero
   registros de dados de usuário sem dono.

---

### User Story 3 - Exclusão de usuário sem quebrar (Priority: P2)

Como administrador, quando eu preciso remover ou desativar um usuário, o sistema
se comporta de forma previsível e definida — nunca falha com um erro de
integridade referencial deixando o sistema num estado inconsistente. A política
do que acontece com os dados de um usuário removido é explícita e documentada.

**Why this priority**: Hoje remover um usuário pode falhar por violação de chave
estrangeira (as relações não têm regra de exclusão definida), deixando a operação
pela metade. Definir a política elimina esse risco.

**Independent Test**: Executar a remoção/desativação de um usuário que possui
dados vinculados conclui de acordo com a política definida, sem erro de
integridade referencial, e o estado resultante é o esperado.

**Acceptance Scenarios**:

1. **Given** um usuário com dados financeiros vinculados, **When** o
   administrador aciona a remoção/desativação, **Then** a operação conclui sem
   erro de integridade referencial.
2. **Given** a política de exclusão definida, **When** aplicada, **Then** o
   destino dos dados do usuário (preservados/bloqueados/removidos) é exatamente o
   documentado.

---

### User Story 4 - Modelo de dados sem ambiguidade legada (Priority: P3)

Como quem mantém o produto, os campos que representam a mesma informação de forma
duplicada (data/origem de receitas em dois pares de campos; parcelas em dois
lugares) são unificados numa única fonte de verdade, para não haver divergência
entre onde o valor foi gravado e de onde é lido.

**Why this priority**: Campos legados duplicados são fonte silenciosa de bug
(gravar num, ler do outro). É P3 porque não é um risco agudo de segurança/valor,
mas dívida técnica que confunde a evolução.

**Independent Test**: Após a unificação, cada informação tem um único campo
canônico; leitura e escrita usam a mesma fonte, verificado por teste; nenhum dado
existente é perdido na consolidação.

**Acceptance Scenarios**:

1. **Given** informações hoje duplicadas em campos legados, **When** a
   consolidação roda, **Then** os dados existentes são preservados no campo
   canônico e o campo legado deixa de ser usado.
2. **Given** o modelo consolidado, **When** um valor é gravado e lido de volta,
   **Then** vem da mesma fonte única (sem divergência).

---

### User Story 5 - Parcelas que somam o total exato (Priority: P2)

Como titular de conta, quando eu divido uma compra em parcelas, a soma das
parcelas é exatamente o valor da compra — sem sobrar nem faltar centavo. Hoje
uma compra de R$ 100 em 3× vira 33,33 + 33,33 + 33,33 = 99,99 (some 1 centavo);
depois desta mudança, a última parcela absorve o resíduo (33,34), fechando em
R$ 100,00.

**Why this priority**: É dinheiro real "sumindo" — um erro visível e legítimo de
corrigir, e o momento (mexer na representação monetária) é o certo para acertar.

**Independent Test**: Para vários totais e números de parcelas (incluindo os que
não dividem exato), a soma das parcelas geradas é igual ao total ao centavo; os
parcelamentos manuais já existentes são recalculados e passam a somar o total.

**Acceptance Scenarios**:

1. **Given** uma compra de R$ 100 em 3 parcelas, **When** as parcelas são
   geradas, **Then** elas somam exatamente R$ 100,00 (ex.: 33,33 + 33,33 +
   33,34).
2. **Given** parcelamentos manuais já gravados com resíduo perdido, **When** o
   recálculo roda, **Then** cada grupo passa a somar exatamente o seu total.
3. **Given** um total que divide exato (ex.: R$ 90 em 3), **When** parcelado,
   **Then** todas as parcelas são iguais (30,00 cada) — a correção não introduz
   distorção onde não havia resíduo.

---

### Edge Cases

- Registro monetário com muitas casas decimais herdadas do ponto flutuante (ex.:
  0.1 + 0.2 gravado como 0.30000000000000004): a migração precisa decidir o
  arredondamento canônico (2 casas) e documentá-lo; o valor "correto de negócio"
  (0,30) deve prevalecer.
- Registro órfão cujo dono verdadeiro é ambíguo/desconhecido: precisa de um
  destino explícito (atribuir a um dono administrativo definido, ou remover com
  registro), nunca ficar num limbo.
- Falha no meio da migração: precisa haver backup e um caminho de rollback; a
  migração roda primeiro no banco de testes.
- Exclusão de usuário que é o único administrador: a política não pode permitir
  deixar o sistema sem administrador.
- Valores nulos opcionais (ex.: teto de meta, total declarado de fatura): a
  mudança de representação preserva o "sem valor" (continua nulo), não vira zero.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Todos os campos monetários MUST usar uma representação de precisão
  decimal fixa (2 casas), não ponto flutuante, cobrindo: saldos de conta, limites
  de cartão/cartão adicional, valores de transação/parcela, total/pago/declarado
  de fatura, recebíveis, receitas, saldos e metas de caixa, pagamentos de pessoa,
  movimentações de caixa, metas, e os limiares monetários de regras de
  categorização.
- **FR-002**: Campos não monetários que hoje usam ponto flutuante por outro
  motivo (ex.: temperatura do assistente de IA) MUST permanecer inalterados.
- **FR-003**: A migração de representação numérica MUST preservar exatamente
  todos os valores monetários existentes — nenhum valor exibido muda; valores
  nulos permanecem nulos. **Exceção intencional (FR-013)**: a correção do
  arredondamento de parcelamento pode ajustar o valor de parcelas individuais.
- **FR-004**: Testes de caracterização dos cálculos monetários MUST existir e
  passar ANTES da migração, e continuar passando depois, cobrindo saldo, totais,
  parcelamento, comparativos e movimentações (constituição, princípio VI).
- **FR-005**: Todo registro de dados de usuário MUST ter um dono obrigatório; o
  banco MUST rejeitar a persistência de um registro de dados de usuário sem dono.
- **FR-006**: Registros pré-existentes sem dono MUST ser **removidos** antes de a
  regra de obrigatoriedade passar a valer (decisão: são resíduo pré-multiusuário);
  após o saneamento MUST haver zero órfãos. O saneamento roda com backup prévio.
- **FR-007**: Cada relação entre usuário e seus dados MUST usar política de
  exclusão **Restrict**: o banco MUST impedir excluir um usuário que ainda possui
  dados vinculados (sem orfanizar). A ação hoje rotulada "excluir usuário" MUST
  passar a **desativar** o usuário (marcar inativo, mantendo os dados).
- **FR-008**: A desativação MUST derrubar o acesso do usuário e MUST impedir
  deixar o sistema sem nenhum administrador ativo; a política MUST estar
  documentada.
- **FR-009**: Os campos legados de receita (data/origem duplicados) MUST ser
  removidos, preservando a informação na fonte canônica; os dois mecanismos de
  parcelamento (parcelas manuais e metadados de fatura importada) permanecem como
  estão (não são redundância).
- **FR-013**: O cálculo de parcelamento MUST distribuir o valor total sem perder
  centavos: a soma das parcelas MUST ser exatamente igual ao total (o resíduo do
  arredondamento vai para a última parcela). Parcelamentos manuais já gravados
  MUST ser recalculados para satisfazer essa regra, com backup prévio.
- **FR-010**: A proteção de acesso ao banco no nível da infraestrutura (fechar a
  API pública de dados) MUST estar aplicada nos ambientes de desenvolvimento e
  teste, permanecendo entendido que essa proteção não substitui o isolamento por
  dono da aplicação.
- **FR-011**: Toda alteração estrutural MUST ser aplicada pelo canal de migração
  guardado do projeto, com backup antes e execução primeiro no banco de teste
  (constituição, princípio III).
- **FR-012**: O código que consome valores monetários (cálculos, ações,
  exibição) MUST continuar funcionando corretamente com a nova representação —
  nenhuma regressão de valor ou de exibição.

### Key Entities

- **Valor monetário**: qualquer quantia em dinheiro persistida (saldo, total,
  pago, limite, meta, movimentação, parcela, limiar de regra); passa a ter
  precisão decimal fixa de 2 casas.
- **Registro de dados de usuário**: qualquer entidade privada sujeita ao
  isolamento por dono (transações, faturas, contas, cartões, metas, caixas,
  pessoas, recebíveis, regras, parcelas, importações, conversas/memórias de IA);
  passa a exigir dono obrigatório.
- **Relação usuário→dados**: vínculo entre o usuário e cada tipo de dado seu, que
  passa a ter política de exclusão explícita.
- **Campo legado**: par de campos que representa a mesma informação de forma
  duplicada (a consolidar numa fonte canônica).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos cálculos monetários cobertos por caracterização produzem
  resultado idêntico antes e depois da migração **na precisão exibida** (valores
  em dinheiro ao centavo; razões/percentuais arredondados como a UI mostra).
- **SC-002**: 100% dos valores monetários existentes lidos após a migração são
  iguais aos de antes (amostra de verificação bate ao centavo).
- **SC-003**: Zero registros de dados de usuário sem dono após o saneamento.
- **SC-004**: Uma tentativa de persistir registro de dados de usuário sem dono é
  rejeitada em 100% dos casos.
- **SC-005**: Remoção/desativação de um usuário com dados vinculados conclui sem
  erro de integridade referencial em 100% dos casos testados.
- **SC-006**: Comparação estrutural do banco contra o modelo alvo não aponta
  divergências após a migração (migração "limpa").
- **SC-007**: A suíte de testes (caracterização + isolamento herdado da 001)
  permanece 100% verde após todas as mudanças.
- **SC-008**: Para 100% dos casos de parcelamento testados (incluindo os que não
  dividem exato), a soma das parcelas é igual ao total ao centavo; 100% dos
  parcelamentos manuais existentes passam a somar o total após o recálculo.

## Assumptions

- **Precisão**: 2 casas decimais (centavos) é suficiente para toda a moeda do
  app (BRL); não há necessidade de mais casas.
- **Arredondamento na migração**: valores com "lixo" de ponto flutuante são
  canonicalizados para 2 casas pelo arredondamento padrão de moeda; o valor de
  negócio pretendido (ex.: 0,30) prevalece.
- **Saneamento de dono**: os órfãos são **removidos** (decisão do clarify) com
  backup prévio; o app não tem UI para adotá-los (a extensão de escopo nunca casa
  registro sem dono), então é operação de manutenção via script.
- **Política de exclusão**: **Restrict + desativação** (decisão do clarify) —
  preserva dados, o botão de exclusão desativa o usuário.
- **Split de parcela**: correção INTENCIONAL (decisão do clarify) — a soma passa
  a fechar exata; parcelamentos manuais gravados são recalculados. É a única
  exceção ao "nenhum valor muda" da migração de representação.
- **Banco compartilhado dev/test**: as duas conexões apontam para o mesmo banco
  (plano free); a migração e o backup consideram isso — nada roda contra
  produção, que é migrada só pelo deploy.
- **Fora de escopo**: cifragem de segredos e headers HTTP (feature 003); refactor
  de código não relacionado à integridade de dados (feature 004); paginação/UX
  (feature 006). A adaptação do código monetário à nova representação está no
  escopo apenas na medida necessária para não regredir valor/exibição.
- **Rastreabilidade**: os campos e relações concretos afetados estão listados no
  Input e detalhados em `docs/PLANO-DE-ACAO.md` (Módulo 5); a fase de plano os
  enumera com precisão.
