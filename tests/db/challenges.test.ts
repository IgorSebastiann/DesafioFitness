/**
 * Regras de desafio criado pelos participantes, convites e notificações (migration 0006).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createDb, errorOf } from "./harness";

const LUIZA = "44444444-4444-4444-4444-444444444444";
const MARCOS = "55555555-5555-5555-5555-555555555555";
const TERCEIRO = "66666666-6666-6666-6666-666666666666";

let db: PGlite;
let token: string;
let challengeId: string;

async function su<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}
async function as<T = Record<string, unknown>>(uid: string, sql: string, params: unknown[] = []): Promise<T[]> {
  return asUser(db, uid, async () => (await db.query<T>(sql, params)).rows);
}

beforeAll(async () => {
  db = await createDb();
  await su(
    `insert into users (id, name, email) values
       ($1, 'Luiza', 'luiza@teste.local'),
       ($2, 'Marcos', 'marcos@teste.local'),
       ($3, 'Terceiro', 'terceiro@teste.local')`,
    [LUIZA, MARCOS, TERCEIRO],
  );
});

afterAll(async () => {
  await db?.close();
});

describe("criação de desafio pelo próprio usuário", () => {
  it("qualquer usuário cria o desafio e entra automaticamente", async () => {
    const [row] = await as<{ id: string }>(LUIZA, `select create_challenge('Casal 2027', 2, current_date) as id`);
    challengeId = row.id;
    const members = await su(`select user_id from challenge_participants where challenge_id = $1`, [challengeId]);
    expect(members).toEqual([{ user_id: LUIZA }]);
  });

  it("a mesma pessoa não cria um segundo desafio", async () => {
    const err = await errorOf(as(LUIZA, `select create_challenge('Outro desafio', 2, current_date)`));
    expect(err).toContain("Você já participa de um desafio");
  });

  it("valida o nome e o limite diário", async () => {
    const err = await errorOf(as(TERCEIRO, `select create_challenge('ab', 2, current_date)`));
    expect(err).toContain("entre 3 e 80");
    const err2 = await errorOf(as(TERCEIRO, `select create_challenge('Desafio X', 11, current_date)`));
    expect(err2).toContain("entre 0 e 10");
  });

  it("o criador pode alterar o próprio desafio, mas quem não participa não", async () => {
    await as(LUIZA, `update challenges set name = 'Casal 2027 (novo nome)' where id = $1`, [challengeId]);
    const [c] = await su<{ name: string }>(`select name from challenges where id = $1`, [challengeId]);
    expect(c.name).toBe("Casal 2027 (novo nome)");
    await as(MARCOS, `update challenges set name = 'invasão' where id = $1`, [challengeId]);
    const [after] = await su<{ name: string }>(`select name from challenges where id = $1`, [challengeId]);
    expect(after.name).toBe("Casal 2027 (novo nome)");
  });
});

describe("convites", () => {
  it("só participante cria convite; não é possível convidar o próprio e-mail", async () => {
    const err = await errorOf(as(TERCEIRO, `select create_invitation($1, 'terceiro@teste.local')`, [challengeId]));
    expect(err).toContain("Você não participa deste desafio");
    const err2 = await errorOf(as(LUIZA, `select create_invitation($1, 'luiza@teste.local')`, [challengeId]));
    expect(err2).toContain("não o seu");
  });

  it("o criador gera o convite para o parceiro", async () => {
    const [row] = await as<{ create_invitation: string }>(LUIZA, `select create_invitation($1, 'Marcos@Teste.local') `, [
      challengeId,
    ]);
    token = row.create_invitation;
    expect(token).toMatch(/^[0-9a-f]{48}$/);
    const preview = await su<{ challenge_name: string; inviter_name: string; valid: boolean }>(
      `select challenge_name, inviter_name, valid from invitation_preview($1)`,
      [token],
    );
    expect(preview[0]).toMatchObject({ inviter_name: "Luiza", valid: true });
  });

  it("convite só pode ser aceito pelo e-mail convidado", async () => {
    const err = await errorOf(as(TERCEIRO, `select accept_invitation($1)`, [token]));
    expect(err).toContain("foi enviado para outro e-mail");
  });

  it("o convidado aceita: entra no desafio e a criadora recebe aviso", async () => {
    await as(MARCOS, `select accept_invitation($1)`, [token]);
    const members = await su(`select user_id from challenge_participants where challenge_id = $1 order by user_id`, [
      challengeId,
    ]);
    expect(members).toHaveLength(2);
    const aviso = await su(`select id from notifications where user_id = $1 and kind = 'invite_accepted'`, [LUIZA]);
    expect(aviso.length).toBeGreaterThan(0);
  });

  it("convite aceito não pode ser usado de novo", async () => {
    const preview = await su<{ valid: boolean }>(`select valid from invitation_preview($1)`, [token]);
    expect(preview[0].valid).toBe(false);
    const err = await errorOf(as(MARCOS, `select accept_invitation($1)`, [token]));
    expect(err).toMatch(/já participa|Convite inválido ou expirado/);
  });

  it("não é possível criar convite com o desafio já completo", async () => {
    const err = await errorOf(as(LUIZA, `select create_invitation($1, 'novo@teste.local')`, [challengeId]));
    expect(err).toContain("já tem 2 participantes");
  });
});

describe("notificações push (fila)", () => {
  it("notificações novas entram na fila de envio sem data de envio", async () => {
    const pending = await su(`select id from notifications where push_sent_at is null`);
    expect(pending.length).toBeGreaterThan(0);
  });

  it("assinatura de push só é visível para o próprio dono", async () => {
    await as(MARCOS, `select save_push_subscription('https://fcm.googleapis.com/fcm/send/abc', 'k', 'a')`);
    const bad = await errorOf(as(MARCOS, `select save_push_subscription('https://exemplo.com/x', 'k', 'a')`));
    expect(bad).toContain("não aceito");
    const mine = await as(MARCOS, `select id from push_subscriptions`);
    expect(mine).toHaveLength(1);
    const others = await as(LUIZA, `select id from push_subscriptions`);
    expect(others).toHaveLength(0);
  });
});
