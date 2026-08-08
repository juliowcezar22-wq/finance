"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";

const NO_SHELL = ["/login"];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role: "ADMIN" | "USER" } | null;
}) {
  const path = usePathname() ?? "";
  const bare = NO_SHELL.some((p) => path === p || path.startsWith(p + "/"));

  if (bare) return <>{children}</>;

  return (
    <>
      <div className="flex min-h-screen app-shell">
        <Sidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header user={user} />
          <main
            key={path}
            className="page-enter flex-1 px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-8 w-full max-w-[1440px] mx-auto"
          >
            {children}
          </main>
        </div>
      </div>
      <MobileNav user={user} />
    </>
  );
}
