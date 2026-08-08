import { describe, it, expect, vi } from "vitest";

/**
 * Cron de lembretes (US3): exige Authorization: Bearer <CRON_SECRET>,
 * timing-safe; segredo em query string é ignorado. FR-009.
 */

vi.mock("@/lib/whatsapp/provider", () => ({ getWhatsAppSettings: async () => null }));
vi.mock("@/lib/whatsapp/reminders", () => ({ sendReminders: async () => ({ ok: true, sent: 0 }) }));
vi.mock("@/lib/auth/system-owner", () => ({ getPrimaryAdminId: async () => "admin-test" }));

import { GET } from "@/app/api/whatsapp/reminders/route";

const SECRET = process.env.CRON_SECRET!;

function get(url: string, headers: Record<string, string> = {}): any {
  return new Request(url, { method: "GET", headers });
}

describe("reminders — autenticação por Bearer", () => {
  it("401 sem Authorization", async () => {
    const res = await GET(get("http://localhost/api/whatsapp/reminders"));
    expect(res.status).toBe(401);
  });

  it("401 com segredo apenas na query string (ignorado)", async () => {
    const res = await GET(get(`http://localhost/api/whatsapp/reminders?secret=${SECRET}`));
    expect(res.status).toBe(401);
  });

  it("401 com Bearer errado", async () => {
    const res = await GET(get("http://localhost/api/whatsapp/reminders", { authorization: "Bearer errado" }));
    expect(res.status).toBe(401);
  });

  it("passa da autenticação com Bearer correto (não 401)", async () => {
    const res = await GET(
      get("http://localhost/api/whatsapp/reminders", { authorization: `Bearer ${SECRET}` })
    );
    expect(res.status).not.toBe(401);
    // getWhatsAppSettings mockado como null → 400 "Não configurado" (após auth)
    expect(res.status).toBe(400);
  });
});
