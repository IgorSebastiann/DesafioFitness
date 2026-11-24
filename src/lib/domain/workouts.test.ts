import { describe, expect, it } from "vitest";
import {
  brzycki,
  buildSteps,
  clock,
  epley,
  estimateOneRm,
  formatSeconds,
  loadForReps,
  prescription,
  sessionMinutes,
  weekdayList,
  weekdayOf,
  type WorkoutBlock,
} from "./workouts";

const item = (id: string, extra: Partial<WorkoutBlock["items"][number]> = {}) => ({
  id,
  exercise_id: `ex-${id}`,
  reps: 15,
  reps_scheme: null,
  duration_seconds: null,
  load_kg: null,
  rest_seconds: null,
  notes: null,
  ...extra,
});
const block = (kind: WorkoutBlock["kind"], items: WorkoutBlock["items"], extra: Partial<WorkoutBlock> = {}): WorkoutBlock => ({
  kind,
  title: null,
  sets: 3,
  rest_seconds: 60,
  notes: null,
  items,
  ...extra,
});

describe("prescrição", () => {
  it("mostra séries × alvo", () => {
    expect(prescription({ kind: "straight", sets: 3 }, { reps: 15, reps_scheme: null, duration_seconds: null })).toBe("3 × 15");
    expect(prescription({ kind: "alternating", sets: 3 }, { reps: null, reps_scheme: [6, 12], duration_seconds: null })).toBe("3 × 6/12");
    expect(prescription({ kind: "straight", sets: 3 }, { reps: null, reps_scheme: null, duration_seconds: 30 })).toBe("3 × 30 s");
    expect(prescription({ kind: "circuit", sets: 1 }, { reps: null, reps_scheme: null, duration_seconds: 20 })).toBe("20 s");
  });
  it("formata tempo", () => {
    expect(formatSeconds(45)).toBe("45 s");
    expect(formatSeconds(90)).toBe("1 min 30 s");
    expect(formatSeconds(120)).toBe("2 min");
    expect(clock(75)).toBe("1:15");
    expect(clock(-3)).toBe("0:00");
  });
});

describe("1RM", () => {
  it("Epley e Brzycki batem com as fórmulas", () => {
    expect(epley(100, 10)).toBeCloseTo(133.33, 1);
    expect(brzycki(100, 10)).toBeCloseTo(133.33, 1);
    expect(epley(80, 1)).toBe(80);
    expect(brzycki(80, 5)).toBeCloseTo(90, 0);
    expect(epley(0, 10)).toBe(0);
  });
  it("estimativa e carga sugerida são inversas (Epley)", () => {
    const orm = epley(60, 12);
    expect(loadForReps(orm, 12)).toBeCloseTo(60, 5);
    expect(estimateOneRm(60, 15)).toBeCloseTo(epley(60, 15), 5);
  });
});

describe("agenda", () => {
  it("dia da semana e lista em português", () => {
    expect(weekdayOf("2026-11-24")).toBe(2); // terça
    expect(weekdayList([5, 1, 3])).toBe("segunda, quarta e sexta");
    expect(weekdayList([0])).toBe("domingo");
  });
});

describe("ordem de execução", () => {
  it("bi-set alterna os exercícios e descansa ao fim de cada série", () => {
    const steps = buildSteps([block("biset", [item("a"), item("b")], { sets: 2 })]);
    expect(steps.map((s) => `${s.itemId}${s.setNumber}:${s.restAfter}`)).toEqual(["a1:0", "b1:60", "a2:0", "b2:0"]);
  });
  it("carga alternada vira 6 e 12 dentro da mesma série", () => {
    const steps = buildSteps([block("alternating", [item("r", { reps: null, reps_scheme: [6, 12] })], { sets: 2, rest_seconds: 90 })]);
    expect(steps.map((s) => `${s.setNumber}.${s.step}=${s.targetReps}:${s.restAfter}`)).toEqual(["1.1=6:0", "1.2=12:90", "2.1=6:0", "2.2=12:0"]);
  });
  it("circuito usa tempo e não registra repetições; aquecimento não gera passos", () => {
    const steps = buildSteps([
      block("warmup", [], { title: "Mobilidade", sets: 1 }),
      block("circuit", [item("x", { reps: null, duration_seconds: 20 }), item("y", { reps: null, duration_seconds: 20 })], { sets: 1, rest_seconds: 0 }),
    ]);
    expect(steps.map((s) => [s.itemId, s.targetReps, s.targetSeconds, s.blockIndex])).toEqual([
      ["x", null, 20, 1],
      ["y", null, 20, 1],
    ]);
  });
  it("descanso do exercício vale sobre o do bloco", () => {
    const steps = buildSteps([block("straight", [item("s", { rest_seconds: 120 })], { sets: 2 })]);
    expect(steps.map((s) => s.restAfter)).toEqual([120, 0]);
  });
});

it("minutos do treino", () => {
  expect(sessionMinutes("2026-11-24T10:00:00Z", "2026-11-24T10:41:20Z")).toBe(41);
  expect(sessionMinutes("2026-11-24T10:00:00Z", "2026-11-24T10:00:10Z")).toBe(1);
});
