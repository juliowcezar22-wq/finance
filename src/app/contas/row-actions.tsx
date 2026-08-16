"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { AccountDialog } from "./account-dialog";
import { deleteAccount } from "@/lib/actions/accounts";
import { Pencil, Trash2 } from "lucide-react";

export function AccountRowActions({ account }: { account: any }) {
  const [pending, start] = useTransition();
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
      <Button
        variant="ghost"
        size="icon"
        title="Excluir"
        disabled={pending}
        onClick={() => {
          if (confirm("Excluir esta conta?")) start(() => void deleteAccount(account.id));
        }}
      >
        <Trash2 className="h-4 w-4 text-nummiq-danger" />
      </Button>
    </div>
  );
}
