"use client";
import { useMemo, useState } from "react";
import { NummiqSymbol } from "@/components/brand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { GoalRowActions } from "./row-actions";
import { formatBRL, formatDateBR } from "@/lib/format";
import { CheckCircle2 } from "lucide-react";

export type GoalRow = {
  id: string;
  name: string;
  type: string;
  priority: number;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null; // ISO
  notes: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  economia: "Economia",
  quitacao: "Quitação",
  investimento: "Investimento",
  reserva: "Reserva",
};

function daysUntil(iso: string): number {
  const d = new Date(iso);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
}

export function GoalsGrid({ goals }: { goals: GoalRow[] }) {
  const [type, setType] = useState("");

  const filtered = useMemo(() => goals.filter((g) => !type || g.type === type), [goals, type]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:w-56">
              <Label className="text-xs">Tipo</Label>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Todos</option>
                <option value="economia">Economia</option>
                <option value="quitacao">Quitação</option>
                <option value="investimento">Investimento</option>
                <option value="reserva">Reserva</option>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground sm:pb-2">
              {filtered.length} de {goals.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            <NummiqSymbol size={44} className="mx-auto mb-3 opacity-40" />
            {goals.length === 0
              ? "Nenhuma meta cadastrada ainda. Toda liberdade começa com uma direção — crie sua primeira meta!"
              : "Nenhuma meta desse tipo."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => {
            const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
            const done = pct >= 100;
            const remaining = Math.max(0, g.targetAmount - g.currentAmount);
            const days = g.deadline ? daysUntil(g.deadline) : null;
            return (
              <Card key={g.id} className={done ? "ring-1 ring-nummiq-success/40" : undefined}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span className="truncate">{g.name}</span>
                    {done ? (
                      <Badge variant="success" className="shrink-0">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Concluída
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        {TYPE_LABEL[g.type] ?? g.type}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">{formatBRL(g.currentAmount)}</span>
                      <span className="text-muted-foreground">de {formatBRL(g.targetAmount)}</span>
                    </div>
                    <Progress value={Math.min(100, pct)} />
                    <div className="mt-1 flex justify-between text-xs">
                      <span className={done ? "text-nummiq-success" : "text-muted-foreground"}>
                        {pct.toFixed(0)}%
                      </span>
                      {!done && (
                        <span className="text-muted-foreground">faltam {formatBRL(remaining)}</span>
                      )}
                    </div>
                  </div>

                  {g.deadline && (
                    <p className="text-xs text-muted-foreground">
                      Prazo: {formatDateBR(new Date(g.deadline))}
                      {days !== null && !done && (
                        <span
                          className={
                            days < 0
                              ? "text-nummiq-danger"
                              : days <= 30
                                ? "text-nummiq-warning"
                                : ""
                          }
                        >
                          {" "}
                          ·{" "}
                          {days < 0
                            ? `${Math.abs(days)} dias em atraso`
                            : days === 0
                              ? "vence hoje"
                              : `faltam ${days} dias`}
                        </span>
                      )}
                    </p>
                  )}

                  <div className="flex justify-end pt-1">
                    <GoalRowActions goal={g} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
