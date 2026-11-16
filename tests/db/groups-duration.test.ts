/**
 * Duração do desafio e grupos de até 4 pessoas (migration 0011).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createDb, errorOf } from "./harness";

const A = "a1111111-1111-4111-8111-111111111111";
const B = "b2222222-2222-4222-8222-222222222222";
const C = "c3333333-3333-4333-8333-333333333333";
const D = "d4444444-4444-4444-8444-444444444444";
const E = "e5555555-5555-4555-8555-555555555555";

let db: PGlite;
let challengeId: string;
let categoryId: string;
const TODAY = `(now() at time zone 'America/Sao_Paulo')::date`;

async function su<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}
async function as<T = Record<string, unknown>>(uid: string, sql: string, params: unknown[] = []): Promise<T[]> {
  return asUser(db, uid, async () => (await db.query<T>(sql, params)).rows);
}
async function invite(email: string) {
  const [row] = await as<{ t: string }>(A, `select create_invitation($1, $2) as t`, [challengeId, email]);
  return row.t;
}

beforeAll(async () => {
  db = await createDb();
  await su(
    `insert into users (id, name, email) values
       ($1, 'Ana', 'a@teste.local'), ($2, 'Bia', 'b@teste.local'), ($3, 'Cris', 'c@teste.local'),
       ($4, 'Duda', 'd@teste.local'), ($5, 'Edu', 'e@teste.local')`,
    [A, B, C, D, E],
  );
  const [row] = await as<{ id: string }>(A, `select create_challenge('Turma do treino', 5, current_date - 10, current_date + 19) as id`);
  challengeId = row.id;
  [{ id: categoryId }] = await su<{ id: string }>(`select id from activity_categories where name = 'Corrida' and challenge_id is null`);
});

afterAll(async () => {
  await db?.close();
});

describe("duração do desafio", () => {
  it("guarda a data de fim escolhida", async () => {
    const [c] = await su<{ days: number }>(`select (ends_on - starts_on + 1) as days from challenges where id = $1`, [challengeId]);
    expect(c.days).toBe(30);
  });

  it("não aceita fim antes do início", async () => {
    const err = await errorOf(as(E, `select create_challenge('Errado', 2, current_date, current_date - 1)`));
    expect(err).toContain("depois do início");
  });

  it("sem data de fim continua funcionando (3 argumentos)", async () => {
    const [row] = await as<{ id: string }>(E, `select create_challenge('Sem fim', 2, current_date) as id`);
    const [c] = await su<{ ends_on: string | null }>(`select ends_on from challenges where id = $1`, [row.id]);
    expect(c.ends_on).toBeNull();
    await su(`delete from challenges where id = $1`, [row.id]);
  });

  it("bloqueia atividade depois do fim, mas aceita dentro do período", async () => {
    await su(`update challenges set ends_on = ${TODAY} - 2 where id = $1`, [challengeId]);
    const insert = (date: string) =>
      as(
        A,
        `insert into activities (challenge_id, user_id, category_id, activity_date, activity_time, duration_minutes, proof_path, proof_kind)
         values ($1, $2, $3, ${date}, '07:00', 60, $4, 'image')`,
        [challengeId, A, categoryId, `proofs/${A}/x.webp`],
      );
    expect(await errorOf(insert(TODAY))).toContain("O desafio terminou");
    expect(await errorOf(insert(`${TODAY} - 3`))).toBeNull();
    await su(`update challenges set ends_on = current_date + 19 where id = $1`, [challengeId]);
  });
});

describe("grupo de até 4 pessoas", () => {
  it("convites pendentes simultâneos ocupam vagas: no máximo 3 além do criador", async () => {
    await invite("b@teste.local");
    await invite("c@teste.local");
    await invite("d@teste.local");
    const err = await errorOf(as(A, `select create_invitation($1, 'e@teste.local')`, [challengeId]));
    expect(err).toContain("todas as vagas");
    // Reenviar para o mesmo e-mail substitui, não ocupa outra vaga.
    expect(await errorOf(invite("d@teste.local"))).toBeNull();
  });

  it("cancelar um convite libera a vaga", async () => {
    const [inv] = await as<{ id: string }>(A, `select id from challenge_invitations where invited_email = 'd@teste.local' and status = 'pending'`);
    expect(await errorOf(as(E, `select cancel_invitation($1)`, [inv.id]))).toContain("não participa");
    await as(A, `select cancel_invitation($1)`, [inv.id]);
    expect(await errorOf(invite("d@teste.local"))).toBeNull();
  });

  it("todos aceitam e cada entrada avisa quem já estava", async () => {
    const pending = await su<{ token: string; invited_email: string }>(
      `select token, invited_email from challenge_invitations where challenge_id = $1 and status = 'pending'`,
      [challengeId],
    );
    const byEmail = Object.fromEntries(pending.map((p) => [p.invited_email, p.token]));
    await as(B, `select accept_invitation($1)`, [byEmail["b@teste.local"]]);
    await as(C, `select accept_invitation($1)`, [byEmail["c@teste.local"]]);
    await as(D, `select accept_invitation($1)`, [byEmail["d@teste.local"]]);
    const members = await su(`select user_id from challenge_participants where challenge_id = $1`, [challengeId]);
    expect(members).toHaveLength(4);
    const toB = await su(`select id from notifications where user_id = $1 and kind = 'invite_accepted'`, [B]);
    expect(toB).toHaveLength(2); // entradas de Cris e Duda
  });

  it("o quinto participante é barrado", async () => {
    const err = await errorOf(su(`insert into challenge_participants (challenge_id, user_id) values ($1, $2)`, [challengeId, E]));
    expect(err).toContain("já possui 4 participantes");
    const err2 = await errorOf(as(A, `select create_invitation($1, 'e@teste.local')`, [challengeId]));
    expect(err2).toContain("já tem 4 participantes");
  });

  it("não dá para convidar quem já está no desafio", async () => {
    await su(`delete from challenge_participants where challenge_id = $1 and user_id = $2`, [challengeId, D]);
    const err = await errorOf(as(A, `select create_invitation($1, 'B@teste.local')`, [challengeId]));
    expect(err).toContain("já está no desafio");
    await su(`insert into challenge_participants (challenge_id, user_id) values ($1, $2)`, [challengeId, D]);
  });

  it("qualquer outro participante aprova a atividade", async () => {
    const [act] = await as<{ id: string }>(
      B,
      `insert into activities (challenge_id, user_id, category_id, activity_date, activity_time, duration_minutes, proof_path, proof_kind)
       values ($1, $2, $3, ${TODAY}, '08:00', 60, $4, 'image') returning id`,
      [challengeId, B, categoryId, `proofs/${B}/y.webp`],
    );
    await as(D, `update activities set status = 'approved' where id = $1`, [act.id]);
    const [row] = await su<{ status: string }>(`select status from activities where id = $1`, [act.id]);
    expect(row.status).toBe("approved");
  });

  it("cutuca uma pessoa específica, com limite por pessoa", async () => {
    await as(A, `select poke_partner($1)`, [C]);
    expect(await errorOf(as(A, `select poke_partner($1)`, [C]))).toMatch(/cutucou há pouco/);
    expect(await errorOf(as(A, `select poke_partner($1)`, [D]))).toBeNull();
    expect(await errorOf(as(A, `select poke_partner($1)`, [E]))).toMatch(/não está no seu desafio/);
    const toC = await su(`select id from notifications where user_id = $1 and kind = 'poke'`, [C]);
    expect(toC).toHaveLength(1);
  });

  it("lembrete diário: um aviso só, com os nomes de quem já treinou", async () => {
    await su(`insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, 'https://fcm.googleapis.com/x', 'k', 'a')`, [C]);
    // Ana treinou hoje? Não (a dela foi há 3 dias). Bia treinou hoje.
    const [{ queue_daily_reminders: n }] = await su<{ queue_daily_reminders: number }>(`select queue_daily_reminders()`);
    expect(n).toBe(1);
    const [note] = await su<{ title: string }>(`select title from notifications where user_id = $1 and kind = 'daily_reminder'`, [C]);
    expect(note.title).toBe("Bia já treinou hoje 👀");
  });

  it("desafio encerrado não recebe lembrete", async () => {
    await su(`delete from notifications where kind = 'daily_reminder'`);
    await su(`update challenges set ends_on = ${TODAY} - 1 where id = $1`, [challengeId]);
    const [{ queue_daily_reminders: n }] = await su<{ queue_daily_reminders: number }>(`select queue_daily_reminders()`);
    expect(n).toBe(0);
  });
});
