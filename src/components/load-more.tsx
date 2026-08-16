import Link from "next/link";
import { Button } from "@/components/ui/button";

export const PAGE_SIZE = 50;

/** Lê e sanitiza o `?limit=` (lotes de PAGE_SIZE, teto 1000). */
export function parseLimit(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < PAGE_SIZE) return PAGE_SIZE;
  return Math.min(Math.floor(n / PAGE_SIZE) * PAGE_SIZE, 1000);
}

/**
 * Rodapé de paginação "Carregar mais" (feature 009). Server Component puro:
 * o botão é um Link que repete os searchParams atuais com `limit` maior —
 * preserva filtros, funciona com back/forward e sem estado client.
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
  const hasMore = total > shown;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v != null && k !== "limit") params.set(k, v);
  }
  params.set("limit", String(limit + PAGE_SIZE));

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
    </div>
  );
}
