"use client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Pencil, Trash2 } from "lucide-react";
import { UserDialog } from "./user-dialog";
import { deleteUser } from "@/lib/actions/users";

export function UserRowActions({ user, people }: { user: any; people: any[] }) {
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
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="icon" title="Desativar">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        }
        title="Desativar usuário"
        description={`Desativar o usuário "${user.name}"? Ele perderá o acesso ao sistema.`}
        confirmLabel="Desativar"
        onConfirm={async () => {
          const res = await deleteUser(user.id);
          // Guarda de último admin (e afins) não pode falhar em silêncio.
          if (!res.ok) {
            toast({ title: res.error, variant: "danger" });
            return;
          }
          toast({ title: "Usuário desativado", variant: "success" });
        }}
      />
    </div>
  );
}
