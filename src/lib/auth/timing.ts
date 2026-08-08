import { timingSafeEqual } from "crypto";

/**
 * Comparação de segredos resistente a timing attack. Retorna false para
 * comprimentos diferentes (a diferença de tamanho não é segredo relevante aqui).
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
