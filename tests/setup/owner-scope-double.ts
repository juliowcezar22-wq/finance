/**
 * Test double de src/lib/auth/owner-scope, usado via `vi.mock` nos testes de
 * segurança que dependem do escopo de dono passar pela extensão do Prisma.
 *
 * Por quê: o AsyncLocalStorage do módulo real NÃO propaga de forma confiável
 * através da fronteira do engine (Node-API) do Prisma quando rodando sob
 * Vitest/tsx — o engine captura o contexto assíncrono na conexão. Em produção
 * (Next.js) a propagação funciona (é o que permite `cookies()` dentro da
 * extensão). Como os testes de segurança rodam sequencialmente (singleFork,
 * awaited), uma pilha síncrona é um substituto fiel: a extensão do Prisma
 * continua chamando resolveOwnerId/getOwnerContext e aplicando TODA a lógica
 * real de escopo (injeção de ownerId no where/data); o banco continua
 * enforçando. Só a fonte de "quem é o dono atual" muda de ALS para variável.
 */

export type OwnerContext = { ownerId: string | null; bypass?: boolean };

let current: OwnerContext | undefined;

export function runWithOwner<T>(ownerId: string | null, fn: () => Promise<T>): Promise<T> {
  const prev = current;
  current = { ownerId };
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      current = prev;
    });
}

export function runWithoutScope<T>(fn: () => Promise<T>): Promise<T> {
  const prev = current;
  current = { ownerId: null, bypass: true };
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      current = prev;
    });
}

export function getOwnerContext(): OwnerContext | undefined {
  return current;
}

export async function resolveOwnerId(): Promise<string | null> {
  return current ? current.ownerId : null;
}
