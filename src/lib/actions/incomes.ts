"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseBRL, parseDateBR } from "@/lib/format";
import { getViewer } from "@/lib/auth/viewer";
import { type ActionResult, ok, err } from "@/lib/types/action";

// #1 Unificação: receitas vivem em Transaction (type=receita).
const ORIGINS = ["debito", "pix", "dinheiro", "boleto", "cartao"] as const;
const INCOME_TYPES = [
  "SALARY", "EARNINGS", "COMPANY_WITHDRAWAL", "SALE", "OTHER",
  "CLIENT", "REIMBURSEMENT", "LOAN_RECEIVED",
] as const;
const STATUS = ["pago", "pendente", "cancelado"] as const;

const Schema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Descrição obrigatória"),
  amount: z.number().nonnegative(),
  date: z.date(),
  origin: z.enum(ORIGINS),
  incomeType: z.enum(INCOME_TYPES),
  status: z.enum(STATUS),
  accountId: z.string().nullable().optional(),
  responsibleId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function saveIncome(formData: FormData): Promise<ActionResult> {
  await getViewer();
  const date = parseDateBR(String(formData.get("date") || "")) ?? new Date();

  const parsed = Schema.safeParse({
    id: formData.get("id") || undefined,
    description: String(formData.get("description") || ""),
    amount: parseBRL(String(formData.get("amount") || "0")),
    date,
    origin: String(formData.get("origin") || "debito"),
    incomeType: String(formData.get("incomeType") || "OTHER"),
    status: String(formData.get("status") || "pago"),
    accountId: (formData.get("accountId") as string) || null,
    responsibleId: (formData.get("responsibleId") as string) || null,
    categoryId: (formData.get("categoryId") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");
  const input = parsed.data;

  const data = {
    type: "receita",
    description: input.description,
    amount: input.amount,
    date: input.date,
    origin: input.origin,
    incomeType: input.incomeType,
    status: input.status,
    belongsTo: "pessoal",
    accountId: input.accountId,
    responsibleId: input.responsibleId,
    categoryId: input.categoryId,
    notes: input.notes,
  };

  if (input.id) {
    await prisma.transaction.update({ where: { id: input.id }, data });
  } else {
    await prisma.transaction.create({ data });
  }

  revalidatePath("/receitas");
  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
  return ok();
}

export async function deleteIncome(id: string): Promise<ActionResult> {
  await getViewer();
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/receitas");
  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
  return ok();
}

export async function setIncomeStatus(
  id: string,
  status: (typeof STATUS)[number]
): Promise<ActionResult> {
  await getViewer();
  await prisma.transaction.update({ where: { id }, data: { status } });
  revalidatePath("/receitas");
  revalidatePath("/dashboard");
  return ok();
}
