import { NextResponse, type NextRequest } from "next/server";
import { queryAsOwner } from "@/lib/db";
import { safeDispatchPush } from "@/lib/push";

/**
 * Lembrete diário (19h de Brasília): avisa quem ainda não registrou atividade no dia.
 * Protegida por CRON_SECRET (a Vercel envia Authorization: Bearer <CRON_SECRET> nos crons).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const rows = await queryAsOwner<{ queue_daily_reminders: number }>("select queue_daily_reminders()");
    await safeDispatchPush();
    return NextResponse.json({ reminded: Number(rows[0]?.queue_daily_reminders ?? 0) });
  } catch {
    return NextResponse.json({ error: "Falha ao enviar lembretes." }, { status: 500 });
  }
}
