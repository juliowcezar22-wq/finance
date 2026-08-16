"use client";
import { Button } from "@/components/ui/button";
import { CashBoxDialog } from "./cashbox-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Pencil, Trash2 } from "lucide-react";
import { deleteCashBox, deleteCashMovement } from "@/lib/actions/cashboxes";

export function CashBoxActions({ box, accounts }: { box: any; accounts: any[] }) {
  return (
    <div className="flex gap-1">
      <CashBoxDialog
        accounts={accounts}
        initial={box}
        trigger={
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="icon" title="Excluir">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        }
        title="Excluir caixa"
        description={`Excluir o caixa "${box.name}"? As movimentações serão perdidas e essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={async () => {
          const res = await deleteCashBox(box.id);
          if (!res.ok) {
            toast({ title: res.error, variant: "danger" });
            return;
          }
          toast({ title: "Caixa excluído", variant: "success" });
        }}
      />
    </div>
  );
}

export function MovementDeleteButton({ id }: { id: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" title="Excluir">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      }
      title="Excluir movimentação"
      description="Excluir esta movimentação? Essa ação não pode ser desfeita."
      confirmLabel="Excluir"
      onConfirm={async () => {
        const res = await deleteCashMovement(id);
        if (!res.ok) {
          toast({ title: res.error, variant: "danger" });
          return;
        }
        toast({ title: "Movimentação excluída", variant: "success" });
      }}
    />
  );
}
