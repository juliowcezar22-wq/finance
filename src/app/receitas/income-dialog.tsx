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
import { saveIncome } from "@/lib/actions/incomes";
import { Plus } from "lucide-react";
import { formatDateInput } from "@/lib/format";

export function IncomeDialog({
  accounts,
  people,
  categories,
  initial,
  trigger,
}: {
  accounts: any[];
  people: any[];
  categories: any[];
  initial?: any;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-1 h-4 w-4" /> Nova receita
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar receita" : "Nova receita"}</DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            await saveIncome(fd);
            setOpen(false);
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}

          <div className="col-span-2">
            <Label>Descrição</Label>
            <Input name="description" defaultValue={initial?.description ?? ""} required />
          </div>

          <div>
            <Label>Valor</Label>
            <Input
              name="amount"
              defaultValue={initial?.amount?.toString().replace(".", ",") ?? "0,00"}
              required
            />
          </div>
          <div>
            <Label>Data de recebimento</Label>
            <DatePicker
              name="date"
              defaultValue={
                initial?.date ? formatDateInput(initial.date) : formatDateInput(new Date())
              }
              required
            />
          </div>

          <div>
            <Label>Forma de recebimento</Label>
            <Select name="origin" defaultValue={initial?.origin ?? "debito"}>
              <option value="debito">Conta bancária</option>
              <option value="pix">Pix</option>
              <option value="dinheiro">Dinheiro em espécie</option>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Receita não pode entrar em cartão de crédito.
            </p>
          </div>

          <div>
            <Label>Tipo</Label>
            <Select name="incomeType" defaultValue={initial?.incomeType ?? "OTHER"}>
              <option value="SALARY">Salário</option>
              <option value="EARNINGS">Rendimentos</option>
              <option value="COMPANY_WITHDRAWAL">Retirada da empresa</option>
              <option value="SALE">Venda</option>
              <option value="OTHER">Outro</option>
            </Select>
          </div>

          <div>
            <Label>Conta de destino</Label>
            <Select name="accountId" defaultValue={initial?.accountId ?? ""}>
              <option value="">—</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Pessoa relacionada</Label>
            <Select name="responsibleId" defaultValue={initial?.responsibleId ?? ""}>
              <option value="">—</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Categoria</Label>
            <Select name="categoryId" defaultValue={initial?.categoryId ?? ""}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Status</Label>
            <Select name="status" defaultValue={initial?.status ?? "pago"}>
              <option value="pago">Recebido</option>
              <option value="pendente">Previsto</option>
              <option value="cancelado">Cancelado</option>
            </Select>
          </div>

          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea name="notes" defaultValue={initial?.notes ?? ""} />
          </div>

          <DialogFooter className="col-span-2">
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
