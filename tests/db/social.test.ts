/**
 * Reações, comentários e lembrete diário (migration 0009).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createDb, errorOf } from "./harness";

const ANA = "a1111111-1111-1111-1111-111111111111";
const BETO = "b2222222-2222-2222-2222-222222222222";
const FORA = "c3333333-3333-3333-3333-333333333333";

let db: PGlite;
let challengeId: string;
let activityId: string;
let corrida: string;

async function su<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}
async function as<T = Record<string, unknown>>(uid: string, sql: string, params: unknown[] = []): Promise<T[]> {
  return asUser(db, uid, async () => (await db.query<T>(sql, params)).rows);
}
const countNotes = async (uid: string, kind: string) =>
  Number((await su<{ n: number }>(`select count(*)::int as n from notifications where user_id = $1 and kind = $2`, [uid, kind]))[0].n);

beforeAll(async () => {
  db = await createDb();
  await su(
    `insert into users (id, name, email) values ($1, 'Ana', 'ana@teste.local'), ($2, 'Beto', 'beto@teste.local'), ($3, 'Fora', 'fora@teste.local')`,
    [ANA, BETO, FORA],
  );
  [{ id: challengeId }] = await as<{ id: string }>(ANA, `select create_challenge('Ana e Beto', 5, current_date - 7) as id`);
  await su(`insert into challenge_participants (challenge_id, user_id) values ($1, $2)`, [challengeId, BETO]);
  [{ id: corrida }] = await su<{ id: string }>(`select id from activity_categories where name = 'Corrida' and challenge_id is null`);
  [{ id: activityId }] = await as<{ id: string }>(
    ANA,
    `insert into activities (challenge_id, user_id, category_id, activity_date, activity_time, duration_minutes, proof_path, proof_kind)
     values ($1, $2, $3, (now() at time zone 'America/Sao_Paulo')::date - 1, '07:00', 40, $4, 'image') returning id`,
    [challengeId, ANA, corrida, `proofs/${ANA}/a.jpg`],
  );
});

afterAll(async () => {
  await db?.close();
});

describe("reações", () => {
  it("participante reage e o dono recebe um aviso só (sem spam ao trocar de emoji)", async () => {
    await as(BETO, `insert into activity_reactions (activity_id, user_id, emoji) values ($1, $2, '🔥')`, [activityId, BETO]);
    await as(BETO, `insert into activity_reactions (activity_id, user_id, emoji) values ($1, $2, '💪')`, [activityId, BETO]);
    expect(await countNotes(ANA, "reaction")).toBe(1);
    const seen = await as(ANA, `select emoji from activity_reactions where activity_id = $1`, [activityId]);
    expect(seen).toHaveLength(2);
  });

  it("reagir à própria atividade não gera aviso", async () => {
    await as(ANA, `insert into activity_reactions (activity_id, user_id, emoji) values ($1, $2, '👏')`, [activityId, ANA]);
    expect(await countNotes(ANA, "reaction")).toBe(1);
  });

  it("quem não participa não vê nem reage; emoji fora da lista é recusado", async () => {
    expect(await as(FORA, `select * from activity_reactions where activity_id = $1`, [activityId])).toEqual([]);
    expect(
      await errorOf(as(FORA, `insert into activity_reactions (activity_id, user_id, emoji) values ($1, $2, '🔥')`, [activityId, FORA])),
    ).toMatch(/row-level security/);
    expect(
      await errorOf(as(BETO, `insert into activity_reactions (activity_id, user_id, emoji) values ($1, $2, '💩')`, [activityId, BETO])),
    ).toMatch(/check/);
  });

  it("ninguém reage em nome de outra pessoa nem apaga reação alheia", async () => {
    expect(
      await errorOf(as(BETO, `insert into activity_reactions (activity_id, user_id, emoji) values ($1, $2, '❤️')`, [activityId, ANA])),
    ).toMatch(/row-level security/);
    const removed = await as(ANA, `delete from activity_reactions where user_id = $1 returning emoji`, [BETO]);
    expect(removed).toEqual([]);
  });
});

describe("comentários", () => {
  it("comentário avisa o outro participante e não quem comentou", async () => {
    await as(BETO, `insert into activity_comments (activity_id, user_id, body) values ($1, $2, 'Mandou bem!')`, [activityId, BETO]);
    expect(await countNotes(ANA, "comment")).toBe(1);
    expect(await countNotes(BETO, "comment")).toBe(0);
  });

  it("comentário vazio é recusado e quem não participa não comenta", async () => {
    expect(
      await errorOf(as(BETO, `insert into activity_comments (activity_id, user_id, body) values ($1, $2, '   ')`, [activityId, BETO])),
    ).toMatch(/check/);
    expect(
      await errorOf(as(FORA, `insert into activity_comments (activity_id, user_id, body) values ($1, $2, 'oi')`, [activityId, FORA])),
    ).toMatch(/row-level security/);
  });

  it("cada um apaga só o próprio comentário", async () => {
    const byAna = await as(ANA, `delete from activity_comments where user_id = $1 returning id`, [BETO]);
    expect(byAna).toEqual([]);
    const byBeto = await as(BETO, `delete from activity_comments where user_id = $1 returning id`, [BETO]);
    expect(byBeto).toHaveLength(1);
  });
});

describe("lembrete diário", () => {
  it("app_user não chama a função do cron", async () => {
    expect(await errorOf(as(ANA, `select queue_daily_reminders()`))).toMatch(/permission denied/);
  });

  it("lembra só quem tem push, não treinou hoje e deixou o lembrete ligado; uma vez por dia", async () => {
    await su(
      `insert into push_subscriptions (user_id, endpoint, p256dh, auth) values
         ($1, 'https://fcm.googleapis.com/fcm/send/ana', 'k', 'a'),
         ($2, 'https://fcm.googleapis.com/fcm/send/beto', 'k', 'a')`,
      [ANA, BETO],
    );
    // Beto treinou hoje: só Ana recebe, com o nome do Beto no aviso.
    await as(
      BETO,
      `insert into activities (challenge_id, user_id, category_id, activity_date, activity_time, duration_minutes, proof_path, proof_kind)
       values ($1, $2, $3, (now() at time zone 'America/Sao_Paulo')::date, '06:00', 40, $4, 'image')`,
      [challengeId, BETO, corrida, `proofs/${BETO}/b.jpg`],
    );
    const [{ queue_daily_reminders: first }] = await su<{ queue_daily_reminders: number }>(`select queue_daily_reminders()`);
    expect(first).toBe(1);
    const [note] = await su<{ title: string }>(`select title from notifications where user_id = $1 and kind = 'daily_reminder'`, [ANA]);
    expect(note.title).toContain("Beto");

    const [{ queue_daily_reminders: again }] = await su<{ queue_daily_reminders: number }>(`select queue_daily_reminders()`);
    expect(again).toBe(0);
  });

  it("quem desligou o lembrete não recebe", async () => {
    await su(`delete from notifications where kind = 'daily_reminder'`);
    await as(ANA, `update profiles set daily_reminder = false where id = $1`, [ANA]);
    const [{ queue_daily_reminders: n }] = await su<{ queue_daily_reminders: number }>(`select queue_daily_reminders()`);
    expect(n).toBe(0);
  });
});
