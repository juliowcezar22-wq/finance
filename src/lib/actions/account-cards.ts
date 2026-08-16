"use server";
import { getViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseBRL } from "@/lib/format";
import { type ActionResult, ok, err } from "@/lib/types/action";

const AccountCardSchema = z.object({
  id: z.string().optional(),
  cardId: z.string().min(1, "Conta obrigatória"),
  name: z.string().min(1, "Nome obrigatório"),
  kind: z.enum(["fisico", "virtual"]).default("fisico"),
  lastDigits: z.string().optional().nullable(),
  limit: z.number().nonnegative().default(0),
  notes: z.string().optional().nullable(),
});

export async function saveAccountCard(formData: FormData): Promise<ActionResult> {
  await getViewer();
  const parsed = AccountCardSchema.safeParse({
    id: formData.get("id") || undefined,
    cardId: formData.get("cardId"),
    name: formData.get("name"),
    kind: formData.get("kind") || "fisico",
    lastDigits: (formData.get("lastDigits") as string)?.trim() || null,
    limit: parseBRL(String(formData.get("limit") || "0")),
    notes: (formData.get("notes") as string) || null,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");
  const input = parsed.data;

  const data = {
    cardId: input.cardId,
    name: input.name,
    kind: input.kind,
    lastDigits: input.lastDigits,
    limit: input.limit,
    notes: input.notes,
  };

  if (input.id) {
    await prisma.accountCard.update({ where: { id: input.id }, data });
  } else {
    await prisma.accountCard.create({ data });
  }
  revalidatePath(`/cartoes/${input.cardId}`);
  revalidatePath("/cartoes");
  return ok();
}

export async function deleteAccountCard(id: string): Promise<ActionResult> {
  await getViewer();
  const existing = await prisma.accountCard.findUnique({ where: { id } });
  await prisma.accountCard.delete({ where: { id } });
  if (existing) {
    revalidatePath(`/cartoes/${existing.cardId}`);
    revalidatePath("/cartoes");
  }
  return ok();
}
