"use server";
import { getViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseBRL, parseDateBR } from "@/lib/format";
import { type ActionResult, ok, err } from "@/lib/types/action";

const Schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  type: z.enum(["economia", "quitacao", "investimento", "reserva"]).default("economia"),
  targetAmount: z.number().nonnegative(),
  currentAmount: z.number().nonnegative().default(0),
  deadline: z.date().nullable().optional(),
  priority: z.number().int().min(1).max(5).default(3),
  notes: z.string().optional().nullable(),
});

export async function saveGoal(formData: FormData): Promise<ActionResult> {
  await getViewer();
  const deadlineStr = String(formData.get("deadline") || "");
  const deadline = deadlineStr ? parseDateBR(deadlineStr) : null;
  const parsed = Schema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    type: formData.get("type") || "economia",
    targetAmount: parseBRL(String(formData.get("targetAmount") || "0")),
    currentAmount: parseBRL(String(formData.get("currentAmount") || "0")),
    deadline,
    priority: Number(formData.get("priority") || 3),
    notes: (formData.get("notes") as string) || null,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");
  const input = parsed.data;
  if (input.id) {
    await prisma.goal.update({
      where: { id: input.id },
      data: {
        name: input.name,
        type: input.type,
        targetAmount: input.targetAmount,
        currentAmount: input.currentAmount,
        deadline: input.deadline ?? null,
        priority: input.priority,
        notes: input.notes,
      },
    });
  } else {
    await prisma.goal.create({
      data: {
        name: input.name,
        type: input.type,
        targetAmount: input.targetAmount,
        currentAmount: input.currentAmount,
        deadline: input.deadline ?? null,
        priority: input.priority,
        notes: input.notes,
      },
    });
  }
  revalidatePath("/metas");
  return ok();
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  await getViewer();
  await prisma.goal.delete({ where: { id } });
  revalidatePath("/metas");
  return ok();
}
