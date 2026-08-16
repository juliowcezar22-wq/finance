"use client";
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { visibleNavItems, type UserLike } from "./nav-items";
import { NummiqLogo } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { logoutAction } from "@/lib/actions/auth";

/**
 * Gaveta "Mais" do mobile: dá acesso a TODAS as seções (inclusive as que não cabem
 * na barra inferior), além de perfil, troca de tema e logout — antes só disponíveis
 * na sidebar do desktop.
 */
export function MobileMenu({ user, trigger }: { user: UserLike; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = useTransition();
  const path = usePathname();
  const items = visibleNavItems(user);

  // Fecha a gaveta automaticamente ao trocar de rota.
  React.useEffect(() => {
    setOpen(false);
  }, [path]);

  const initials = (user?.name ?? "")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex w-[86%] max-w-sm flex-col border-l bg-background shadow-2xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <NummiqLogo />
              <Dialog.Title className="sr-only">Menu Nummiq</Dialog.Title>
              <Dialog.Description className="sr-only">Navegação principal</Dialog.Description>
            </div>
            <Dialog.Close className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-nummiq-silver hover:bg-accent hover:text-nummiq-white">
              <X className="h-5 w-5" />
              <span className="sr-only">Fechar menu</span>
            </Dialog.Close>
          </div>

          {/* Navegação (rolável) */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
            {items.map((it) => {
              const Icon = it.icon;
              const active = path === it.href || path?.startsWith(it.href + "/");
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-[48px] items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium transition-colors",
                    active
                      ? "border border-border bg-accent text-nummiq-white"
                      : "border border-transparent text-nummiq-silver hover:bg-accent hover:text-nummiq-white"
                  )}
                >
                  <Icon size={20} strokeWidth={1.75} className="shrink-0" />
                  {it.label}
                </Link>
              );
            })}
          </nav>

          {/* Rodapé: tema + perfil + sair */}
          <div className="border-t">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Tema
              </span>
              <ThemeToggle />
            </div>
            {user && (
              <div className="flex items-center gap-3 border-t bg-card/40 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {initials || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {user.role === "ADMIN" ? "Administrador" : "Usuário"} · {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  title="Sair"
                  aria-label="Sair"
                  disabled={pending}
                  onClick={() => start(() => logoutAction())}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
