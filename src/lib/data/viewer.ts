import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { withUser } from "@/lib/db";
import { meFirst, toneMap } from "@/lib/people";
import type { Challenge, Profile } from "@/lib/types";

/**
 * Usuário logado, perfil, desafio e participantes (até 4). Cacheado por requisição.
 * Sem sessão → redireciona para /login.
 */
export const getViewer = cache(async () => {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  const userId = sessionUser.id;
  const { profile, challenge, participants } = await withUser(userId, async (sql) => {
    const profileRows = await sql.query<Profile>(
      `select id, display_name, nickname, avatar_path, role, body_figure from profiles where id = $1`,
      [userId],
    );
    const membership = await sql.query<Challenge>(
      `select c.id, c.name, c.daily_point_limit, c.starts_on, c.ends_on, c.is_active
         from challenge_participants cp join challenges c on c.id = cp.challenge_id
        where cp.user_id = $1 limit 1`,
      [userId],
    );
    const challengeRow = membership.rows[0] ?? null;
    const participantRows = challengeRow
      ? (
          await sql.query<Profile>(
            `select p.id, p.display_name, p.nickname, p.avatar_path, p.role
               from challenge_participants cp join profiles p on p.id = cp.user_id
              where cp.challenge_id = $1
              order by cp.joined_at, p.id`,
            [challengeRow.id],
          )
        ).rows
      : [];
    return { profile: profileRows.rows[0] ?? null, challenge: challengeRow, participants: participantRows };
  });

  const fallbackProfile: Profile = {
    id: userId,
    display_name: sessionUser.name || sessionUser.email.split("@")[0],
    nickname: null,
    avatar_path: null,
    role: "member",
  };
  const current = profile ?? fallbackProfile;
  // Quem entrou primeiro (fora você) é o "parceiro" nas telas que comparam só duas pessoas.
  const others = participants.filter((p) => p.id !== userId);
  const partner = others[0] ?? null;

  return {
    userId,
    user: sessionUser,
    profile: current,
    challenge,
    /** Ordem de entrada no desafio. */
    participants,
    /** Você primeiro, depois os demais na ordem de entrada. */
    people: meFirst(participants, userId),
    others,
    partner,
    tones: toneMap(participants, userId),
    isAdmin: current.role === "admin",
  };
});

export type Viewer = Awaited<ReturnType<typeof getViewer>>;
