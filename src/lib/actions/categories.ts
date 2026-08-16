"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/viewer";
import { type ActionResult, ok, err } from "@/lib/types/action";

const CategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  color: z.string().optional().nullable(),
  kind: z.enum(["despesa", "receita", "mista"]).default("despesa"),
});

export async function saveCategory(formData: FormData): Promise<ActionResult> {
  // Categorias são um catálogo GLOBAL (sem ownerId): só admin escreve.
  await requireAdmin();
  const parsed = CategorySchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    color: formData.get("color") || null,
    kind: formData.get("kind") || "despesa",
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");
  if (parsed.data.id) {
    await prisma.category.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        color: parsed.data.color,
        kind: parsed.data.kind,
      },
    });
  } else {
    await prisma.category.create({
      data: {
        name: parsed.data.name,
        color: parsed.data.color,
        kind: parsed.data.kind,
      },
    });
  }
  revalidatePath("/configuracoes");
  return ok();
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.category.delete({ where: { id } });
  revalidatePath("/configuracoes");
  return ok();
}
