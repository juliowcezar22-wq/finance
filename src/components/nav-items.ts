import {
  LayoutDashboard,
  ArrowRightLeft,
  CreditCard,
  WalletCards,
  PiggyBank,
  Target,
  ArrowDownToLine,
  ArrowUpFromLine,
  Upload,
  Users,
  Wand2,
  ShieldCheck,
  Settings,
  Sparkles,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  /** Rótulo curto usado na barra inferior do mobile (fallback: label). */
  short?: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Aparece como atalho na barra inferior do mobile. */
  primary?: boolean;
  /** Agrupa no rodapé da sidebar (Configurações/Ajuda). */
  footer?: boolean;
};

// Fonte única de navegação — nomenclatura Nummiq (DS §25/§63), mapeada às
// rotas REAIS existentes (sem inventar páginas).
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Visão Geral", short: "Início", icon: LayoutDashboard, primary: true },
  { href: "/transacoes", label: "Transações", short: "Trans.", icon: ArrowRightLeft, primary: true },
  { href: "/receitas", label: "Receitas", icon: ArrowDownToLine, primary: true },
  { href: "/despesas", label: "Despesas", icon: ArrowUpFromLine },
  { href: "/contas", label: "Contas", icon: WalletCards },
  { href: "/cartoes", label: "Cartões", short: "Cartões", icon: CreditCard },
  { href: "/caixa", label: "Reservas", short: "Reservas", icon: PiggyBank, primary: true },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/pessoas", label: "Pessoas", icon: Users },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/regras", label: "Regras", icon: Wand2 },
  { href: "/assistente", label: "Assistente", icon: Sparkles },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle, adminOnly: true },
  { href: "/usuarios", label: "Usuários", icon: ShieldCheck, adminOnly: true, footer: true },
  { href: "/configuracoes", label: "Categorias", icon: Settings, adminOnly: true, footer: true },
];

export type UserLike = { name: string; email: string; role: "ADMIN" | "USER" } | null;

/** Filtra itens conforme o papel do usuário (admin vê tudo). */
export function visibleNavItems(user: UserLike): NavItem[] {
  return NAV_ITEMS.filter((it) => !it.adminOnly || user?.role === "ADMIN");
}

/** Rótulo da rota atual (para o título no header). */
export function labelForPath(path: string): string {
  const match = NAV_ITEMS.filter((it) => path === it.href || path.startsWith(it.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "Nummiq";
}
