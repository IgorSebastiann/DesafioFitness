import "server-only";
import { activeDays, challengeRange, currentStreak, longestStreak, monthRange, weekRange } from "@/lib/domain/periods";
import { withUser, type Sql } from "@/lib/db";
import { todayIso } from "@/lib/time";
import type {
  ActivityRow,
  ActivityStatus,
  Category,
  Challenge,
  Profile,
  StandingRow,
} from "@/lib/types";

/** URL de comprovação servida pela aplicação (Blob privado; checa o vínculo no servidor). */
export function proofUrlFor(path: string | null | undefined): string | null {
  return path ? `/api/proofs?p=${encodeURIComponent(path)}` : null;
}

/** URL da foto de perfil (rota que confere se o usuário pode ver o perfil). */
export function avatarUrlFor(p: { id: string; avatar_path: string | null }): string | null {
  return p.avatar_path ? `/api/avatars/${p.id}?v=${encodeURIComponent(p.avatar_path)}` : null;
}

const ACTIVITY_SQL = `
  select a.id, a.challenge_id, a.user_id, a.category_id,
         a.activity_date::text as activity_date, a.activity_time::text as activity_time,
         a.duration_minutes, a.distance_km, a.description, a.proof_path, a.proof_kind,
         a.status, a.points_awarded, a.review_note, a.reviewed_at, a.created_at,
         c.name as category_name, c.icon as category_icon,
         p.display_name as owner_display_name, p.avatar_path as owner_avatar_path,
         (select count(*)::int from activity_reactions r where r.activity_id = a.id) as reaction_count,
         (select count(*)::int from activity_comments m where m.activity_id = a.id) as comment_count,
         (select count(*)::int from activity_extra_proofs x where x.activity_id = a.id) as extra_proof_count
    from activities a
    join activity_categories c on c.id = a.category_id
    join profiles p on p.id = a.user_id`;

type ActivityDbRow = {
  id: string;
  challenge_id: string;
  user_id: string;
  category_id: string;
  activity_date: string;
  activity_time: string;
  duration_minutes: number;
  distance_km: string | null;
  description: string | null;
  proof_path: string;
  proof_kind: "image" | "video";
  status: ActivityStatus;
  points_awarded: number;
  review_note: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  category_name: string;
  category_icon: string;
  owner_display_name: string;
  owner_avatar_path: string | null;
  reaction_count: number;
  comment_count: number;
  extra_proof_count: number;
};

function toActivity(r: ActivityDbRow): ActivityRow {
  return {
    id: r.id,
    challenge_id: r.challenge_id,
    user_id: r.user_id,
    category_id: r.category_id,
    activity_date: r.activity_date,
    activity_time: r.activity_time,
    duration_minutes: r.duration_minutes,
    distance_km: r.distance_km === null ? null : Number(r.distance_km),
    description: r.description,
    proof_path: r.proof_path,
    proof_kind: r.proof_kind,
    status: r.status,
    points_awarded: r.points_awarded,
    review_note: r.review_note,
    reviewed_at: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
    created_at: new Date(r.created_at).toISOString(),
    category: { name: r.category_name, icon: r.category_icon },
    owner: { display_name: r.owner_display_name, avatar_path: r.owner_avatar_path },
    reaction_count: Number(r.reaction_count ?? 0),
    comment_count: Number(r.comment_count ?? 0),
    extra_proof_count: Number(r.extra_proof_count ?? 0),
  };
}

/** Ranking ao vivo de um intervalo (somente atividades aprovadas). */
export async function getStandings(
  uid: string,
  challengeId: string,
  from: string,
  to: string,
): Promise<StandingRow[]> {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<StandingRow>(`select * from standings($1, $2, $3)`, [challengeId, from, to]);
    return rows;
  });
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export async function getDashboard(uid: string, challenge: Challenge) {
  const today = todayIso();
  const week = weekRange(today);
  const month = monthRange(today);
  const total = challengeRange(challenge.starts_on, challenge.ends_on, today);

  return withUser(uid, async (sql) => {
    const weekRows = (await sql.query<StandingRow>(`select * from standings($1,$2,$3)`, [challenge.id, week.start, week.end])).rows;
    const monthRows = (await sql.query<StandingRow>(`select * from standings($1,$2,$3)`, [challenge.id, month.start, month.end])).rows;
    const totalRows = (await sql.query<StandingRow>(`select * from standings($1,$2,$3)`, [challenge.id, total.start, total.end])).rows;

    // Aprovadas e pendentes (rejeitadas ficam de fora). Estatísticas usam só as aprovadas;
    // a sequência atual conta também as pendentes, pela data da atividade (não da aprovação).
    const notRejected = (
      await sql.query<{ activity_date: string; points_awarded: number; category_name: string; status: ActivityStatus }>(
        `select a.activity_date::text as activity_date, a.points_awarded, c.name as category_name, a.status
           from activities a join activity_categories c on c.id = a.category_id
          where a.challenge_id = $1 and a.user_id = $2 and a.status <> 'rejected'`,
        [challenge.id, uid],
      )
    ).rows;
    const mine = notRejected.filter((a) => a.status === "approved");
    const streakDates = notRejected.map((a) => a.activity_date);

    // Meta semanal: dias distintos com atividade (aprovada ou pendente) na semana, por participante.
    const goals = (
      await sql.query<{ user_id: string; weekly_goal: number; days: number; trained_today: boolean }>(
        `select cp.user_id, pr.weekly_goal,
                count(distinct a.activity_date)::int as days,
                coalesce(bool_or(a.activity_date = $4::date), false) as trained_today
           from challenge_participants cp
           join profiles pr on pr.id = cp.user_id
           left join activities a
             on a.user_id = cp.user_id and a.challenge_id = cp.challenge_id
            and a.status <> 'rejected' and a.activity_date between $2::date and $3::date
          where cp.challenge_id = $1
          group by cp.user_id, pr.weekly_goal`,
        [challenge.id, week.start, week.end, today],
      )
    ).rows;

    const recent = (
      await sql.query<ActivityDbRow>(`${ACTIVITY_SQL} where a.challenge_id = $1 order by a.created_at desc limit 6`, [
        challenge.id,
      ])
    ).rows.map(toActivity);

    const dates = mine.map((a) => a.activity_date);
    return {
      today,
      week,
      month,
      weekRows,
      monthRows,
      goals,
      stats: {
        totalActivities: mine.length,
        totalPoints: mine.reduce((sum, a) => sum + a.points_awarded, 0),
        runs: mine.filter((a) => a.category_name === "Corrida").length,
        strength: mine.filter((a) => a.category_name === "Musculação").length,
        activeDays: activeDays(dates),
        longestStreak: longestStreak(dates),
        currentStreak: currentStreak(streakDates, today),
        trainedToday: streakDates.includes(today),
      },
      recent: recent.map((r) => ({ ...r, proofUrl: proofUrlFor(r.proof_path) })),
      totalRows,
      total,
    };
  });
}

// ---------------------------------------------------------------------------
// Atividades
// ---------------------------------------------------------------------------
export async function listActivities(
  uid: string,
  challengeId: string,
  filter: { status?: ActivityStatus; userId?: string; limit?: number },
): Promise<ActivityRow[]> {
  return withUser(uid, async (sql) => {
    const params: unknown[] = [challengeId];
    let where = "a.challenge_id = $1";
    if (filter.status) {
      params.push(filter.status);
      where += ` and a.status = $${params.length}`;
    }
    if (filter.userId) {
      params.push(filter.userId);
      where += ` and a.user_id = $${params.length}`;
    }
    params.push(filter.limit ?? 100);
    const { rows } = await sql.query<ActivityDbRow>(
      `${ACTIVITY_SQL} where ${where}
       order by a.activity_date desc, a.activity_time desc limit $${params.length}`,
      params,
    );
    return rows.map(toActivity);
  });
}

export async function getActivityDetail(uid: string, id: string) {
  return withUser(uid, async (sql) => {
    const found = await sql.query<ActivityDbRow>(`${ACTIVITY_SQL} where a.id = $1`, [id]);
    if (!found.rows[0]) return null;
    const activity = toActivity(found.rows[0]);

    const history = (
      await sql.query<{
        id: string;
        decision: "approved" | "rejected";
        note: string | null;
        created_at: Date;
        reviewer_name: string;
        reviewer_nickname: string | null;
      }>(
        `select ap.id, ap.decision, ap.note, ap.created_at,
                p.display_name as reviewer_name, p.nickname as reviewer_nickname
           from activity_approvals ap join profiles p on p.id = ap.reviewer_id
          where ap.activity_id = $1 order by ap.created_at desc`,
        [id],
      )
    ).rows;

    const extraProofs = (
      await sql.query<{ proof_path: string; proof_kind: "image" | "video" }>(
        `select proof_path, proof_kind from activity_extra_proofs where activity_id = $1 order by position`,
        [id],
      )
    ).rows;

    const reactions = (
      await sql.query<{ emoji: string; user_id: string }>(
        `select emoji, user_id from activity_reactions where activity_id = $1 order by created_at`,
        [id],
      )
    ).rows;

    const comments = (
      await sql.query<{
        id: string;
        user_id: string;
        body: string;
        created_at: Date;
        display_name: string;
        nickname: string | null;
        avatar_path: string | null;
      }>(
        `select c.id, c.user_id, c.body, c.created_at, p.display_name, p.nickname, p.avatar_path
           from activity_comments c join profiles p on p.id = c.user_id
          where c.activity_id = $1 order by c.created_at`,
        [id],
      )
    ).rows;

    return {
      activity,
      proofUrl: proofUrlFor(activity.proof_path),
      proofs: [
        { url: proofUrlFor(activity.proof_path)!, kind: activity.proof_kind },
        ...extraProofs.map((p) => ({ url: proofUrlFor(p.proof_path)!, kind: p.proof_kind })),
      ],
      reactions,
      comments: comments.map((c) => ({
        id: c.id,
        user_id: c.user_id,
        body: c.body,
        created_at: new Date(c.created_at).toISOString(),
        author: { display_name: c.display_name, nickname: c.nickname },
        avatarUrl: avatarUrlFor({ id: c.user_id, avatar_path: c.avatar_path }),
      })),
      history: history.map((h) => ({
        id: h.id,
        decision: h.decision,
        note: h.note,
        created_at: new Date(h.created_at).toISOString(),
        reviewer: { display_name: h.reviewer_name, nickname: h.reviewer_nickname },
      })),
    };
  });
}

/** Modalidades globais (as próprias de cada desafio ficam fora; são do desafio, não do admin). */
export async function getCategories(uid: string, onlyActive = true): Promise<Category[]> {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<Category>(
      `select id, name, points, min_duration_minutes, icon, is_active
         from activity_categories where challenge_id is null ${onlyActive ? "and is_active" : ""} order by name`,
    );
    return rows;
  });
}

export type ChallengeCategoryRule = {
  id: string;
  name: string;
  points: number;
  icon: string;
  min_duration_minutes: number;
  default_min_duration: number;
  enabled: boolean;
  is_custom: boolean;
};

/** Modalidades do desafio com o tempo mínimo que vale nele (todas, marcando as que valem). */
export async function getChallengeCategoryRules(uid: string, challengeId: string): Promise<ChallengeCategoryRule[]> {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<ChallengeCategoryRule>(`select * from challenge_category_rules($1)`, [challengeId]);
    return rows;
  });
}

/** Modalidades que valem no desafio, no formato do formulário de atividade. */
export async function getChallengeCategories(uid: string, challengeId: string): Promise<Category[]> {
  const rules = await getChallengeCategoryRules(uid, challengeId);
  return rules
    .filter((r) => r.enabled)
    .map((r) => ({
      id: r.id,
      name: r.name,
      points: r.points,
      min_duration_minutes: r.min_duration_minutes,
      icon: r.icon,
      is_active: true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/** Pontos já usados hoje pelo usuário (atividades não rejeitadas). */
/** Pontos já usados (aprovadas e pendentes) em cada dia de um intervalo, para o saldo do limite diário. */
export async function pointsUsedByDate(
  uid: string,
  challengeId: string,
  userId: string,
  from: string,
  to: string,
): Promise<Record<string, number>> {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<{ day: string; total: number }>(
      `select a.activity_date::text as day, coalesce(sum(c.points), 0)::int as total
         from activities a join activity_categories c on c.id = a.category_id
        where a.challenge_id = $1 and a.user_id = $2 and a.status <> 'rejected'
          and a.activity_date between $3::date and $4::date
        group by a.activity_date`,
      [challengeId, userId, from, to],
    );
    return Object.fromEntries(rows.map((r) => [r.day, Number(r.total)]));
  });
}

// ---------------------------------------------------------------------------
// Calendário
// ---------------------------------------------------------------------------
export async function getMonthActivities(uid: string, challengeId: string, from: string, to: string) {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<ActivityDbRow>(
      `${ACTIVITY_SQL}
        where a.challenge_id = $1 and a.activity_date between $2 and $3 and a.status <> 'rejected'
        order by a.activity_time`,
      [challengeId, from, to],
    );
    return rows.map(toActivity);
  });
}

// ---------------------------------------------------------------------------
// Ranking e histórico de períodos
// ---------------------------------------------------------------------------
export type ClosedPeriod = {
  period_start: string;
  period_end: string;
  rows: {
    user_id: string;
    points: number;
    activity_count: number;
    is_winner: boolean;
    is_tie: boolean;
    award_title: string | null;
  }[];
};

export async function getClosedPeriods(uid: string, challengeId: string, kind: "weekly" | "monthly") {
  const table = kind === "weekly" ? "weekly_results" : "monthly_results";
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<{
      period_start: string;
      period_end: string;
      user_id: string;
      points: number;
      activity_count: number;
      is_winner: boolean;
      is_tie: boolean;
      award_title: string | null;
    }>(
      `select r.period_start::text as period_start, r.period_end::text as period_end, r.user_id,
              r.points, r.activity_count, r.is_winner, r.is_tie, aw.title as award_title
         from ${table} r left join awards aw on aw.id = r.award_id
        where r.challenge_id = $1
        order by r.period_start desc
        limit 200`,
      [challengeId],
    );

    const grouped = new Map<string, ClosedPeriod>();
    for (const row of rows) {
      const entry = grouped.get(row.period_start) ?? {
        period_start: row.period_start,
        period_end: row.period_end,
        rows: [],
      };
      entry.rows.push({
        user_id: row.user_id,
        points: row.points,
        activity_count: row.activity_count,
        is_winner: row.is_winner,
        is_tie: row.is_tie,
        award_title: row.award_title,
      });
      grouped.set(row.period_start, entry);
    }
    return [...grouped.values()];
  });
}

// ---------------------------------------------------------------------------
// Premiações, conquistas e notificações
// ---------------------------------------------------------------------------
export async function listAwards(uid: string, challengeId: string) {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<{
      id: string;
      period: "weekly" | "monthly";
      title: string;
      description: string | null;
      value_note: string | null;
      is_active: boolean;
    }>(
      `select id, period, title, description, value_note, is_active
         from awards where challenge_id = $1 order by created_at desc`,
      [challengeId],
    );
    return rows;
  });
}

export type PendingInvitation = { id: string; invited_email: string; token: string; expires_at: string };

/** Convites ainda válidos (cada um ocupa uma vaga até ser aceito, cancelado ou expirar). */
export async function listPendingInvitations(uid: string, challengeId: string): Promise<PendingInvitation[]> {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<{ id: string; invited_email: string; token: string; expires_at: Date }>(
      `select id, invited_email, token, expires_at from challenge_invitations
        where challenge_id = $1 and status = 'pending' and expires_at > now()
        order by created_at`,
      [challengeId],
    );
    return rows.map((r) => ({ ...r, expires_at: new Date(r.expires_at).toISOString() }));
  });
}

export async function getAchievementsState(uid: string, challengeId: string) {
  return withUser(uid, async (sql) => {
    const catalog = (
      await sql.query<{ code: string; title: string; description: string; icon: string; sort_order: number }>(
        `select code, title, description, icon, sort_order from achievements order by sort_order`,
      )
    ).rows;
    const unlocked = (
      await sql.query<{ user_id: string; achievement_code: string; unlocked_at: Date }>(
        `select user_id, achievement_code, unlocked_at from user_achievements where challenge_id = $1`,
        [challengeId],
      )
    ).rows;
    return { catalog, unlocked };
  });
}

export async function listNotifications(uid: string) {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<{
      id: string;
      kind: string;
      title: string;
      body: string | null;
      link: string | null;
      read_at: Date | null;
      created_at: Date;
    }>(
      `select id, kind, title, body, link, read_at, created_at
         from notifications where user_id = $1 order by created_at desc limit 50`,
      [uid],
    );
    return rows.map((n) => ({
      ...n,
      read_at: n.read_at ? new Date(n.read_at).toISOString() : null,
      created_at: new Date(n.created_at).toISOString(),
    }));
  });
}

/** Meta semanal de dias de treino (1 a 7, padrão 4). */
export async function getWeeklyGoal(uid: string): Promise<number> {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<{ weekly_goal: number }>(`select weekly_goal from profiles where id = $1`, [uid]);
    return rows[0]?.weekly_goal ?? 4;
  });
}

export type ModalityStat = {
  user_id: string;
  category_name: string;
  activities: number;
  minutes: number;
  km: number;
};

/** Atividades aprovadas por pessoa e modalidade (intervalo opcional). */
export async function getModalityStats(
  uid: string,
  challengeId: string,
  range?: { start: string; end: string },
): Promise<ModalityStat[]> {
  return withUser(uid, async (sql) => {
    const params: unknown[] = [challengeId];
    let where = "a.challenge_id = $1 and a.status = 'approved'";
    if (range) {
      params.push(range.start, range.end);
      where += " and a.activity_date between $2::date and $3::date";
    }
    const { rows } = await sql.query<ModalityStat>(
      `select a.user_id, c.name as category_name, count(*)::int as activities,
              coalesce(sum(a.duration_minutes), 0)::int as minutes,
              coalesce(sum(a.distance_km), 0)::float8 as km
         from activities a join activity_categories c on c.id = a.category_id
        where ${where}
        group by a.user_id, c.name
        order by count(*) desc`,
      params,
    );
    return rows.map((r) => ({ ...r, activities: Number(r.activities), minutes: Number(r.minutes), km: Number(r.km) }));
  });
}

export type PersonalRecord = {
  user_id: string;
  category_name: string;
  kind: "duration" | "distance";
  value: number;
  activity_id: string;
  activity_date: string;
};

/**
 * Recordes pessoais por modalidade: maior duração e maior distância entre as atividades
 * aprovadas (em empate vale a mais antiga, quem chegou primeiro).
 */
export async function getPersonalRecords(uid: string, challengeId: string): Promise<PersonalRecord[]> {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<PersonalRecord>(
      `select * from (
         select distinct on (a.user_id, a.category_id)
                a.user_id, c.name as category_name, 'duration' as kind, a.duration_minutes::float8 as value,
                a.id as activity_id, a.activity_date::text as activity_date
           from activities a join activity_categories c on c.id = a.category_id
          where a.challenge_id = $1 and a.status = 'approved'
          order by a.user_id, a.category_id, a.duration_minutes desc, a.activity_date, a.created_at
       ) d
       union all
       select * from (
         select distinct on (a.user_id, a.category_id)
                a.user_id, c.name as category_name, 'distance' as kind, a.distance_km::float8 as value,
                a.id as activity_id, a.activity_date::text as activity_date
           from activities a join activity_categories c on c.id = a.category_id
          where a.challenge_id = $1 and a.status = 'approved' and a.distance_km > 0
          order by a.user_id, a.category_id, a.distance_km desc, a.activity_date, a.created_at
       ) k`,
      [challengeId],
    );
    return rows.map((r) => ({ ...r, value: Number(r.value) }));
  });
}

export type GalleryItem = { id: string; proof_path: string; proof_kind: "image" | "video"; user_id: string; activity_date: string; category_name: string };

/** Fotos e vídeos das atividades do desafio (exceto rejeitadas), mais recentes primeiro. */
export async function getGallery(uid: string, challengeId: string, limit = 120): Promise<GalleryItem[]> {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<GalleryItem>(
      `select * from (
         select a.id, a.proof_path, a.proof_kind, a.user_id, a.activity_date::text as activity_date, c.name as category_name,
                a.activity_date as d, a.activity_time as t, 0 as pos
           from activities a join activity_categories c on c.id = a.category_id
          where a.challenge_id = $1 and a.status <> 'rejected'
         union all
         select a.id, x.proof_path, x.proof_kind, a.user_id, a.activity_date::text, c.name,
                a.activity_date, a.activity_time, x.position
           from activity_extra_proofs x
           join activities a on a.id = x.activity_id
           join activity_categories c on c.id = a.category_id
          where a.challenge_id = $1 and a.status <> 'rejected'
       ) g
       order by d desc, t desc, pos
       limit $2`,
      [challengeId, limit],
    );
    return rows;
  });
}

export type ActivityFact = {
  user_id: string;
  activity_date: string;
  activity_time: string;
  duration_minutes: number;
  distance_km: number | null;
  category_name: string;
};

/**
 * Atividades "cruas" de um intervalo, para missões, mapa de treinos e retrospectiva.
 * `approvedOnly` = só aprovadas; senão aprovadas e pendentes (rejeitadas sempre de fora).
 */
export async function getActivityFacts(
  uid: string,
  challengeId: string,
  range: { start: string; end: string },
  approvedOnly = false,
): Promise<ActivityFact[]> {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<ActivityFact & { distance_km: string | null }>(
      `select a.user_id, a.activity_date::text as activity_date, a.activity_time::text as activity_time,
              a.duration_minutes, a.distance_km, c.name as category_name
         from activities a join activity_categories c on c.id = a.category_id
        where a.challenge_id = $1 and a.activity_date between $2::date and $3::date
          and ${approvedOnly ? "a.status = 'approved'" : "a.status <> 'rejected'"}
        order by a.activity_date, a.activity_time`,
      [challengeId, range.start, range.end],
    );
    return rows.map((r) => ({ ...r, distance_km: r.distance_km === null ? null : Number(r.distance_km) }));
  });
}

/** Lembrete diário das 19h ligado? (padrão: sim) */
export async function getDailyReminder(uid: string): Promise<boolean> {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<{ daily_reminder: boolean }>(`select daily_reminder from profiles where id = $1`, [uid]);
    return rows[0]?.daily_reminder ?? true;
  });
}

export async function countUnreadNotifications(uid: string): Promise<number> {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<{ n: number }>(
      `select count(*)::int as n from notifications where user_id = $1 and read_at is null`,
      [uid],
    );
    return rows[0]?.n ?? 0;
  });
}

// ---------------------------------------------------------------------------
// Administração
// ---------------------------------------------------------------------------
export async function listAllProfiles(uid: string) {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<Pick<Profile, "id" | "display_name" | "nickname" | "role">>(
      `select id, display_name, nickname, role from profiles order by display_name`,
    );
    return rows;
  });
}

export async function listAdminActivities(uid: string, limit = 60) {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<ActivityDbRow>(`${ACTIVITY_SQL} order by a.created_at desc limit $1`, [limit]);
    return rows.map(toActivity);
  });
}

export async function listAuditLogs(uid: string, limit = 40) {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<{
      id: string;
      table_name: string;
      record_id: string;
      action: string;
      actor_id: string | null;
      created_at: Date;
    }>(
      `select id, table_name, record_id, action, actor_id, created_at
         from audit_logs order by created_at desc limit $1`,
      [limit],
    );
    return rows.map((l) => ({ ...l, id: String(l.id), created_at: new Date(l.created_at).toISOString() }));
  });
}

export async function listChallengesAdmin(uid: string) {
  return withUser(uid, async (sql) => {
    const challenges = (
      await sql.query<Challenge>(
        `select id, name, daily_point_limit, starts_on::text as starts_on, ends_on::text as ends_on, is_active
           from challenges order by created_at desc`,
      )
    ).rows;
    const members = (
      await sql.query<{ challenge_id: string; user_id: string }>(`select challenge_id, user_id from challenge_participants`)
    ).rows;
    return { challenges, members };
  });
}

// ---------------------------------------------------------------------------
// Desafio inteiro (ranking geral)
// ---------------------------------------------------------------------------
export type WeekPoints = { user_id: string; week_start: string; points: number };

/** Pontos aprovados por semana e por pessoa num intervalo (para a evolução acumulada). */
export async function getWeeklyPoints(uid: string, challengeId: string, range: { start: string; end: string }): Promise<WeekPoints[]> {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<{ user_id: string; week_start: string; points: number }>(
      `select a.user_id, date_trunc('week', a.activity_date)::date::text as week_start,
              sum(a.points_awarded)::int as points
         from activities a
        where a.challenge_id = $1 and a.status = 'approved' and a.activity_date between $2::date and $3::date
        group by a.user_id, week_start`,
      [challengeId, range.start, range.end],
    );
    return rows.map((r) => ({ ...r, points: Number(r.points) }));
  });
}

export type WinCount = { user_id: string; weeks: number; months: number };

/** Quantas semanas e meses fechados cada pessoa venceu. */
export async function getWinCounts(uid: string, challengeId: string): Promise<WinCount[]> {
  return withUser(uid, async (sql) => {
    const { rows } = await sql.query<WinCount>(
      `select cp.user_id,
              (select count(*)::int from weekly_results w where w.challenge_id = cp.challenge_id and w.user_id = cp.user_id and w.is_winner) as weeks,
              (select count(*)::int from monthly_results m where m.challenge_id = cp.challenge_id and m.user_id = cp.user_id and m.is_winner) as months
         from challenge_participants cp
        where cp.challenge_id = $1`,
      [challengeId],
    );
    return rows;
  });
}

export type { Sql };
