import Link from "next/link";
import { Button } from "@/components/ui/button";

export const PAGE_SIZE = 50;
export const MAX_LIMIT = 1000;

/** Lê e sanitiza o `?limit=` (lotes de PAGE_SIZE, teto MAX_LIMIT). */
export function parseLimit(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < PAGE_SIZE) return PAGE_SIZE;
  return Math.min(Math.floor(n / PAGE_SIZE) * PAGE_SIZE, MAX_LIMIT);
}

/**
 * Rodapé de paginação "Carregar mais" (feature 009). Server Component puro:
 * o botão é um Link que repete os searchParams atuais com `limit` maior —
 * preserva filtros, funciona com back/forward e sem estado client.
 * No teto (MAX_LIMIT), o botão dá lugar a uma dica de refinar filtros —
 * nunca um botão que não faz nada.
 */
export function LoadMore({
  shown,
  total,
  limit,
  searchParams,
  label = "registros",
}: {
  shown: number;
  total: number;
  limit: number;
  searchParams: Record<string, string | undefined>;
  label?: string;
}) {
  const capped = limit >= MAX_LIMIT;
  const hasMore = total > shown && !capped;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v != null && k !== "limit") params.set(k, v);
  }
  params.set("limit", String(Math.min(limit + PAGE_SIZE, MAX_LIMIT)));

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <p className="text-xs text-muted-foreground">
        Mostrando {shown} de {total} {label}
      </p>
      {hasMore && (
        <Button asChild variant="outline" size="sm">
          <Link href={`?${params.toString()}`} scroll={false}>
            Carregar mais {Math.min(PAGE_SIZE, total - shown)}
          </Link>
        </Button>
      )}
      {capped && total > shown && (
        <p className="text-xs text-muted-foreground">
          Limite de {MAX_LIMIT} registros na tela — refine os filtros (mês, pessoa, categoria) para
          ver os demais.
        </p>
      )}
    </div>
  );
}
