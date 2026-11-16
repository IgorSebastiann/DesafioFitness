import { ImageResponse } from "next/og";
import { getSessionUser } from "@/lib/session";
import { withUser } from "@/lib/db";
import { weekRange } from "@/lib/domain/periods";
import { todayIso } from "@/lib/time";
import { WeekCard } from "@/lib/week-card";
import type { StandingRow } from "@/lib/types";

/**
 * Card do placar da semana (1080x1350, formato de post/story) para compartilhar.
 * Só para quem está logado e participa do desafio; os pontos vêm do RLS.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response("Não autenticado.", { status: 401 });

  const week = weekRange(todayIso());
  const data = await withUser(user.id, async (sql) => {
    const challenge = (
      await sql.query<{ id: string; name: string }>(
        `select c.id, c.name from challenge_participants cp join challenges c on c.id = cp.challenge_id
          where cp.user_id = $1 limit 1`,
        [user.id],
      )
    ).rows[0];
    if (!challenge) return null;
    const rows = (await sql.query<StandingRow>(`select * from standings($1,$2,$3)`, [challenge.id, week.start, week.end])).rows;
    return { challenge, rows };
  });
  if (!data || data.rows.length === 0) return new Response("Sem desafio.", { status: 404 });

  const people = data.rows
    .map((r) => ({ id: r.user_id, name: r.nickname?.trim() || r.display_name, points: Number(r.points), count: Number(r.activity_count) }))
    .sort((a, b) => Number(b.id === user.id) - Number(a.id === user.id));

  return new ImageResponse(
    <WeekCard viewerId={user.id} challengeName={data.challenge.name} week={week} people={people} />,
    { width: 1080, height: 1350, headers: { "Cache-Control": "private, no-store" } },
  );
}
