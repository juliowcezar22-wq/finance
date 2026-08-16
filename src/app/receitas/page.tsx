import { PageHeader } from "@/components/page-header";
import { NummiqSymbol } from "@/components/brand";
import { StatCard } from "@/components/stat-card";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDateBR, monthRange } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  MobileCards,
  MobileCard,
  MobileCardHeader,
  MobileCardActions,
  Field,
  MobileEmpty,
} from "@/components/ui/record-card";
import { IncomeDialog } from "./income-dialog";
import { IncomeActions } from "./row-actions";
import { IncomeFilters } from "./filters";
import { LoadMore, parseLimit } from "@/components/load-more";
import { getViewer } from "@/lib/auth/viewer";
import { toNum } from "@/lib/services/money";

type Search = {
  mes?: string;
  status?: string;
  origem?: string;
  pessoa?: string;
  limit?: string;
};

// #1 Unificação: receitas = Transaction(type=receita). Vocabulário do Transaction.
const ORIGIN_LABEL: Record<string, string> = {
  debito: "Conta bancária",
  pix: "Pix",
  dinheiro: "Dinheiro",
  boleto: "Boleto",
  cartao: "Cartão",
};

const TYPE_LABEL: Record<string, string> = {
  SALARY: "Salário",
  EARNINGS: "Rendimentos",
  COMPANY_WITHDRAWAL: "Retirada da empresa",
  SALE: "Venda",
  OTHER: "Outro",
  CLIENT: "Cliente",
  REIMBURSEMENT: "Reembolso",
  LOAN_RECEIVED: "Empréstimo recebido",
};

const STATUS_LABEL: Record<string, string> = {
  pago: "Recebido",
  pendente: "Previsto",
  cancelado: "Cancelado",
};

function statusVariant(s: string): any {
  if (s === "pago") return "success";
  if (s === "pendente") return "warning";
  return "secondary";
}

export default async function ReceitasPage({ searchParams }: { searchParams: Search }) {
  await getViewer();
  const where: any = { type: "receita" };
  if (searchParams.mes) {
    const [y, m] = searchParams.mes.split("-").map(Number);
    if (y && m) {
      const ref = new Date(y, m - 1, 1);
      const { start, end } = monthRange(ref);
      where.date = { gte: start, lt: end };
    }
  }
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.origem) where.origin = searchParams.origem;
  if (searchParams.pessoa) where.responsibleId = searchParams.pessoa;

  const limit = parseLimit(searchParams.limit);

  const [rows, accounts, people, categories, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: { account: true, responsible: true, category: true },
      take: limit + 1,
    }),
    prisma.account.findMany({ orderBy: { name: "asc" } }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { kind: { in: ["receita", "mista"] } },
      orderBy: { name: "asc" },
    }),
    prisma.transaction.count({ where }),
  ]);

  const hasExtra = rows.length > limit;
  const incomes = hasExtra ? rows.slice(0, limit) : rows;

  // Totais dos cards seguem o período selecionado no filtro (ou mês atual)
  let ref = new Date();
  if (searchParams.mes) {
    const [y, m] = searchParams.mes.split("-").map(Number);
    if (y && m) ref = new Date(y, m - 1, 1);
  }
  const { start, end } = monthRange(ref);
  const monthIncomes = await prisma.transaction.findMany({
    where: { type: "receita", date: { gte: start, lt: end } },
    select: { amount: true, status: true },
  });
  const totalRecebido = monthIncomes
    .filter((i) => i.status === "pago")
    .reduce((s, i) => s + toNum(i.amount), 0);
  const totalPrevisto = monthIncomes
    .filter((i) => i.status === "pendente")
    .reduce((s, i) => s + toNum(i.amount), 0);

  return (
    <div>
      <PageHeader
        title="Receitas"
        description="Cadastre todas as suas entradas de dinheiro"
        actions={<IncomeDialog accounts={accounts} people={people} categories={categories} />}
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <IncomeFilters people={people} />
        </CardContent>
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard title="Recebido no mês" value={formatBRL(totalRecebido)} intent="positive" />
        <StatCard title="Previsto no mês" value={formatBRL(totalPrevisto)} intent="warning" />
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Desktop: tabela completa */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      <NummiqSymbol size={44} className="mx-auto mb-3 opacity-40" />
                      Nenhuma receita registrada neste período. Adicione uma entrada para começar.
                    </TableCell>
                  </TableRow>
                )}
                {incomes.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{formatDateBR(i.date)}</TableCell>
                    <TableCell className="max-w-xs truncate">{i.description}</TableCell>
                    <TableCell>
                      {i.incomeType ? (TYPE_LABEL[i.incomeType] ?? i.incomeType) : "—"}
                    </TableCell>
                    <TableCell>{ORIGIN_LABEL[i.origin] ?? i.origin}</TableCell>
                    <TableCell>{i.account?.name ?? "—"}</TableCell>
                    <TableCell>{i.responsible?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(i.status)}>
                        {STATUS_LABEL[i.status] ?? i.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-nummiq-success">
                      +{formatBRL(i.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <IncomeActions
                        income={i}
                        accounts={accounts}
                        people={people}
                        categories={categories}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cada receita vira um card */}
          <MobileCards>
            {incomes.length === 0 ? (
              <MobileEmpty>
                <NummiqSymbol size={44} className="mx-auto mb-3 opacity-40" />
                Nenhuma receita registrada neste período. Adicione uma entrada para começar.
              </MobileEmpty>
            ) : (
              incomes.map((i) => (
                <MobileCard key={i.id}>
                  <MobileCardHeader
                    title={i.description}
                    aside={
                      <span className="font-semibold text-nummiq-success">
                        +{formatBRL(i.amount)}
                      </span>
                    }
                  />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{formatDateBR(i.date)}</span>
                    <span aria-hidden>·</span>
                    <span>{i.incomeType ? (TYPE_LABEL[i.incomeType] ?? i.incomeType) : "—"}</span>
                    <Badge variant={statusVariant(i.status)}>
                      {STATUS_LABEL[i.status] ?? i.status}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    <Field label="Origem">{ORIGIN_LABEL[i.origin] ?? i.origin}</Field>
                    <Field label="Conta">{i.account?.name ?? "—"}</Field>
                    <Field label="Pessoa">{i.responsible?.name ?? "—"}</Field>
                  </div>
                  <MobileCardActions>
                    <IncomeActions
                      income={i}
                      accounts={accounts}
                      people={people}
                      categories={categories}
                    />
                  </MobileCardActions>
                </MobileCard>
              ))
            )}
          </MobileCards>

          <LoadMore
            shown={incomes.length}
            total={totalCount}
            limit={limit}
            searchParams={searchParams}
            label="receitas"
          />
        </CardContent>
      </Card>
    </div>
  );
}
