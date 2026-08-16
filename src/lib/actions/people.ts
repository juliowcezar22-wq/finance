"use server";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/auth/viewer";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseBRL, parseDateBR, formatBRL } from "@/lib/format";
import { toNum } from "@/lib/services/money";
import { type ActionResult, ok, err } from "@/lib/types/action";

const PersonSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  type: z.enum(["pessoal", "empresa", "terceiro", "familiar"]).default("pessoal"),
  notes: z.string().optional().nullable(),
});

export async function savePerson(formData: FormData): Promise<ActionResult> {
  await getViewer();
  const parsed = PersonSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    type: formData.get("type") || "pessoal",
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");
  if (parsed.data.id) {
    await prisma.person.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        notes: parsed.data.notes ?? null,
      },
    });
  } else {
    await prisma.person.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        notes: parsed.data.notes ?? null,
      },
    });
  }
  revalidatePath("/pessoas");
  return ok();
}

export async function deletePerson(id: string): Promise<ActionResult> {
  await getViewer();
  try {
    await prisma.person.delete({ where: { id } });
  } catch (e: any) {
    // FK Restrict: pessoa com recebíveis/pagamentos/transações vinculados.
    if (e?.code === "P2003") {
      return err(
        "Esta pessoa tem lançamentos vinculados (recebíveis, pagamentos ou transações). Remova-os primeiro."
      );
    }
    return err("Registro não encontrado.");
  }
  revalidatePath("/pessoas");
  return ok();
}

const PaymentSchema = z.object({
  personId: z.string().min(1),
  amount: z.number().positive(),
  paidAt: z.date(),
  method: z.enum(["PIX", "TRANSFER", "CASH", "OTHER"]),
  accountId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * Registra pagamento da pessoa e amortiza Receivables abertos por ordem de vencimento.
 * O valor pago reduz primeiro o vencimento mais antigo. Se sobra, distribui no próximo.
 * Receivables totalmente quitados viram "pago"; parcialmente quitados são reduzidos.
 */
export async function registerPersonPayment(
  formData: FormData
): Promise<ActionResult<{ paymentId: string; leftover: number }>> {
  await getViewer();
  const paidAt = parseDateBR(String(formData.get("paidAt") || "")) ?? new Date();
  const parsed = PaymentSchema.safeParse({
    personId: String(formData.get("personId") || ""),
    amount: parseBRL(String(formData.get("amount") || "0")),
    paidAt,
    method: String(formData.get("method") || "PIX"),
    accountId: (formData.get("accountId") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");

  const payment = await prisma.personPayment.create({
    data: {
      personId: parsed.data.personId,
      amount: parsed.data.amount,
      paidAt: parsed.data.paidAt,
      method: parsed.data.method,
      accountId: parsed.data.accountId,
      notes: parsed.data.notes,
    },
  });

  // Amortizar Receivables abertos
  let remaining = parsed.data.amount;
  const open = await prisma.receivable.findMany({
    where: {
      personId: parsed.data.personId,
      status: { in: ["aberto", "atrasado", "renegociado"] },
    },
    orderBy: { dueDate: "asc" },
    include: { transaction: true },
  });

  for (const r of open) {
    if (remaining <= 0) break;
    if (toNum(r.amount) <= remaining) {
      remaining -= toNum(r.amount);
      await prisma.receivable.update({
        where: { id: r.id },
        data: { status: "pago", paidAt: parsed.data.paidAt },
      });
      // Marca a transação relacionada como reembolsada/paga (devia → reembolsado)
      if (r.transactionId) {
        await prisma.transaction.update({
          where: { id: r.transactionId },
          data: { status: "reembolsado" },
        });
      }
    } else {
      // Quitação parcial: reduz o valor restante
      await prisma.receivable.update({
        where: { id: r.id },
        data: { amount: toNum(r.amount) - remaining },
      });
      remaining = 0;
    }
  }

  revalidatePath("/pessoas");
  revalidatePath(`/pessoas/${parsed.data.personId}`);
  revalidatePath("/dashboard");
  revalidatePath("/transacoes");

  return ok({ paymentId: payment.id, leftover: remaining });
}

export async function deletePersonPayment(id: string): Promise<ActionResult> {
  await getViewer();
  const p = await prisma.personPayment.findUnique({ where: { id } });
  if (!p) return ok();
  await prisma.personPayment.delete({ where: { id } });
  revalidatePath("/pessoas");
  revalidatePath(`/pessoas/${p.personId}`);
  return ok();
}

const TxStatusSchema = z.enum(["pendente", "pago", "devendo", "reembolsado", "cancelado"]);

export async function setPersonTxStatus(
  transactionId: string,
  status: string
): Promise<ActionResult> {
  await getViewer();
  const parsed = TxStatusSchema.safeParse(status);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");
  const s = parsed.data;
  const tx = await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: s },
  });

  // Se virou "pago" ou "reembolsado", encerra Receivable se houver
  if (s === "pago" || s === "reembolsado") {
    const r = await prisma.receivable.findFirst({ where: { transactionId } });
    if (r && r.status !== "pago") {
      await prisma.receivable.update({
        where: { id: r.id },
        data: { status: "pago", paidAt: new Date() },
      });
    }
  }

  revalidatePath("/pessoas");
  if (tx.responsibleId) revalidatePath(`/pessoas/${tx.responsibleId}`);
  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
  if (tx.cardId) revalidatePath(`/cartoes/${tx.cardId}`);
  return ok();
}

export async function setPersonTxCategory(
  transactionId: string,
  categoryId: string | null
): Promise<ActionResult> {
  await getViewer();
  const tx = await prisma.transaction.update({
    where: { id: transactionId },
    data: { categoryId: categoryId || null },
  });
  revalidatePath("/pessoas");
  if (tx.responsibleId) revalidatePath(`/pessoas/${tx.responsibleId}`);
  revalidatePath("/transacoes");
  if (tx.cardId) revalidatePath(`/cartoes/${tx.cardId}`);
  return ok();
}

/**
 * Gera texto de cobrança WhatsApp-friendly.
 * Lista Receivables em aberto + sugestão de data de pagamento (5 dias úteis aproximados).
 */
export async function generateBillingText(personId: string): Promise<string> {
  await getViewer();
  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) return "";

  const open = await prisma.receivable.findMany({
    where: {
      personId,
      status: { in: ["aberto", "atrasado", "renegociado"] },
    },
    orderBy: { dueDate: "asc" },
    include: { transaction: true },
  });

  const total = open.reduce((s, r) => s + toNum(r.amount), 0);

  const suggested = new Date();
  suggested.setDate(suggested.getDate() + 5);
  const suggestedStr = suggested.toLocaleDateString("pt-BR");

  if (open.length === 0) {
    return `Olá, ${person.name}. No momento não há valores em aberto. ✅`;
  }

  const lines = open
    .map((r) => {
      const desc = r.transaction?.description ?? r.notes ?? "Pendência";
      return `- ${desc} — ${formatBRL(r.amount)}`;
    })
    .join("\n");

  return [
    `Olá, ${person.name}. Segue o resumo dos valores pendentes:`,
    "",
    lines,
    "",
    `Total em aberto: ${formatBRL(total)}`,
    `Sugestão de pagamento até: ${suggestedStr}`,
    "",
    "Pode enviar por Pix/transferência quando possível. Obrigado!",
  ].join("\n");
}
