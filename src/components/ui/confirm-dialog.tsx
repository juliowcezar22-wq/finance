"use client";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

/**
 * Confirmação destrutiva do design system (feature 010) — substitui os
 * window.confirm(). Uso:
 *
 *   <ConfirmDialog
 *     trigger={<Button variant="ghost" size="icon"><Trash2/></Button>}
 *     title="Excluir despesa"
 *     description={`Excluir "${e.description}"? Essa ação não pode ser desfeita.`}
 *     confirmLabel="Excluir"
 *     onConfirm={async () => { ... }}   // pode ser async; fecha ao concluir
 *   />
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Excluir",
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) setOpen(v); // Esc/overlay/X não fecham durante a operação
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } catch {
                  // Exceção não tratada pelo consumer: nunca falhar em silêncio.
                  toast({ title: "Não foi possível concluir a ação.", variant: "danger" });
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            {busy ? `${confirmLabel.replace(/r$/, "ndo")}…` : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
