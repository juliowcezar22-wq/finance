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

        // findUnique/update/delete/upsert usam `where` único (não aceita
        // ownerId). Leituras: pós-filtro por dono. Escritas: pré-checagem de
        // dono no client base (sem escopo → sem recursão) antes de executar;
        // registro de outro dono → mesmo erro de "não encontrado", sem vazar
        // a existência do registro.
        if (operation === "findUnique" || operation === "findUniqueOrThrow") {
          const res: any = await query(a);
          if (res && res.ownerId != null && res.ownerId !== ownerId) {
            if (operation === "findUniqueOrThrow") {
              throw new Error("Registro não encontrado.");
            }
            return null;
          }
          return res;
        }

        if (operation === "update" || operation === "delete" || operation === "upsert") {
          const delegate = (base as any)[model.charAt(0).toLowerCase() + model.slice(1)];
          const existing = await delegate.findUnique({
            where: a.where,
            select: { ownerId: true },
          });
          if (existing && existing.ownerId != null && existing.ownerId !== ownerId) {
            throw new Error("Registro não encontrado.");
          }
          if (operation === "upsert") {
            a.create = injectOwnerData(a.create ?? {}, ownerId);
          }
          return query(a);
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
