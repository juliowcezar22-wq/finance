"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { reserveAttempt, recordLoginAttempt, pruneOldAttempts } from "@/lib/auth/login-throttle";

const GENERIC_LOGIN_ERROR = "E-mail ou senha incorretos";
const LOCKED_LOGIN_ERROR = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

// Hash descartável usado quando o e-mail não existe: garante que bcrypt.compare
// rode SEMPRE, equalizando a latência entre e-mail existente e inexistente
// (fecha o canal de enumeração por timing).
const DUMMY_HASH = bcrypt.hashSync("nao-e-uma-senha-real", 10);

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
    email: String(formData.get("email") || "")
      .trim()
      .toLowerCase(),
    password: String(formData.get("password") || ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const email = parsed.data.email;
  const ip = clientIp();

  // Lockout atômico: reserva a tentativa e checa o limite sob advisory lock por
  // e-mail (sem corrida). Falha de banco NEGA o login (fail-closed, FR-013).
  let blocked: boolean;
  try {
    blocked = await reserveAttempt(email, ip);
  } catch {
    return { error: GENERIC_LOGIN_ERROR };
  }
  if (blocked) return { error: LOCKED_LOGIN_ERROR };

  const user = await prisma.user.findUnique({ where: { email } });
  // Compara SEMPRE (hash descartável se o e-mail não existe) para não vazar
  // existência por timing. A falha já foi reservada acima.
  const ok = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !ok) {
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
  await pruneOldAttempts().catch(() => {}); // best-effort, mas sem promise órfã no pool

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
export async function signUpAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = SignupSchema.safeParse({
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "")
      .trim()
      .toLowerCase(),
    password: String(formData.get("password") || ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  // Resposta neutra: NÃO revela se o e-mail já existe (sem oráculo de
  // enumeração). Tenta criar; colisão de e-mail (P2002) é silenciada e
  // respondida como sucesso, igual ao cadastro novo.
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: "USER",
        active: false,
      },
    });
  } catch (e: any) {
    if (e?.code !== "P2002") throw e; // erro real → propaga
  }

  return { success: true };
}

export async function logoutAction() {
  // Revogação: incrementa sessionVersion → todos os tokens ativos do usuário
  // passam a divergir e são rejeitados por getUserFromToken. É a ÚNICA via de
  // invalidação além da expiração, então a falha não pode passar despercebida:
  // tenta com um retry e registra o erro (não silencia).
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = verifySessionToken(token);
  if (payload?.uid) {
    const revoke = () =>
      prisma.user.update({
        where: { id: payload.uid },
        data: { sessionVersion: { increment: 1 } },
      });
    try {
      await revoke();
    } catch (err1) {
      try {
        await revoke();
      } catch (err2) {
        // Sem observabilidade estruturada ainda (feature 012): ao menos loga,
        // para que uma revogação falha seja visível e possa ser reprocessada.
        console.error("logout: falha ao revogar sessão (sessionVersion)", err2);
      }
    }
  }
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}
