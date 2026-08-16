"use client";
import { Button } from "@/components/ui/button";
import { TransactionDialog } from "./transaction-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Pencil, Trash2 } from "lucide-react";
import { deleteTransaction } from "@/lib/actions/transactions";

export function TransactionRowActions({
  tx,
  cards,
  people,
  categories,
  accounts,
}: {
  tx: any;
  cards: any[];
  people: any[];
  categories: any[];
  accounts: any[];
}) {
  return (
    <div className="flex justify-end gap-1">
      <TransactionDialog
        cards={cards}
        people={people}
        categories={categories}
        accounts={accounts}
        initial={tx}
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
        title="Excluir transação"
        description={`Excluir "${tx.description}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={async () => {
          const res = await deleteTransaction(tx.id);
          if (!res.ok) {
            toast({ title: res.error, variant: "danger" });
            return;
          }
          toast({ title: "Transação excluída", variant: "success" });
        }}
      />
    </div>
  );
}
