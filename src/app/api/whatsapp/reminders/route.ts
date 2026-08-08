import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppSettings } from "@/lib/whatsapp/provider";
import { sendReminders } from "@/lib/whatsapp/reminders";
import { runWithOwner } from "@/lib/auth/owner-scope";
import { getPrimaryAdminId } from "@/lib/auth/system-owner";
import { timingSafeEqualStr } from "@/lib/auth/timing";

export const dynamic = "force-dynamic";

/**
 * Dispara os lembretes financeiros. Protegido por `Authorization: Bearer
 * <CRON_SECRET>` (a Vercel injeta esse header no cron automaticamente quando a
 * env CRON_SECRET existe). O segredo NÃO trafega mais em query string.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "cron_not_configured" }, { status: 501 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!timingSafeEqualStr(token, secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const settings = await getWhatsAppSettings();
  if (!settings) {
    return NextResponse.json({ ok: false, error: "Não configurado." }, { status: 400 });
  }

  const adminId = await getPrimaryAdminId();
  const r = await runWithOwner(adminId, () => sendReminders());
  return NextResponse.json(r);
}
