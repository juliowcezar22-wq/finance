<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Modified principles: n/a (adoção inicial)
- Added sections:
  - Core Principles (7 princípios: I–VII)
  - Restrições de Segurança e Dados
  - Fluxo de Desenvolvimento e Quality Gates
  - Governance
- Removed sections: placeholders do template (5 slots → 7 princípios)
- Follow-up TODOs: nenhum
-->

# Constituição do Nummiq

App de finanças pessoais multiusuário: Next.js 14 (App Router) + Prisma 5 +
Postgres (Supabase). Fontes normativas complementares: `CLAUDE.md`,
`docs/AMBIENTES.md`, `docs/PLANO-DE-ACAO.md`.

## Core Principles

### I. Segurança P0 nunca é adiada

Nenhum item de segurança classificado como P0 pode ser postergado para depois de
um lançamento ou merge. Se o prazo apertar, corta-se feature — nunca segurança.
Specs e plans que toquem autenticação, autorização, sessão ou superfícies
públicas DEVEM tratar as correções P0 como bloqueantes de release.

### II. Isolamento multi-tenant pela extensão Prisma

O isolamento entre usuários é garantido exclusivamente pela extensão de escopo
de dono em `src/lib/prisma.ts` (owner-scope), NUNCA por filtros manuais de
`ownerId` espalhados em queries. Toda server action DEVE autenticar no topo via
`getViewer()` (ou `requireAdmin()` para operações administrativas) antes de
qualquer acesso a dados. Código que contorne a extensão (uso do client base,
`runWithoutScope`) só é permitido em scripts de manutenção e DEVE ser
justificado no próprio código.

*Racional*: filtros manuais já falharam neste projeto (IDOR em 11 arquivos de
actions); um único ponto de aplicação é auditável, filtros espalhados não são.

### III. Banco de dados só por canais guardados

Todo comando de banco passa por `scripts/with-env.ts`, que exige
`APP_ENV` = `development` ou `test`. É PROIBIDO contornar a guarda chamando
`prisma` diretamente com URLs no shell. Mudanças de schema DEVEM gerar migration
via `npm run db:migrate` (`db:push` apenas para protótipo rápido). Scripts de
manutenção de dados DEVEM ter dry-run por padrão e viver em `scripts/`.
Credenciais de produção NUNCA entram neste repositório; produção é migrada
somente pelo build da Vercel.

### IV. Nenhum segredo hardcoded ou com fallback

Código não contém segredos, nem fallbacks de segredos (ex.: valor default para
`SESSION_SECRET`). A ausência de um segredo obrigatório DEVE falhar o boot de
forma explícita, nunca degradar silenciosamente para um valor conhecido.
Segredos persistidos no banco (chaves de API de IA, tokens de WhatsApp) DEVEM
ser cifrados em repouso. Comparações de segredos DEVEM ser timing-safe.

### V. Precisão financeira

Valores monetários usam `Decimal` no schema Prisma — nunca `Float`. Regras de
data (competência de fatura, vencimentos, agrupamentos mensais) usam o fuso
`America/Sao_Paulo`. Cálculos financeiros centrais (`src/lib/services/`) são
código crítico: mudanças neles DEVEM preservar resultados comprovados por
testes de caracterização.

### VI. Lógica financeira e de autorização exige testes

Toda spec que toque lógica financeira (cálculos, parcelamento, importação,
regras) ou de autorização (guards, escopo de dono, sessão) DEVE declarar testes
automatizados explicitamente como requisito funcional — os templates de spec
tratam testes como opcionais, portanto a omissão vale como não-conformidade
nesta constituição. Correções de segurança DEVEM incluir teste que reproduza o
ataque bloqueado (ex.: intrusão com dois usuários).

### VII. TypeScript estrito na borda

`strict` permanece ligado. Toda entrada externa (formulários, uploads, webhooks,
respostas de provedores) é validada com zod na borda. Nenhum `any` novo entra no
código; os existentes só diminuem. Server actions retornam o tipo padronizado
`ActionResult<T>` com erros tratados — exceções de validação não vazam cruas
para o client.

## Restrições de Segurança e Dados

- Ambientes: `.env` (Nummiq Dev), `.env.test` (mesmo banco de dev — atenção:
  `db:test:reset` apaga dados de dev), produção só na Vercel/Supabase Prod.
- `prisma/security/rls-hardening.sql` DEVE estar aplicado em todos os bancos;
  RLS fecha a API REST pública do Supabase mas NÃO isola tenants — o isolamento
  é o Princípio II.
- Superfícies públicas (webhooks, crons) DEVEM autenticar via segredo em header
  com comparação timing-safe; segredo em query string é não-conformidade.
- Experimentos destrutivos só no banco de testes.

## Fluxo de Desenvolvimento e Quality Gates

- Trabalho estruturado por features Speckit em `specs/###-nome/`; branch git
  `###-nome` criada manualmente antes do `specify`; artefatos de spec são
  commitados junto com o código da feature.
- `speckit-implement` só inicia com working tree limpo.
- Gates de merge de uma feature: critério de "pronto" da spec atendido;
  checkboxes correspondentes do `docs/PLANO-DE-ACAO.md` marcadas; testes da
  feature verdes; nenhum item P0 aberto na área tocada.
- O gate "Constitution Check" de todo `plan.md` DEVE citar os princípios
  desta constituição afetados pela feature e como serão cumpridos.

## Governance

Esta constituição prevalece sobre qualquer outra prática documentada quando
houver conflito. Emendas exigem: atualização deste arquivo com bump de versão
semântico (MAJOR: remoção/redefinição incompatível de princípio; MINOR: novo
princípio ou expansão material; PATCH: clarificação), registro no Sync Impact
Report e menção no commit. Revisões de conformidade acontecem no
`speckit-analyze` de cada feature e na revisão de merge; violações DEVEM ser
justificadas por escrito na seção Complexity Tracking do plan ou corrigidas
antes do merge. Orientação operacional de runtime para agentes permanece em
`CLAUDE.md`.

**Version**: 1.0.0 | **Ratified**: 2026-08-08 | **Last Amended**: 2026-08-08
