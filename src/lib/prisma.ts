import { PrismaClient } from "@prisma/client";
import { getOwnerContext, resolveOwnerId } from "@/lib/auth/owner-scope";

/**
 * Entidades PRIVADAS por usuário (multiusuário). Toda leitura/criação é
 * automaticamente escopada por `ownerId` pela extensão abaixo.
 * Modelos globais (compartilhados): User, Category, AISetting, WhatsApp*, AIMessage.
 * Obs.: AIConversation/AIMemory são privados (histórico e memória do Assistente
 * por usuário); AIMessage segue as conversas do dono via conversationId.
 */
const OWNED_MODELS = new Set<string>([
  "Account",
  "CreditCard",
  "AccountCard",
  "Transaction",
  "CreditCardInvoice",
  "Installment",
  "Receivable",
  "Income",
  "CashBox",
  "CashBoxMovement",
  "Person",
  "PersonPayment",
  "Goal",
  "ImportBatch",
  "CategorizationRule",
  "AIConversation",
  "AIMemory",
  "AiUsage",
]);

// Valor impossível → quando não há dono resolvido, nada casa (fail-closed):
// preferimos "não mostrar nada" a "vazar tudo".
const NO_OWNER = "__no_owner__";

const READ_WHERE = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);
const WHERE_WRITE = new Set(["updateMany", "deleteMany"]);
const CREATE_MANY = new Set(["createMany", "createManyAndReturn"]);

function injectOwnerData<T extends Record<string, any>>(data: T, uid: string): T {
  return data.ownerId == null ? { ...data, ownerId: uid } : data;
}

// Escrita escopada que não casou (dono errado / registro órfão / inexistente):
// Prisma lança P2025. Traduzimos para um erro genérico que não revela se o
// registro existe. Qualquer outro erro é repassado intacto.
function asNotFound(e: unknown): Error {
  if (e && typeof e === "object" && (e as any).code === "P2025") {
    return new Error("Registro não encontrado.");
  }
  return e instanceof Error ? e : new Error(String(e));
}

function makeClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return base.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        // Modelos globais: passam direto (nunca resolve dono → sem recursão).
        if (!model || !OWNED_MODELS.has(model)) {
          return query(args as any);
        }

        // Bypass explícito (scripts de manutenção / seed).
        const ctx = getOwnerContext();
        if (ctx?.bypass) return query(args as any);

        const ownerId = (await resolveOwnerId()) ?? NO_OWNER;
        const a: any = args ?? {};

        if (READ_WHERE.has(operation) || WHERE_WRITE.has(operation)) {
          a.where = { ...(a.where ?? {}), ownerId };
          return query(a);
        }

        if (operation === "create") {
          a.data = injectOwnerData(a.data ?? {}, ownerId);
          return query(a);
        }

        if (CREATE_MANY.has(operation)) {
          const rows = Array.isArray(a.data) ? a.data : [a.data];
          a.data = rows.map((d: any) => injectOwnerData(d ?? {}, ownerId));
          return query(a);
        }

        // findUnique/update/delete/upsert usam `where` único. Injetamos
        // `ownerId` no próprio `where` (extendedWhereUnique, GA no Prisma 5):
        // a operação vira um único `... WHERE id = ? AND ownerId = ?`, atômico
        // e sem janela TOCTOU. Registro de outro dono OU órfão (ownerId null)
        // não casa: leitura → null; escrita → P2025, traduzido para o mesmo
        // erro genérico, sem vazar a existência do registro.
        if (operation === "findUnique") {
          a.where = { ...(a.where ?? {}), ownerId };
          return query(a);
        }

        if (operation === "findUniqueOrThrow") {
          a.where = { ...(a.where ?? {}), ownerId };
          try {
            return await query(a);
          } catch (e) {
            throw asNotFound(e);
          }
        }

        if (operation === "update" || operation === "delete") {
          a.where = { ...(a.where ?? {}), ownerId };
          try {
            return await query(a);
          } catch (e) {
            throw asNotFound(e);
          }
        }

        if (operation === "upsert") {
          // where escopado impede sequestrar registro de outro dono; se não
          // casar, o create injeta o dono atual (id de outro dono colidiria no
          // unique → P2002, fail-closed).
          a.where = { ...(a.where ?? {}), ownerId };
          a.create = injectOwnerData(a.create ?? {}, ownerId);
          try {
            return await query(a);
          } catch (e) {
            throw asNotFound(e);
          }
        }

        return query(a);
      },
    },
  });
}

type ExtendedPrisma = ReturnType<typeof makeClient>;

const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrisma };

export const prisma: ExtendedPrisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
