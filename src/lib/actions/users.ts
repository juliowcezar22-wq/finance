"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/viewer";

/**
 * Roda `fn` numa transação SERIALIZABLE com retry. Usada nas mutações que podem
 * reduzir o número de administradores ativos: o SERIALIZABLE detecta o conflito
 * de duas desativações concorrentes de admins DIFERENTES (que sob READ COMMITTED
 * ambas passariam, zerando os admins) e aborta uma; o retry reavalia já com a
 * mudança visível e rejeita corretamente.
 */
async function txSerializable<T>(fn: (tx: any) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: "Serializable" });
    } catch (e: any) {
      // P2034: falha de serialização / conflito de escrita / deadlock.
      if (e?.code === "P2034" && attempt < 2) continue;
      throw e;
    }
  }
}

const LAST_ADMIN_ERROR =
  "Não é possível remover o último administrador ativo (desativar ou rebaixar de ADMIN).";

/** Lança se `id` é o único admin ativo (dentro da transação `tx`). */
async function assertOtherActiveAdmin(tx: any, id: string) {
  const others = await tx.user.count({
    where: { role: "ADMIN", active: true, id: { not: id } },
  });
  if (others < 1) throw new Error(LAST_ADMIN_ERROR);
}

const CreateSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha mínima de 6 caracteres"),
  role: z.enum(["ADMIN", "USER"]),
  active: z.boolean(),
  personId: z.string().nullable().optional(),
});

const UpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().optional().nullable(),
  role: z.enum(["ADMIN", "USER"]),
  active: z.boolean(),
  personId: z.string().nullable().optional(),
});

export async function createUser(formData: FormData) {
  await requireAdmin();
  const parsed = CreateSchema.parse({
    name: String(formData.get("name") || ""),
    email: String(formData.get("email") || "").trim().toLowerCase(),
    password: String(formData.get("password") || ""),
    role: String(formData.get("role") || "USER"),
    active: formData.get("active") !== "false",
    personId: (formData.get("personId") as string) || null,
  });

  const exists = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (exists) throw new Error("Já existe um usuário com este e-mail.");

  const passwordHash = await bcrypt.hash(parsed.password, 10);

  const user = await prisma.user.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      passwordHash,
      role: parsed.role,
      active: parsed.active,
    },
  });

  if (parsed.personId) {
    // Garante 1:1 — desfaz vínculo anterior dessa Person
    await prisma.person.update({
      where: { id: parsed.personId },
      data: { userId: user.id },
    });
  }

  revalidatePath("/usuarios");
  revalidatePath("/pessoas");
}

export async function updateUser(formData: FormData) {
  await requireAdmin();
  const parsed = UpdateSchema.parse({
    id: String(formData.get("id") || ""),
    name: String(formData.get("name") || ""),
    email: String(formData.get("email") || "").trim().toLowerCase(),
    password: (formData.get("password") as string) || null,
    role: String(formData.get("role") || "USER"),
    active: formData.get("active") !== "false",
    personId: (formData.get("personId") as string) || null,
  });

  const newHash = parsed.password ? await bcrypt.hash(parsed.password, 10) : null;

  // Guarda de "último admin ativo" (FR-008), cobrindo a via de edição
  // (papel/status), não só desativar/excluir. Se a mudança remove a condição
  // de admin ativo do alvo, exige que exista outro admin ativo — checado e
  // aplicado sob SERIALIZABLE (race-safe).
  const removesAdmin = !parsed.active || parsed.role !== "ADMIN";
  await txSerializable(async (tx) => {
    if (removesAdmin) {
      const target = await tx.user.findUnique({
        where: { id: parsed.id },
        select: { role: true, active: true },
      });
      if (target?.role === "ADMIN" && target.active) await assertOtherActiveAdmin(tx, parsed.id);
    }
    await tx.user.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name,
        email: parsed.email,
        role: parsed.role,
        active: parsed.active,
        ...(newHash ? { passwordHash: newHash } : {}),
      },
    });
  });

  // Sincroniza vínculo com Person:
  // 1. desvincula qualquer Person que apontava para esse user mas não é a selecionada
  await prisma.person.updateMany({
    where: { userId: parsed.id, NOT: parsed.personId ? { id: parsed.personId } : undefined },
    data: { userId: null },
  });
  // 2. vincula a Person selecionada
  if (parsed.personId) {
    await prisma.person.update({
      where: { id: parsed.personId },
      data: { userId: parsed.id },
    });
  }

  revalidatePath("/usuarios");
  revalidatePath("/pessoas");
}

/**
 * Desativa um usuário sem deixar o sistema sem admin ativo (FR-008): checa e
 * escreve sob SERIALIZABLE (com retry), fechando a corrida de desativações
 * concorrentes de admins diferentes.
 */
export async function deactivateGuarded(id: string) {
  await txSerializable(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id },
      select: { role: true, active: true },
    });
    if (!target) throw new Error("Usuário não encontrado.");
    if (target.role === "ADMIN" && target.active) await assertOtherActiveAdmin(tx, id);
    await tx.user.update({ where: { id }, data: { active: false } });
  });
}

/** Aprova (ativa) ou suspende (desativa) uma conta. Usado no botão rápido de /usuarios. */
export async function setUserActive(id: string, active: boolean) {
  await requireAdmin();
  if (active) {
    await prisma.user.update({ where: { id }, data: { active: true } });
  } else {
    await deactivateGuarded(id);
  }
  revalidatePath("/usuarios");
}

/**
 * "Excluir usuário" agora DESATIVA (feature 002). As FKs de dono são
 * ON DELETE RESTRICT: excluir de fato um usuário com dados vinculados é
 * bloqueado pelo banco (evita orfanizar o histórico financeiro). Desativar
 * derruba a sessão (getUserFromToken rejeita usuário inativo) e preserva os
 * dados; a exclusão dura exigiria remover/reatribuir os dados antes.
 */
export async function deleteUser(id: string) {
  await requireAdmin();
  await deactivateGuarded(id);
  revalidatePath("/usuarios");
  revalidatePath("/pessoas");
}

export async function linkPersonToUser(personId: string, userId: string | null) {
  await requireAdmin();
  if (userId) {
    // Desfaz vínculo anterior do mesmo user a outra pessoa
    await prisma.person.updateMany({
      where: { userId, NOT: { id: personId } },
      data: { userId: null },
    });
  }
  await prisma.person.update({
    where: { id: personId },
    data: { userId },
  });
  revalidatePath("/pessoas");
  revalidatePath(`/pessoas/${personId}`);
  revalidatePath("/usuarios");
}
