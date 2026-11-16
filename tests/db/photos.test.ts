/**
 * Várias comprovações por atividade (migration 0012).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createDb, errorOf } from "./harness";

const DONA = "a7777777-7777-4777-8777-777777777777";
const PAR = "b8888888-8888-4888-8888-888888888888";
const FORA = "c9999999-9999-4999-8999-999999999999";

let db: PGlite;
let activityId: string;

async function su<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}
async function as<T = Record<string, unknown>>(uid: string, sql: string, params: unknown[] = []): Promise<T[]> {
  return asUser(db, uid, async () => (await db.query<T>(sql, params)).rows);
}
const addExtra = (uid: string, pos: number, path: string) =>
  as(uid, `insert into activity_extra_proofs (activity_id, position, proof_path, proof_kind) values ($1, $2, $3, 'image')`, [
    activityId,
    pos,
    path,
  ]);

beforeAll(async () => {
  db = await createDb();
  await su(
    `insert into users (id, name, email) values ($1, 'Dona', 'dona@teste.local'), ($2, 'Par', 'par@teste.local'), ($3, 'Fora', 'fora@teste.local')`,
    [DONA, PAR, FORA],
  );
  const [{ id }] = await as<{ id: string }>(DONA, `select create_challenge('Fotos', 5, current_date - 7) as id`);
  await su(`insert into challenge_participants (challenge_id, user_id) values ($1, $2)`, [id, PAR]);
  await as(FORA, `select create_challenge('Outro', 5, current_date - 7)`);
  const [{ id: corrida }] = await su<{ id: string }>(`select id from activity_categories where name = 'Corrida' and challenge_id is null`);
  [{ id: activityId }] = await as<{ id: string }>(
    DONA,
    `insert into activities (challenge_id, user_id, category_id, activity_date, activity_time, duration_minutes, proof_path, proof_kind)
     values ($1, $2, $3, (now() at time zone 'America/Sao_Paulo')::date - 1, '07:00', 40, $4, 'image') returning id`,
    [id, DONA, corrida, `proofs/${DONA}/capa.webp`],
  );
});

afterAll(async () => {
  await db?.close();
});

describe("comprovações extras", () => {
  it("a dona adiciona fotos extras na própria pasta enquanto está pendente", async () => {
    expect(await errorOf(addExtra(DONA, 1, `proofs/${DONA}/2.webp`))).toBeNull();
    expect(await errorOf(addExtra(DONA, 2, `proofs/${DONA}/3.webp`))).toBeNull();
  });

  it("não aceita arquivo de outra pasta, nem posição fora de 1 a 4", async () => {
    expect(await errorOf(addExtra(DONA, 3, `proofs/${PAR}/x.webp`))).toMatch(/row-level security/);
    expect(await errorOf(addExtra(DONA, 5, `proofs/${DONA}/5.webp`))).toMatch(/check/);
  });

  it("outra pessoa do desafio vê, mas não adiciona", async () => {
    const seen = await as(PAR, `select proof_path from activity_extra_proofs where activity_id = $1`, [activityId]);
    expect(seen).toHaveLength(2);
    expect(await errorOf(addExtra(PAR, 3, `proofs/${PAR}/y.webp`))).toMatch(/row-level security/);
  });

  it("quem é de fora não vê nada", async () => {
    const seen = await as(FORA, `select proof_path from activity_extra_proofs`);
    expect(seen).toHaveLength(0);
  });

  it("depois de aprovada, não dá para adicionar nem remover", async () => {
    await as(PAR, `update activities set status = 'approved' where id = $1`, [activityId]);
    expect(await errorOf(addExtra(DONA, 3, `proofs/${DONA}/4.webp`))).toMatch(/row-level security/);
    await as(DONA, `delete from activity_extra_proofs where activity_id = $1`, [activityId]);
    const still = await su(`select 1 from activity_extra_proofs where activity_id = $1`, [activityId]);
    expect(still).toHaveLength(2);
  });
});
