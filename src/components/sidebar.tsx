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
            ? "border border-border bg-accent text-nummiq-white"
            : "border border-transparent text-nummiq-silver hover:bg-accent hover:text-nummiq-white"
        )}
      >
        <Icon size={20} strokeWidth={1.75} className="shrink-0" />
        {it.label}
      </Link>
    );
  };

  return (
    <aside className="hidden shrink-0 flex-col border-r border-border bg-nummiq-black md:sticky md:top-0 md:flex md:h-screen md:w-60">
      <div className="flex h-[72px] items-center border-b border-border px-5">
        <Link href="/dashboard" aria-label="Nummiq — Visão Geral">
          <NummiqLogo />
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">{main.map(renderItem)}</nav>
      {footer.length > 0 && (
        <div className="space-y-0.5 border-t border-border px-3 py-3">{footer.map(renderItem)}</div>
      )}
    </aside>
  );
}
