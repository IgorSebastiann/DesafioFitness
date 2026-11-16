import "server-only";
import { get } from "@vercel/blob";
import sharp from "sharp";
import { withUser } from "@/lib/db";
import { challengeProgress, challengeRange, monthRange, weekRange } from "@/lib/domain/periods";
import { TONE, meFirst, toneMap } from "@/lib/people";
import { formatDayMonth, formatMonthTitle } from "@/lib/time";

export type SharePeriod = "semana" | "mes" | "geral";
export type ShareOptions = { period: SharePeriod; photos: boolean; modalities: boolean; time: boolean };

export type ShareCardPerson = {
  id: string;
  name: string;
  color: string;
  points: number;
  count: number;
  minutes: number;
  modalities: { name: string; count: number }[];
  avatar: string | null;
  photos: string[];
};

export type ShareCardData = {
  challengeName: string;
  periodLabel: string;
  /** Período encerrado (desafio que já acabou): o título diz "venceu" em vez de "lidera". */
  final: boolean;
  people: ShareCardPerson[];
};

/** Lê a opção da URL (?periodo=semana&fotos=1&modalidades=1&tempo=0). */
export function parseShareOptions(params: URLSearchParams): ShareOptions {
  const p = params.get("periodo");
  const period: SharePeriod = p === "mes" || p === "geral" ? p : "semana";
  const flag = (key: string, fallback: boolean) => {
    const v = params.get(key);
    return v === null ? fallback : v === "1";
  };
  return {
    period,
    photos: flag("fotos", period !== "geral"),
    modalities: flag("modalidades", period !== "mes"),
    time: flag("tempo", period !== "semana"),
  };
}

/**
 * Imagem do Blob privado → JPEG pequeno em data URI. O gerador do card (Satori) não desenha
 * WebP, que é o formato em que a maioria das fotos é salva, então tudo vira JPEG aqui.
 */
async function blobAsJpeg(path: string, width: number, height: number): Promise<string | null> {
  try {
    const result = await get(path, { access: "private" });
    if (!result) return null;
    const input = Buffer.from(await new Response(result.stream).arrayBuffer());
    const out = await sharp(input).rotate().resize(width, height, { fit: "cover" }).jpeg({ quality: 78 }).toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null; // foto apagada ou formato que não abre: o card sai sem ela
  }
}

/** Monta tudo o que o card precisa, com as permissões do usuário logado (RLS). */
export async function loadShareCard(userId: string, today: string, options: ShareOptions): Promise<ShareCardData | null> {
  const base = await withUser(userId, async (sql) => {
    const challenge = (
      await sql.query<{ id: string; name: string; starts_on: string; ends_on: string | null }>(
        `select c.id, c.name, c.starts_on, c.ends_on from challenge_participants cp
           join challenges c on c.id = cp.challenge_id where cp.user_id = $1 limit 1`,
        [userId],
      )
    ).rows[0];
    if (!challenge) return null;

    const range =
      options.period === "semana"
        ? weekRange(today)
        : options.period === "mes"
          ? monthRange(today)
          : challengeRange(challenge.starts_on, challenge.ends_on, today);

    const participants = (
      await sql.query<{ id: string; display_name: string; nickname: string | null; avatar_path: string | null }>(
        `select p.id, p.display_name, p.nickname, p.avatar_path
           from challenge_participants cp join profiles p on p.id = cp.user_id
          where cp.challenge_id = $1 order by cp.joined_at, p.id`,
        [challenge.id],
      )
    ).rows;

    const perCategory = (
      await sql.query<{ user_id: string; category_name: string; n: number; points: number; minutes: number }>(
        `select a.user_id, c.name as category_name, count(*)::int as n,
                sum(a.points_awarded)::int as points, sum(a.duration_minutes)::int as minutes
           from activities a join activity_categories c on c.id = a.category_id
          where a.challenge_id = $1 and a.status = 'approved' and a.activity_date between $2::date and $3::date
          group by a.user_id, c.name`,
        [challenge.id, range.start, range.end],
      )
    ).rows;

    // Fotos mais recentes (só imagens) de cada pessoa no período.
    const photos = options.photos
      ? (
          await sql.query<{ user_id: string; proof_path: string }>(
            `select user_id, proof_path from (
               select p.user_id, p.proof_path,
                      row_number() over (partition by p.user_id order by p.d desc, p.t desc, p.pos) as rn
                 from (
                   select a.user_id, a.proof_path, a.activity_date as d, a.activity_time as t, 0 as pos
                     from activities a
                    where a.challenge_id = $1 and a.status = 'approved' and a.proof_kind = 'image'
                      and a.activity_date between $2::date and $3::date
                   union all
                   select a.user_id, x.proof_path, a.activity_date, a.activity_time, x.position
                     from activity_extra_proofs x join activities a on a.id = x.activity_id
                    where a.challenge_id = $1 and a.status = 'approved' and x.proof_kind = 'image'
                      and a.activity_date between $2::date and $3::date
                 ) p
             ) x where rn <= 3`,
            [challenge.id, range.start, range.end],
          )
        ).rows
      : [];

    return { challenge, range, participants, perCategory, photos };
  });
  if (!base) return null;

  const { challenge, range, participants, perCategory, photos } = base;
  const tones = toneMap(participants, userId);
  const compact = participants.length > 2;
  const [photoW, photoH] = compact ? [144, 144] : [560, 260];

  const people = await Promise.all(
    meFirst(participants, userId).map(async (p) => {
      const rows = perCategory.filter((r) => r.user_id === p.id).sort((a, b) => b.n - a.n || a.category_name.localeCompare(b.category_name));
      const myPhotos = photos.filter((ph) => ph.user_id === p.id && ph.proof_path.startsWith(`proofs/${p.id}/`));
      const [avatar, ...images] = await Promise.all([
        p.avatar_path?.startsWith(`avatars/${p.id}/`) ? blobAsJpeg(p.avatar_path, 192, 192) : Promise.resolve(null),
        ...myPhotos.map((ph) => blobAsJpeg(ph.proof_path, photoW, photoH)),
      ]);
      return {
        id: p.id,
        name: p.nickname?.trim() || p.display_name,
        color: TONE[tones[p.id] ?? "partner"].hex,
        points: rows.reduce((s, r) => s + Number(r.points), 0),
        count: rows.reduce((s, r) => s + Number(r.n), 0),
        minutes: rows.reduce((s, r) => s + Number(r.minutes), 0),
        modalities: rows.map((r) => ({ name: r.category_name, count: Number(r.n) })),
        avatar,
        photos: images.filter((x): x is string => !!x),
      } satisfies ShareCardPerson;
    }),
  );

  const progress = challengeProgress(challenge.starts_on, challenge.ends_on, today);
  const periodLabel =
    options.period === "semana"
      ? `Semana de ${formatDayMonth(range.start)} a ${formatDayMonth(range.end)}`
      : options.period === "mes"
        ? capitalize(formatMonthTitle(range.start))
        : progress.ended
          ? `Resultado final · ${progress.totalDays} dias`
          : progress.totalDays
            ? `Desafio inteiro · dia ${progress.day} de ${progress.totalDays}`
            : `Desafio inteiro · desde ${formatDayMonth(challenge.starts_on)}`;

  return {
    challengeName: challenge.name,
    periodLabel,
    final: options.period === "geral" && progress.ended,
    people: [...people].sort((a, b) => b.points - a.points),
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
