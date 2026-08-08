# Nummiq Design System
## Guia oficial de identidade visual, UI e experiência da plataforma

> **Status:** Fonte oficial de verdade para a interface da Nummiq  
> **Uso:** Refatoração visual, desenvolvimento de novas telas, revisão de componentes, criação de specs no SpecKit e execução por agentes de IA  
> **Produto:** Nummiq  
> **Categoria:** SaaS financeiro / gestão financeira inteligente  
> **Direção visual:** Premium, dark, institucional, precisa, elegante e orientada a patrimônio

---

# 1. Objetivo deste documento

Este documento define a identidade visual interna da plataforma Nummiq.

Ele deve ser usado como referência obrigatória sempre que houver:

- refatoração visual;
- criação de novas páginas;
- criação ou alteração de componentes;
- desenvolvimento de dashboards;
- criação de modais;
- tabelas;
- gráficos;
- formulários;
- menus;
- estados vazios;
- telas de autenticação;
- cards;
- relatórios;
- filtros;
- notificações;
- responsividade;
- microinterações;
- construção de specs no SpecKit;
- geração ou revisão de código por agentes de IA.

Este arquivo deve ser tratado como **fonte de verdade visual da plataforma**.

Em caso de conflito entre uma implementação existente e este documento, este documento deve prevalecer, salvo quando existir uma spec aprovada que declare explicitamente uma exceção.

---

# 2. Visão de marca aplicada ao produto

A Nummiq deve transmitir imediatamente quatro percepções:

1. **Controle**
2. **Patrimônio**
3. **Inteligência**
4. **Confiança**

A plataforma não deve parecer apenas um aplicativo de controle de gastos.

Ela deve parecer uma ferramenta premium de inteligência financeira e patrimônio.

A sensação visual desejada deve estar próxima de produtos financeiros de alto padrão, interfaces institucionais modernas e softwares premium.

Referências conceituais de percepção:

- XP Investimentos;
- Apple;
- Linear;
- dashboards financeiros institucionais;
- plataformas de wealth management;
- produtos SaaS premium com forte hierarquia visual.

Essas referências servem apenas como direção de percepção. A Nummiq deve possuir identidade própria.

---

# 3. Conceito visual principal

A identidade visual da Nummiq deve seguir o conceito:

## Black Finance + Platinum + Precision

A interface deve utilizar:

- preto profundo;
- grafite;
- prata;
- branco gelo;
- transparências discretas;
- bordas finas;
- gradientes metálicos apenas em pontos estratégicos;
- espaço negativo generoso;
- números financeiros com forte destaque;
- ícones outline;
- hierarquia clara;
- animações discretas;
- baixa saturação visual.

A interface deve ser sofisticada sem parecer excessivamente decorativa.

---

# 4. Personalidade visual

A Nummiq deve parecer:

- premium;
- segura;
- silenciosa;
- moderna;
- precisa;
- organizada;
- confiável;
- profissional;
- madura;
- inteligente.

A Nummiq não deve parecer:

- infantil;
- chamativa;
- gamer;
- neon;
- excessivamente futurista;
- colorida;
- genérica;
- semelhante a banco digital popular;
- semelhante a app de cashback;
- semelhante a app de criptomoedas especulativas.

---

# 5. Frase de direção criativa

> **Nummiq é precisão financeira em uma interface escura, sofisticada e silenciosa.**

---

# 6. Significado visual das cores

## Preto
Representa controle, segurança, sofisticação, concentração e ambiente institucional.

## Prata
Representa patrimônio, valor, precisão, tecnologia e premium.

## Branco
Representa clareza, leitura, dados, informação e foco.

## Cinza
Representa hierarquia, apoio, contexto e informações secundárias.

## Cores funcionais
Verde, vermelho, amarelo e azul devem existir apenas para comunicação funcional. Nunca devem competir com a identidade visual da marca.

---

# 7. Paleta oficial

## 7.1 Backgrounds e superfícies

| Token | HEX | Uso |
|---|---|---|
| `--nq-bg` | `#050505` | Fundo principal da aplicação |
| `--nq-bg-soft` | `#080808` | Fundo secundário |
| `--nq-surface-1` | `#0C0C0D` | Cards principais |
| `--nq-surface-2` | `#111113` | Cards secundários |
| `--nq-surface-3` | `#161618` | Hover, dropdowns, superfícies elevadas |
| `--nq-surface-4` | `#1D1D20` | Inputs e estados elevados |

Evitar o uso indiscriminado de `#000000`. O preto absoluto deve ser reservado para casos específicos.

---

# 8. Paleta Platinum

| Token | HEX |
|---|---|
| `--nq-platinum-50` | `#FAFAFA` |
| `--nq-platinum-100` | `#F1F1F2` |
| `--nq-platinum-200` | `#DCDCDD` |
| `--nq-platinum-300` | `#C6C6C8` |
| `--nq-platinum-400` | `#A7A7AA` |
| `--nq-platinum-500` | `#858589` |
| `--nq-platinum-600` | `#656569` |
| `--nq-platinum-700` | `#464649` |

---

# 9. Gradiente metálico oficial

O gradiente metálico é um recurso de assinatura visual e deve ser utilizado com moderação.

```css
background: linear-gradient(
  135deg,
  #FFFFFF 0%,
  #D8D8DA 28%,
  #9B9B9F 55%,
  #F5F5F5 78%,
  #A7A7AA 100%
);
```

## Pode ser utilizado em

- logo;
- símbolo NQ;
- botão principal premium;
- card de upgrade;
- borda especial;
- indicador selecionado;
- elemento institucional;
- destaque de patrimônio.

## Não utilizar em

- todos os cards;
- todos os botões;
- todos os títulos;
- toda a navegação;
- todas as bordas;
- gráficos inteiros.

Regra:

> Se tudo for metálico, nada parecerá premium.

---

# 10. Cores funcionais

| Estado | Token | HEX |
|---|---|---|
| Positivo | `--nq-success` | `#3DDC84` |
| Negativo | `--nq-danger` | `#FF5C5C` |
| Atenção | `--nq-warning` | `#F2B94B` |
| Informação | `--nq-info` | `#5B9CFF` |

Usar apenas em crescimento, queda, status, alertas, confirmação, gráficos, indicadores e badges funcionais.

---

# 11. Cores de texto

| Token | HEX | Uso |
|---|---|---|
| `--nq-text-primary` | `#F5F5F5` | Texto principal |
| `--nq-text-secondary` | `#A7A7AA` | Texto secundário |
| `--nq-text-muted` | `#6D6D72` | Labels, legendas, contexto |
| `--nq-text-disabled` | `#48484C` | Estado desabilitado |

---

# 12. Bordas

Bordas devem ser discretas.

```css
--nq-border: rgba(255, 255, 255, 0.07);
--nq-border-hover: rgba(255, 255, 255, 0.12);
--nq-border-active: rgba(255, 255, 255, 0.18);
```

A interface não deve parecer uma grade de caixas. Bordas devem organizar sem chamar atenção.

---

# 13. Tipografia oficial

## Fonte principal

**Inter**

Fallback recomendado:

```css
font-family:
  "Inter",
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

---

# 14. Pesos tipográficos

| Uso | Peso |
|---|---:|
| Display | 600 |
| H1 | 600 |
| H2 | 600 |
| H3 | 600 |
| Subtítulo | 500 |
| Body | 400 |
| Label | 500 |
| Botão | 500 ou 600 |
| Valores financeiros | 500 ou 600 |

Evitar uso excessivo de peso `700` e `800`.

---

# 15. Escala tipográfica

| Token | Tamanho | Uso |
|---|---:|---|
| Display | 48px | Patrimônio, KPI principal |
| H1 | 32px | Título de página |
| H2 | 24px | Seção principal |
| H3 | 18px | Card / subseção |
| Body | 14px | Texto geral |
| Label | 12px | Labels |
| Caption | 11px | Informações auxiliares |

---

# 16. Valores financeiros

Valores devem utilizar números tabulares.

```css
font-variant-numeric: tabular-nums;
```

Essa regra é obrigatória em tabelas, cards, gráficos, relatórios, saldos, extratos e KPIs.

---

# 17. Formatação monetária

Padrão brasileiro:

```text
R$ 12.840,92
```

Valores negativos:

```text
-R$ 842,90
```

Valores positivos em contexto de variação:

```text
+R$ 1.240,00
```

---

# 18. Formatação percentual

Exemplo:

```text
+8,42%
-3,17%
```

Para crescimento, utilizar verde e seta para cima quando necessário.

Para queda, utilizar vermelho e seta para baixo quando necessário.

---

# 19. Sistema de espaçamento

A Nummiq deve utilizar um sistema baseado em múltiplos de 4px.

```text
4
8
12
16
20
24
32
40
48
64
```

Unidade principal:

```text
8px
```

---

# 20. Grid

## Desktop

- 12 colunas;
- container ideal entre 1200px e 1440px;
- padding horizontal de 32px;
- gap entre colunas e cards de aproximadamente 20px.

## Tablet

- reduzir conteúdo sem comprometer leitura;
- transformar grids complexos em 2 colunas.

## Mobile

- uma coluna;
- sidebar transformada em drawer;
- KPIs empilhados;
- gráficos responsivos;
- tabelas com scroll horizontal apenas quando necessário.

---

# 21. Border radius

| Elemento | Radius |
|---|---:|
| Elementos pequenos | 8px |
| Botão | 10px |
| Input | 10px |
| Card | 16px |
| Modal | 20px |
| Badge | 999px |
| Avatar | 999px |

Tokens:

```css
--nq-radius-sm: 8px;
--nq-radius-md: 12px;
--nq-radius-lg: 16px;
--nq-radius-xl: 20px;
```

---

# 22. Estrutura geral da aplicação

```text
┌─────────────────────────────────────────────────┐
│ Sidebar │ Header                                │
│         │                                       │
│         │ Conteúdo principal                    │
│         │                                       │
└─────────────────────────────────────────────────┘
```

---

# 23. Sidebar

## Dimensões

Expandida:

```text
240px
```

Compacta:

```text
72px
```

Mobile:

Utilizar drawer.

---

# 24. Marca na sidebar

Sidebar expandida:

```text
[símbolo] Nummiq
```

Sidebar compacta:

```text
[símbolo NQ]
```

Login: utilizar logo completa.

Favicon: utilizar somente símbolo NQ.

---

# 25. Navegação principal

Ordem recomendada:

1. Visão Geral
2. Transações
3. Contas
4. Cartões
5. Fluxo de Caixa
6. Planejamento
7. Metas
8. Reservas
9. Investimentos
10. Relatórios
11. Integrações

Na parte inferior:

12. Configurações
13. Ajuda

---

# 26. Ícones da navegação

| Página | Ícone Lucide |
|---|---|
| Visão Geral | `LayoutDashboard` |
| Transações | `ArrowRightLeft` |
| Contas | `WalletCards` |
| Cartões | `CreditCard` |
| Fluxo de Caixa | `ChartNoAxesCombined` |
| Planejamento | `CalendarRange` ou `ChartSpline` |
| Metas | `Target` |
| Reservas | `PiggyBank` |
| Investimentos | `TrendingUp` |
| Relatórios | `ReceiptText` |
| Integrações | `Plug` |
| Configurações | `Settings` |
| Ajuda | `CircleHelp` |

---

# 27. Biblioteca oficial de ícones

Utilizar exclusivamente **Lucide Icons**.

Para React:

```bash
npm install lucide-react
```

Exemplo:

```tsx
import {
  LayoutDashboard,
  ArrowRightLeft,
  WalletCards,
  CreditCard,
  ChartNoAxesCombined,
  PiggyBank,
  Target,
  TrendingUp,
  ReceiptText,
  Search,
  Bell,
  Settings,
  CircleHelp,
  Plus,
  Ellipsis,
  ChevronDown,
  ChevronRight
} from "lucide-react";
```

---

# 28. Regras de ícones

```text
16px = tabelas
18px = inputs
20px = navegação
24px = ações importantes
```

Stroke recomendado:

```text
1.75
```

Regras:

- preferir ícones outline;
- evitar ícones preenchidos;
- evitar mistura de bibliotecas;
- não usar Font Awesome, Material Icons, Heroicons e Lucide ao mesmo tempo.

---

# 29. Estado ativo da navegação

```css
background: rgba(255,255,255,.07);
border: 1px solid rgba(255,255,255,.08);
color: #F5F5F5;
```

Pode existir uma pequena iluminação prata.

Evitar verde neon, glow intenso e bordas chamativas.

---

# 30. Header

Altura recomendada:

```text
72px
```

Estrutura:

```text
Título da página                   Buscar   Notificações   Perfil
```

O header pode conter breadcrumb, título, busca global, notificações, ajuda e avatar.

---

# 31. Busca global

Atalho:

```text
⌘ K
```

No Windows:

```text
Ctrl + K
```

A busca pode localizar transações, contas, categorias, relatórios, páginas, configurações e integrações.

---

# 32. Command Palette

```text
Buscar na Nummiq

> Adicionar transação
> Criar conta
> Abrir fluxo de caixa
> Ver investimentos
> Gerar relatório
```

---

# 33. Dashboard principal

Estrutura recomendada:

```text
Bom dia, [Nome].

Aqui está um resumo da sua vida financeira.
```

Depois:

```text
Patrimônio atual
R$ 327.480,62

+ R$ 14.892 este mês
+ 4,76%
```

---

# 34. KPIs principais

| Card | Informação |
|---|---|
| Patrimônio | Valor total |
| Receitas | Total do período |
| Despesas | Total do período |
| Saldo | Resultado do período |

---

# 35. Card padrão

```text
╭────────────────────────╮
│ Saldo atual         ••• │
│                        │
│ R$ 42.827,41            │
│                        │
│ ↑ 8,4% este mês         │
╰────────────────────────╯
```

```css
background: #111113;
border: 1px solid rgba(255,255,255,.07);
border-radius: 16px;
```

---

# 36. Cards premium

```css
background:
  linear-gradient(
    145deg,
    rgba(255,255,255,.09),
    rgba(255,255,255,.025)
  );

backdrop-filter: blur(20px);
```

Não aplicar glassmorphism em todos os componentes.

---

# 37. Sombras

```css
box-shadow:
  0 0 0 1px rgba(255,255,255,.04),
  0 12px 40px rgba(0,0,0,.35);
```

---

# 38. Botão primário

```css
background: linear-gradient(
  135deg,
  #FAFAFA,
  #B8B8BB
);

color: #080808;
```

Exemplos:

```text
Adicionar transação
Criar conta
Salvar alterações
Continuar
```

---

# 39. Botão secundário

```css
background: #161618;
border: 1px solid rgba(255,255,255,.08);
color: #F5F5F5;
```

---

# 40. Botão ghost

- fundo transparente;
- sem elevação;
- apenas texto ou ícone;
- hover discreto.

---

# 41. Botões destrutivos

Utilizar vermelho apenas em texto, ícone, confirmação e hover.

Não utilizar grandes blocos vermelhos por padrão.

---

# 42. Inputs

Altura recomendada:

```text
44px
```

```css
background: #101012;
border: 1px solid #242427;
border-radius: 10px;
color: #F5F5F5;
```

Focus:

```css
border-color: #77777C;
```

---

# 43. Dropdowns

```text
Período

Este mês        ✓
Últimos 3 meses
Últimos 6 meses
Este ano
Personalizado
```

O item selecionado pode utilizar check prata, texto principal e fundo levemente elevado.

---

# 44. Selects

Mesma identidade dos inputs.

Ícone:

```text
ChevronDown
```

---

# 45. Modais

Características:

- background `#111113`;
- radius 20px;
- borda discreta;
- overlay preto translúcido;
- máximo de informação necessária;
- CTA principal claramente identificado.

```css
background: rgba(0,0,0,.72);
backdrop-filter: blur(6px);
```

---

# 46. Tabelas

Evitar grids completos com linhas verticais.

```text
Descrição        Categoria       Data        Valor
──────────────────────────────────────────────────
Salário          Receita         05 ago      +8.500
Spotify          Assinatura      05 ago         -21
Mercado          Alimentação     04 ago        -325
```

Utilizar linhas horizontais discretas, alinhamento consistente, números tabulares e valores à direita.

---

# 47. Tabelas financeiras

- coluna de valor alinhada à direita;
- valores positivos podem utilizar verde;
- valores negativos podem utilizar vermelho;
- descrição alinhada à esquerda;
- data em texto secundário;
- categoria com badge discreto;
- ações com `Ellipsis`.

---

# 48. Badges

Formato pill.

```text
Pago
Pendente
Atrasado
Concluído
```

Exemplo:

```css
background: rgba(61,220,132,.10);
color: #3DDC84;
```

---

# 49. Gráficos

Linha principal:

```text
#D8D8DA
```

Linha secundária:

```text
#626266
```

Área:

```css
linear-gradient(
  180deg,
  rgba(220,220,221,.18),
  rgba(220,220,221,0)
);
```

---

# 50. Grid dos gráficos

```css
rgba(255,255,255,.045)
```

As linhas de apoio não devem competir com os dados.

---

# 51. Tooltips de gráficos

```text
15 Ago

Receitas
R$ 8.420

Despesas
R$ 3.218
```

```css
background: #18181A;
border: 1px solid rgba(255,255,255,.08);
border-radius: 10px;
```

---

# 52. Gráficos de barras

- barras padrão em grafite;
- barra selecionada em prata ou gradiente prata;
- verde e vermelho apenas quando houver significado financeiro explícito.

---

# 53. Gráficos de pizza ou donut

Evitar muitas categorias simultâneas.

Quando necessário:

- utilizar variações de cinza;
- destacar apenas categoria selecionada;
- utilizar cores funcionais quando necessário.

---

# 54. Perfil do usuário

Exemplo:

```text
IB
```

Dropdown:

```text
Israel Bugia
conta@email.com

Meu perfil
Preferências
Plano
Segurança
────────────
Sair
```

---

# 55. Notificações

Utilizar `Bell`.

Quando existir notificação não lida, usar pequeno indicador.

Evitar contador chamativo permanente, sino preenchido e animação constante.

---

# 56. Microinterações

```text
Hover: 150ms
Dropdown: 180ms
Modal: 200ms
Page transition: 220ms
```

---

# 57. Easing recomendado

```css
cubic-bezier(0.2, 0.8, 0.2, 1)
```

---

# 58. Hover de cards

```css
transform: translateY(-1px);
border-color: rgba(255,255,255,.12);
```

---

# 59. Loading

Preferir skeleton, shimmer discreto e loaders minimalistas.

---

# 60. Skeleton

```css
background: linear-gradient(
  90deg,
  #111113,
  #19191B,
  #111113
);
```

---

# 61. Estados vazios

```text
Nenhuma transação encontrada.

Adicione sua primeira transação para começar.
```

CTA:

```text
Adicionar transação
```

---

# 62. Estados de erro

```text
Não foi possível carregar os dados.

Tente novamente em alguns instantes.
```

CTA:

```text
Tentar novamente
```

---

# 63. Terminologia oficial

Usar:

```text
Visão Geral
Fluxo de Caixa
Receitas
Despesas
Transações
Contas
Cartões
Metas
Investimentos
Relatórios
Configurações
```

Evitar misturar com:

```text
Dashboard
Overview
Cashflow
Expenses
Income
Settings
```

---

# 64. Microcopy

A linguagem deve ser humana, direta, clara, profissional e curta.

Evitar:

```text
Efetue o cadastro de uma nova transação.
```

Usar:

```text
Adicionar transação
```

Evitar:

```text
Não existem registros disponíveis.
```

Usar:

```text
Nenhuma transação encontrada.
```

---

# 65. Planejamento

Submenu recomendado:

```text
Orçamento
Metas
Reserva
Projeções
```

---

# 66. Tela de login

```text
┌──────────────────────────┬──────────────────────────┐
│                          │                          │
│ NQ                       │ Entrar                   │
│                          │                          │
│ Inteligência financeira  │ Email                    │
│ para decisões melhores.  │ Senha                    │
│                          │                          │
│                          │ Entrar                   │
│                          │                          │
│                          │ Esqueci minha senha      │
└──────────────────────────┴──────────────────────────┘
```

O lado institucional pode conter símbolo NQ, mensagem de posicionamento e composição abstrata escura e prateada.

---

# 67. Branding dentro da plataforma

## Login
Logo completa.

## Sidebar expandida
Símbolo + Nummiq.

## Sidebar compacta
Símbolo.

## Favicon
Símbolo.

## Empty state institucional
Símbolo monocromático sutil.

---

# 68. Uso da logo

A logo deve possuir versões:

```text
nummiq-logo.svg
nummiq-logo-tagline.svg
nummiq-symbol.svg
nummiq-symbol-bordered.svg
nummiq-logo-white.svg
nummiq-logo-dark.svg
```

Preferir SVG na aplicação.

---

# 69. O que evitar

Não utilizar como identidade principal:

- verde neon;
- azul fintech;
- roxo bancário;
- gradientes rosa/roxo;
- ilustrações infantis;
- elementos cartoon;
- emojis como parte estrutural da UI;
- ícones 3D;
- cards extremamente arredondados;
- glassmorphism excessivo;
- sombras pesadas;
- bordas brilhantes;
- glow;
- excesso de cores;
- excesso de informações por tela.

---

# 70. Princípio de silêncio visual

A Nummiq deve utilizar silêncio visual:

- menos cores;
- menos bordas;
- menos efeitos;
- menos elementos decorativos;
- mais espaço;
- mais hierarquia;
- maior importância para números;
- melhor organização.

---

# 71. Prioridade visual

Em telas financeiras:

1. patrimônio;
2. saldo;
3. receita;
4. despesa;
5. tendência;
6. contexto;
7. ações.

Elementos decorativos nunca devem competir com dados.

---

# 72. Densidade de informação

Evitar:

- 12 KPIs na primeira dobra;
- 4 gráficos grandes simultaneamente;
- tabelas gigantes sem filtro;
- múltiplos CTAs primários.

Preferir:

- 3 ou 4 KPIs prioritários;
- um gráfico principal;
- um gráfico secundário;
- tabela de resumo;
- ações progressivas.

---

# 73. Responsividade

## Desktop
Experiência principal.

## Tablet
- sidebar compacta;
- 2 colunas;
- reduzir gráficos;
- preservar hierarquia.

## Mobile
- navegação em drawer;
- cards em 1 coluna;
- ações principais fixas quando necessário;
- tabelas adaptadas;
- manter legibilidade de valores.

---

# 74. Breakpoints sugeridos

```text
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

---

# 75. Acessibilidade

Obrigatório considerar:

- contraste;
- foco visível;
- navegação por teclado;
- labels;
- aria-label;
- estados não dependentes exclusivamente de cor;
- hit area mínima;
- leitura por screen reader.

---

# 76. Foco de teclado

```css
outline: 2px solid rgba(220,220,221,.55);
outline-offset: 2px;
```

Não remover focus sem substituição.

---

# 77. Touch targets

Área mínima recomendada:

```text
44px x 44px
```

---

# 78. Design tokens base

```css
:root {
  --nq-bg: #050505;
  --nq-bg-soft: #080808;

  --nq-surface-1: #0c0c0d;
  --nq-surface-2: #111113;
  --nq-surface-3: #161618;
  --nq-surface-4: #1d1d20;

  --nq-border: rgba(255,255,255,.07);
  --nq-border-hover: rgba(255,255,255,.12);
  --nq-border-active: rgba(255,255,255,.18);

  --nq-text-primary: #f5f5f5;
  --nq-text-secondary: #a7a7aa;
  --nq-text-muted: #6d6d72;
  --nq-text-disabled: #48484c;

  --nq-platinum-50: #fafafa;
  --nq-platinum-100: #f1f1f2;
  --nq-platinum-200: #dcdcdd;
  --nq-platinum-300: #c6c6c8;
  --nq-platinum-400: #a7a7aa;
  --nq-platinum-500: #858589;
  --nq-platinum-600: #656569;
  --nq-platinum-700: #464649;

  --nq-success: #3ddc84;
  --nq-danger: #ff5c5c;
  --nq-warning: #f2b94b;
  --nq-info: #5b9cff;

  --nq-radius-sm: 8px;
  --nq-radius-md: 12px;
  --nq-radius-lg: 16px;
  --nq-radius-xl: 20px;

  --nq-space-1: 4px;
  --nq-space-2: 8px;
  --nq-space-3: 12px;
  --nq-space-4: 16px;
  --nq-space-5: 20px;
  --nq-space-6: 24px;
  --nq-space-8: 32px;
  --nq-space-10: 40px;
  --nq-space-12: 48px;
  --nq-space-16: 64px;
}
```

---

# 79. Tailwind

```javascript
colors: {
  nummiq: {
    black: "#050505",
    soft: "#080808",
    surface1: "#0C0C0D",
    surface2: "#111113",
    surface3: "#161618",
    platinum: "#DCDCDD",
    silver: "#A7A7AA",
    white: "#F5F5F5",
    success: "#3DDC84",
    danger: "#FF5C5C",
    warning: "#F2B94B",
    info: "#5B9CFF"
  }
}
```

---

# 80. Componentes fundamentais

O design system deve possuir, no mínimo:

```text
Button
IconButton
Input
Textarea
Select
Combobox
Checkbox
Radio
Switch
Tabs
Badge
Card
StatCard
FinancialValue
Table
DataTable
Modal
Drawer
Popover
Tooltip
DropdownMenu
CommandPalette
Breadcrumb
Pagination
DatePicker
DateRangePicker
Toast
Alert
Skeleton
EmptyState
Avatar
Progress
ChartContainer
Sidebar
Header
Search
```

---

# 81. Reutilização

Nunca criar um componente visual isolado quando já existir equivalente no design system.

Antes de criar um novo componente:

1. verificar componentes existentes;
2. verificar variantes;
3. verificar se o problema pode ser resolvido com composição;
4. criar novo componente apenas quando realmente necessário.

---

# 82. Variantes de Button

```text
primary
secondary
ghost
danger
link
```

Tamanhos:

```text
sm
md
lg
icon
```

---

# 83. Variantes de Card

```text
default
interactive
premium
flat
danger
```

---

# 84. Estados interativos

Todo componente interativo deve prever:

```text
default
hover
focus
active
disabled
loading
error
```

---

# 85. Charts

A biblioteca escolhida deve permitir:

- tema customizado;
- tooltips;
- responsividade;
- acessibilidade;
- animação discreta.

O tema do gráfico deve obedecer a este documento.

Não utilizar cores padrão da biblioteca.

---

# 86. Ações rápidas

```text
Adicionar transação
Transferir
Registrar receita
Registrar despesa
Criar meta
Gerar relatório
```

---

# 87. Dashboard recomendado

```text
┌──────────────────────────────────────────────────────┐
│ Visão Geral                        Buscar   🔔   IB   │
│                                                      │
│ Bom dia, Israel                                      │
│ Controle sua vida financeira com clareza.            │
│                                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Patrimônio                                       │ │
│ │                                                  │ │
│ │ R$ 327.480,62                                    │ │
│ │ +4,76% nos últimos 30 dias                       │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐           │
│ │ Receita   │ │ Despesas  │ │ Saldo     │           │
│ │ R$ 32k    │ │ R$ 19k    │ │ R$ 13k    │           │
│ └───────────┘ └───────────┘ └───────────┘           │
│                                                      │
│ ┌───────────────────────┐ ┌────────────────────────┐ │
│ │ Fluxo de Caixa        │ │ Distribuição           │ │
│ │ gráfico               │ │ gráfico                │ │
│ └───────────────────────┘ └────────────────────────┘ │
│                                                      │
│ Transações recentes                                  │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Mercado        Alimentação      -R$ 248,90       │ │
│ │ Salário        Receita         +R$ 8.500,00      │ │
│ │ Netflix        Assinatura       -R$ 59,90        │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

# 88. Regra para agentes de IA

Ao implementar qualquer tela da Nummiq:

1. ler este documento antes de alterar UI;
2. identificar componentes existentes;
3. respeitar tokens;
4. não criar novas cores arbitrariamente;
5. não adicionar bibliotecas de ícones extras;
6. não criar estilos inline duplicados;
7. manter Inter como fonte principal;
8. manter Lucide como biblioteca de ícones;
9. manter a identidade dark;
10. manter português consistente;
11. respeitar responsividade;
12. respeitar acessibilidade;
13. evitar regressões;
14. reutilizar componentes;
15. testar estados vazios, loading e erro.

---

# 89. Instrução para uso com SpecKit

Ao criar uma spec visual ou funcional:

## A spec deve definir

- objetivo da tela;
- usuário;
- problema;
- estados;
- regras de negócio;
- dados exibidos;
- interações;
- responsividade;
- comportamento.

## Este documento define

- identidade;
- tipografia;
- cores;
- espaçamento;
- componentes;
- ícones;
- hierarquia;
- estilo;
- linguagem.

A spec e o Design System devem ser utilizados em conjunto.

---

# 90. Hierarquia de decisão

Quando existir conflito:

1. regras de negócio aprovadas;
2. spec atual aprovada;
3. este Design System;
4. componentes existentes;
5. implementação legada.

Uma spec pode alterar comportamento.

Uma spec não deve alterar a identidade visual sem declarar explicitamente uma exceção.

---

# 91. Prompt recomendado para agentes de IA

```text
Antes de implementar esta tarefa, leia e siga integralmente:

1. A spec correspondente no SpecKit.
2. O arquivo NUMMIQ_DESIGN_SYSTEM.md.

A spec define comportamento e requisitos funcionais.
O Design System define identidade visual, componentes, tipografia,
cores, ícones, espaçamento, microcopy e padrões de interface.

Não crie novos padrões visuais sem necessidade.
Não introduza novas cores.
Não misture bibliotecas de ícones.
Priorize componentes reutilizáveis.
Mantenha consistência com as telas existentes que já estiverem aderentes
ao Design System.

Se houver conflito entre a implementação legada e o Design System,
refatore a implementação para seguir o Design System, desde que isso
não viole uma regra funcional da spec.
```

---

# 92. Checklist para refatoração de tela

- [ ] Está usando Inter?
- [ ] Está usando Lucide?
- [ ] Background segue a paleta Nummiq?
- [ ] Cards usam superfícies corretas?
- [ ] Bordas estão discretas?
- [ ] Tipografia respeita hierarquia?
- [ ] Valores usam números tabulares?
- [ ] Valores monetários estão formatados corretamente?
- [ ] Verde e vermelho aparecem somente quando possuem significado?
- [ ] CTAs estão claros?
- [ ] Existe apenas um CTA primário por contexto?
- [ ] Hover está implementado?
- [ ] Focus está implementado?
- [ ] Disabled está implementado?
- [ ] Loading está implementado?
- [ ] Empty state está implementado?
- [ ] Error state está implementado?
- [ ] Mobile está validado?
- [ ] Tablet está validado?
- [ ] Desktop está validado?
- [ ] A tela funciona por teclado?
- [ ] Os ícones possuem tamanho consistente?
- [ ] O texto está em português consistente?
- [ ] Não existem cores arbitrárias?
- [ ] Não existem estilos duplicados?
- [ ] Não existem componentes visuais desnecessariamente únicos?
- [ ] A tela transmite sofisticação e controle?

---

# 93. Checklist para novo componente

- [ ] O componente já existe?
- [ ] Pode ser uma variante?
- [ ] Está usando tokens?
- [ ] Possui `hover`?
- [ ] Possui `focus`?
- [ ] Possui `disabled`?
- [ ] Possui `loading` quando aplicável?
- [ ] Possui suporte a teclado?
- [ ] Possui `aria-label` quando necessário?
- [ ] É responsivo?
- [ ] Possui API clara?
- [ ] É reutilizável?
- [ ] Evita estilos inline?
- [ ] Segue o radius oficial?
- [ ] Segue os espaços oficiais?

---

# 94. Anti-patterns

São proibidos sem aprovação explícita:

```text
background: blue;
background: purple;
background: neon-green;
border-radius: 32px em todos os cards;
box-shadow: glow;
font-family diferente de Inter;
FontAwesome;
Material Icons;
Heroicons;
emojis como ícones estruturais;
gradientes coloridos;
texto em inglês misturado com português;
cores hardcoded fora dos tokens;
gráficos com paleta rainbow;
```

---

# 95. Critério final de qualidade

Uma tela Nummiq aprovada deve responder positivamente:

> A tela parece parte do mesmo produto?

> Os dados financeiros são a prioridade?

> A interface parece premium?

> A tela transmite confiança?

> Existe silêncio visual?

> A tela possui boa hierarquia?

> O usuário entende a próxima ação?

> A interface continua elegante mesmo sem animações?

> A experiência funciona em desktop e mobile?

> O código reutiliza padrões existentes?

---

# 96. Resumo executivo

A Nummiq deve ser construída sobre cinco pilares:

## 1. Dark premium
Preto e grafite como base.

## 2. Platinum
Prata como assinatura visual.

## 3. Financial clarity
Números e informações em primeiro plano.

## 4. Precision
Alinhamento, espaçamento, hierarquia e consistência.

## 5. Restraint
Poucas cores, poucos efeitos, poucas distrações.

---

# 97. Regra de ouro

> **A Nummiq não deve impressionar pelo excesso. Deve impressionar pela precisão.**

---

# 98. Identidade final

**Preto representa controle.**

**Prata representa patrimônio.**

**Branco representa clareza.**

**Cinza representa hierarquia.**

**Verde, vermelho, amarelo e azul representam apenas estados funcionais.**

A experiência da Nummiq deve sempre comunicar:

> **Meu patrimônio e minhas finanças estão sob controle.**

---

# 99. Nome interno do Design System

Nome recomendado:

```text
NQ UI
```

Nome completo:

```text
Nummiq NQ Design System
```

Estrutura futura sugerida:

```text
/docs
  /design
    NUMMIQ_DESIGN_SYSTEM.md

/src
  /components
    /ui

/src
  /styles
    tokens.css
    globals.css

/src
  /assets
    /brand
      nummiq-symbol.svg
      nummiq-symbol-bordered.svg
      nummiq-logo.svg
      nummiq-logo-tagline.svg
```

---

# 100. Source of Truth

Este documento deve ser considerado a referência oficial de UI da Nummiq.

Toda nova feature deve nascer compatível com ele.

Toda refatoração visual deve aproximar a implementação existente deste padrão.

Toda spec deve ser interpretada em conjunto com este arquivo.
