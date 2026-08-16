"use server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/format";
import { toNum } from "@/lib/services/money";
import { getViewer } from "@/lib/auth/viewer";
import { type ActionResult, ok, err } from "@/lib/types/action";

// Status válidos de fatura (schema: aberta | fechada | paga | atrasada | parcial).
const InvoiceStatus = z.enum(["aberta", "fechada", "paga", "atrasada", "parcial"]);

const PayInvoiceSchema = z.object({
  id: z.string().min(1),
  amount: z.number().finite().positive(),
});

export async function payInvoice(formData: FormData): Promise<ActionResult> {
  await getViewer();
  const parsed = PayInvoiceSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    amount: parseBRL(String(formData.get("amount") || "0")),
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");

  // Read-modify-write do valor pago em transação: evita lost update sob
  // pagamentos concorrentes. O escopo de dono (extensão Prisma) faz o
  // findUnique retornar null para fatura de outro dono → nada é alterado.
  // O throw interno permanece (aborta a transação); aqui vira err(...).
  try {
    await prisma.$transaction(async (tx) => {
      const inv = await tx.creditCardInvoice.findUnique({
        where: { id: parsed.data.id },
      });
      if (!inv) throw new Error("Registro não encontrado.");
      const newPaid = toNum(inv.paid) + parsed.data.amount;
      const status = newPaid >= toNum(inv.total) ? "paga" : "parcial";
      await tx.creditCardInvoice.update({
        where: { id: parsed.data.id },
        data: { paid: newPaid, status },
      });
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Erro inesperado.");
  }

  revalidatePath("/importar");
  revalidatePath("/dashboard");
  return ok();
}

export async function setInvoiceStatus(id: string, status: string): Promise<ActionResult> {
  await getViewer();
  const parsedId = z.string().min(1).safeParse(id);
  if (!parsedId.success) return err(parsedId.error.issues[0]?.message ?? "Dados inválidos");
  const parsedStatus = InvoiceStatus.safeParse(status);
  if (!parsedStatus.success) return err(parsedStatus.error.issues[0]?.message ?? "Dados inválidos");
  await prisma.creditCardInvoice.update({
    where: { id: parsedId.data },
    data: { status: parsedStatus.data },
  });
  revalidatePath("/importar");
  return ok();
}

/**
 * Exclui uma fatura E todas as suas transações (com recebíveis vinculados).
 * Usado para desfazer uma importação de fatura inteira.
 */
export async function deleteInvoice(id: string): Promise<ActionResult> {
  await getViewer();
  const inv = await prisma.creditCardInvoice.findUnique({
    where: { id },
    select: { id: true, cardId: true },
  });
  if (!inv) return ok();

  const txs = await prisma.transaction.findMany({
    where: { invoiceId: id },
    select: { id: true },
  });
  const txIds = txs.map((t) => t.id);

  await prisma.$transaction([
    prisma.receivable.deleteMany({ where: { transactionId: { in: txIds } } }),
    prisma.transaction.deleteMany({ where: { id: { in: txIds } } }),
    prisma.importBatch.updateMany({
      where: { invoiceId: id },
      data: { invoiceId: null },
    }),
    prisma.creditCardInvoice.delete({ where: { id } }),
  ]);

  revalidatePath("/importar");
  revalidatePath("/transacoes");
  revalidatePath("/cartoes");
  revalidatePath(`/cartoes/${inv.cardId}`);
  revalidatePath("/dashboard");
  return ok();
}
