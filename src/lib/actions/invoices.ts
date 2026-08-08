"use server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseBRL } from "@/lib/format";
import { getViewer } from "@/lib/auth/viewer";

// Status válidos de fatura (schema: aberta | fechada | paga | atrasada | parcial).
const InvoiceStatus = z.enum(["aberta", "fechada", "paga", "atrasada", "parcial"]);

const PayInvoiceSchema = z.object({
  id: z.string().min(1),
  amount: z.number().finite().positive(),
});

export async function payInvoice(formData: FormData) {
  await getViewer();
  const parsed = PayInvoiceSchema.parse({
    id: String(formData.get("id") ?? ""),
    amount: parseBRL(String(formData.get("amount") || "0")),
  });

  // Read-modify-write do valor pago em transação: evita lost update sob
  // pagamentos concorrentes. O escopo de dono (extensão Prisma) faz o
  // findUnique retornar null para fatura de outro dono → nada é alterado.
  await prisma.$transaction(async (tx) => {
    const inv = await tx.creditCardInvoice.findUnique({ where: { id: parsed.id } });
    if (!inv) throw new Error("Registro não encontrado.");
    const newPaid = inv.paid + parsed.amount;
    const status = newPaid >= inv.total ? "paga" : "parcial";
    await tx.creditCardInvoice.update({
      where: { id: parsed.id },
      data: { paid: newPaid, status },
    });
  });

  revalidatePath("/importar");
  revalidatePath("/dashboard");
}

export async function setInvoiceStatus(id: string, status: string) {
  await getViewer();
  const parsedId = z.string().min(1).parse(id);
  const parsedStatus = InvoiceStatus.parse(status);
  await prisma.creditCardInvoice.update({
    where: { id: parsedId },
    data: { status: parsedStatus },
  });
  revalidatePath("/importar");
}

/**
 * Exclui uma fatura E todas as suas transações (com recebíveis vinculados).
 * Usado para desfazer uma importação de fatura inteira.
 */
export async function deleteInvoice(id: string) {
  await getViewer();
  const inv = await prisma.creditCardInvoice.findUnique({
    where: { id },
    select: { id: true, cardId: true },
  });
  if (!inv) return;

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
}
