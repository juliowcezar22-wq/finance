"use client";
import { Button } from "@/components/ui/button";
import { RuleDialog } from "./rule-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Pencil, Trash2 } from "lucide-react";
import { deleteRule } from "@/lib/actions/rules";

export function RuleRowActions({
  rule,
  categories,
  cards,
}: {
  rule: any;
  categories: any[];
  cards: any[];
}) {
  return (
    <div className="flex justify-end gap-1">
      <RuleDialog
        categories={categories}
        cards={cards}
        initial={rule}
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
        title="Excluir regra"
        description={`Excluir a regra "${rule.name}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={async () => {
          const res = await deleteRule(rule.id);
          if (!res.ok) {
            toast({ title: res.error, variant: "danger" });
            return;
          }
          toast({ title: "Regra excluída", variant: "success" });
        }}
      />
    </div>
  );
}
