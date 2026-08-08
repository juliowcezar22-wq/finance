import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWhatsAppSettings, isAllowedSender, sendText } from "@/lib/whatsapp/provider";
import { parseIncoming } from "@/lib/whatsapp/parse";
import { runAgent } from "@/lib/whatsapp/agent";
import { runWithOwner } from "@/lib/auth/owner-scope";
import { getPrimaryAdminId } from "@/lib/auth/system-owner";
import { timingSafeEqualStr } from "@/lib/auth/timing";

export const dynamic = "force-dynamic";

// Healthcheck / verificação do gateway (público, sem detalhes internos).
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const settings = await getWhatsAppSettings();

  // Fail-closed: sem Client-Token configurado, ninguém entra.
  if (!settings || !settings.clientToken) {
    return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 501 });
  }

  // Autenticação por header, comparação timing-safe — ANTES de qualquer leitura
  // do corpo, gravação ou chamada de IA.
  const provided = req.headers.get("client-token") ?? "";
  if (!timingSafeEqualStr(provided, settings.clientToken)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!settings.enabled) {
    return NextResponse.json({ ok: true, ignored: "disabled" });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true, ignored: "invalid_json" });
  }

  const msg = parseIncoming(body);

  if (msg.fromMe) return NextResponse.json({ ok: true, ignored: "from_me" });
  if (!isAllowedSender(msg.from, settings)) {
    return NextResponse.json({ ok: true, ignored: "sender_not_allowed" });
  }

  // Sem id do provedor não há como deduplicar com segurança (múltiplos NULL não
  // colidem no índice único → reentrega reprocessaria e duplicaria lançamentos).
  // Gateways reais (Z-API/Evolution) sempre enviam id; ausência = payload
  // malformado/forjado → ignora.
  if (!msg.providerMessageId) {
    return NextResponse.json({ ok: true, ignored: "no_message_id" });
  }

  // Deduplicação atômica por providerMessageId (unicidade no banco). Grava o log
  // de entrada ANTES de processar; reentrega do gateway → P2002 → ignora.
  try {
    await prisma.whatsAppMessage.create({
      data: {
        direction: "in",
        waType: msg.waType,
        fromNumber: msg.from ?? null,
        body: msg.text ?? null,
        mediaUrl: msg.imageUrl ?? null,
        providerMessageId: msg.providerMessageId ?? null,
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: true, ignored: "duplicate" });
    }
    throw e;
  }

  if (!msg.text && !msg.imageUrl) {
    // tipo não suportado (ex.: áudio na v1)
    await sendText(
      msg.from!,
      "Por enquanto eu entendo *texto* e *foto* (comprovantes). Áudio chega na próxima versão. 🙂"
    );
    return NextResponse.json({ ok: true, ignored: "unsupported_type" });
  }

  // agente decide e executa (age sobre os dados do admin primário)
  const adminId = await getPrimaryAdminId();
  const result = await runWithOwner(adminId, () =>
    runAgent({ text: msg.text, imageUrl: msg.imageUrl, from: msg.from })
  );

  // responde no WhatsApp
  await sendText(msg.from!, result.reply);

  // log de saída
  await prisma.whatsAppMessage.create({
    data: {
      direction: "out",
      waType: "text",
      fromNumber: msg.from ?? null,
      body: result.reply,
      intent: result.action,
      actionTaken: result.created ? JSON.stringify(result.created) : null,
      status: result.error ? "error" : "ok",
      error: result.error ?? null,
    },
  });

  return NextResponse.json({ ok: true, action: result.action });
}
