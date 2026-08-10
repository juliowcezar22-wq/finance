import { cn } from "@/lib/utils";

// Marca Nummiq. Símbolo = SVG oficial (public/brand/nummiq-simbolo/icone).
// Não recriar/redesenhar a logo (DS §26/§68).

export function NummiqSymbol({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/nummiq-icone.svg"
      alt="Nummiq"
      width={size}
      height={size}
      className={cn("select-none", className)}
      draggable={false}
    />
  );
}

/** Símbolo + wordmark (sidebar expandida, DS §24). */
export function NummiqLogo({
  size = 30,
  className,
  showWordmark = true,
}: {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <NummiqSymbol size={size} />
      {showWordmark && (
        <span className="text-[17px] font-semibold tracking-tight text-nummiq-white">
          Nummiq
        </span>
      )}
    </div>
  );
}
