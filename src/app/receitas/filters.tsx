"use client";
import { Input } from "@/components/ui/input";
import { MonthPicker } from "@/components/ui/month-picker";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

export function IncomeFilters({ people }: { people: any[] }) {
  const router = useRouter();
  const sp = useSearchParams();

  function update(name: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    router.push(`/receitas?${params.toString()}`);
  }

  function clear() {
    router.push("/receitas");
  }

  return (
    <div className="flex items-end gap-2">
      <div>
        <Label className="text-xs">Mês</Label>
        <MonthPicker value={sp.get("mes") ?? ""} onChange={(v) => update("mes", v)} />
      </div>
      <Button variant="outline" type="button" onClick={clear}>
        Mês atual
      </Button>
    </div>
  );
}
