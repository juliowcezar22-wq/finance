import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDateBR, monthRange } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MobileCards,
  MobileCard,
  MobileCardHeader,
  Field,
  MobileEmpty,
} from "@/components/ui/record-card";
import { Filters } from "./filters";
import { TransactionDialog } from "./transaction-dialog";
import { TransactionRowActions } from "./row-actions";
import { LoadMore, parseLimit } from "@/components/load-more";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getViewer } from "@/lib/auth/viewer";

type Search = {
  mes?: string;
  pessoa?: string;
  cartao?: string;
  categoria?: string;
  status?: string;
  tipo?: string;
  limit?: string;
};

function statusVariant(status: string): any {
  switch (status) {
    case "pago":
      return "success";
    case "devendo":
      return "destructive";
    case "reembolsado":
      return "secondary";
    case "cancelado":
      return "outline";
    default:
      return "warning";
  }
}

export default async function TransacoesPage({ searchParams }: { searchParams: Search }) {
  await getViewer("/transacoes");

  // Isolamento por dono é automático (extensão do Prisma).
  const where: any = {};

  if (searchParams.mes) {
    const [y, m] = searchParams.mes.split("-").map(Number);
    if (y && m) {
      const ref = new Date(y, m - 1, 1);
      const { start, end } = monthRange(ref);
      where.date = { gte: start, lt: end };
    }
  }
  if (searchParams.pessoa) where.responsibleId = searchParams.pessoa;
  if (searchParams.cartao) where.cardId = searchParams.cartao;
  if (searchParams.categoria) where.categoryId = searchParams.categoria;
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.tipo) where.type = searchParams.tipo;

  const limit = parseLimit(searchParams.limit);

  const [rows, cards, people, categories, accounts, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: { card: true, category: true, responsible: true, account: true },
      take: limit + 1,
    }),
    prisma.creditCard.findMany({ orderBy: { name: "asc" } }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.account.findMany({ orderBy: { name: "asc" } }),
    prisma.transaction.count({ where }),
  ]);

  const hasExtra = rows.length > limit;
  const transactions = hasExtra ? rows.slice(0, limit) : rows;

  return (
    <div>
      <PageHeader
        title="Transações"
        description="Histórico de todas as transações da sua conta."
        actions={
          <TransactionDialog
            cards={cards}
            people={people}
            categories={categories}
            accounts={accounts}
            trigger={
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Nova transação
              </Button>
            }
          />
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <Filters cards={cards} people={people} categories={categories} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {/* Desktop: tabela completa */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Cartão / Conta</TableHead>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      Nenhuma transação encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{formatDateBR(t.date)}</TableCell>
                    <TableCell className="max-w-xs truncate">{t.description}</TableCell>
                    <TableCell>{t.category?.name ?? "—"}</TableCell>
                    <TableCell>{t.card?.name ?? t.account?.name ?? "—"}</TableCell>
                    <TableCell>{t.responsible?.name ?? "—"}</TableCell>
                    <TableCell className="capitalize">{t.belongsTo}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${t.type === "receita" ? "text-nummiq-success" : ""}`}
                    >
                      {t.type === "despesa" ? "-" : "+"}
                      {formatBRL(t.amount)}
                    </TableCell>
                    <TableCell>
                      <TransactionRowActions
                        tx={t}
                        cards={cards}
                        people={people}
                        categories={categories}
                        accounts={accounts}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cada movimentação vira um card */}
          <MobileCards>
            {transactions.length === 0 ? (
              <MobileEmpty>Nenhuma transação encontrada.</MobileEmpty>
            ) : (
              transactions.map((t) => (
                <MobileCard key={t.id}>
                  <MobileCardHeader
                    title={t.description}
                    aside={
                      <span
                        className={`font-semibold ${
                          t.type === "receita" ? "text-nummiq-success" : ""
                        }`}
                      >
                        {t.type === "despesa" ? "-" : "+"}
                        {formatBRL(t.amount)}
                      </span>
                    }
                  />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{formatDateBR(t.date)}</span>
                    <span aria-hidden>·</span>
                    <span>{t.category?.name ?? "—"}</span>
                    <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    <Field label="Cartão / Conta">{t.card?.name ?? t.account?.name ?? "—"}</Field>
                    <Field label="Pessoa">{t.responsible?.name ?? "—"}</Field>
                    <Field label="Grupo">
                      <span className="capitalize">{t.belongsTo}</span>
                    </Field>
                  </div>
                  <div className="flex justify-end pt-1">
                    <TransactionRowActions
                      tx={t}
                      cards={cards}
                      people={people}
                      categories={categories}
                      accounts={accounts}
                    />
                  </div>
                </MobileCard>
              ))
            )}
          </MobileCards>

          <LoadMore
            shown={transactions.length}
            total={totalCount}
            limit={limit}
            searchParams={searchParams}
            label="transações"
          />
        </CardContent>
      </Card>
    </div>
  );
}
