"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth";
import { LogOut } from "lucide-react";

export function UserMenu({
  user,
}: {
  user: { name: string; email: string; role: "ADMIN" | "USER" };
}) {
  const [pending, start] = useTransition();
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 border-t bg-card/40 px-3 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {initials || "U"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {user.role === "ADMIN" ? "Administrador" : "Usuário"} · {user.email}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Sair"
        disabled={pending}
        onClick={() => start(() => logoutAction())}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
