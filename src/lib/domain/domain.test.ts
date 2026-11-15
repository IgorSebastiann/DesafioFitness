import { describe, expect, it } from "vitest";
import { validateActivityRules, validPointsFor, type ActivityRuleInput } from "./rules";
import { gap, rank } from "./ranking";
import {
  activeDays,
  addDays,
  currentStreak,
  determineOutcome,
  longestStreak,
  monthRange,
  weekRange,
} from "./periods";

const base: ActivityRuleInput = {
  categoryName: "Corrida",
  categoryActive: true,
  categoryPoints: 1,
  minDurationMinutes: 15,
  durationMinutes: 30,
  dailyPointLimit: 2,
  pointsUsedToday: 0,
  activityDate: "2026-11-10",
  today: "2026-11-12",
  isDuplicate: false,
};

describe("validateActivityRules", () => {
  it("aceita atividade válida", () => {
    expect(validateActivityRules(base)).toEqual({ ok: true });
  });

  it("bloqueia modalidade inativa", () => {
    const r = validateActivityRules({ ...base, categoryActive: false });
    expect(r).toMatchObject({ ok: false, code: "CATEGORY_INACTIVE" });
  });

  it("bloqueia data futura", () => {
    const r = validateActivityRules({ ...base, activityDate: "2026-11-13" });
    expect(r).toMatchObject({ ok: false, code: "FUTURE_DATE" });
  });

  it("aceita a data de hoje", () => {
    expect(validateActivityRules({ ...base, activityDate: "2026-11-12" })).toEqual({ ok: true });
  });

  it("bloqueia duplicidade", () => {
    const r = validateActivityRules({ ...base, isDuplicate: true });
    expect(r).toMatchObject({ ok: false, code: "DUPLICATE" });
  });

  it("bloqueia duração abaixo do mínimo e informa o valor", () => {
    const r = validateActivityRules({ ...base, durationMinutes: 14 });
    expect(r).toMatchObject({ ok: false, code: "MIN_DURATION" });
    if (!r.ok) expect(r.message).toContain("15 minutos");
  });

  it("aceita duração exatamente igual ao mínimo", () => {
    expect(validateActivityRules({ ...base, durationMinutes: 15 })).toEqual({ ok: true });
  });

  it("bloqueia quando o limite diário seria ultrapassado", () => {
    const r = validateActivityRules({ ...base, pointsUsedToday: 2 });
    expect(r).toMatchObject({ ok: false, code: "DAILY_LIMIT" });
  });

  it("permite a segunda atividade do dia (chega exatamente ao limite)", () => {
    expect(validateActivityRules({ ...base, pointsUsedToday: 1 })).toEqual({ ok: true });
  });
});

describe("validPointsFor", () => {
  it("só conta pontos quando aprovada", () => {
    expect(validPointsFor("approved", 1)).toBe(1);
    expect(validPointsFor("pending", 1)).toBe(0);
    expect(validPointsFor("rejected", 1)).toBe(0);
  });
});

describe("weekRange", () => {
  it("começa na segunda e termina no domingo (quinta 12/11/2026)", () => {
    expect(weekRange("2026-11-12")).toEqual({ start: "2026-11-09", end: "2026-11-15" });
  });

  it("segunda-feira é o início da própria semana", () => {
    expect(weekRange("2026-11-09")).toEqual({ start: "2026-11-09", end: "2026-11-15" });
  });

  it("domingo pertence à semana que começou na segunda anterior", () => {
    expect(weekRange("2026-11-15")).toEqual({ start: "2026-11-09", end: "2026-11-15" });
  });

  it("atravessa a virada do mês sem erro", () => {
    expect(weekRange("2026-10-01")).toEqual({ start: "2026-09-28", end: "2026-10-04" });
  });
});

describe("monthRange", () => {
  it("cobre do dia 1 ao último dia", () => {
    expect(monthRange("2026-11-12")).toEqual({ start: "2026-11-01", end: "2026-11-30" });
  });

  it("respeita fevereiro bissexto", () => {
    expect(monthRange("2028-02-10")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
  });
});

describe("determineOutcome", () => {
  it("define vencedor quando há um líder único", () => {
    expect(
      determineOutcome([
        { userId: "a", points: 5 },
        { userId: "b", points: 3 },
      ]),
    ).toEqual({ kind: "winner", userId: "a" });
  });

  it("exibe empate quando a pontuação é igual e positiva", () => {
    expect(
      determineOutcome([
        { userId: "a", points: 4 },
        { userId: "b", points: 4 },
      ]),
    ).toEqual({ kind: "tie", userIds: ["a", "b"] });
  });

  it("sem pontuação não há vencedor nem empate", () => {
    expect(
      determineOutcome([
        { userId: "a", points: 0 },
        { userId: "b", points: 0 },
      ]),
    ).toEqual({ kind: "none" });
  });
});

describe("longestStreak e activeDays", () => {
  it("calcula a maior sequência de dias consecutivos", () => {
    expect(longestStreak(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-05", "2026-11-06"])).toBe(3);
  });

  it("ignora datas duplicadas e desordenadas", () => {
    expect(longestStreak(["2026-11-03", "2026-11-01", "2026-11-02", "2026-11-02"])).toBe(3);
  });

  it("atravessa virada de mês e de ano", () => {
    expect(longestStreak(["2026-12-31", "2027-01-01"])).toBe(2);
  });

  it("lista vazia tem sequência zero", () => {
    expect(longestStreak([])).toBe(0);
  });

  it("conta dias ativos distintos", () => {
    expect(activeDays(["2026-11-01", "2026-11-01", "2026-11-02"])).toBe(2);
  });

  it("addDays funciona com saltos de mês", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });
});


describe("rank", () => {
  it("ordena e atribui posição competitiva", () => {
    const r = rank([
      { userId: "a", points: 3 },
      { userId: "b", points: 5 },
    ]);
    expect(r[0]).toMatchObject({ userId: "b", position: 1, tiedWithOther: false });
    expect(r[1]).toMatchObject({ userId: "a", position: 2 });
  });

  it("empate compartilha a posição e sinaliza o empate", () => {
    const r = rank([
      { userId: "a", points: 4 },
      { userId: "b", points: 4 },
    ]);
    expect(r.map((e) => e.position)).toEqual([1, 1]);
    expect(r.every((e) => e.tiedWithOther)).toBe(true);
  });

  it("zero pontos em empate não é marcado como empate de disputa", () => {
    const r = rank([
      { userId: "a", points: 0 },
      { userId: "b", points: 0 },
    ]);
    expect(r.every((e) => !e.tiedWithOther)).toBe(true);
  });
});

describe("gap", () => {
  it("retorna a diferença e o líder", () => {
    expect(
      gap([
        { userId: "a", points: 2 },
        { userId: "b", points: 7 },
      ]),
    ).toEqual({ diff: 5, leaderId: "b" });
  });

  it("empate não tem líder", () => {
    expect(
      gap([
        { userId: "a", points: 2 },
        { userId: "b", points: 2 },
      ]),
    ).toEqual({ diff: 0, leaderId: null });
  });
});

describe("currentStreak", () => {
  it("conta os dias seguidos até hoje", () => {
    expect(currentStreak(["2026-11-12", "2026-11-13", "2026-11-14"], "2026-11-14")).toBe(3);
  });

  it("sem atividade hoje, a sequência ainda vale até ontem", () => {
    expect(currentStreak(["2026-11-12", "2026-11-13"], "2026-11-14")).toBe(2);
  });

  it("um dia em branco antes de ontem zera a sequência", () => {
    expect(currentStreak(["2026-11-10", "2026-11-11"], "2026-11-14")).toBe(0);
  });
});
