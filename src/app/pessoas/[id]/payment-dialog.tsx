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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { registerPersonPayment } from "@/lib/actions/people";
import { HandCoins } from "lucide-react";
import { formatDateInput } from "@/lib/format";

export function PaymentDialog({ personId, accounts }: { personId: string; accounts: any[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <HandCoins className="mr-1 h-4 w-4" /> Registrar pagamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            const res = await registerPersonPayment(fd);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            setError(null);
            toast({ title: "Pagamento registrado", variant: "success" });
            setOpen(false);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="personId" value={personId} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Valor pago</Label>
              <Input name="amount" defaultValue="0,00" required />
            </div>
            <div>
              <Label>Data do pagamento</Label>
              <DatePicker name="paidAt" defaultValue={formatDateInput(new Date())} required />
            </div>
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <Select name="method" defaultValue="PIX">
              <option value="PIX">Pix</option>
              <option value="TRANSFER">Transferência</option>
              <option value="CASH">Dinheiro</option>
              <option value="OTHER">Outro</option>
            </Select>
          </div>
          <div>
            <Label>Conta de destino (opcional)</Label>
            <Select name="accountId" defaultValue="">
              <option value="">—</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea name="notes" />
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
