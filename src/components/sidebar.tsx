"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NummiqLogo } from "./brand";
import { visibleNavItems, type UserLike } from "./nav-items";

// NQ UI — Sidebar (DS §22–§29). 240px, marca Nummiq, estado ativo em tint sutil.
export function Sidebar({ user }: { user: UserLike }) {
  const path = usePathname() ?? "";
  const items = visibleNavItems(user);
  const main = items.filter((it) => !it.footer);
  const footer = items.filter((it) => it.footer);

  const renderItem = (it: (typeof items)[number]) => {
    const Icon = it.icon;
    const active = path === it.href || path.startsWith(it.href + "/");
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors duration-150 ease-nq",
          active
            ? "bg-white/[0.07] border border-white/[0.08] text-nummiq-white"
            : "border border-transparent text-nummiq-silver hover:bg-white/[0.04] hover:text-nummiq-white"
        )}
      >
        <Icon size={20} strokeWidth={1.75} className="shrink-0" />
        {it.label}
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex md:w-60 shrink-0 flex-col md:sticky md:top-0 md:h-screen border-r border-border bg-nummiq-black">
      <div className="h-[72px] flex items-center px-5 border-b border-border">
        <Link href="/dashboard" aria-label="Nummiq — Visão Geral">
          <NummiqLogo />
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {main.map(renderItem)}
      </nav>
      {footer.length > 0 && (
        <div className="px-3 py-3 border-t border-border space-y-0.5">
          {footer.map(renderItem)}
        </div>
      )}
    </aside>
  );
}
