"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MonthPicker } from "@/components/ui/month-picker";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function DashboardMonthFilter({ current }: { current: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const path = usePathname();

  function update(value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set("mes", value);
    else params.delete("mes");
    const qs = params.toString();
    router.push(qs ? `${path}?${qs}` : path);
  }

  return (
    <div className="flex items-end gap-2">
      <div className="w-[200px]">
        <Label className="text-xs text-nummiq-muted">Mês de análise</Label>
        <div className="mt-1">
          <MonthPicker value={current} onChange={update} />
        </div>
      </div>
      <Button variant="outline" type="button" onClick={() => update("")}>
        Mês atual
      </Button>
    </div>
  );
}
