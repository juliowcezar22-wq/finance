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
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { saveAccount } from "@/lib/actions/accounts";
import { Plus } from "lucide-react";

export function AccountDialog({ initial, trigger }: { initial?: any; trigger?: React.ReactNode }) {
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
        {trigger ?? (
          <Button>
            <Plus className="mr-1 h-4 w-4" /> Nova conta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar conta" : "Nova conta"}</DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            const res = await saveAccount(fd);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            setError(null);
            toast({ title: "Conta salva", variant: "success" });
            setOpen(false);
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}
          <div className="col-span-2">
            <Label>Nome</Label>
            <Input name="name" defaultValue={initial?.name ?? ""} required />
          </div>
          <div>
            <Label>Banco</Label>
            <Input name="bank" defaultValue={initial?.bank ?? ""} />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select name="type" defaultValue={initial?.type ?? "corrente"}>
              <option value="corrente">Conta corrente</option>
              <option value="poupanca">Poupança</option>
              <option value="dinheiro">Dinheiro / carteira</option>
              <option value="investimento">Investimento</option>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Saldo atual</Label>
            <Input
              name="balance"
              defaultValue={initial?.balance?.toString().replace(".", ",") ?? "0,00"}
            />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} />
            <Label>Ativa</Label>
          </div>
          {error && (
            <p
              role="alert"
              className="col-span-2 text-sm font-medium text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          )}
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
