/**
 * Modalidades por desafio (migration 0008): quais valem, tempo mínimo e modalidades próprias.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createDb, errorOf } from "./harness";

const BIA = "77777777-7777-7777-7777-777777777777";
const CAIO = "88888888-8888-8888-8888-888888888888";
const OUTRA = "99999999-9999-9999-9999-999999999999";

let db: PGlite;
let challengeId: string;
let otherChallengeId: string;
let corrida: string;
let musculacao: string;
let seq = 0;

async function su<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}
async function as<T = Record<string, unknown>>(uid: string, sql: string, params: unknown[] = []): Promise<T[]> {
  return asUser(db, uid, async () => (await db.query<T>(sql, params)).rows);
}

/** Registra uma atividade de ontem (horário único para não cair na regra de duplicidade). */
function insertActivity(uid: string, challenge: string, category: string, duration: number) {
  seq += 1;
  const time = `0${Math.floor(seq / 60) % 10}:${String(seq % 60).padStart(2, "0")}`;
  return as<{ id: string }>(
    uid,
    `insert into activities (challenge_id, user_id, category_id, activity_date, activity_time,
                             duration_minutes, proof_path, proof_kind)
     values ($1, $2, $3, (now() at time zone 'America/Sao_Paulo')::date - 1, $4, $5,
             $6, 'image') returning id`,
    [challenge, uid, category, time, duration, `proofs/${uid}/x${seq}.jpg`],
  );
}

type Rule = { id: string; name: string; min_duration_minutes: number; enabled: boolean; is_custom: boolean };
const rules = (uid: string, challenge: string) =>
  as<Rule>(uid, `select * from challenge_category_rules($1)`, [challenge]);

beforeAll(async () => {
  db = await createDb();
  await su(
    `insert into users (id, name, email) values
       ($1, 'Bia', 'bia@teste.local'), ($2, 'Caio', 'caio@teste.local'), ($3, 'Outra', 'outra@teste.local')`,
    [BIA, CAIO, OUTRA],
  );
  // Limite diário alto para estes testes não esbarrarem nele.
  [{ id: challengeId }] = await as<{ id: string }>(BIA, `select create_challenge('Bia e Caio', 10, current_date - 7) as id`);
  await su(`insert into challenge_participants (challenge_id, user_id) values ($1, $2)`, [challengeId, CAIO]);
  [{ id: otherChallengeId }] = await as<{ id: string }>(OUTRA, `select create_challenge('Outro casal', 10, current_date - 7) as id`);

  const cats = await su<{ id: string; name: string }>(`select id, name from activity_categories where challenge_id is null`);
  corrida = cats.find((c) => c.name === "Corrida")!.id;
  musculacao = cats.find((c) => c.name === "Musculação")!.id;
});

afterAll(async () => {
  await db?.close();
});

describe("desafio sem configuração", () => {
  it("todas as modalidades globais valem, com o tempo mínimo padrão", async () => {
    const list = await rules(BIA, challengeId);
    expect(list.length).toBeGreaterThanOrEqual(12);
    expect(list.every((r) => r.enabled && !r.is_custom)).toBe(true);
    expect(list.find((r) => r.id === corrida)!.min_duration_minutes).toBe(15);
  });

  it("quem não participa não vê as regras", async () => {
    expect(await rules(OUTRA, challengeId)).toEqual([]);
  });
});

describe("configuração de modalidades e tempo mínimo", () => {
  it("só participante salva a configuração e precisa de ao menos uma modalidade", async () => {
    const items = JSON.stringify([{ category_id: corrida, min_duration_minutes: 40 }]);
    expect(await errorOf(as(OUTRA, `select save_challenge_categories($1, $2)`, [challengeId, items]))).toContain(
      "Você não participa",
    );
    expect(await errorOf(as(BIA, `select save_challenge_categories($1, '[]')`, [challengeId]))).toContain(
      "pelo menos uma",
    );
  });

  it("salva só Corrida com 40 min e avisa o parceiro", async () => {
    await as(BIA, `select save_challenge_categories($1, $2)`, [
      challengeId,
      JSON.stringify([{ category_id: corrida, min_duration_minutes: 40 }]),
    ]);
    const list = await rules(CAIO, challengeId);
    expect(list.filter((r) => r.enabled).map((r) => [r.id, r.min_duration_minutes])).toEqual([[corrida, 40]]);
    const notes = await su(`select kind from notifications where user_id = $1 and kind = 'rules_changed'`, [CAIO]);
    expect(notes.length).toBe(1);
  });

  it("aplica o tempo mínimo do desafio e bloqueia modalidade que não vale", async () => {
    expect(await errorOf(insertActivity(CAIO, challengeId, corrida, 30))).toContain("Duração mínima para Corrida é de 40");
    expect(await errorOf(insertActivity(CAIO, challengeId, corrida, 40))).toBeNull();
    expect(await errorOf(insertActivity(CAIO, challengeId, musculacao, 60))).toContain("não faz parte das modalidades");
  });

  it("rejeita tempo mínimo fora da faixa", async () => {
    const err = await errorOf(
      as(BIA, `select save_challenge_categories($1, $2)`, [
        challengeId,
        JSON.stringify([{ category_id: corrida, min_duration_minutes: 900 }]),
      ]),
    );
    expect(err).toContain("entre 0 e 600");
  });

  it("não deixa escrever direto na tabela de configuração", async () => {
    const err = await errorOf(
      as(BIA, `insert into challenge_categories (challenge_id, category_id, min_duration_minutes) values ($1, $2, 0)`, [
        challengeId,
        musculacao,
      ]),
    );
    expect(err).not.toBeNull();
  });
});

describe("modalidades próprias", () => {
  let yoga: string;

  it("o casal cria uma modalidade própria, que já entra valendo", async () => {
    [{ id: yoga }] = await as<{ id: string }>(CAIO, `select add_challenge_category($1, 'Yoga', 2, 25) as id`, [challengeId]);
    const list = await rules(BIA, challengeId);
    const row = list.find((r) => r.id === yoga)!;
    expect(row).toMatchObject({ name: "Yoga", enabled: true, is_custom: true, min_duration_minutes: 25 });
    expect(await errorOf(insertActivity(BIA, challengeId, yoga, 25))).toBeNull();
  });

  it("não repete nome de modalidade existente", async () => {
    const err = await errorOf(as(CAIO, `select add_challenge_category($1, 'corrida', 1, 10)`, [challengeId]));
    expect(err).toContain("Já existe uma modalidade");
  });

  it("modalidade própria é invisível e inutilizável para outro desafio", async () => {
    const seen = await as(OUTRA, `select id from activity_categories where id = $1`, [yoga]);
    expect(seen).toEqual([]);
    expect(await errorOf(insertActivity(OUTRA, otherChallengeId, yoga, 60))).toContain("Modalidade indisponível");
    const err = await errorOf(
      as(OUTRA, `select save_challenge_categories($1, $2)`, [
        otherChallengeId,
        JSON.stringify([{ category_id: yoga, min_duration_minutes: 10 }]),
      ]),
    );
    expect(err).toContain("Modalidade indisponível");
  });

  it("criar modalidade própria em desafio sem configuração mantém as globais valendo", async () => {
    await as(OUTRA, `select add_challenge_category($1, 'Escalada', 1, 30)`, [otherChallengeId]);
    const list = await rules(OUTRA, otherChallengeId);
    expect(list.filter((r) => r.enabled).length).toBeGreaterThanOrEqual(13);
    expect(await errorOf(insertActivity(OUTRA, otherChallengeId, musculacao, 30))).toBeNull();
  });
});
