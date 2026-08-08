# Research — 001-seguranca-acesso (Phase 0)

Decisões técnicas que resolvem os pontos em aberto do Technical Context.
Referências de código conferidas no commit atual da branch.

## R1. Revogação de sessão: `sessionVersion` validado no Node runtime

**Decision**: Adicionar `User.sessionVersion Int @default(0)`. O payload do
token ganha `sv` (`{ uid, role, sv, exp }`). `getCurrentUser`
(`src/lib/auth/current-user.ts`) — que já faz `prisma.user.findUnique` com
`React.cache` — passa a rejeitar sessões com `payload.sv !== user.sessionVersion`.
`logoutAction` incrementa `sessionVersion` e apaga o cookie. O middleware Edge
(`src/middleware.ts`) continua validando apenas HMAC + `exp`.

**Rationale**: o middleware Edge não pode consultar o banco (restrição já
documentada no próprio arquivo); a validação completa sempre foi
responsabilidade do Node runtime. Como `getCurrentUser` já busca o usuário a
cada request autenticado, a revogação não custa query extra. Incrementar a
versão derruba todas as sessões do usuário — exatamente o escopo decidido no
clarify.

**Alternatives considered**: tabela de sessões (revogação por dispositivo) —
mais controle, porém +1 tabela, +1 consulta por request e manutenção de
expirados; rejeitada no clarify. Trocar `SESSION_SECRET` a cada logout —
derruba todos os usuários, inviável.

**Tokens antigos** (sem campo `sv`): tratados como `sv = -1` → inválidos após a
migration. Efeito colateral aceito: todos os usuários fazem relogin uma vez.

## R2. Segredo de sessão obrigatório (boot fail-fast)

**Decision**: remover o fallback nos dois pontos (`src/lib/auth/session.ts:11-14`
e `src/middleware.ts:14-16`). Em `session.ts`, lançar erro no carregamento do
módulo se `SESSION_SECRET` estiver ausente ou tiver < 32 chars. No middleware
Edge, sem o segredo toda sessão é considerada inválida (redirect a `/login`) —
fail-closed, nunca fallback. `.env.example` e `docs/AMBIENTES.md` ganham a
variável como obrigatória; `generateSecret()` (já existe em `session.ts:72`)
documentado como gerador.

**Rationale**: princípio IV da constituição; fallback conhecido = token forjável
por qualquer pessoa que leia o repositório.

**Alternatives considered**: warning em produção (comportamento atual
prometido no comentário, nunca implementado) — rejeitado: aviso não impede
forja.

## R3. Lockout de login: tabela `LoginAttempt` no Postgres

**Decision**: tabela `LoginAttempt { id, email, ip, success, createdAt }` com
índice `(email, createdAt)`. No `loginAction`: contar falhas dos últimos 15 min
para o e-mail informado (normalizado) — o IP é registrado para auditoria mas
não participa da regra de bloqueio; se ≥ 5 →
retornar o MESMO erro genérico "E-mail ou senha incorretos" com uma nota de
espera, sem revelar existência da conta. Toda tentativa (sucesso/falha) é
registrada; sucesso zera a contagem na prática (janela deslizante só conta
falhas posteriores ao último sucesso). Limpeza oportunista: apagar registros
com mais de 24h no próprio fluxo de login (best-effort).

**Rationale**: decisão do clarify (Postgres, sem infra nova); sobrevive a
instâncias serverless; volume mínimo (< 50 usuários). IP obtido de
`x-forwarded-for` (primeiro hop) — na Vercel é confiável o suficiente para
rate limit de conveniência.

**Alternatives considered**: Upstash Redis (TTL nativo, mas +1 vendor e +1
segredo — rejeitado no clarify); memória de processo (não sobrevive ao
serverless — rejeitado na spec, FR-007).

**Modelo global**: `LoginAttempt` NÃO entra em `OWNED_MODELS` (roda antes de
existir sessão); acesso apenas pelo fluxo de auth.

## R4. Escrita com escopo de dono atômica (fim do TOCTOU) e órfãos bloqueados

**Decision**: na extensão de `src/lib/prisma.ts`:

- `update`/`delete` de modelos com dono deixam de fazer pré-checagem
  read-then-write; viram `updateMany`/`deleteMany` no client base com
  `where: { ...args.where, ownerId }` — uma única instrução SQL, atômica por
  natureza. `count === 0` → lançar `"Registro não encontrado."` (não vaza
  existência). Quando o call site precisa do registro de retorno (`update`
  devolve o row), buscar com `findUnique` APÓS a escrita — a parte crítica
  (escrita escopada) já foi atômica.
- `upsert`: decompor em `updateMany` escopado; se `count === 0` e não existir
  registro com aquele `where` único (verificado no client base), `create` com
  `ownerId` injetado, dentro de `base.$transaction` interativa.
- Órfãos: com `ownerId` no `where`, registro com `ownerId NULL` simplesmente
  não casa → bloqueado por construção (FR-003). Mesmo tratamento no pós-filtro
  de `findUnique`: hoje `res.ownerId != null && res.ownerId !== ownerId` deixa
  órfão passar (`src/lib/prisma.ts:93`); passa a ser `res.ownerId !== ownerId`
  (órfão → `null` para usuário comum). Saneamento de órfãos permanece possível
  via `runWithoutScope` nos scripts (`scripts/README.md`).
- Auditoria prévia dos call sites: `update` com nested writes de relação não
  passa por `updateMany` — inventariar com grep na implementação; caso exista,
  usar o caminho `$transaction` interativa para esses casos.

**Rationale**: elimina a janela TOCTOU sem transação interativa no caminho
comum; `updateMany` com `where` composto é o idioma Prisma para "update se
ainda for meu".

**Alternatives considered**: `$transaction` interativa com nível serializable
para todo update/delete — correto, porém overhead e complexidade no hot path;
mantido só para `upsert`/nested. RLS de banco — não isola tenants aqui (app
conecta como `postgres`, dono das tabelas; documentado em
`prisma/security/rls-hardening.sql`).

## R5. Guard e validação nas actions de fatura

**Decision**: `payInvoice` e `setInvoiceStatus`
(`src/lib/actions/invoices.ts:7,24`) ganham `await getViewer()` na primeira
linha (padrão das outras 11 actions). Entradas validadas com zod:
`payInvoice` → `amount` numérico finito > 0; `setInvoiceStatus` → whitelist de
status conferida no código de faturas existente (`aberta`/`parcial`/`paga` —
confirmar enum exato no call site durante implementação). Leitura+escrita de
`payInvoice` (soma de `paid`) embrulhadas em `prisma.$transaction` para o
recálculo não sofrer corrida com pagamentos concorrentes.

**Rationale**: fecha o gap do Módulo 1; a extensão (R4) já garante o escopo de
dono — o guard cobre autenticação/redirect e o zod cobre entrada maliciosa
(princípio VII).

## R6. Webhook WhatsApp: header `client-token` timing-safe, fail-closed

**Decision**: `POST /api/whatsapp/webhook` passa a exigir header
`client-token` (nome padrão do recurso "Client-Token de segurança" do Z-API,
que o gateway envia nas chamadas de webhook quando configurado; provider
`custom`/Evolution configura o mesmo header no cadastro do webhook). Comparação
com `WhatsAppSetting.clientToken` via `crypto.timingSafeEqual` (rota roda no
Node runtime). Fail-closed em três camadas: sem `clientToken` configurado →
recusar tudo (501 "não configurado"); header ausente/errado → 401 sem tocar
banco nem IA; `settings.enabled === false` → recusar. O healthcheck GET
continua público mas deixa de citar o nome interno do serviço.

**Rationale**: o campo `clientToken` já existe no modelo
(`prisma/schema.prisma:510`, comentário "header de segurança (Z-API)") — a
feature o torna obrigatório e verificado. FR-008/FR-013.

**Alternatives considered**: assinatura HMAC do corpo — Z-API não assina
webhooks; segredo na URL — proibido pela spec (FR-009 vale como princípio geral);
mTLS — inviável no gateway.

## R7. Reminders: `Authorization: Bearer` com `CRON_SECRET`

**Decision**: `/api/whatsapp/reminders` deixa de aceitar `?secret=` e passa a
exigir `Authorization: Bearer <CRON_SECRET>` comparado com
`crypto.timingSafeEqual` contra `process.env.CRON_SECRET`. GET é mantido
(Vercel Cron chama GET e injeta o header `Authorization: Bearer ${CRON_SECRET}`
automaticamente quando a env existe); POST removido. O campo
`WhatsAppSetting.remindersSecret` é aposentado (deixa de ser lido; remoção da
coluna fica para a 002 junto das outras mudanças de schema).

**Rationale**: padrão nativo da plataforma de deploy, zero código de
agendamento; tira o segredo da URL (que vaza em logs de proxy/CDN) — FR-009.

**Alternatives considered**: manter `remindersSecret` no banco mas em header —
funciona, porém segredo em texto plano no banco é exatamente o que a feature
003 vai eliminar; `CRON_SECRET` em env já nasce no lugar certo.

## R8. Remetente autorizado: igualdade exata normalizada

**Decision**: `isAllowedSender` (`src/lib/whatsapp/provider.ts:40-47`) passa a
exigir igualdade exata entre `normalizeNumber(from)` e
`normalizeNumber(settings.myNumber)` (dígitos completos com DDI). A única
tolerância mantida: equivalência BR com/sem o 9º dígito (`55 + DDD + 9XXXXXXXX`
≡ `55 + DDD + XXXXXXXX`) — canonicalizar inserindo o 9 quando o número é BR de
12 dígitos, e então comparar por igualdade. Nada de `endsWith`/sufixo.

**Rationale**: `endsWith` de 8–11 dígitos permite forjar o campo `from` no JSON
com qualquer prefixo; a canonicalização BR evita quebrar o remetente legítimo
quando o gateway alterna o formato (comportamento conhecido do WhatsApp BR).

**Alternatives considered**: igualdade estrita sem canonicalização — quebraria
o uso legítimo dependendo do gateway; lista de números autorizados — fora do
escopo (campo é singular hoje).

## R9. Deduplicação por unicidade no banco

**Decision**: `WhatsAppMessage` ganha `providerMessageId String? @unique`.
`parseIncoming` (`src/lib/whatsapp/parse.ts`) extrai o id da mensagem do
payload (Z-API: `messageId`; Evolution: `key.id`; fallback `null`). O log de
entrada é gravado ANTES de processar, com o id; violação de unicidade (P2002)
→ responder `{ ok: true, ignored: "duplicate" }` sem processar. Mensagem sem
id do provedor: processada normalmente (fallback documentado — retries do
Z-API sempre trazem o mesmo id).

**Rationale**: constraint de unicidade é atômica entre instâncias serverless —
sem janela de corrida entre "já vi?" e "gravei". Janela de dedupe = retenção
das linhas (indefinida hoje, suficiente; FR-011).

**Alternatives considered**: tabela dedicada de dedupe com TTL — mais limpeza
para o mesmo efeito; checagem `findFirst` antes de gravar — TOCTOU de novo.

## R10. Runner de testes: Vitest mínimo nesta feature

**Decision**: instalar `vitest` (devDependency) com config mínima
(`vitest.config.ts` com alias `@/* → src/*`). Duas categorias:
unit (token/comparações/normalização — sem banco) e integração
(`tests/security/*.test.ts` contra o banco de `.env.test`, carregado via o
mesmo mecanismo de `scripts/with-env.ts`; dados de teste com prefixo
`test-001-` e limpeza no `afterAll`). Script `npm run test` +
`npm run test:security`. Playwright e cobertura ampla ficam na feature 005.

**Rationale**: princípio VI exige testes nesta feature; o mínimo viável é o
runner + a suíte de segurança. `.env.test` compartilha o banco de dev (limite
do plano free) — testes não podem truncar tabelas; usam registros próprios.

**Alternatives considered**: adiar testes para a 005 — viola a constituição;
Jest — Vitest tem suporte TS/ESM nativo e é o runner já planejado no Módulo 11.
