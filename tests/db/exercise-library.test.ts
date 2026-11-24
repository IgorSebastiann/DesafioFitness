/**
 * Biblioteca de exercícios (migration 0013) e catálogo (0014).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createDb, errorOf } from "./harness";

const ADMIN = "a1111111-1111-4111-8111-111111111111";
const MEMBRO = "b2222222-2222-4222-8222-222222222222";
const BLOB = "https://abc123.public.blob.vercel-storage.com/exercises";

let db: PGlite;
let exerciseId: string;

async function su<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}
async function as<T = Record<string, unknown>>(uid: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  return asUser(db, uid, async () => (await db.query<T>(sql, params)).rows);
}

const insertExercise = (uid: string, slug: string) =>
  as<{ id: string }>(
    uid,
    `insert into exercises (slug, name, primary_muscle, equipment, level, mechanic, steps)
     values ($1, $2, 'chest', 'dumbbell', 'beginner', 'compound', array['Passo 1']) returning id`,
    [slug, `Teste ${slug}`],
  );

const insertMedia = (uid: string, fields: Record<string, unknown>) => {
  const row = {
    exercise_id: exerciseId,
    kind: "image",
    url: `${BLOB}/teste/${Math.random().toString(36).slice(2)}.webp`,
    origin: "wger",
    author: "Fulano",
    license: "cc_by_sa",
    source_url: "https://wger.de/exercise/1",
    source_key: `wger-image-${Math.random().toString(36).slice(2)}`,
    ...fields,
  };
  const cols = Object.keys(row);
  return as(
    uid,
    `insert into exercise_media (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")})`,
    Object.values(row),
  );
};

beforeAll(async () => {
  db = await createDb();
  await su(`insert into users (id, name, email) values ($1, 'Admin', 'admin@teste.local'), ($2, 'Membro', 'membro@teste.local')`, [
    ADMIN,
    MEMBRO,
  ]);
  // Promoção direta (como um operador faria no banco), sem passar pela proteção de papel.
  await su(`alter table profiles disable trigger trg_profiles_before_update`);
  await su(`update profiles set role = 'admin' where id = $1`, [ADMIN]);
  await su(`alter table profiles enable trigger trg_profiles_before_update`);
  [{ id: exerciseId }] = await insertExercise(ADMIN, "exercicio-base");
});

afterAll(async () => {
  await db?.close();
});

describe("catálogo de exercícios", () => {
  it("tem os 19 grupos musculares do mapa", async () => {
    const rows = await as<{ n: number }>(MEMBRO, `select count(*)::int as n from muscle_groups`);
    expect(rows[0].n).toBe(19);
  });

  it("vem com cerca de 100 exercícios, todos com execução e músculos válidos", async () => {
    const [{ n }] = await as<{ n: number }>(MEMBRO, `select count(*)::int as n from exercises where slug <> 'exercicio-base'`);
    expect(n).toBeGreaterThanOrEqual(95);
    const semPasso = await su(`select slug from exercises where cardinality(steps) = 0`);
    expect(semPasso).toEqual([]);
  });

  it("cobre todos os grupos musculares como músculo principal ou secundário", async () => {
    const vazios = await su(
      `select code from muscle_groups mg
        where not exists (select 1 from exercises e where e.primary_muscle = mg.code)
          and not exists (select 1 from exercise_secondary_muscles s where s.muscle = mg.code)`,
    );
    expect(vazios).toEqual([]);
  });

  it("busca sem acento e sem diferença de maiúsculas", async () => {
    const rows = await as<{ slug: string }>(MEMBRO, `select slug from exercises where search_text like '%' || fold_text($1) || '%'`, [
      "ELEVAÇÃO lateral",
    ]);
    expect(rows.map((r) => r.slug)).toContain("elevacao-lateral-com-halteres");
  });

  it("quem não está logado não lê nada", async () => {
    expect(await as(null, `select * from exercises`)).toEqual([]);
    expect(await as(null, `select * from muscle_groups`)).toEqual([]);
  });

  it("participante comum lê, mas não cria, edita nem apaga", async () => {
    expect((await as(MEMBRO, `select id from exercises where id = $1`, [exerciseId])).length).toBe(1);
    expect(await errorOf(insertExercise(MEMBRO, "nao-pode"))).toMatch(/row-level security/);
    const upd = await as(MEMBRO, `update exercises set name = 'Hackeado' where id = $1 returning id`, [exerciseId]);
    expect(upd).toEqual([]);
    const del = await as(MEMBRO, `delete from exercises where id = $1 returning id`, [exerciseId]);
    expect(del).toEqual([]);
    expect(await errorOf(as(MEMBRO, `insert into exercise_secondary_muscles values ($1, 'triceps')`, [exerciseId]))).toMatch(
      /row-level security/,
    );
  });

  it("exercício inativo some para o participante, mas não para o admin", async () => {
    const [{ id }] = await insertExercise(ADMIN, "inativo");
    await as(ADMIN, `update exercises set is_active = false where id = $1`, [id]);
    expect(await as(MEMBRO, `select id from exercises where id = $1`, [id])).toEqual([]);
    expect((await as(ADMIN, `select id from exercises where id = $1`, [id])).length).toBe(1);
  });

  it("músculo secundário não pode repetir o principal, e trocar o principal limpa a duplicata", async () => {
    expect(await errorOf(as(ADMIN, `insert into exercise_secondary_muscles values ($1, 'chest')`, [exerciseId]))).toMatch(
      /principal/,
    );
    await as(ADMIN, `insert into exercise_secondary_muscles values ($1, 'triceps')`, [exerciseId]);
    await as(ADMIN, `update exercises set primary_muscle = 'triceps' where id = $1`, [exerciseId]);
    const sec = await su(`select muscle from exercise_secondary_muscles where exercise_id = $1`, [exerciseId]);
    expect(sec).toEqual([]);
    await as(ADMIN, `update exercises set primary_muscle = 'chest' where id = $1`, [exerciseId]);
  });
});

describe("mídias de execução", () => {
  it("admin inclui mídia de terceiros com autor, licença e fonte", async () => {
    expect(await errorOf(insertMedia(ADMIN, {}))).toBeNull();
    expect(await errorOf(insertMedia(ADMIN, { license: "cc0", author: null }))).toBeNull();
  });

  it("participante comum não inclui mídia", async () => {
    expect(await errorOf(insertMedia(MEMBRO, {}))).toMatch(/row-level security/);
  });

  it("não aceita licença desconhecida", async () => {
    expect(await errorOf(insertMedia(ADMIN, { license: "all_rights_reserved" }))).toMatch(/invalid input value/);
    expect(await errorOf(insertMedia(ADMIN, { license: null }))).toMatch(/null value/);
  });

  it("CC BY e CC BY-SA exigem autor", async () => {
    expect(await errorOf(insertMedia(ADMIN, { license: "cc_by", author: null }))).toMatch(/exercise_media_attribution/);
    expect(await errorOf(insertMedia(ADMIN, { license: "cc_by_sa", author: null }))).toMatch(/exercise_media_attribution/);
  });

  it("terceiros exigem link da fonte", async () => {
    expect(await errorOf(insertMedia(ADMIN, { source_url: null }))).toMatch(/exercise_media_third_party_source/);
  });

  it("origem própria só com licença própria, e vice-versa", async () => {
    expect(await errorOf(insertMedia(ADMIN, { origin: "own", license: "cc_by" }))).toMatch(/exercise_media_own_license/);
    expect(await errorOf(insertMedia(ADMIN, { origin: "wger", license: "own" }))).toMatch(/exercise_media_own_license/);
    expect(
      await errorOf(insertMedia(ADMIN, { origin: "own", license: "own", author: null, source_url: null, source_key: null, kind: "video" })),
    ).toBeNull();
  });

  it("só aceita arquivos do Blob público de mídias", async () => {
    expect(await errorOf(insertMedia(ADMIN, { url: "https://wger.de/media/x.png" }))).toMatch(/check/);
  });

  it("só uma mídia principal por exercício", async () => {
    expect(await errorOf(insertMedia(ADMIN, { is_primary: true }))).toBeNull();
    expect(await errorOf(insertMedia(ADMIN, { is_primary: true }))).toMatch(/exercise_media_one_primary/);
  });

  it("participante lê as mídias", async () => {
    const rows = await as(MEMBRO, `select id from exercise_media where exercise_id = $1`, [exerciseId]);
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe("desenho do corpo no perfil", () => {
  it("cada um escolhe o próprio desenho, e não o de outra pessoa", async () => {
    await as(MEMBRO, `update profiles set body_figure = 'female' where id = $1`, [MEMBRO]);
    const [row] = await su<{ body_figure: string }>(`select body_figure from profiles where id = $1`, [MEMBRO]);
    expect(row.body_figure).toBe("female");
    const upd = await as(MEMBRO, `update profiles set body_figure = 'female' where id = $1 returning id`, [ADMIN]);
    expect(upd).toEqual([]);
    expect(await errorOf(as(MEMBRO, `update profiles set body_figure = 'robot' where id = $1`, [MEMBRO]))).toMatch(
      /invalid input value/,
    );
  });
});
