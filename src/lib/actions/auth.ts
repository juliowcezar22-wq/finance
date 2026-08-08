"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { isLockedOut, recordLoginAttempt, pruneOldAttempts } from "@/lib/auth/login-throttle";

const GENERIC_LOGIN_ERROR = "E-mail ou senha incorretos";
const LOCKED_LOGIN_ERROR =
  "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

/** Primeiro hop de x-forwarded-for (apenas auditoria). */
function clientIp(): string | null {
  const fwd = headers().get("x-forwarded-for");
  return fwd ? fwd.split(",")[0]!.trim() || null : null;
}

const LoginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

const SignupSchema = z.object({
  name: z.string().min(2, "Informe seu nome"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha mínima de 6 caracteres"),
});

export type LoginState = { error?: string } | null;
export type SignupState = { error?: string; success?: boolean } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: String(formData.get("email") || "").trim().toLowerCase(),
    password: String(formData.get("password") || ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const email = parsed.data.email;
  const ip = clientIp();

  // Lockout: falha de banco aqui NEGA o login (fail-closed, FR-013).
  try {
    if (await isLockedOut(email)) {
      await recordLoginAttempt(email, ip, false).catch(() => {});
      return { error: LOCKED_LOGIN_ERROR };
    }
  } catch {
    return { error: GENERIC_LOGIN_ERROR };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;

  if (!user || !ok) {
    await recordLoginAttempt(email, ip, false).catch(() => {});
    return { error: GENERIC_LOGIN_ERROR };
  }

  // Conta criada via autocadastro fica inativa até o admin aprovar em /usuarios.
  if (!user.active) {
    return {
      error:
        "Sua conta está aguardando aprovação do administrador. Você poderá entrar assim que for liberada.",
    };
  }

  await recordLoginAttempt(email, ip, true).catch(() => {});
  void pruneOldAttempts();

  const token = createSessionToken({
    uid: user.id,
    role: (user.role as "ADMIN" | "USER") ?? "USER",
    sv: user.sessionVersion,
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });

  redirect("/dashboard");
}

/**
 * Autocadastro público (botão "Criar minha conta" na tela de login).
 * Cria sempre um usuário comum (USER) e INATIVO — sem acesso a nenhum dado —
 * até que um administrador aprove a conta em /usuarios. Não autentica nem
 * cria sessão; apenas registra o pedido de acesso.
 */
export async function signUpAction(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const parsed = SignupSchema.safeParse({
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim().toLowerCase(),
    password: String(formData.get("password") || ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) {
    return { error: "Já existe uma conta com este e-mail." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "USER",
      active: false,
    },
  });

  return { success: true };
}

export async function logoutAction() {
  // Revogação: incrementa sessionVersion → todos os tokens ativos do usuário
  // passam a divergir e são rejeitados por getUserFromToken.
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = verifySessionToken(token);
  if (payload?.uid) {
    await prisma.user
      .update({ where: { id: payload.uid }, data: { sessionVersion: { increment: 1 } } })
      .catch(() => {});
  }
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}
