import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { toNum } from "@/lib/services/money";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountDialog } from "./account-dialog";
import { AccountRowActions } from "./row-actions";
import { getViewer } from "@/lib/auth/viewer";

const TYPE_LABEL: Record<string, string> = {
  corrente: "Conta corrente",
  poupanca: "Poupança",
  dinheiro: "Dinheiro / carteira",
  investimento: "Investimento",
};

export default async function ContasPage() {
  await getViewer("/contas");
  const accounts = await prisma.account.findMany({ orderBy: { name: "asc" } });
  const total = accounts.reduce((s, a) => s + toNum(a.balance), 0);

  return (
    <div>
      <PageHeader
        title="Contas"
        description="Suas contas bancárias e saldos"
        actions={<AccountDialog />}
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title="Saldo total em contas" value={formatBRL(total)} intent="positive" />
        <StatCard title="Contas cadastradas" value={String(accounts.length)} />
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          title="Nenhuma conta cadastrada"
          description="Adicione sua primeira conta bancária para acompanhar saldos."
          action={<AccountDialog />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-medium text-nummiq-white">{a.name}</h3>
                  <p className="mt-0.5 text-xs text-nummiq-muted">
                    {a.bank ?? "—"} · {TYPE_LABEL[a.type] ?? a.type}
                  </p>
                </div>
                {!a.active && <Badge variant="secondary">Inativa</Badge>}
              </div>
              <p className="mt-4 text-2xl font-semibold tabular-nums text-nummiq-white">
                {formatBRL(a.balance)}
              </p>
              <div className="mt-3">
                <AccountRowActions account={a} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
