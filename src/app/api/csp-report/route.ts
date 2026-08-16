import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

/**
 * Coletor de violações da CSP report-only (feature 011). O next.config aponta
 * a CSP para cá; violações viram logs estruturados para a promoção a enforce
 * ser decidida com dados. Corpo limitado e nunca refletido na resposta.
 */
export async function POST(req: NextRequest) {
  try {
    // Só content-types de report CSP (corta flood genérico barato).
    const ct = req.headers.get("content-type") ?? "";
    if (!/csp-report|reports\+json|application\/json/.test(ct)) {
      return new NextResponse(null, { status: 204 });
    }
    const text = (await req.text()).slice(0, 4_000);
    const body = JSON.parse(text) as {
      "csp-report"?: Record<string, unknown>;
    };
    const r = body["csp-report"] ?? body;
    const bounded = (v: unknown) => String(v ?? "").slice(0, 300);
    log.warn("csp.violation", {
      documentUri: bounded((r as any)["document-uri"] ?? (r as any).documentURL),
      directive: bounded((r as any)["violated-directive"] ?? (r as any).effectiveDirective),
      blockedUri: bounded((r as any)["blocked-uri"] ?? (r as any).blockedURL),
    });
  } catch {
    // corpo malformado: ignora silenciosamente (endpoint de telemetria)
  }
  return new NextResponse(null, { status: 204 });
}
