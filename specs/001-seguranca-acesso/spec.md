# Feature Specification: Hardening de Segurança P0 — Acesso, Sessão e Canal WhatsApp

**Feature Branch**: `001-seguranca-acesso`

**Created**: 2026-08-08

**Status**: Draft

**Input**: User description: "Hardening de segurança P0 do Nummiq, cobrindo os Módulos 1 (restante), 2 e 3 do docs/PLANO-DE-ACAO.md: fechar o restante do IDOR (invoices sem guard, checagem de dono não atômica, registro órfão passa livre), remover fallback de segredo de sessão e implementar revogação no logout + rate limit de login, e autenticar o canal WhatsApp (webhook aberto, secret de reminders em query string, remetente forjável, sem dedupe). Testes automatizados são requisito explícito (constituição, princípio VI)."

## Clarifications

### Session 2026-08-08

- Q: Onde guardar contadores de tentativas de login e deduplicação de mensagens
  (precisa sobreviver a instâncias serverless)? → A: Tabelas no banco de dados
  principal (Postgres), sem infra nova.
- Q: Como revogar sessões no logout? → A: Versão de sessão por usuário embutida
  no token; logout incrementa a versão e todas as sessões do usuário caem.
- Q: Duração máxima da sessão? → A: Mantida em 30 dias — aceitável porque o
  logout passa a revogar de fato; reavaliar se surgir uso multi-dispositivo.
- Q: Política de bloqueio de login? → A: 5 falhas consecutivas por conta+origem
  → bloqueio temporário de 15 minutos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Isolamento total entre usuários (Priority: P1)

Como titular de uma conta no Nummiq, meus dados financeiros (faturas, lançamentos,
metas, caixas etc.) só podem ser lidos e alterados por mim. Nenhuma operação do
sistema — inclusive pagamento e mudança de status de fatura — pode ser executada
sobre um registro de outro usuário, mesmo que o atacante conheça ou adivinhe o
identificador do registro, e mesmo sob condições de concorrência.

**Why this priority**: É a brecha de maior impacto (vazamento e adulteração de
dados financeiros de terceiros). A maior parte já foi fechada; restam operações
de fatura desprotegidas, uma janela de corrida na checagem de dono e o caso de
registros órfãos (sem dono) que passam livres.

**Independent Test**: Teste de intrusão com dois usuários (A e B): autenticado
como B, invocar cada operação de escrita/leitura com identificadores de registros
de A — todas devem ser negadas sem revelar a existência do registro. Repetir sem
sessão alguma — todas devem exigir autenticação.

**Acceptance Scenarios**:

1. **Given** usuário B autenticado e uma fatura pertencente a A, **When** B tenta
   pagar a fatura ou alterar seu status informando o id da fatura de A, **Then**
   a operação é negada com mensagem genérica que não revela a existência do
   registro, e nada muda no banco.
2. **Given** requisição sem sessão válida, **When** qualquer operação de fatura
   (pagar, alterar status, excluir) é invocada, **Then** o chamador é levado ao
   fluxo de autenticação e nada é executado.
3. **Given** duas requisições concorrentes disputando alterar/excluir o mesmo
   registro, **When** a checagem de dono e a escrita são executadas, **Then**
   não existe janela em que a escrita ocorra sobre registro de outro dono
   (verificação e escrita são atômicas).
4. **Given** um registro órfão (sem dono definido) em tabela de dados de
   usuário, **When** qualquer usuário comum tenta lê-lo ou alterá-lo, **Then**
   a operação é negada — ausência de dono nunca significa acesso liberado.
5. **Given** a decisão de produto de que categorias são um catálogo global,
   **When** um usuário comum tenta criar/alterar/excluir categoria, **Then**
   somente administradores conseguem, e essa decisão está registrada por escrito.

---

### User Story 2 - Sessão confiável e login resistente a abuso (Priority: P2)

Como titular de conta, quando eu saio do aplicativo minha sessão morre de
verdade: um token antigo capturado não pode continuar sendo usado. O sistema
nunca opera com um segredo de sessão previsível, e tentativas repetidas de
adivinhar minha senha são bloqueadas.

**Why this priority**: Um segredo de sessão com valor de fallback conhecido
permite forjar tokens de qualquer usuário; logout sem revogação deixa tokens
roubados válidos por 30 dias; login sem limite de tentativas permite força
bruta. Depende do isolamento (US1) já valer para que a sessão seja a única
porta de entrada.

**Independent Test**: (1) Subir a aplicação sem o segredo de sessão configurado
e verificar que ela se recusa a operar. (2) Autenticar, guardar o token, fazer
logout e reapresentar o token antigo — deve ser rejeitado. (3) Errar a senha
repetidamente e verificar bloqueio temporário.

**Acceptance Scenarios**:

1. **Given** ambiente sem o segredo de sessão definido, **When** a aplicação
   inicia ou recebe a primeira requisição, **Then** ela falha de forma explícita
   e visível — nunca adota silenciosamente um valor padrão embutido.
2. **Given** usuário autenticado com token válido, **When** faz logout e o mesmo
   token é reapresentado em nova requisição, **Then** o token é rejeitado e o
   portador é tratado como não autenticado.
3. **Given** sequência de tentativas de login com senha errada para uma conta,
   **When** o limite de tentativas é excedido, **Then** novas tentativas são
   bloqueadas temporariamente e o bloqueio é registrado, sem revelar ao
   atacante se a conta existe.
4. **Given** usuário legítimo após o período de bloqueio, **When** informa a
   senha correta, **Then** consegue entrar normalmente.

---

### User Story 3 - Canal WhatsApp fechado para estranhos (Priority: P3)

Como dono da instância, somente meu provedor de WhatsApp autorizado pode
entregar mensagens ao sistema, e somente remetentes explicitamente cadastrados
têm suas mensagens processadas. Ninguém de fora consegue criar lançamentos
financeiros nem consumir meus créditos de IA, e reenvios da mesma mensagem não
geram lançamentos duplicados.

**Why this priority**: Hoje o ponto de entrada aceita qualquer requisição
anônima: um estranho pode criar lançamentos e gastar tokens de IA. É P3 apenas
porque depende das duas histórias anteriores para o perímetro fazer sentido —
continua sendo item de segurança inegociável antes de produção.

**Independent Test**: Enviar requisições diretas ao ponto de entrada do
WhatsApp: sem credencial → recusada; com credencial mas remetente não
cadastrado → ignorada sem efeitos; com credencial e remetente válido →
processada; a mesma mensagem reenviada → processada uma única vez.

**Acceptance Scenarios**:

1. **Given** requisição ao webhook sem a credencial secreta correta, **When**
   recebida, **Then** é recusada como não autorizada, nenhum dado é criado e
   nenhum serviço de IA é acionado.
2. **Given** requisição autenticada cujo remetente não corresponde exatamente a
   um número cadastrado (comparação integral, não por sufixo), **When**
   processada, **Then** a mensagem é descartada sem efeitos.
3. **Given** o disparo de lembretes, **When** invocado com a credencial fora do
   local esperado (ex.: exposta na URL) ou ausente, **Then** é recusado; a
   credencial só é aceita em cabeçalho e comparada de forma resistente a
   ataques de tempo.
4. **Given** a mesma mensagem entregue duas vezes pelo provedor (retry),
   **When** processada, **Then** o efeito ocorre exatamente uma vez
   (deduplicação por identificador de mensagem).

---

### Edge Cases

- Registro órfão criado por dados legados ou scripts: nunca acessível a usuário
  comum; deve existir caminho administrativo documentado para saneá-lo.
- Rotação do segredo de sessão: sessões existentes são invalidadas de forma
  previsível e o usuário só precisa autenticar de novo (sem estado quebrado).
- Bloqueio de login não pode permitir negação de serviço trivial contra um
  usuário legítimo (bloqueio temporário e com escopo adequado, não permanente).
- Retry do provedor de WhatsApp chegando fora de ordem ou minutos depois:
  deduplicação continua valendo dentro de janela razoável.
- Falha do armazenamento usado pelo controle de tentativas/deduplicação não
  pode abrir o bypass (fail-closed).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Toda operação de fatura (pagar, alterar status, excluir) MUST
  exigir chamador autenticado e MUST operar somente sobre faturas do próprio
  dono; violações retornam mensagem genérica que não revela existência.
- **FR-002**: A verificação de dono nas operações de alteração/exclusão/upsert
  MUST ser atômica com a escrita — não pode existir janela entre verificar e
  escrever em que outro dono seja afetado.
- **FR-003**: Registros sem dono definido em tabelas de dados de usuário MUST
  ser tratados como inacessíveis a usuários comuns (negar por padrão).
- **FR-004**: A decisão "Categoria é catálogo global, escrita somente por
  administradores" MUST estar registrada em documentação do projeto.
- **FR-005**: A aplicação MUST recusar-se a operar sem o segredo de sessão
  configurado; nenhum valor de fallback pode existir no código, em nenhum dos
  pontos que validam sessão.
- **FR-006**: Logout MUST revogar a sessão via versão de sessão por usuário:
  o token carrega a versão vigente, o logout incrementa a versão e tokens de
  versões anteriores MUST ser rejeitados em requisições subsequentes (revogação
  vale para todas as sessões ativas do usuário).
- **FR-007**: O login MUST limitar tentativas falhas por conta (e-mail
  normalizado): após 5 falhas consecutivas, bloqueio temporário de 15 minutos —
  sem revelar existência da conta. A origem (IP) MUST ser registrada para
  auditoria, mas não participa da regra de bloqueio (resistência a ataque
  distribuído). Contadores MUST persistir em armazenamento durável
  compartilhado entre instâncias (banco principal); falha desse armazenamento
  MUST negar o login (fail-closed, FR-013).
- **FR-008**: O webhook de WhatsApp MUST autenticar cada requisição com
  credencial secreta transportada em cabeçalho e comparada de forma resistente
  a ataques de tempo; requisições não autenticadas MUST ser recusadas antes de
  qualquer efeito (criação de dados ou consumo de IA).
- **FR-009**: O disparo de lembretes MUST aceitar credencial apenas em
  cabeçalho (nunca em URL) com comparação resistente a ataques de tempo.
- **FR-010**: A autorização de remetente MUST comparar o número completo
  normalizado (formato internacional), nunca por sufixo.
- **FR-011**: Mensagens recebidas MUST ser deduplicadas por identificador de
  mensagem do provedor; reentregas não geram efeitos repetidos.
- **FR-012**: A feature MUST incluir testes automatizados que cubram: intrusão
  entre dois usuários em todas as operações de escrita expostas (incluindo as
  de fatura), rejeição de token pós-logout, bloqueio de login por tentativas,
  recusa de requisição não autenticada no webhook e deduplicação de mensagens
  (constituição, princípio VI).
- **FR-013**: Nenhum dos controles acima pode degradar para "aberto" em caso de
  falha de dependência (fail-closed).

### Key Entities

- **Fatura**: documento mensal de cartão pertencente a um dono; alvo das
  operações hoje desprotegidas (pagar, alterar status).
- **Sessão**: credencial portadora de identidade com expiração (30 dias) e
  versão de sessão do usuário embutida; emitida no login, invalidada quando a
  versão do usuário é incrementada (logout).
- **Tentativa de login**: registro durável de falhas por conta/origem que
  alimenta o bloqueio temporário (5 falhas → 15 minutos), compartilhado entre
  instâncias via banco principal.
- **Mensagem WhatsApp**: mensagem recebida do provedor, com identificador único
  persistido para deduplicação e remetente autorizado por igualdade exata.
- **Registro com dono**: qualquer dado de usuário sujeito ao isolamento
  (transações, faturas, metas, caixas etc.); "sem dono" = inacessível.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Teste de intrusão com 2 usuários cobre 100% das operações de
  escrita expostas (incluindo pagar/alterar status de fatura) e 100% delas
  negam acesso a dados do outro usuário, sem vazar existência de registros.
- **SC-002**: 100% das operações expostas exigem autenticação quando invocadas
  sem sessão.
- **SC-003**: Token de sessão usado após logout é rejeitado em 100% dos casos.
- **SC-004**: Aplicação sem segredo de sessão configurado não atende nenhuma
  requisição autenticada (falha explícita em 100% das tentativas).
- **SC-005**: Após 5 tentativas falhas consecutivas, a 6ª é bloqueada; usuário
  legítimo recupera acesso após a janela de 15 minutos em 100% dos casos.
- **SC-006**: Requisição anônima ao webhook: 0 registros criados, 0 chamadas de
  IA disparadas, resposta de não autorizado em 100% dos casos.
- **SC-007**: Mensagem reentregue com mesmo identificador: exatamente 1 efeito
  no sistema (0 duplicatas) em 100% dos reenvios testados.
- **SC-008**: Suíte de testes da feature executa localmente com 100% de
  aprovação e passa a fazer parte do gate de merge.

## Assumptions

- **Escopo de revogação**: logout revoga todas as sessões ativas do usuário
  (não apenas a do dispositivo atual) — mecanismo de versão de sessão por
  usuário; refinamento por dispositivo fica fora do escopo.
- **Duração da sessão**: mantida em 30 dias (decisão do dono do produto),
  aceitável porque o logout passa a revogar de fato; reavaliar se o app
  ganhar uso multi-dispositivo relevante.
- **Persistência do controle de tentativas e deduplicação**: tabelas no banco
  de dados principal (Postgres/Supabase) — sobrevivem a instâncias serverless
  efêmeras sem infra nova; contadores em memória de processo não atendem.
- **Deduplicação**: janela de deduplicação na ordem de dias é suficiente para
  retries do provedor.
- **Rotação de segredo**: trocar o segredo de sessão pode invalidar todas as
  sessões vigentes; isso é aceitável e documentado.
- **Fora de escopo**: cifragem de chaves de API armazenadas (feature 003),
  cabeçalhos de segurança HTTP (feature 003), migrações de schema não
  relacionadas a sessão/tentativas/dedupe (feature 002).
- **Rastreabilidade de auditoria**: os pontos fracos concretos que motivaram
  esta spec estão citados no Input acima e detalhados em
  `docs/PLANO-DE-ACAO.md` (Módulos 1–3); a verificação de convergência da
  implementação usa essa lista como referência.
