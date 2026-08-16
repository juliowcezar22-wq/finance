"use client";
import { Button } from "@/components/ui/button";
import { AccountDialog } from "./account-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { deleteAccount } from "@/lib/actions/accounts";
import { Pencil, Trash2 } from "lucide-react";

export function AccountRowActions({ account }: { account: any }) {
  return (
    <div className="flex gap-1">
      <AccountDialog
        initial={account}
        trigger={
          <Button variant="ghost" size="icon" title="Editar">
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="icon" title="Excluir">
            <Trash2 className="h-4 w-4 text-nummiq-danger" />
          </Button>
        }
        title="Excluir conta"
        description={`Excluir a conta "${account.name}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={async () => {
          const res = await deleteAccount(account.id);
          if (!res.ok) {
            toast({ title: res.error, variant: "danger" });
            return;
          }
          toast({ title: "Conta excluída", variant: "success" });
        }}
      />
    </div>
  );
}
