"use client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { Trash2 } from "lucide-react";
import { deleteInvoice } from "@/lib/actions/invoices";
import { deleteImportBatch } from "@/lib/actions/import";

/** Exclui uma fatura importada (e todas as suas transações). */
export function DeleteInvoiceButton({
  invoiceId,
  label,
}: {
  invoiceId: string;
  label: string; // ex.: "Junho / 2026 — Nubank Israel"
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" title="Excluir fatura e todas as suas transações">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      }
      title="Excluir fatura"
      description={`Excluir a fatura ${label}? Todas as transações dessa fatura (e os valores a receber vinculados) serão apagados. Essa ação não pode ser desfeita.`}
      confirmLabel="Excluir"
      onConfirm={async () => {
        const res = await deleteInvoice(invoiceId);
        if (!res.ok) {
          toast({ title: res.error, variant: "danger" });
          return;
        }
        toast({ title: "Fatura excluída", variant: "success" });
      }}
    />
  );
}

/** Exclui (desfaz) um lote de importação inteiro. */
export function DeleteBatchButton({
  batchId,
  label,
}: {
  batchId: string;
  label: string; // ex.: nome do arquivo
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="ghost"
          size="icon"
          title="Desfazer esta importação (apaga as transações importadas)"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      }
      title="Desfazer importação"
      description={`Desfazer a importação "${label}"? Todas as transações importadas nesse lote serão apagadas e as faturas afetadas serão recalculadas. Essa ação não pode ser desfeita.`}
      confirmLabel="Desfazer"
      onConfirm={async () => {
        try {
          await deleteImportBatch(batchId);
          toast({ title: "Importação desfeita", variant: "success" });
        } catch {
          toast({ title: "Não foi possível desfazer a importação.", variant: "danger" });
        }
      }}
    />
  );
}
