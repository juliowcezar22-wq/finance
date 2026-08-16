"use server";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/auth/viewer";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseBRL, parseDateBR } from "@/lib/format";
import { toNum } from "@/lib/services/money";
import { type ActionResult, ok, err } from "@/lib/types/action";

const TYPES = ["PERSONAL", "EMERGENCY", "INVESTMENT", "COMPANY", "GOAL", "OTHER"] as const;

const Schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  currentAmount: z.number().nonnegative(),
  targetAmount: z.number().nullable().optional(),
  type: z.enum(TYPES),
  accountId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function saveCashBox(formData: FormData): Promise<ActionResult> {
  await getViewer();
  const targetRaw = String(formData.get("targetAmount") || "").trim();
  const parsed = Schema.safeParse({
    id: formData.get("id") || undefined,
    name: String(formData.get("name") || ""),
    currentAmount: parseBRL(String(formData.get("currentAmount") || "0")),
    targetAmount: targetRaw ? parseBRL(targetRaw) : null,
    type: String(formData.get("type") || "PERSONAL"),
    accountId: (formData.get("accountId") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");
  const input = parsed.data;

  const data = {
    name: input.name,
    currentAmount: input.currentAmount,
    targetAmount: input.targetAmount ?? null,
    type: input.type,
    accountId: input.accountId,
    notes: input.notes,
  };

  if (input.id) {
    await prisma.cashBox.update({ where: { id: input.id }, data });
  } else {
    await prisma.cashBox.create({ data });
  }

  revalidatePath("/caixa");
  revalidatePath("/dashboard");
  return ok();
}

export async function deleteCashBox(id: string): Promise<ActionResult> {
  await getViewer();
  await prisma.cashBox.delete({ where: { id } });
  revalidatePath("/caixa");
  revalidatePath("/dashboard");
  return ok();
}

const MoveSchema = z.object({
  cashBoxId: z.string().min(1),
  type: z.enum(["IN", "OUT"]),
  amount: z.number().positive(),
  date: z.date(),
  description: z.string().nullable().optional(),
});

export async function registerCashMovement(formData: FormData): Promise<ActionResult> {
  await getViewer();
  const date = parseDateBR(String(formData.get("date") || "")) ?? new Date();

  const parsed = MoveSchema.safeParse({
    cashBoxId: String(formData.get("cashBoxId") || ""),
    type: String(formData.get("type") || "IN"),
    amount: parseBRL(String(formData.get("amount") || "0")),
    date,
    description: (formData.get("description") as string) || null,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");
  const input = parsed.data;

  const box = await prisma.cashBox.findUnique({ where: { id: input.cashBoxId } });
  if (!box) return err("Caixa não encontrado");

  // Saldo via increment ATÔMICO (não valor absoluto lido antes): dois
  // movimentos concorrentes no mesmo caixa não se perdem (lost update).
  const delta = input.type === "IN" ? input.amount : -input.amount;

  await prisma.$transaction([
    prisma.cashBoxMovement.create({
      data: {
        cashBoxId: input.cashBoxId,
        type: input.type,
        amount: input.amount,
        date: input.date,
        description: input.description,
      },
    }),
    prisma.cashBox.update({
      where: { id: input.cashBoxId },
      data: { currentAmount: { increment: delta } },
    }),
  ]);

  revalidatePath("/caixa");
  revalidatePath("/dashboard");
  return ok();
}

export async function deleteCashMovement(id: string): Promise<ActionResult> {
  await getViewer();
  const mov = await prisma.cashBoxMovement.findUnique({ where: { id } });
  if (!mov) return err("Movimentação não encontrada");
  const delta = mov.type === "IN" ? -toNum(mov.amount) : toNum(mov.amount);

  await prisma.$transaction([
    prisma.cashBoxMovement.delete({ where: { id } }),
    prisma.cashBox.update({
      where: { id: mov.cashBoxId },
      data: { currentAmount: { increment: delta } },
    }),
  ]);
  revalidatePath("/caixa");
  revalidatePath("/dashboard");
  return ok();
}
