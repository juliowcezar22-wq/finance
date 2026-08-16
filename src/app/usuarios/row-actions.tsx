"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { UserDialog } from "./user-dialog";
import { deleteUser } from "@/lib/actions/users";

export function UserRowActions({ user, people }: { user: any; people: any[] }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex justify-end gap-1">
      <UserDialog
        people={people}
        initial={user}
        trigger={
          <Button variant="ghost" size="icon" title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Excluir o usuário ${user.name}?`)) return;
          start(() => {
            void (async () => {
              const res = await deleteUser(user.id);
              // feedback mínimo até a 010 (toasts): a guarda de último admin
              // não pode falhar em silêncio.
              if (!res.ok) alert(res.error);
            })();
          });
        }}
        title="Excluir"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
