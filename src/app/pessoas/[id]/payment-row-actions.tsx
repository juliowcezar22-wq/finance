"use client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Trash2 } from "lucide-react";
import { deletePersonPayment } from "@/lib/actions/people";

export function PaymentDeleteButton({ id }: { id: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" title="Excluir">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      }
      title="Excluir pagamento"
      description="Excluir este pagamento? Essa ação não pode ser desfeita."
      confirmLabel="Excluir"
      onConfirm={async () => {
        const res = await deletePersonPayment(id);
        if (!res.ok) {
          toast({ title: res.error, variant: "danger" });
          return;
        }
        toast({ title: "Pagamento excluído", variant: "success" });
      }}
    />
  );
}
