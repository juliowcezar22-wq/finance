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

  const data: any = {
    name: parsed.name,
    email: parsed.email,
    role: parsed.role,
    active: parsed.active,
  };
  if (parsed.password) {
    data.passwordHash = await bcrypt.hash(parsed.password, 10);
  }

  await prisma.user.update({ where: { id: parsed.id }, data });

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
 * Impede deixar o sistema sem nenhum administrador ativo (FR-008): recusa
 * desativar o ÚLTIMO admin ainda ativo.
 */
async function assertNotLastActiveAdmin(id: string) {
  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true, active: true },
  });
  if (target?.role === "ADMIN" && target.active) {
    const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
    if (activeAdmins <= 1) {
      throw new Error("Não é possível desativar o último administrador ativo.");
    }
  }
}

/** Aprova (ativa) ou suspende (desativa) uma conta. Usado no botão rápido de /usuarios. */
export async function setUserActive(id: string, active: boolean) {
  await requireAdmin();
  if (!active) await assertNotLastActiveAdmin(id);
  await prisma.user.update({ where: { id }, data: { active } });
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
  await assertNotLastActiveAdmin(id);
  await prisma.user.update({ where: { id }, data: { active: false } });
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
