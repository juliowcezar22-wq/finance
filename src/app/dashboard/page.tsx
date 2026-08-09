import Link from "next/link";
import { getViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { getDashboardSummary } from "@/lib/services/calculations";
import { getMonthlyHistory } from "@/lib/services/history";
import { formatBRL, formatDateBR, monthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { FinancialValue } from "@/components/ui/financial-value";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { MonthlyBarChart } from "@/components/bar-chart";
import { DashboardMonthFilter } from "./month-filter";

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function endividamentoStatus(taxa: number): {
  label: string;
  variant: "success" | "warning" | "destructive";
} {
  if (taxa <= 0.3) return { label: "Saudável", variant: "success" };
  if (taxa <= 0.5) return { label: "Atenção", variant: "warning" };
  return { label: "Crítico", variant: "destructive" };
}

function parseMonthRef(mes?: string): Date {
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [year, month] = mes.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }
  return new Date();
}

function toMonthValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function greeting(): string {
  const hour = Number(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    })
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// Distribuição por categoria de gasto — barras platinum proporcionais.
function Distribution({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3.5">
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-nummiq-silver">{it.label}</span>
            <span className="tabular-nums text-nummiq-white">{formatBRL(it.value)}</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-accent">
            <div
              className="h-full rounded-full bg-gradient-to-r from-nummiq-platinum/40 to-nummiq-platinum/80"
              style={{ width: `${(it.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { mes?: string };
}) {
  const viewer = await getViewer("/dashboard");
  const ref = parseMonthRef(searchParams?.mes);

  const [summary, history, recentes] = await Promise.all([
    getDashboardSummary(ref),
    getMonthlyHistory(),
    prisma.transaction.findMany({
      orderBy: { date: "desc" },
      take: 6,
      select: {
        id: true,
        date: true,
        description: true,
        amount: true,
        type: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  const {
    receitas,
    despesas,
    faturas,
    aReceber,
    porPertenceA: { pessoal, empresa, terceiro: terceiros, familiar: familia },
    caixa,
    taxaEndividamento: taxa,
    sobraReal: sobra,
    receitasPrevistas: receitasPrev,
    despesasPrevistas: despesasPrev,
  } = summary;

  const endiv = endividamentoStatus(taxa);
  const firstName = viewer.name.split(/\s+/)[0];

  return (
    <div className="space-y-8">
      {/* Saudação + filtro de mês */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-nummiq-white">
            {greeting()}, {firstName}.
          </h1>
          <p className="mt-1 text-sm text-nummiq-silver">
            Sua visão financeira · {monthLabel(ref)}
          </p>
        </div>
        <DashboardMonthFilter current={toMonthValue(ref)} />
      </div>

      {/* Hero — Saldo em caixa */}
      <Card className="p-6 md:p-8">
        <p className="text-[11px] uppercase tracking-[0.16em] text-nummiq-muted">
          Saldo em caixa
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <FinancialValue value={caixa} size="display" />
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              sobra >= 0 ? "text-nummiq-success" : "text-nummiq-danger"
            )}
          >
            {sobra >= 0 ? "+" : "−"}
            {formatBRL(Math.abs(sobra))} neste mês
          </span>
        </div>
        <p className="mt-2 text-xs text-nummiq-muted">
          Sobra real: receitas recebidas − despesas pagas − faturas pagas
        </p>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Receitas do mês" value={formatBRL(receitas)} intent="positive" />
        <StatCard title="Despesas do mês" value={formatBRL(despesas)} intent="negative" />
        <StatCard
          title="Sobra do mês"
          value={formatBRL(sobra)}
          intent={sobra >= 0 ? "positive" : "negative"}
        />
        <StatCard
          title="Faturas em aberto"
          value={formatBRL(faturas.openAmount)}
          hint={`Total: ${formatBRL(faturas.total)}`}
        />
      </div>

      {/* Fluxo de caixa (principal) + Distribuição (secundário) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-medium text-nummiq-white">Fluxo de caixa</h2>
            <span className="text-xs text-nummiq-muted">
              últimos {history.labels.length} meses
            </span>
          </div>
          <MonthlyBarChart labels={history.labels} values={history.caixa} tone="cash" />
        </Card>
        <Card className="p-5">
          <h2 className="mb-5 text-sm font-medium text-nummiq-white">
            Distribuição por categoria
          </h2>
          <Distribution
            items={[
              { label: "Pessoal", value: pessoal },
              { label: "Empresa", value: empresa },
              { label: "Terceiros", value: terceiros },
              { label: "Família", value: familia },
            ]}
          />
        </Card>
      </div>

      {/* Transações recentes */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-medium text-nummiq-white">Transações recentes</h2>
          <Link
            href="/transacoes"
            className="text-xs text-nummiq-silver transition-colors hover:text-nummiq-white"
          >
            Ver todas
          </Link>
        </div>
        {recentes.length === 0 ? (
          <EmptyState
            className="border-0"
            title="Nenhuma transação encontrada"
            description="Adicione sua primeira transação para começar."
          />
        ) : (
          <Table>
            <TableBody>
              {recentes.map((t) => {
                const n = Number(t.amount);
                const signed = t.type === "receita" ? n : t.type === "despesa" ? -n : n;
                const colored = t.type === "receita" || t.type === "despesa";
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium text-nummiq-white">{t.description}</div>
                      {t.category?.name && (
                        <Badge variant="secondary" className="mt-1">
                          {t.category.name}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-nummiq-muted">
                      {formatDateBR(t.date)}
                    </TableCell>
                    <TableCell className="text-right">
                      <FinancialValue value={signed} size="sm" colorBySign={colored} signed={colored} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Saúde & previsão (secundário, compacto) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-nummiq-muted">
            Taxa de endividamento
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span
              className={cn(
                "text-2xl font-semibold tabular-nums",
                endiv.variant === "success"
                  ? "text-nummiq-success"
                  : endiv.variant === "warning"
                    ? "text-nummiq-warning"
                    : "text-nummiq-danger"
              )}
            >
              {pct(taxa)}
            </span>
            <Badge variant={endiv.variant}>{endiv.label}</Badge>
          </div>
          <p className="mt-2 text-xs text-nummiq-muted">
            Saudável até 30%, crítico acima de 50%.
          </p>
        </Card>
        <StatCard
          title="Previsto a receber"
          value={formatBRL(receitasPrev + aReceber)}
          intent="positive"
        />
        <StatCard
          title="Previsto a pagar"
          value={formatBRL(despesasPrev + faturas.openAmount)}
          intent="negative"
        />
      </div>
    </div>
  );
}
