/**
 * Meta semanal e cutucadas (migration 0010).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createDb, errorOf } from "./harness";

const LIA = "d4444444-4444-4444-4444-444444444444";
const LEO = "e5555555-5555-5555-5555-555555555555";
const SOLO = "f6666666-6666-6666-6666-666666666666";

let db: PGlite;

async function su<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}
async function as<T = Record<string, unknown>>(uid: string, sql: string, params: unknown[] = []): Promise<T[]> {
  return asUser(db, uid, async () => (await db.query<T>(sql, params)).rows);
}

beforeAll(async () => {
  db = await createDb();
  await su(
    `insert into users (id, name, email) values ($1, 'Lia', 'lia@teste.local'), ($2, 'Leo', 'leo@teste.local'), ($3, 'Solo', 'solo@teste.local')`,
    [LIA, LEO, SOLO],
  );
  const [{ id }] = await as<{ id: string }>(LIA, `select create_challenge('Lia e Leo', 2, current_date - 7) as id`);
  await su(`insert into challenge_participants (challenge_id, user_id) values ($1, $2)`, [id, LEO]);
  await as(SOLO, `select create_challenge('Sozinho', 2, current_date)`);
});

afterAll(async () => {
  await db?.close();
});

describe("meta semanal", () => {
  it("padrão 4 dias; cada um muda a própria entre 1 e 7", async () => {
    const [{ weekly_goal }] = await as<{ weekly_goal: number }>(LIA, `select weekly_goal from profiles where id = $1`, [LIA]);
    expect(weekly_goal).toBe(4);
    await as(LIA, `update profiles set weekly_goal = 6 where id = $1`, [LIA]);
    expect(await errorOf(as(LIA, `update profiles set weekly_goal = 8 where id = $1`, [LIA]))).toMatch(/check/);
    const changed = await as(LIA, `update profiles set weekly_goal = 1 where id = $1 returning id`, [LEO]);
    expect(changed).toEqual([]);
  });
});

describe("cutucar", () => {
  it("avisa o parceiro e só deixa cutucar de novo depois de 4 horas", async () => {
    await as(LIA, `select poke_partner()`);
    const notes = await su<{ title: string }>(`select title from notifications where user_id = $1 and kind = 'poke'`, [LEO]);
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toContain("Lia");
    expect(await errorOf(as(LIA, `select poke_partner()`))).toMatch(/cutucou há pouco/);
    // O parceiro pode cutucar de volta.
    expect(await errorOf(as(LEO, `select poke_partner()`))).toBeNull();
  });

  it("sem parceiro não dá para cutucar", async () => {
    expect(await errorOf(as(SOLO, `select poke_partner()`))).toMatch(/não está no seu desafio/);
  });

  it("ninguém grava cutucada direto na tabela nem vê as dos outros", async () => {
    expect(
      await errorOf(as(LIA, `insert into pokes (from_user, to_user) values ($1, $2)`, [LIA, LEO])),
    ).toMatch(/row-level security/);
    expect(await as(SOLO, `select * from pokes`)).toEqual([]);
    expect((await as(LEO, `select * from pokes`)).length).toBe(2);
  });
});
