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
import { saveCard } from "@/lib/actions/cards";
import { Plus } from "lucide-react";

export function CardDialog({
  people,
  accounts = [],
  initial,
  trigger,
}: {
  people: any[];
  accounts?: any[];
  initial?: any;
  trigger?: React.ReactNode;
}) {
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
            <Plus className="mr-1 h-4 w-4" /> Novo cartão
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar cartão" : "Novo cartão"}</DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            const res = await saveCard(fd);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            setError(null);
            toast({ title: "Cartão salvo", variant: "success" });
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
            <Select name="type" defaultValue={initial?.type ?? "pessoal"}>
              <option value="pessoal">Pessoal</option>
              <option value="empresarial">Empresarial</option>
              <option value="terceiro">Terceiro</option>
            </Select>
          </div>
          <div>
            <Label>Titular</Label>
            <Select name="holderId" defaultValue={initial?.holderId ?? ""}>
              <option value="">—</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Limite total</Label>
            <Input
              name="limitTotal"
              defaultValue={initial?.limitTotal?.toString().replace(".", ",") ?? "0,00"}
            />
          </div>
          <div>
            <Label>Dia de fechamento</Label>
            <Input
              name="closingDay"
              type="number"
              min={1}
              max={31}
              defaultValue={initial?.closingDay ?? 1}
            />
          </div>
          <div>
            <Label>Dia de vencimento</Label>
            <Input
              name="dueDay"
              type="number"
              min={1}
              max={31}
              defaultValue={initial?.dueDay ?? 10}
            />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} />
            <Label>Ativo</Label>
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
