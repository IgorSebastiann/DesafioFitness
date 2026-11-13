/**
 * Testes das regras do backend executadas contra PostgreSQL real (PGlite).
 * Cada cenário roda com a identidade de um usuário autenticado, como no Supabase.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createDb, errorOf } from "./harness";
import { addDays, weekRange } from "../../src/lib/domain/periods";
import { todayIso } from "../../src/lib/time";

const ANA = "11111111-1111-1111-1111-111111111111";
const BRUNO = "22222222-2222-2222-2222-222222222222";
const CARLA = "33333333-3333-3333-3333-333333333333"; // não participa do desafio

const TODAY = todayIso();
const YESTERDAY = addDays(TODAY, -1);
const TOMORROW = addDays(TODAY, 1);
const PAST_A = addDays(TODAY, -21); // semana já encerrada
const PAST_B = addDays(TODAY, -28); // semana já encerrada (anterior)

let db: PGlite;
let challengeId: string;
let corridaId: string;
let musculacaoId: string;
let corridaCategory: string;
let musculacaoCategory: string;
let bicicletaCategory: string;

/** Consulta como superusuário (ignora RLS) — para verificar o estado real. */
async function su<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}

/** Consulta como um usuário autenticado (RLS aplicada). */
async function as<T = Record<string, unknown>>(userId: string, sql: string, params: unknown[] = []): Promise<T[]> {
  return asUser(db, userId, async () => (await db.query<T>(sql, params)).rows);
}

async function insertActivity(
  userId: string,
  opts: {
    category: string;
    date: string;
    time?: string;
    duration?: number;
    extra?: Record<string, unknown>;
  },
) {
  const cols: Record<string, unknown> = {
    challenge_id: challengeId,
    user_id: userId,
    category_id: opts.category,
    activity_date: opts.date,
    activity_time: opts.time ?? "07:00",
    duration_minutes: opts.duration ?? 30,
    proof_path: `proofs/${userId}/${crypto.randomUUID()}.jpg`,
    proof_kind: "image",
    ...(opts.extra ?? {}),
  };
  const keys = Object.keys(cols);
  const sql = `insert into activities (${keys.join(",")}) values (${keys.map((_, i) => `$${i + 1}`).join(",")}) returning id`;
  return asUser(db, userId, async () => (await db.query<{ id: string }>(sql, Object.values(cols))).rows[0]!.id);
}

beforeAll(async () => {
  db = await createDb();

  await su(
    `insert into users (id, name, email) values
       ($1, 'Ana', 'ana@teste.local'),
       ($2, 'Bruno', 'bruno@teste.local'),
       ($3, 'Carla', 'carla@teste.local')`,
    [ANA, BRUNO, CARLA],
  );

  const [ch] = await su<{ id: string }>(
    `insert into challenges (name, daily_point_limit, starts_on) values ('Desafio do casal', 2, $1) returning id`,
    [addDays(TODAY, -35)],
  );
  challengeId = ch.id;
  await su(`insert into challenge_participants (challenge_id, user_id) values ($1,$2), ($1,$3)`, [
    challengeId,
    ANA,
    BRUNO,
  ]);

  const cats = await su<{ id: string; name: string }>(`select id, name from activity_categories`);
  corridaCategory = cats.find((c) => c.name === "Corrida")!.id;
  musculacaoCategory = cats.find((c) => c.name === "Musculação")!.id;
  bicicletaCategory = cats.find((c) => c.name === "Bicicleta")!.id;
});

afterAll(async () => {
  await db?.close();
});

describe("perfis e participantes", () => {
  it("cria o perfil automaticamente com o nome informado no cadastro", async () => {
    const [p] = await su<{ display_name: string; role: string }>(
      `select display_name, role from profiles where id = $1`,
      [ANA],
    );
    expect(p).toEqual({ display_name: "Ana", role: "member" });
  });

  it("impede um terceiro participante no mesmo desafio", async () => {
    const err = await errorOf(
      su(`insert into challenge_participants (challenge_id, user_id) values ($1, $2)`, [challengeId, CARLA]),
    );
    expect(err).toContain("já possui 2 participantes");
  });

  it("impede que um usuário altere o próprio papel para admin", async () => {
    const err = await errorOf(
      as(ANA, `update profiles set role = 'admin' where id = $1`, [ANA]),
    );
    expect(err).toContain("Somente administradores podem alterar papéis");
    const [p] = await su<{ role: string }>(`select role from profiles where id = $1`, [ANA]);
    expect(p.role).toBe("member");
  });
});

describe("registro de atividades", () => {
  it("nasce pendente com 0 pontos, mesmo se o cliente enviar status e pontos", async () => {
    corridaId = await insertActivity(ANA, {
      category: corridaCategory,
      date: YESTERDAY,
      time: "07:00",
      duration: 30,
      extra: { status: "approved", points_awarded: 9 },
    });
    const [a] = await su<{ status: string; points_awarded: number }>(
      `select status, points_awarded from activities where id = $1`,
      [corridaId],
    );
    expect(a).toEqual({ status: "pending", points_awarded: 0 });
  });

  it("não permite registrar atividade em nome de outro participante", async () => {
    const err = await errorOf(
      insertActivity(ANA, {
        category: musculacaoCategory,
        date: YESTERDAY,
        extra: { user_id: BRUNO, proof_path: `proofs/${BRUNO}/x.jpg` },
      }),
    );
    // A política de INSERT (RLS) bloqueia antes do trigger; ambas barram a operação.
    expect(err).toMatch(/row-level security|Você só pode registrar as próprias atividades/);
  });

  it("não permite a mesma atividade duas vezes (modalidade + data + horário)", async () => {
    const err = await errorOf(
      insertActivity(ANA, { category: corridaCategory, date: YESTERDAY, time: "07:00" }),
    );
    expect(err).toContain("já foi registrada");
  });

  it("valida a duração mínima da modalidade", async () => {
    const err = await errorOf(
      insertActivity(ANA, { category: corridaCategory, date: YESTERDAY, time: "08:00", duration: 10 }),
    );
    expect(err).toContain("Duração mínima para Corrida é de 15 minutos");
  });

  it("não permite datas futuras", async () => {
    const err = await errorOf(
      insertActivity(ANA, { category: corridaCategory, date: TOMORROW, time: "07:00" }),
    );
    expect(err).toContain("datas futuras");
  });

  it("não permite que a comprovação esteja fora da pasta do usuário", async () => {
    const err = await errorOf(
      insertActivity(ANA, {
        category: corridaCategory,
        date: YESTERDAY,
        time: "09:00",
        extra: { proof_path: `proofs/${BRUNO}/foto.jpg` },
      }),
    );
    expect(err).toContain("Comprovação inválida");
  });

  it("aplica o limite diário de 2 pontos", async () => {
    // Corrida (1 pt) já existe; Musculação (1 pt) chega ao limite.
    musculacaoId = await insertActivity(ANA, {
      category: musculacaoCategory,
      date: YESTERDAY,
      time: "18:00",
      duration: 30,
    });
    const err = await errorOf(
      insertActivity(ANA, { category: bicicletaCategory, date: YESTERDAY, time: "19:00", duration: 30 }),
    );
    expect(err).toContain("Limite diário de 2 pontos atingido");
  });
});

describe("validação e aprovação", () => {
  it("o próprio dono não pode aprovar a própria atividade", async () => {
    const err = await errorOf(
      as(ANA, `update activities set status = 'approved' where id = $1`, [corridaId]),
    );
    expect(err).toContain("Você não pode aprovar ou contestar a própria atividade");
  });

  it("usuário fora do desafio não vê nem altera as atividades", async () => {
    const visible = await as(CARLA, `select id from activities`);
    expect(visible).toHaveLength(0);
    await as(CARLA, `update activities set status = 'approved' where id = $1`, [corridaId]);
    const [a] = await su<{ status: string }>(`select status from activities where id = $1`, [corridaId]);
    expect(a.status).toBe("pending");
  });

  it("o outro participante aprova: vira aprovada, conta 1 ponto e registra quem aprovou", async () => {
    await as(BRUNO, `update activities set status = 'approved' where id = $1`, [corridaId]);
    const [a] = await su<{ status: string; points_awarded: number; reviewed_by: string }>(
      `select status, points_awarded, reviewed_by from activities where id = $1`,
      [corridaId],
    );
    expect(a).toMatchObject({ status: "approved", points_awarded: 1, reviewed_by: BRUNO });
    const history = await su(`select decision from activity_approvals where activity_id = $1`, [corridaId]);
    expect(history).toEqual([{ decision: "approved" }]);
  });

  it("o revisor não pode alterar dados da atividade, apenas decidir", async () => {
    const err = await errorOf(
      as(BRUNO, `update activities set duration_minutes = 90, status = 'approved' where id = $1`, [musculacaoId]),
    );
    expect(err).toContain("Você só pode aprovar ou contestar esta atividade");
  });

  it("contestar (rejeitar) zera os pontos e registra a observação", async () => {
    await as(BRUNO, `update activities set status = 'rejected', review_note = 'Vídeo não mostra o treino' where id = $1`, [
      musculacaoId,
    ]);
    const [a] = await su<{ status: string; points_awarded: number; review_note: string }>(
      `select status, points_awarded, review_note from activities where id = $1`,
      [musculacaoId],
    );
    expect(a).toEqual({ status: "rejected", points_awarded: 0, review_note: "Vídeo não mostra o treino" });
  });

  it("atividade já avaliada não pode mais ser editada pelo dono", async () => {
    const err = await errorOf(
      as(ANA, `update activities set duration_minutes = 60 where id = $1`, [corridaId]),
    );
    expect(err).toContain("Atividade já avaliada não pode ser editada");
  });

  it("atividade rejeitada não conta no limite diário", async () => {
    // Corrida aprovada (1) + Musculação rejeitada (0) → ainda cabe Bicicleta (total 2).
    const id = await insertActivity(ANA, {
      category: bicicletaCategory,
      date: YESTERDAY,
      time: "19:00",
      duration: 30,
    });
    expect(id).toBeTruthy();
  });

  it("o cliente não consegue forjar pontos por update do próprio dono", async () => {
    const bikeRows = await su<{ id: string }>(
      `select id from activities where user_id = $1 and status = 'pending' and category_id = $2`,
      [ANA, bicicletaCategory],
    );
    await as(ANA, `update activities set points_awarded = 50, description = 'treino' where id = $1`, [bikeRows[0].id]);
    const [a] = await su<{ points_awarded: number }>(`select points_awarded from activities where id = $1`, [bikeRows[0].id]);
    expect(a.points_awarded).toBe(0);
  });

  it("identificação e comprovação não podem ser trocadas", async () => {
    const err = await errorOf(
      as(ANA, `update activities set user_id = $1 where id = $2`, [BRUNO, corridaId]),
    );
    expect(err).toMatch(/Identificação|permissão|policy/i);
  });
});

describe("notificações, conquistas e auditoria", () => {
  it("o outro participante recebe aviso de atividade cadastrada", async () => {
    const rows = await su(`select id from notifications where user_id = $1 and kind = 'activity_created'`, [BRUNO]);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("o dono recebe aviso de aprovação e de contestação", async () => {
    const approved = await su(`select id from notifications where user_id = $1 and kind = 'activity_approved'`, [ANA]);
    const rejected = await su(`select id from notifications where user_id = $1 and kind = 'activity_rejected'`, [ANA]);
    expect(approved.length).toBeGreaterThan(0);
    expect(rejected.length).toBeGreaterThan(0);
  });

  it("notificações são lidas apenas pelo próprio dono", async () => {
    const seenByCarla = await as(CARLA, `select id from notifications`);
    expect(seenByCarla).toHaveLength(0);
    const seenByBruno = await as(BRUNO, `select id from notifications where user_id = $1`, [ANA]);
    expect(seenByBruno).toHaveLength(0);
  });

  it("conquistas: primeira atividade e primeira corrida foram desbloqueadas", async () => {
    const rows = await su<{ achievement_code: string }>(
      `select achievement_code from user_achievements where user_id = $1 order by achievement_code`,
      [ANA],
    );
    const codes = rows.map((r) => r.achievement_code);
    expect(codes).toContain("first_activity");
    expect(codes).toContain("first_run");
  });

  it("mudança de liderança gera aviso para o casal", async () => {
    const rows = await su(`select id from notifications where kind = 'leadership_change'`);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("auditoria registra alterações, mas só admin consegue ler", async () => {
    const all = await su(`select id from audit_logs where table_name = 'activities'`);
    expect(all.length).toBeGreaterThan(0);
    const asMember = await as(ANA, `select id from audit_logs`);
    expect(asMember).toHaveLength(0);
  });
});

describe("ranking e isolamento de dados", () => {
  it("ranking semanal soma somente atividades aprovadas", async () => {
    const w = weekRange(TODAY);
    // Mesmo SQL do supabase.rpc('standings'). Executado como superusuário: o teste
    // valida a regra de soma (apenas aprovadas); o isolamento por RLS é coberto em outros testes.
    const rows = await su<{ user_id: string; points: string }>(
      `select user_id, display_name, nickname, avatar_path, points, activity_count
         from standings($1, $2, $3)`,
      [challengeId, w.start, w.end],
    );
    const points = Object.fromEntries(rows.map((r) => [r.user_id, Number(r.points)]));
    // Corrida de ontem aprovada pode cair na mesma semana ou na anterior; o total do casal não passa de 1.
    expect(points[ANA] ?? 0).toBeLessThanOrEqual(1);
    expect(points[BRUNO] ?? 0).toBe(0);
  });

});

describe("fechamento de períodos", () => {
  it("não fecha período em andamento", async () => {
    const err = await errorOf(su(`select close_period($1, 'weekly', $2)`, [challengeId, TODAY]));
    expect(err).toContain("ainda está em andamento");
  });

  it("quem não participa do desafio não pode fechar período", async () => {
    const err = await errorOf(as(CARLA, `select close_period($1, 'weekly', $2)`, [challengeId, PAST_A]));
    expect(err).toContain("Você não participa deste desafio");
  });

  it("vencedor único: quem tem mais pontos aprovados na semana encerrada", async () => {
    // Semana PAST_A: Ana tem duas atividades aprovadas por Bruno; Bruno nenhuma.
    const c1 = await insertActivity(ANA, { category: corridaCategory, date: PAST_A, time: "07:00" });
    const c2 = await insertActivity(ANA, { category: musculacaoCategory, date: PAST_A, time: "18:00" });
    await as(BRUNO, `update activities set status = 'approved' where id = $1`, [c1]);
    await as(BRUNO, `update activities set status = 'approved' where id = $1`, [c2]);

    const closed = await su<{ close_period: boolean }>(`select close_period($1, 'weekly', $2)`, [challengeId, PAST_A]);
    expect(closed[0].close_period).toBe(true);

    const rows = await su<{ user_id: string; is_winner: boolean; is_tie: boolean; points: number }>(
      `select user_id, is_winner, is_tie, points from weekly_results where challenge_id = $1 and period_start = date_trunc('week', $2::date)::date`,
      [challengeId, PAST_A],
    );
    const ana = rows.find((r) => r.user_id === ANA)!;
    const bruno = rows.find((r) => r.user_id === BRUNO)!;
    expect(ana).toMatchObject({ is_winner: true, is_tie: false, points: 2 });
    expect(bruno).toMatchObject({ is_winner: false, is_tie: false, points: 0 });
  });

  it("é idempotente: fechar o mesmo período de novo não duplica nada", async () => {
    const again = await su<{ close_period: boolean }>(`select close_period($1, 'weekly', $2)`, [challengeId, PAST_A]);
    expect(again[0].close_period).toBe(false);
  });

  it("empate: mesma pontuação positiva gera empate e nenhum vencedor", async () => {
    // Semana PAST_B: Ana aprova uma atividade de Bruno e Bruno aprova uma de Ana.
    const anaAct = await insertActivity(ANA, { category: corridaCategory, date: PAST_B, time: "07:00" });
    await as(BRUNO, `update activities set status = 'approved' where id = $1`, [anaAct]);
    const brunoAct = await insertActivity(BRUNO, { category: musculacaoCategory, date: PAST_B, time: "18:00" });
    await as(ANA, `update activities set status = 'approved' where id = $1`, [brunoAct]);

    await su(`select close_period($1, 'weekly', $2)`, [challengeId, PAST_B]);
    const rows = await su<{ is_winner: boolean; is_tie: boolean }>(
      `select is_winner, is_tie from weekly_results where challenge_id = $1 and period_start = date_trunc('week', $2::date)::date`,
      [challengeId, PAST_B],
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.is_tie && !r.is_winner)).toBe(true);
  });

  it("a rotina automática fecha períodos pendentes e não repete fechamentos", async () => {
    const first = await su<{ close_due_periods: number }>(`select close_due_periods()`);
    expect(first[0].close_due_periods).toBeGreaterThan(0);
    const second = await su<{ close_due_periods: number }>(`select close_due_periods()`);
    expect(second[0].close_due_periods).toBe(0);
  });

  it("o histórico permanece: zerar o placar não apaga atividades", async () => {
    const count = await su(`select id from activities where challenge_id = $1`, [challengeId]);
    expect(count.length).toBeGreaterThan(0);
  });
});
