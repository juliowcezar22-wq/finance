"use client";
import { useTransition } from "react";
import { Bell, Search, LogOut } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { logoutAction } from "@/lib/actions/auth";
import type { UserLike } from "./nav-items";

// NQ UI — Header (DS §30–§32, §54/§55). Barra utilitária: busca ⌘K, notificações,
// tema e perfil. A busca é visual (Command Palette futura, sem backend ainda).
export function Header({ user }: { user: UserLike }) {
  const [pending, start] = useTransition();
  const initials =
    user?.name
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 h-[72px] shrink-0 border-b border-border bg-nummiq-black/80 backdrop-blur">
      <div className="flex h-full items-center gap-3 px-4 md:px-6">
        {/* Busca global (visual) */}
        <button
          type="button"
          aria-label="Buscar na Nummiq"
          className="group flex h-10 w-full max-w-sm items-center gap-2.5 rounded-[10px] border border-border bg-nummiq-surface2 px-3 text-sm text-nummiq-muted transition-colors hover:border-white/12"
        >
          <Search size={18} strokeWidth={1.75} />
          <span className="flex-1 text-left">Buscar na Nummiq</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[11px] text-nummiq-muted">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Notificações"
            className="relative flex h-10 w-10 items-center justify-center rounded-[10px] text-nummiq-silver transition-colors hover:bg-accent hover:text-nummiq-white"
          >
            <Bell size={20} strokeWidth={1.75} />
          </button>

          <ThemeToggle />

          {user && (
            <div className="flex items-center gap-2 pl-1.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-nummiq-surface3 text-xs font-semibold text-nummiq-white ring-1 ring-white/10">
                {initials}
              </div>
              <div className="hidden lg:block leading-tight">
                <p className="text-sm font-medium text-nummiq-white max-w-[160px] truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-nummiq-muted">
                  {user.role === "ADMIN" ? "Administrador" : "Usuário"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Sair"
                title="Sair"
                disabled={pending}
                onClick={() => start(() => logoutAction())}
                className="flex h-10 w-10 items-center justify-center rounded-[10px] text-nummiq-silver transition-colors hover:bg-accent hover:text-nummiq-white disabled:opacity-50"
              >
                <LogOut size={18} strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
