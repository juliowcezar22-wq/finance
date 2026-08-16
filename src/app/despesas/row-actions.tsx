"use client";
import { Button } from "@/components/ui/button";
import { ExpenseDialog } from "./expense-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Pencil, Trash2 } from "lucide-react";
import { deleteExpense } from "@/lib/actions/expenses";

export function ExpenseActions({
  expense,
  people,
  categories,
  accounts,
}: {
  expense: any;
  people: any[];
  categories: any[];
  accounts: any[];
}) {
  return (
    <div className="flex justify-end gap-1">
      <ExpenseDialog
        initial={expense}
        people={people}
        categories={categories}
        accounts={accounts}
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
        title="Excluir despesa"
        description={`Excluir "${expense.description}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={async () => {
          const res = await deleteExpense(expense.id);
          if (!res.ok) {
            toast({ title: res.error, variant: "danger" });
            return;
          }
          toast({ title: "Despesa excluída", variant: "success" });
        }}
      />
    </div>
  );
}
