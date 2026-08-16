"use client";
import { Button } from "@/components/ui/button";
import { CategoryDialog } from "./category-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Pencil, Trash2 } from "lucide-react";
import { deleteCategory } from "@/lib/actions/categories";

export function CategoryRowActions({ category }: { category: any }) {
  return (
    <div className="flex justify-end gap-1">
      <CategoryDialog
        initial={category}
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
        title="Excluir categoria"
        description={`Excluir a categoria "${category.name}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={async () => {
          const res = await deleteCategory(category.id);
          if (!res.ok) {
            toast({ title: res.error, variant: "danger" });
            return;
          }
          toast({ title: "Categoria excluída", variant: "success" });
        }}
      />
    </div>
  );
}
