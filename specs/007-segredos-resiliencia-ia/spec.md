# Feature Specification: Segredos Cifrados, Hardening Web e Resiliência da IA

**Feature Branch**: `007-segredos-resiliencia-ia`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "Módulos 4 e 6 do docs/PLANO-DE-ACAO.md — cifrar
segredos de IA/WhatsApp no banco (AES-256-GCM), headers de segurança no
next.config, validação de upload (MIME/tamanho), não vazar corpo de erro do
provedor, revisar XSS no markdown do assistente; e resiliência da IA: timeout,
retry com backoff e teto de custo/tokens por usuário."

## Clarifications

### Session 2026-08-10

- Q: Como armazenar as credenciais? → A: **Cifrar no banco** (AES-256-GCM),
  segredo mestre `SECRETS_KEY` em env (sem fallback). Gestão pela tela mantida.
- Q: Teto de consumo de IA? → A: **Bloquear** ao atingir o teto diário por
  usuário (não contata o provedor ao exceder). Valor default proposto no plano.
- Q: Rigor da CSP? → A: **Headers fortes em enforce** (HSTS, X-Frame-Options/
  frame-ancestors, nosniff, Referrer-Policy) + **CSP em report-only** inicial,
  para não quebrar a UI redesenhada; endurece depois.
- Q: Higiene web (upload/markdown) nesta feature? → A: **Sim**, incluir —
  fecha o Módulo 4 inteiro (cifra + headers + upload + markdown + erro do
  provedor).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Segredos protegidos em repouso (Priority: P1)

Como dono da instância, as credenciais que eu cadastro (chave de API da IA,
token e client-token do WhatsApp, segredo de lembretes) ficam **cifradas** no
banco de dados. Se alguém obtiver uma cópia do banco (dump, backup, acesso de
leitura), não consegue ler minhas chaves em texto plano. Eu continuo
cadastrando e trocando as credenciais normalmente pela tela de configurações,
sem perceber diferença no uso.

**Why this priority**: Hoje as credenciais ficam em texto plano no banco — um
dump vaza acesso à conta de IA (custo) e ao gateway de WhatsApp. É o maior risco
de dados sensíveis do sistema.

**Independent Test**: Cadastrar uma credencial pela tela; inspecionar o valor
gravado no banco e confirmar que NÃO é o texto plano; usar a funcionalidade
(testar conexão de IA / enviar WhatsApp) e confirmar que funciona (a aplicação
decifra corretamente em memória).

**Acceptance Scenarios**:

1. **Given** uma credencial cadastrada pela tela de configurações, **When** o
   valor é lido diretamente do banco, **Then** ele está cifrado (não é o texto
   plano digitado).
2. **Given** uma credencial cifrada no banco, **When** a aplicação a usa (chamar
   a IA, enviar WhatsApp), **Then** ela é decifrada em memória e funciona
   normalmente.
3. **Given** a tela de configurações, **When** exibida, **Then** a credencial
   nunca é mostrada em claro (mascarada); trocar por um valor novo re-cifra;
   deixar o campo mascarado mantém o valor atual.
4. **Given** credenciais já existentes em texto plano (legado), **When** a
   feature entra em vigor, **Then** elas são migradas para o formato cifrado sem
   perda de acesso.

---

### User Story 2 - Respostas HTTP endurecidas (Priority: P2)

Como usuário, minha navegação é protegida por cabeçalhos de segurança padrão
que o navegador passa a respeitar (evitar embutir o app em iframe de terceiros,
não "adivinhar" tipos de conteúdo, forçar HTTPS, limitar vazamento de referrer).

**Why this priority**: Defesa em profundidade barata contra clickjacking,
sniffing e downgrade. Independe das outras histórias.

**Independent Test**: Requisitar qualquer página e inspecionar os cabeçalhos de
resposta; confirmar a presença dos cabeçalhos de segurança definidos.

**Acceptance Scenarios**:

1. **Given** qualquer resposta do app, **When** inspecionada, **Then** inclui os
   cabeçalhos de segurança (proteção contra enquadramento, `nosniff`, política
   de referrer, HSTS em produção).
2. **Given** a política de conteúdo definida, **When** o app é usado, **Then**
   ela não quebra funcionalidades legítimas da interface existente.

---

### User Story 3 - IA resiliente e com custo sob controle (Priority: P2)

Como dono da instância, quando o provedor de IA está lento, instável ou fora do
ar, o app não trava indefinidamente: a chamada tem tempo limite e é retentada de
forma sensata antes de desistir com uma mensagem clara. Além disso, existe um
teto de consumo por usuário para que um uso anômalo (ou um loop) não gere uma
fatura surpresa no provedor.

**Why this priority**: Hoje uma chamada de IA pode pendurar a requisição
(sem timeout), falhar sem retry numa instabilidade transitória, e não há teto de
gasto — um abuso (ex.: pelo WhatsApp) consome tokens sem limite.

**Independent Test**: Simular provedor lento (estoura o timeout) → erro amigável
em tempo limitado; simular falha transitória (ex.: 503 seguido de sucesso) →
retry conclui; exceder o teto diário de um usuário → próxima chamada é recusada
com mensagem clara, sem contatar o provedor.

**Acceptance Scenarios**:

1. **Given** o provedor demora além do tempo limite, **When** a IA é chamada,
   **Then** a chamada é abortada e o usuário recebe erro amigável dentro do
   limite de tempo (não trava).
2. **Given** uma falha transitória do provedor (rede/5xx/limite temporário),
   **When** a IA é chamada, **Then** há novas tentativas com espera crescente
   antes de desistir; se uma tentativa tem sucesso, a resposta é entregue.
3. **Given** um usuário que atingiu o teto de consumo do dia, **When** faz nova
   chamada de IA, **Then** a chamada é recusada com mensagem clara e **não**
   contata o provedor (não gera custo).
4. **Given** qualquer erro do provedor, **When** exibido ao usuário, **Then** a
   mensagem é genérica/curada; o detalhe técnico (corpo da resposta do provedor)
   é registrado no servidor, não devolvido ao cliente.

---

### User Story 4 - Entradas externas validadas (Priority: P3)

Como dono da instância, arquivos enviados para importação e conteúdo gerado pela
IA são tratados com desconfiança: uploads têm tipo e tamanho validados antes do
processamento, e o conteúdo do assistente é renderizado sem permitir injeção de
HTML/script.

**Why this priority**: Reduz superfície de ataque (upload malicioso, XSS via
conteúdo do LLM). P3 porque as superfícies são de uso próprio, mas é higiene
necessária antes de abrir para mais usuários.

**Independent Test**: Enviar um arquivo de tipo/tamanho não permitido → rejeitado
antes do processamento; renderizar conteúdo do assistente contendo marcação
perigosa → nenhuma execução de script.

**Acceptance Scenarios**:

1. **Given** o fluxo de importação, **When** um arquivo de tipo não suportado ou
   acima do tamanho máximo é enviado, **Then** é rejeitado com mensagem clara
   antes de qualquer processamento.
2. **Given** o conteúdo renderizado do assistente, **When** contém marcação que
   tentaria injetar script/HTML, **Then** ele é exibido como texto/markdown
   seguro, sem executar.

---

### Edge Cases

- Ausência da chave de cifra (segredo mestre) no ambiente: a aplicação deve
  falhar de forma explícita ao tentar cifrar/decifrar — nunca gravar/ler em
  texto plano silenciosamente.
- Valor cifrado corrompido/adulterado: a decifragem falha de forma controlada
  (o app trata como "credencial inválida", não quebra).
- Rotação do segredo mestre: precisa haver um caminho definido (re-cifrar os
  segredos) — mesmo que manual e documentado.
- Teto de custo com o relógio virando o dia: a contagem é por dia (fuso do app);
  a virada zera a contagem.
- Retry não pode transformar uma operação única em várias execuções com efeito
  colateral (ex.: não duplicar um lançamento): retentar apenas chamadas
  idempotentes de leitura/geração, não a ação que grava.
- CSP não pode quebrar a interface já redesenhada (estilos/scripts legítimos).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: As credenciais sensíveis persistidas (chave de API da IA; token,
  client-token e segredo de lembretes do WhatsApp) MUST ser cifradas em repouso
  com criptografia autenticada; o texto plano nunca é gravado.
- **FR-002**: A aplicação MUST decifrar as credenciais em memória apenas no
  momento do uso; a decifragem depende de um segredo mestre fornecido pelo
  ambiente (fora do banco e fora do repositório).
- **FR-003**: A ausência do segredo mestre MUST fazer as operações de
  cifra/decifra falharem de forma explícita — nunca degradar para texto plano.
- **FR-004**: A tela de configurações MUST continuar mascarando as credenciais e
  permitir troca sem exibir o valor atual; manter o campo mascarado preserva o
  valor; um valor novo re-cifra.
- **FR-005**: Credenciais legadas em texto plano MUST ser migradas para o
  formato cifrado sem perda de acesso (script de migração com backup/dry-run).
- **FR-006**: As respostas HTTP MUST incluir cabeçalhos de segurança: proteção
  contra enquadramento (frame-ancestors/X-Frame-Options), `X-Content-Type-Options`,
  política de referrer, HSTS em produção e uma Content-Security-Policy que não
  quebre a interface existente.
- **FR-007**: Toda chamada ao provedor de IA MUST ter tempo limite; ao estourar,
  a chamada é abortada e o usuário recebe erro amigável dentro do limite.
- **FR-008**: Falhas transitórias do provedor (rede, 5xx, limite temporário)
  MUST ser retentadas com espera crescente até um teto de tentativas; apenas
  chamadas sem efeito colateral de escrita são retentadas.
- **FR-009**: MUST existir um teto de consumo de IA por usuário por dia; ao ser
  atingido, novas chamadas são recusadas com mensagem clara SEM contatar o
  provedor (não geram custo).
- **FR-010**: Mensagens de erro do provedor de IA exibidas ao usuário MUST ser
  genéricas/curadas; o corpo técnico da resposta do provedor MUST ser registrado
  no servidor, não devolvido ao cliente.
- **FR-011**: Uploads de importação MUST ter tipo (MIME) e tamanho validados na
  server action antes do processamento; arquivos fora do permitido são
  rejeitados com mensagem clara.
- **FR-012**: O conteúdo gerado pela IA MUST ser renderizado sem permitir
  injeção de HTML/script (sem HTML cru não sanitizado).
- **FR-013**: A feature MUST incluir testes automatizados cobrindo: round-trip
  de cifra/decifra e falha sem o segredo mestre; teto de custo bloqueando sem
  chamar o provedor; timeout e retry da IA; não-vazamento do corpo de erro do
  provedor (constituição, princípio VI).

### Key Entities

- **Credencial sensível**: valor secreto persistido (chave de IA, tokens de
  WhatsApp, segredo de lembretes) — passa a ser armazenado cifrado.
- **Segredo mestre**: chave de cifragem fornecida pelo ambiente, usada para
  cifrar/decifrar as credenciais; nunca no banco nem no repositório.
- **Consumo de IA**: registro de uso (tokens/custo) por usuário e dia, base do
  teto diário.
- **Chamada de IA**: requisição ao provedor com tempo limite, política de retry
  e contabilização de consumo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das credenciais sensíveis lidas diretamente do banco estão
  cifradas (nenhuma em texto plano) após a migração.
- **SC-002**: 100% das funcionalidades que usam credenciais (testar IA, enviar
  WhatsApp, webhook, reminders) continuam funcionando após a cifragem.
- **SC-003**: Uma resposta HTTP amostrada apresenta 100% dos cabeçalhos de
  segurança definidos; a interface existente continua funcional.
- **SC-004**: Chamada de IA a um provedor que excede o tempo limite retorna erro
  amigável em ≤ tempo limite + margem, em 100% dos casos (não trava).
- **SC-005**: Uma falha transitória seguida de sucesso é entregue com sucesso
  via retry; o número de tentativas respeita o teto configurado.
- **SC-006**: Usuário no teto diário: 100% das novas chamadas são recusadas sem
  nenhuma requisição ao provedor (0 custo).
- **SC-007**: Nenhuma mensagem de erro exibida ao usuário contém o corpo técnico
  da resposta do provedor (verificado por teste).
- **SC-008**: Upload de tipo/tamanho inválido é rejeitado em 100% dos casos
  antes do processamento; a suíte de testes permanece verde.

## Assumptions

- **Algoritmo de cifra**: criptografia autenticada padrão (ex.: AES-256-GCM) com
  segredo mestre em variável de ambiente (`SECRETS_KEY` ou equivalente), no
  mesmo espírito de `SESSION_SECRET`/`CRON_SECRET` (obrigatório, sem fallback).
- **Gerência de chaves pela UI**: as credenciais continuam geridas pela tela de
  configurações (não migradas para env), para o dono poder trocá-las sem
  redeploy; por isso a cifragem no banco (não env) é o caminho.
- **Teto de custo**: contabilizado em tokens por usuário por dia; o valor do
  teto e o comportamento exato (bloquear vs avisar) são decididos no clarify.
  Persistência durável (não memória de processo), compatível com serverless.
- **CSP**: começa pragmática para não quebrar a UI redesenhada; pode iniciar
  parte da política em modo report-only se necessário (decisão no clarify).
- **Retry idempotente**: apenas as chamadas de geração/leitura à IA são
  retentadas; a gravação de lançamentos (ex.: via WhatsApp) não é duplicada.
- **Fora de escopo**: refactor amplo de qualidade/ESLint (feature de engenharia),
  observabilidade/Sentry (feature de testes/observabilidade), e mudanças de
  modelo de dados não relacionadas a segredos/consumo.
- **Rastreabilidade**: pontos concretos no Input e em `docs/PLANO-DE-ACAO.md`
  (Módulos 4 e 6); a fase de plano enumera arquivos/linhas.
