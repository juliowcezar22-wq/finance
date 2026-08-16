"use server";
import { getViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseBRL } from "@/lib/format";
import { type ActionResult, ok, err } from "@/lib/types/action";

const Schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  priority: z.number().int().default(100),
  active: z.boolean().default(true),
  descriptionContains: z.string().optional().nullable(),
  cardId: z.string().optional().nullable(),
  amountGreaterThan: z.number().nullable().optional(),
  amountLessThan: z.number().nullable().optional(),
  categoryId: z.string().optional().nullable(),
  responsibleName: z.string().optional().nullable(),
  belongsTo: z.string().optional().nullable(),
  reimbursable: z.boolean().nullable().optional(),
  status: z.string().optional().nullable(),
});

export async function saveRule(formData: FormData): Promise<ActionResult> {
  await getViewer();
  const num = (k: string) => {
    const v = String(formData.get(k) || "").trim();
    if (!v) return null;
    return parseBRL(v);
  };
  const parsed = Schema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    priority: Number(formData.get("priority") || 100),
    active: formData.get("active") !== "false",
    descriptionContains: (formData.get("descriptionContains") as string) || null,
    cardId: (formData.get("cardId") as string) || null,
    amountGreaterThan: num("amountGreaterThan"),
    amountLessThan: num("amountLessThan"),
    categoryId: (formData.get("categoryId") as string) || null,
    responsibleName: (formData.get("responsibleName") as string) || null,
    belongsTo: (formData.get("belongsTo") as string) || null,
    reimbursable:
      formData.get("reimbursable") === "on"
        ? true
        : formData.get("reimbursable") === "false"
          ? false
          : null,
    status: (formData.get("status") as string) || null,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");

  if (parsed.data.id) {
    await prisma.categorizationRule.update({
      where: { id: parsed.data.id },
      data: { ...parsed.data, id: undefined } as any,
    });
  } else {
    await prisma.categorizationRule.create({
      data: { ...parsed.data, id: undefined } as any,
    });
  }
  revalidatePath("/regras");
  return ok();
}

export async function deleteRule(id: string): Promise<ActionResult> {
  await getViewer();
  await prisma.categorizationRule.delete({ where: { id } });
  revalidatePath("/regras");
  return ok();
}
