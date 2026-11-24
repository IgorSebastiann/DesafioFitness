/**
 * Fichas de musculação, agenda e execução (migration 0015).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createDb, errorOf } from "./harness";

const ANA = "a7777777-7777-4777-8777-777777777777";
const BETO = "b8888888-8888-4888-8888-888888888888";
const FORA = "c9999999-9999-4999-8999-999999999999";
const ADMIN = "da000000-0000-4000-8000-00000000000a";

let db: PGlite;
let challengeId: string;
let musculacao: string;

async function su<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}
async function as<T = Record<string, unknown>>(uid: string, sql: string, params: unknown[] = []): Promise<T[]> {
  return asUser(db, uid, async () => (await db.query<T>(sql, params)).rows);
}

const STRAIGHT = JSON.stringify([{ kind: "straight", sets: 3, rest_seconds: 60, items: [{ slug: "supino-reto-com-barra", reps: 12 }] }]);

async function newSheet(uid: string, name: string, blocks = STRAIGHT) {
  const [{ id }] = await as<{ id: string }>(uid, `insert into workout_sheets (owner_id, name) values ($1, $2) returning id`, [uid, name]);
  await as(uid, `select replace_workout_blocks($1, $2::jsonb)`, [id, blocks]);
  return id;
}

beforeAll(async () => {
  db = await createDb();
  await su(
    `insert into users (id, name, email) values
       ($1, 'Ana', 'ana@teste.local'), ($2, 'Beto', 'beto@teste.local'), ($3, 'Fora', 'fora@teste.local'), ($4, 'Admin', 'adm@teste.local')`,
    [ANA, BETO, FORA, ADMIN],
  );
  await su(`alter table profiles disable trigger trg_profiles_before_update`);
  await su(`update profiles set role = 'admin' where id = $1`, [ADMIN]);
  await su(`alter table profiles enable trigger trg_profiles_before_update`);
  [{ id: challengeId }] = await as<{ id: string }>(ANA, `select create_challenge('Ana e Beto', 2, current_date - 7) as id`);
  await su(`insert into challenge_participants (challenge_id, user_id) values ($1, $2)`, [challengeId, BETO]);
  await as(FORA, `select create_challenge('Fora', 2, current_date)`);
  [{ id: musculacao }] = await su<{ id: string }>(`select id from activity_categories where name = 'Musculação'`);
});

afterAll(async () => {
  await db?.close();
});

describe("fichas: quem vê e quem edita", () => {
  it("ficha privada só aparece para o dono", async () => {
    const id = await newSheet(ANA, "Privada");
    expect(await as(BETO, `select id from workout_sheets where id = $1`, [id])).toEqual([]);
    expect(await as(BETO, `select id from workout_blocks where sheet_id = $1`, [id])).toEqual([]);
    expect(await as(ANA, `select id from workout_blocks where sheet_id = $1`, [id])).toHaveLength(1);
  });

  it("compartilhada: visível para o desafio, não para quem está fora; só o dono edita", async () => {
    const id = await newSheet(ANA, "Compartilhada");
    await as(ANA, `update workout_sheets set is_shared = true where id = $1`, [id]);
    expect(await as(BETO, `select id from workout_sheets where id = $1`, [id])).toHaveLength(1);
    expect(await as(BETO, `select i.id from workout_block_items i join workout_blocks b on b.id = i.block_id where b.sheet_id = $1`, [id])).toHaveLength(1);
    expect(await as(FORA, `select id from workout_sheets where id = $1`, [id])).toEqual([]);
    expect(await as(BETO, `update workout_sheets set name = 'Roubada' where id = $1 returning id`, [id])).toEqual([]);
    expect(await errorOf(as(BETO, `select replace_workout_blocks($1, '[]'::jsonb)`, [id]))).toBeNull();
    // O delete do Beto não encontra nada (RLS); os blocos da Ana continuam lá.
    expect(await as(ANA, `select id from workout_blocks where sheet_id = $1`, [id])).toHaveLength(1);
  });

  it("ninguém cria ficha em nome de outra pessoa nem modelo sem ser admin", async () => {
    expect(await errorOf(as(ANA, `insert into workout_sheets (owner_id, name) values ($1, 'X')`, [BETO]))).toMatch(/row-level security/);
    expect(
      await errorOf(as(ANA, `insert into workout_sheets (owner_id, is_template, template_group, name) values (null, true, 'Meu', 'X')`)),
    ).toMatch(/row-level security/);
  });

  it("modelos: todos veem, só o admin altera", async () => {
    const templates = await as<{ template_group: string }>(FORA, `select distinct template_group from workout_sheets where is_template`);
    expect(templates.map((t) => t.template_group).sort()).toEqual(["ABC", "ABCD", "Full Body", "Upper/Lower"]);
    expect(await as(ANA, `update workout_sheets set name = 'Mudado' where is_template returning id`)).toEqual([]);
    expect(await as(ADMIN, `update workout_sheets set description = 'Revisado' where id = '7e000000-0000-4000-8000-0000000000c1' returning id`)).toHaveLength(1);
  });
});

describe("formato dos blocos (conferido no banco)", () => {
  const cases: Array<[string, unknown[], RegExp]> = [
    ["bi-set com 3 exercícios", [{ kind: "biset", sets: 3, items: [{ slug: "puxada-alta", reps: 10 }, { slug: "remada-baixa", reps: 10 }, { slug: "remada-com-halteres", reps: 10 }] }], /exatamente 2/],
    ["circuito sem tempo", [{ kind: "circuit", sets: 1, items: [{ slug: "abdominal-crunch", reps: 10 }, { slug: "prancha-abdominal", duration_seconds: 20 }] }], /tempo de cada exercício/],
    ["carga alternada sem sequência", [{ kind: "alternating", sets: 3, items: [{ slug: "remada-cavalinho", reps: 6 }] }], /sequência de repetições/],
    ["meta de repetição sem repetições", [{ kind: "straight", sets: 3, items: [{ slug: "leg-press-45" }] }], /repetições ou o tempo/],
    ["aquecimento vazio", [{ kind: "warmup", sets: 1 }], /aquecimento/],
    ["exercício inexistente", [{ kind: "straight", sets: 3, items: [{ slug: "nao-existe", reps: 10 }] }], /não encontrado/],
  ];
  for (const [label, blocks, message] of cases) {
    it(`recusa ${label}`, async () => {
      const [{ id }] = await as<{ id: string }>(ANA, `insert into workout_sheets (owner_id, name) values ($1, 'Teste') returning id`, [ANA]);
      expect(await errorOf(as(ANA, `select replace_workout_blocks($1, $2::jsonb)`, [id, JSON.stringify(blocks)]))).toMatch(message);
    });
  }

  it("aceita os 5 tipos bem formados", async () => {
    const id = await newSheet(
      ANA,
      "Completa",
      JSON.stringify([
        { kind: "warmup", title: "Mobilidade", sets: 1 },
        { kind: "straight", sets: 3, items: [{ slug: "leg-press-45", reps: 15 }] },
        { kind: "biset", sets: 3, items: [{ slug: "puxada-alta", reps: 15 }, { slug: "remada-com-halteres", reps: 15 }] },
        { kind: "alternating", sets: 3, items: [{ slug: "remada-cavalinho", reps_scheme: [6, 12] }] },
        { kind: "circuit", sets: 1, items: [{ slug: "abdominal-crunch", duration_seconds: 20 }, { slug: "prancha-abdominal", duration_seconds: 20 }] },
      ]),
    );
    const kinds = await as<{ kind: string }>(ANA, `select kind from workout_blocks where sheet_id = $1 order by position`, [id]);
    expect(kinds.map((k) => k.kind)).toEqual(["warmup", "straight", "biset", "alternating", "circuit"]);
  });
});

describe("copiar", () => {
  it("copia ficha compartilhada e modelo; não copia ficha privada de outra pessoa", async () => {
    const shared = await newSheet(ANA, "Para copiar");
    await as(ANA, `update workout_sheets set is_shared = true where id = $1`, [shared]);
    const [{ id: copy }] = await as<{ id: string }>(BETO, `select copy_workout_sheet($1) as id`, [shared]);
    const [row] = await as<{ owner_id: string; copied_from: string; is_shared: boolean }>(
      BETO,
      `select owner_id, copied_from, is_shared from workout_sheets where id = $1`,
      [copy],
    );
    expect(row).toEqual({ owner_id: BETO, copied_from: shared, is_shared: false });
    expect(await as(BETO, `select id from workout_blocks where sheet_id = $1`, [copy])).toHaveLength(1);
    // A cópia é do Beto: ele edita sem mexer na original.
    expect(await errorOf(as(BETO, `select replace_workout_blocks($1, '[]'::jsonb)`, [copy]))).toBeNull();
    expect(await as(ANA, `select id from workout_blocks where sheet_id = $1`, [shared])).toHaveLength(1);

    const [{ id: fromTemplate }] = await as<{ id: string }>(FORA, `select copy_workout_sheet('7e000000-0000-4000-8000-0000000000a1') as id`);
    expect(await as(FORA, `select id from workout_blocks where sheet_id = $1`, [fromTemplate])).toHaveLength(5);

    const privateSheet = await newSheet(ANA, "Só minha");
    expect(await errorOf(as(BETO, `select copy_workout_sheet($1)`, [privateSheet]))).toMatch(/não encontrada/);
  });
});

describe("agenda", () => {
  it("é privada e só aceita fichas da própria conta", async () => {
    const mine = await newSheet(BETO, "Agenda");
    await as(BETO, `insert into workout_schedule (user_id, weekday, sheet_id) values ($1, 1, $2)`, [BETO, mine]);
    expect(await as(ANA, `select * from workout_schedule where user_id = $1`, [BETO])).toEqual([]);
    expect(await errorOf(as(BETO, `insert into workout_schedule (user_id, weekday, sheet_id) values ($1, 2, '7e000000-0000-4000-8000-0000000000a1')`, [BETO]))).toMatch(
      /Copie a ficha/,
    );
    expect(await errorOf(as(ANA, `insert into workout_schedule (user_id, weekday, sheet_id) values ($1, 3, $2)`, [BETO, mine]))).toMatch(/row-level security/);
  });
});

describe("execução", () => {
  it("registra séries, encerra, liga à atividade e protege o histórico", async () => {
    const sheet = await newSheet(ANA, "Execução");
    const [{ id: item, exercise_id }] = await as<{ id: string; exercise_id: string }>(
      ANA,
      `select i.id, i.exercise_id from workout_block_items i join workout_blocks b on b.id = i.block_id where b.sheet_id = $1`,
      [sheet],
    );
    const [{ id: session }] = await as<{ id: string }>(
      ANA,
      `insert into workout_sessions (user_id, sheet_id, sheet_name, started_at) values ($1, $2, 'Execução', now() - interval '40 minutes') returning id`,
      [ANA, sheet],
    );
    await as(ANA, `insert into workout_set_logs (session_id, user_id, item_id, exercise_id, set_number, reps, load_kg) values ($1, $2, $3, $4, 1, 12, 40)`, [
      session,
      ANA,
      item,
      exercise_id,
    ]);
    expect(await as(BETO, `select id from workout_set_logs where session_id = $1`, [session])).toEqual([]);
    expect(await as(BETO, `select id from workout_sessions where id = $1`, [session])).toEqual([]);

    // Ninguém executa ficha de outra pessoa sem copiar.
    expect(await errorOf(as(BETO, `insert into workout_sessions (user_id, sheet_id, sheet_name) values ($1, $2, 'X')`, [BETO, sheet]))).toMatch(/Copie a ficha/);

    await as(ANA, `update workout_sessions set status = 'finished', finished_at = now() where id = $1`, [session]);
    expect(
      await errorOf(
        as(ANA, `insert into workout_set_logs (session_id, user_id, item_id, exercise_id, set_number, reps) values ($1, $2, $3, $4, 2, 10)`, [
          session,
          ANA,
          item,
          exercise_id,
        ]),
      ),
    ).toMatch(/encerrado/);
    expect(await errorOf(as(ANA, `update workout_sessions set status = 'in_progress', finished_at = null where id = $1`, [session]))).toMatch(/reaberto/);

    // Liga à atividade da própria pessoa; atividade de outra pessoa é recusada.
    const [{ id: activity }] = await as<{ id: string }>(
      ANA,
      `insert into activities (challenge_id, user_id, category_id, activity_date, activity_time, duration_minutes, proof_path, proof_kind)
       values ($1, $2, $3, current_date, '07:00', 40, $4, 'image') returning id`,
      [challengeId, ANA, musculacao, `proofs/${ANA}/${crypto.randomUUID()}.jpg`],
    );
    await as(ANA, `update workout_sessions set activity_id = $2 where id = $1`, [session, activity]);
    const [{ id: betoActivity }] = await as<{ id: string }>(
      BETO,
      `insert into activities (challenge_id, user_id, category_id, activity_date, activity_time, duration_minutes, proof_path, proof_kind)
       values ($1, $2, $3, current_date, '08:00', 40, $4, 'image') returning id`,
      [challengeId, BETO, musculacao, `proofs/${BETO}/${crypto.randomUUID()}.jpg`],
    );
    expect(await errorOf(as(ANA, `update workout_sessions set activity_id = $2 where id = $1`, [session, betoActivity]))).toMatch(/precisa ser sua/);

    // Editar a ficha depois não apaga o histórico: a série só perde o vínculo com o item.
    await as(ANA, `select replace_workout_blocks($1, $2::jsonb)`, [sheet, STRAIGHT]);
    const logs = await as<{ item_id: string | null; load_kg: string }>(ANA, `select item_id, load_kg from workout_set_logs where session_id = $1`, [session]);
    expect(logs).toEqual([{ item_id: null, load_kg: "40.00" }]);
  });
});
