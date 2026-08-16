"use client";
import { Button } from "@/components/ui/button";
import { CardDialog } from "./card-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Pencil, Trash2 } from "lucide-react";
import { deleteCard } from "@/lib/actions/cards";

export function CardRowActions({
  card,
  people,
  accounts,
}: {
  card: any;
  people: any[];
  accounts?: any[];
}) {
  return (
    <div className="flex gap-1">
      <CardDialog
        people={people}
        accounts={accounts}
        initial={card}
        trigger={
          <Button variant="ghost" size="icon" title="Editar">
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
        title="Excluir cartão"
        description={`Excluir o cartão "${card.name}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={async () => {
          const res = await deleteCard(card.id);
          if (!res.ok) {
            toast({ title: res.error, variant: "danger" });
            return;
          }
          toast({ title: "Cartão excluído", variant: "success" });
        }}
      />
    </div>
  );
}
