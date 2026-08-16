"use server";
import { getViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseBRL, parseDateBR } from "@/lib/format";
import { type ActionResult, ok, err } from "@/lib/types/action";

const Schema = z.object({
  id: z.string().optional(),
  personId: z.string().min(1),
  transactionId: z.string().nullable().optional(),
  amount: z.number().nonnegative(),
  dueDate: z.date(),
  status: z.enum(["aberto", "pago", "atrasado", "renegociado"]).default("aberto"),
  notes: z.string().optional().nullable(),
});

export async function saveReceivable(formData: FormData): Promise<ActionResult> {
  await getViewer();
  const dueDate = parseDateBR(String(formData.get("dueDate") || "")) ?? new Date();
  const parsed = Schema.safeParse({
    id: formData.get("id") || undefined,
    personId: formData.get("personId"),
    transactionId: (formData.get("transactionId") as string) || null,
    amount: parseBRL(String(formData.get("amount") || "0")),
    dueDate,
    status: formData.get("status") || "aberto",
    notes: (formData.get("notes") as string) || null,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");
  if (parsed.data.id) {
    await prisma.receivable.update({
      where: { id: parsed.data.id },
      data: {
        personId: parsed.data.personId,
        transactionId: parsed.data.transactionId,
        amount: parsed.data.amount,
        dueDate: parsed.data.dueDate,
        status: parsed.data.status,
        notes: parsed.data.notes,
      },
    });
  } else {
    await prisma.receivable.create({
      data: {
        personId: parsed.data.personId,
        transactionId: parsed.data.transactionId,
        amount: parsed.data.amount,
        dueDate: parsed.data.dueDate,
        status: parsed.data.status,
        notes: parsed.data.notes,
      },
    });
  }
  revalidatePath("/pessoas");
  revalidatePath("/dashboard");
  return ok();
}

export async function markReceivablePaid(id: string): Promise<ActionResult> {
  await getViewer();
  await prisma.receivable.update({
    where: { id },
    data: { status: "pago", paidAt: new Date() },
  });
  revalidatePath("/pessoas");
  revalidatePath("/dashboard");
  return ok();
}

export async function deleteReceivable(id: string): Promise<ActionResult> {
  await getViewer();
  await prisma.receivable.delete({ where: { id } });
  revalidatePath("/pessoas");
  return ok();
}
