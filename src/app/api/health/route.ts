import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

/**
 * Healthcheck (feature 011) — para uptime monitor externo (UptimeRobot etc.).
 * Público e barato: 1 SELECT 1. Não expõe detalhes internos além do status.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      db: "up",
      latencyMs: Date.now() - startedAt,
    });
  } catch (e) {
    log.error("health.db_down", { latencyMs: Date.now() - startedAt }, e);
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
