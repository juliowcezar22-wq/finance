"use client";
import { Button } from "@/components/ui/button";
import { GoalDialog } from "./goal-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Pencil, Trash2 } from "lucide-react";
import { deleteGoal } from "@/lib/actions/goals";

export function GoalRowActions({ goal }: { goal: any }) {
  return (
    <div className="flex gap-1">
      <GoalDialog
        initial={goal}
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
        title="Excluir meta"
        description={`Excluir a meta "${goal.name}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={async () => {
          const res = await deleteGoal(goal.id);
          if (!res.ok) {
            toast({ title: res.error, variant: "danger" });
            return;
          }
          toast({ title: "Meta excluída", variant: "success" });
        }}
      />
    </div>
  );
}
