"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { registerCashMovement } from "@/lib/actions/cashboxes";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { formatDateInput } from "@/lib/format";

export function MovementDialog({ cashBoxId, type }: { cashBoxId: string; type: "IN" | "OUT" }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isIn = type === "IN";
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant={isIn ? "default" : "outline"} size="sm">
          {isIn ? (
            <ArrowUpCircle className="mr-1 h-4 w-4" />
          ) : (
            <ArrowDownCircle className="mr-1 h-4 w-4" />
          )}
          {isIn ? "Entrada" : "Retirada"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isIn ? "Registrar entrada" : "Registrar retirada"}</DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            const res = await registerCashMovement(fd);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            setError(null);
            toast({ title: "Movimentação registrada", variant: "success" });
            setOpen(false);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="cashBoxId" value={cashBoxId} />
          <input type="hidden" name="type" value={type} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Valor</Label>
              <Input name="amount" defaultValue="0,00" required />
            </div>
            <div>
              <Label>Data</Label>
              <DatePicker name="date" defaultValue={formatDateInput(new Date())} required />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input name="description" placeholder="Opcional" />
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
