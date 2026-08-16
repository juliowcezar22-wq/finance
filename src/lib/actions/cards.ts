"use server";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/auth/viewer";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseBRL } from "@/lib/format";
import { type ActionResult, ok, err } from "@/lib/types/action";

const CardSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  bank: z.string().optional().nullable(),
  type: z.enum(["pessoal", "empresarial", "terceiro"]).default("pessoal"),
  holderId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  limitTotal: z.number().nonnegative(),
  closingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  active: z.boolean().default(true),
});

export async function saveCard(formData: FormData): Promise<ActionResult> {
  await getViewer();
  const parsed = CardSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    bank: formData.get("bank") || null,
    type: formData.get("type") || "pessoal",
    holderId: formData.get("holderId") || null,
    accountId: formData.get("accountId") || null,
    limitTotal: parseBRL(String(formData.get("limitTotal") || "0")),
    closingDay: Number(formData.get("closingDay") || 1),
    dueDay: Number(formData.get("dueDay") || 10),
    active: formData.get("active") !== "false",
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");
  const input = parsed.data;

  const data = {
    name: input.name,
    bank: input.bank,
    type: input.type,
    holderId: input.holderId || null,
    accountId: input.accountId || null,
    limitTotal: input.limitTotal,
    closingDay: input.closingDay,
    dueDay: input.dueDay,
    active: input.active,
  };

  if (input.id) {
    await prisma.creditCard.update({ where: { id: input.id }, data });
  } else {
    await prisma.creditCard.create({ data });
  }
  revalidatePath("/cartoes");
  return ok();
}

// Criação rápida de conta bancária (usada na importação inline). Retorna o id.
const QuickAccountSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  bank: z.string().optional().nullable(),
  limitTotal: z.number().nonnegative().default(0),
  closingDay: z.number().int().min(1).max(31).default(1),
  dueDay: z.number().int().min(1).max(31).default(10),
});

export async function createBankAccountQuick(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  await getViewer();
  const parsed = QuickAccountSchema.safeParse({
    name: formData.get("name"),
    bank: formData.get("bank") || null,
    limitTotal: parseBRL(String(formData.get("limitTotal") || "0")),
    closingDay: Number(formData.get("closingDay") || 1),
    dueDay: Number(formData.get("dueDay") || 10),
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");
  const input = parsed.data;
  const created = await prisma.creditCard.create({
    data: {
      name: input.name,
      bank: input.bank,
      limitTotal: input.limitTotal,
      closingDay: input.closingDay,
      dueDay: input.dueDay,
    },
  });
  revalidatePath("/cartoes");
  revalidatePath("/importar");
  return ok({ id: created.id });
}

export async function quickRenameCard(id: string, name: string): Promise<ActionResult> {
  await getViewer();
  if (!name.trim()) return err("Nome obrigatório");
  await prisma.creditCard.update({ where: { id }, data: { name: name.trim() } });
  revalidatePath("/cartoes");
  revalidatePath(`/cartoes/${id}`);
  return ok();
}

export async function deleteCard(id: string): Promise<ActionResult> {
  await getViewer();
  await prisma.creditCard.delete({ where: { id } });
  revalidatePath("/cartoes");
  return ok();
}
