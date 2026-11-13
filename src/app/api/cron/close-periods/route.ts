import { NextResponse, type NextRequest } from "next/server";
import { queryAsOwner } from "@/lib/db";
import { safeDispatchPush } from "@/lib/push";

/**
 * Fecha períodos encerrados (semanas e meses) de todos os desafios ativos.
 * Protegida por CRON_SECRET: Authorization: Bearer <CRON_SECRET>.
 * Roda como dono do banco (sem RLS), por isso o segredo é obrigatório.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const rows = await queryAsOwner<{ close_due_periods: number }>("select close_due_periods()");
    await safeDispatchPush();
    return NextResponse.json({ closed: Number(rows[0]?.close_due_periods ?? 0) });
  } catch {
    return NextResponse.json({ error: "Falha ao fechar períodos." }, { status: 500 });
  }
}
