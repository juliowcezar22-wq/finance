# Plano de execução — Repaginação visual Nummiq (NQ UI)

Branch `ui-redesign` (worktree isolado). Fonte de verdade visual:
`docs/NUMMIQ_DESIGN_SYSTEM.md`. Regras funcionais: SpecKit (`specs/`).
**Nada de backend/regra de negócio é alterado** — só apresentação.

## A. O que a auditoria encontrou (estado real)

| Área | Hoje | Ação |
|---|---|---|
| Stack | Next 14.2 (App Router), React 18, Tailwind 3.4, Radix UI, clsx+tailwind-merge | Mantém |
| Ícones | **lucide-react 0.460** já instalado + um set custom em `public/brand/icons/*.svg` | Padronizar em Lucide; aposentar ícones custom (DS §27/§28) |
| Gráficos | **Sem lib** — `bar-chart.tsx` é SVG caseiro | Manter caseiro e re-tematizar (controle total da paleta; sem recharts) |
| Tema | shadcn HSL (`--background`…): **roxo #6F2CFF + dourado #D4AF37 + preto azulado #0A0A0F** | Substituir pela paleta Nummiq (preto neutro #050505 + platinum) |
| Fonte | `@import` Google Fonts (**Orbitron + Inter**) via URL externa | Inter via `next/font` (self-host); **remover Orbitron** |
| Marca | Assets **Bugia** (logo, símbolo, **mascote** PNG) em `public/brand/` | Aposentar mascote/marca Bugia; **logo Nummiq não existe** (ver §D) |
| Componentes base | 12 em `components/ui/` (button, card, input, select, dialog, table, badge, tabs, textarea, label, progress, record-card) | Refatorar para NQ UI + criar os que faltam |
| Toast | `@radix-ui/react-toast` instalado e **nunca usado** | Finalmente ligar (DS §80) |
| Telas | 21 páginas + 18 dialogs; `app-shell`, `sidebar`, `mobile-nav`, `mobile-menu`, `page-header` | Migrar em ondas |
| Rotas mortas | `/faturas`, `/receber`, `/fluxo-de-caixa` (só redirects) | Ignorar/limpar na Onda 5 |

## B. Estratégia central (decisões de arquitetura visual)

1. **Rebasear tokens, não reescrever classNames.** O app inteiro usa
   `bg-card`, `text-foreground`, `bg-primary`, `border-border` (mapeados às HSL
   vars do shadcn). Em vez de trocar classe por classe em 21 telas, eu
   **redefino os tokens** (`--background`, `--card`, `--primary`, `--border`,
   `--foreground`…) para os valores Nummiq. Resultado: reskin global imediato,
   risco mínimo de regressão. Em paralelo, introduzo os tokens `--nq-*` (DS §78)
   e o namespace Tailwind `nummiq` (DS §79) como fonte de verdade daqui pra
   frente; os componentes migram para eles progressivamente.
2. **Charts caseiros re-tematizados** (não adicionar recharts): alinha com "não
   usar paleta padrão de lib" e mantém controle total — menos risco.
3. **`next/font` para Inter**: remove request externo render-blocking e o
   Orbitron. `tabular-nums` como padrão em valores.
4. **Nada de backend**: contratos de server action, rotas, cálculos e schema
   intactos. Onde um componente precisa de dado, consome o que já existe.

## C. Ondas e tasks

### ONDA 0 — Fundação de tokens & tipografia (serial; base de tudo)
- **T1** `globals.css`: inserir bloco `--nq-*` completo (DS §78) + rebasear os
  tokens semânticos legados para valores Nummiq; remover `.card-premium` roxo,
  `.app-shell` glow roxo/dourado, `--gold`, `--primary` roxo.
- **T2** `tailwind.config.ts`: adicionar `colors.nummiq` (DS §79), radius
  sm8/md12/lg16/xl20, escala de spacing 4→64; remover `fontFamily.display`
  (Orbitron); manter aliases legados apontando para os novos valores.
- **T3** `layout.tsx`: Inter via `next/font/google` self-hosted; remover
  `@import` externo; `tabular-nums` no `body`; manter script anti-FOUC dark.
- **T4** Utilitários de tipografia (Display/H1/H2/H3/Body/Label/Caption),
  foco visível global (DS §76), tokens de transição/easing (DS §56/§57).

### ONDA 1 — NQ UI: componentes base (serial-ish; alguns paralelos)
- **T5** `Button` (variants primary/secondary/ghost/danger/link; sizes
  sm/md/lg/icon; estados hover/focus/active/disabled/loading; primary =
  gradiente platinum, texto escuro — DS §38/§82).
- **T6** Família de formulário: `Input`, `Textarea`, `Select`, `Label` +
  novos `Checkbox`/`Radio`/`Switch`; altura 44px, focus platinum, estados
  error/disabled (DS §42–§44, §84).
- **T7** `Card` (default/interactive/premium/flat/danger — DS §83), `StatCard`,
  `FinancialValue` (tabular-nums, +/- verde/vermelho **só** semântico).
- **T8** `Table` base (divisórias horizontais, valor à direita), `Badge` pill,
  `Tooltip`, `DropdownMenu` (Ellipsis), `Modal`, `Drawer`, `Skeleton`,
  `EmptyState`, `Toast` (ligar o Radix já instalado + `<Toaster>` no layout).
- **T9** App Shell: `Sidebar` 240/72 com colapso, `Header` 72px
  (título · busca · notificações · perfil), drawer mobile; marca (símbolo+nome
  / símbolo); `CommandPalette` (⌘K) **visual, sem backend** (DS §22–§32).

### ONDA 2 — Página piloto: Visão Geral (padrão de qualidade)
- **T10** Reconstruir `/dashboard` (DS §33/§87): saudação, Patrimônio (Display),
  KPIs Receitas/Despesas/Saldo, Fluxo de Caixa, distribuição, transações
  recentes. **Adaptado aos dados reais** do sistema.
- **T11** Re-tematizar `bar-chart.tsx` (linha #D8D8DA, grid rgba .045, área
  gradiente prata, tooltip como card — DS §49–§52).
- **T12** Passar o checklist DS §92 no dashboard (desktop/tablet/mobile +
  estados). Vira o gabarito das demais telas.

### ONDA 3 — Áreas financeiras (LOOP / fan-out) — **após a 002 mergear**
- **T13+** Propagar o padrão para: `transacoes`, `receitas`, `despesas`,
  `caixa`, `cartoes`, `cartoes/[id]`, `pessoas`, `pessoas/[id]`, `importar`,
  `metas` — página + seus dialogs. **É aqui que a engenharia de looping entra.**
- ⚠️ **Dependência da feature 002 (Decimal):** essas telas exibem/editam
  dinheiro, que a 002 está migrando de `Float`→`Decimal`. Fazer **depois** do
  merge da 002 no `main` → `merge main → ui-redesign` → então migrar. Evita
  retrabalho e conflito semântico.

### ONDA 4 — Áreas secundárias
- `regras`, `usuarios`, `configuracoes`, `assistente`, `whatsapp`, e `login`
  (layout institucional split — DS §66).

### ONDA 5 — Polimento & regressão
- Sweep mobile/tablet; loading/empty/error padronizados; acessibilidade (DS
  §75–§77); microinterações; **remover legado** (mascote Bugia, `card-premium`,
  utils `gold`, `unlinked-banner`, ícones custom); favicon símbolo NQ;
  `npm run build` verde + revisão de regressão funcional.

## D. Engenharia de looping — onde de fato se aplica

Não é para tudo. A fundação (Ondas 0–1) é **serial** — tudo depende dela, loop
não ajuda. O ganho está nas **Ondas 3–4**, onde cada tela é uma unidade quase
independente com critério de aceite objetivo (checklist DS §92):

> **Loop por tela:** migrar tela → auto-avaliar contra o checklist §92 →
> corrigir o que reprovar → repetir até 15/15. O dashboard (Onda 2) é o
> gabarito; o loop replica o padrão nas demais.

Isso é fan-out real: telas independentes, mesmo padrão-alvo, verificação
mecânica. Rodável em ondas paralelas, com merge frequente no `main`.

## E. Decisões que preciso de você (antes/durante a Onda 1)

1. **Logo Nummiq não existe.** `public/brand/` só tem assets Bugia. O DS §26
   diz "não recrie a logo". Opções: (a) você fornece os SVGs
   (`nummiq-symbol.svg`, `nummiq-logo.svg`…); (b) eu uso um símbolo **"NQ"
   tipográfico** sóbrio como placeholder até você fornecer. Qual?
2. **Nomenclatura da navegação** (DS §25/§63 vs. rótulos atuais) — confirme:
   - `/transacoes` hoje é "Movimentações" → renomear para **"Transações"**?
   - `/cartoes` hoje é "Contas bancárias" → **"Cartões"**, **"Contas"** ou manter?
   - `/caixa` hoje é "Caixa" → **"Reservas"** (DS) ou manter **"Caixa"**?
   - `/metas` existe mas **não está na sidebar** hoje → adicionar **"Metas"**?
   - Itens do DS sem rota real (Investimentos, Relatórios, Planejamento, Fluxo
     de Caixa, Ajuda) **não serão criados** (não inventar página). Ok?
3. **Mascote Bugia**: o DS pede estética institucional, sem mascote/cartoon.
   Confirmo a remoção do mascote da UII (componente `mascot.tsx` + PNGs)?

## F. Coordenação com a feature 002 (outra sessão)

- Ondas 0–2 (fundação, componentes, dashboard) **não colidem** com a 002
  (backend/dados). Podem começar já.
- Onda 3 (telas de dinheiro) **espera** a 002 mergear no `main`.
- `merge main → ui-redesign` com frequência para absorver a 002 aos poucos.
- Rodar o app do worktree contra o banco compartilhado só depois da 002
  estabilizar o schema (senão Prisma client antigo × coluna Decimal quebra).

## G. Fora de escopo (preservado)
Regras de negócio, banco, migrations, integrações, autenticação, permissões,
cálculos, rotas, APIs, contratos de dados e fluxos já validados.
