"use client";
import { Button } from "@/components/ui/button";
import { PersonDialog } from "./person-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Pencil, Trash2 } from "lucide-react";
import { deletePerson } from "@/lib/actions/people";

export function PersonRowActions({ person }: { person: any }) {
  return (
    <div className="flex gap-1">
      <PersonDialog
        initial={person}
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
        title="Excluir pessoa"
        description={`Excluir "${person.name}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={async () => {
          const res = await deletePerson(person.id);
          if (!res.ok) {
            toast({ title: res.error, variant: "danger" });
            return;
          }
          toast({ title: "Pessoa excluída", variant: "success" });
        }}
      />
    </div>
  );
}
