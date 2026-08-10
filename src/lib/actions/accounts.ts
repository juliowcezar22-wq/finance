"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseBRL } from "@/lib/format";
import { getViewer } from "@/lib/auth/viewer";

// #2 Separar Cartões/Contas: gestão das contas bancárias (modelo Account).
const Schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome obrigatório"),
  bank: z.string().nullable().optional(),
  type: z.enum(["corrente", "poupanca", "dinheiro", "investimento"]),
  balance: z.number(),
  active: z.boolean().default(true),
});

export async function saveAccount(formData: FormData) {
  await getViewer();
  const parsed = Schema.parse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    bank: (formData.get("bank") as string) || null,
    type: String(formData.get("type") || "corrente"),
    balance: parseBRL(String(formData.get("balance") || "0")),
    active: formData.get("active") !== "false",
  });

  const data = {
    name: parsed.name,
    bank: parsed.bank,
    type: parsed.type,
    balance: parsed.balance,
    active: parsed.active,
  };

  if (parsed.id) {
    await prisma.account.update({ where: { id: parsed.id }, data });
  } else {
    await prisma.account.create({ data });
  }
  revalidatePath("/contas");
  revalidatePath("/dashboard");
}

export async function deleteAccount(id: string) {
  await getViewer();
  await prisma.account.delete({ where: { id } });
  revalidatePath("/contas");
}
