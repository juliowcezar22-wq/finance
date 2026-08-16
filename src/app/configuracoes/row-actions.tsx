"use client";
import { Button } from "@/components/ui/button";
import { CategoryDialog } from "./category-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { deleteCategory } from "@/lib/actions/categories";
import { useTransition } from "react";

export function CategoryRowActions({ category }: { category: any }) {
  const [pending, start] = useTransition();
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
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() => {
          if (!confirm("Excluir esta categoria?")) return;
          start(() => void deleteCategory(category.id));
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
