"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";
import { quickRenameCard } from "@/lib/actions/cards";
import { toast } from "@/components/ui/toast";

export function QuickRenameCard({ id, name }: { id: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [pending, start] = useTransition();

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <span>{name}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            setValue(name);
            setEditing(true);
          }}
          title="Renomear cartão"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 text-base"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            start(() => {
              void (async () => {
                const res = await quickRenameCard(id, value);
                if (!res.ok) {
                  // mantém a edição aberta p/ corrigir
                  toast({ title: res.error, variant: "danger" });
                  return;
                }
                toast({ title: "Cartão renomeado", variant: "success" });
                setEditing(false);
              })();
            });
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        }}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        disabled={pending}
        onClick={() =>
          start(() => {
            void (async () => {
              const res = await quickRenameCard(id, value);
              if (!res.ok) {
                toast({ title: res.error, variant: "danger" });
                return;
              }
              toast({ title: "Cartão renomeado", variant: "success" });
              setEditing(false);
            })();
          })
        }
      >
        <Check className="h-3 w-3 text-nummiq-success" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(false)}>
        <X className="h-3 w-3" />
      </Button>
    </span>
  );
}
