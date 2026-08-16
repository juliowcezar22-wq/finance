"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/viewer";
import { type ActionResult, ok, err } from "@/lib/types/action";
import {
  deactivateGuarded,
  txSerializable,
  assertOtherActiveAdmin,
  LAST_ADMIN_ERROR,
} from "@/lib/auth/deactivate-user";

// Mensagens de erro que PODEM ir ao cliente; o resto vira genérica (não vazar
// detalhes internos de exceção).
const SAFE_ERRORS = new Set([LAST_ADMIN_ERROR, "Usuário não encontrado."]);
function safeErr(e: unknown): ActionResult {
  const msg = e instanceof Error ? e.message : "";
  return err(SAFE_ERRORS.has(msg) ? msg : "Não foi possível concluir a operação.");
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

export async function createUser(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = CreateSchema.safeParse({
    name: String(formData.get("name") || ""),
    email: String(formData.get("email") || "")
      .trim()
      .toLowerCase(),
    password: String(formData.get("password") || ""),
    role: String(formData.get("role") || "USER"),
    active: formData.get("active") !== "false",
    personId: (formData.get("personId") as string) || null,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");

  const exists = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (exists) return err("Já existe um usuário com este e-mail.");

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      active: parsed.data.active,
    },
  });

  if (parsed.data.personId) {
    // Garante 1:1 — desfaz vínculo anterior dessa Person
    await prisma.person.update({
      where: { id: parsed.data.personId },
      data: { userId: user.id },
    });
  }

  revalidatePath("/usuarios");
  revalidatePath("/pessoas");
  return ok();
}

export async function updateUser(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = UpdateSchema.safeParse({
    id: String(formData.get("id") || ""),
    name: String(formData.get("name") || ""),
    email: String(formData.get("email") || "")
      .trim()
      .toLowerCase(),
    password: (formData.get("password") as string) || null,
    role: String(formData.get("role") || "USER"),
    active: formData.get("active") !== "false",
    personId: (formData.get("personId") as string) || null,
  });
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Dados inválidos");

  const newHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 10) : null;

  // Guarda de "último admin ativo" (FR-008), cobrindo a via de edição
  // (papel/status), não só desativar/excluir. Se a mudança remove a condição
  // de admin ativo do alvo, exige que exista outro admin ativo — checado e
  // aplicado sob SERIALIZABLE (race-safe). O throw interno permanece (aborta
  // a transação); aqui vira err(...).
  const removesAdmin = !parsed.data.active || parsed.data.role !== "ADMIN";
  try {
    await txSerializable(async (tx) => {
      if (removesAdmin) {
        const target = await tx.user.findUnique({
          where: { id: parsed.data.id },
          select: { role: true, active: true },
        });
        if (target?.role === "ADMIN" && target.active)
          await assertOtherActiveAdmin(tx, parsed.data.id);
      }
      await tx.user.update({
        where: { id: parsed.data.id },
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          role: parsed.data.role,
          active: parsed.data.active,
          ...(newHash ? { passwordHash: newHash } : {}),
        },
      });
    });
  } catch (e) {
    return safeErr(e);
  }

  // Sincroniza vínculo com Person:
  // 1. desvincula qualquer Person que apontava para esse user mas não é a selecionada
  await prisma.person.updateMany({
    where: {
      userId: parsed.data.id,
      NOT: parsed.data.personId ? { id: parsed.data.personId } : undefined,
    },
    data: { userId: null },
  });
  // 2. vincula a Person selecionada
  if (parsed.data.personId) {
    await prisma.person.update({
      where: { id: parsed.data.personId },
      data: { userId: parsed.data.id },
    });
  }

  revalidatePath("/usuarios");
  revalidatePath("/pessoas");
  return ok();
}

/** Aprova (ativa) ou suspende (desativa) uma conta. Usado no botão rápido de /usuarios. */
export async function setUserActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (active) {
    await prisma.user.update({ where: { id }, data: { active: true } });
  } else {
    try {
      await deactivateGuarded(id);
    } catch (e) {
      return err(e instanceof Error ? e.message : "Erro inesperado.");
    }
  }
  revalidatePath("/usuarios");
  return ok();
}

/**
 * "Excluir usuário" agora DESATIVA (feature 002). As FKs de dono são
 * ON DELETE RESTRICT: excluir de fato um usuário com dados vinculados é
 * bloqueado pelo banco (evita orfanizar o histórico financeiro). Desativar
 * derruba a sessão (getUserFromToken rejeita usuário inativo) e preserva os
 * dados; a exclusão dura exigiria remover/reatribuir os dados antes.
 */
export async function deleteUser(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deactivateGuarded(id);
  } catch (e) {
    return safeErr(e);
  }
  revalidatePath("/usuarios");
  revalidatePath("/pessoas");
  return ok();
}

export async function linkPersonToUser(
  personId: string,
  userId: string | null
): Promise<ActionResult> {
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
  return ok();
}
