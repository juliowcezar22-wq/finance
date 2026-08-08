"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/viewer";

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

  // Update ATÔMICO com guarda de "último admin ativo" (FR-008): a mudança só
  // é aplicada se o novo estado mantém ESTE usuário como admin ativo, OU se
  // existe outro admin ativo. Senão, 0 linhas afetadas → erro. Cobre também a
  // via de edição (papel/status), não só desativar/excluir.
  const affected = await prisma.$executeRaw`
    UPDATE "User" SET
      name = ${parsed.name},
      email = ${parsed.email},
      role = ${parsed.role},
      active = ${parsed.active},
      "passwordHash" = COALESCE(${newHash}, "passwordHash"),
      "updatedAt" = now()
    WHERE id = ${parsed.id}
      AND (
        (${parsed.active} AND ${parsed.role} = 'ADMIN')
        OR EXISTS (SELECT 1 FROM "User" u2 WHERE u2.role = 'ADMIN' AND u2.active = true AND u2.id <> ${parsed.id})
      )`;
  if (affected === 0) {
    throw new Error(
      "Não é possível remover o último administrador ativo (desativar ou rebaixar de ADMIN)."
    );
  }

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
 * Desativa um usuário de forma ATÔMICA sem deixar o sistema sem admin ativo
 * (FR-008): a linha só é atualizada se o alvo NÃO for o último admin ativo — a
 * checagem e a escrita são um único statement (fecha a corrida check-then-act).
 */
export async function deactivateGuarded(id: string) {
  const affected = await prisma.$executeRaw`
    UPDATE "User" SET active = false, "updatedAt" = now()
    WHERE id = ${id}
      AND (
        NOT (role = 'ADMIN' AND active = true)
        OR EXISTS (SELECT 1 FROM "User" u2 WHERE u2.role = 'ADMIN' AND u2.active = true AND u2.id <> ${id})
      )`;
  if (affected === 0) {
    throw new Error("Não é possível desativar o último administrador ativo.");
  }
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
