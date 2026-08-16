"use client";
import { Button } from "@/components/ui/button";
import { IncomeDialog } from "./income-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Pencil, Trash2 } from "lucide-react";
import { deleteIncome } from "@/lib/actions/incomes";

export function IncomeActions({
  income,
  accounts,
  people,
  categories,
}: {
  income: any;
  accounts: any[];
  people: any[];
  categories: any[];
}) {
  return (
    <div className="flex justify-end gap-1">
      <IncomeDialog
        accounts={accounts}
        people={people}
        categories={categories}
        initial={income}
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
        title="Excluir receita"
        description={`Excluir ${income.description ? `"${income.description}"` : "esta receita"}? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={async () => {
          const res = await deleteIncome(income.id);
          if (!res.ok) {
            toast({ title: res.error, variant: "danger" });
            return;
          }
          toast({ title: "Receita excluída", variant: "success" });
        }}
      />
    </div>
  );
}
