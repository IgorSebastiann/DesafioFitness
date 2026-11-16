import { describe, expect, it } from "vitest";
import { MISSIONS, missionForWeek, type MissionActivity } from "./missions";

const act = (date: string, over: Partial<MissionActivity> = {}): MissionActivity => ({
  activity_date: date,
  activity_time: "18:00",
  duration_minutes: 30,
  distance_km: null,
  category_name: "Corrida",
  ...over,
});
const mission = (code: string) => MISSIONS.find((m) => m.code === code)!;

describe("missionForWeek", () => {
  it("é a mesma para toda a semana e muda na seguinte", () => {
    expect(missionForWeek("2026-11-16").code).toBe(missionForWeek("2026-11-16").code);
    expect(missionForWeek("2026-11-16").code).not.toBe(missionForWeek("2026-11-23").code);
  });

  it("passa por todas as missões em sequência", () => {
    const codes = new Set<string>();
    let start = "2026-11-16";
    for (let i = 0; i < MISSIONS.length; i++) {
      codes.add(missionForWeek(start).code);
      const d = new Date(`${start}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 7);
      start = d.toISOString().slice(0, 10);
    }
    expect(codes.size).toBe(MISSIONS.length);
  });
});

describe("progresso das missões", () => {
  it("variedade conta modalidades distintas", () => {
    const items = [act("2026-11-16"), act("2026-11-17", { category_name: "Yoga" }), act("2026-11-18")];
    expect(mission("variedade").progress(items)).toBe(2);
  });

  it("sequência acha a maior série de dias seguidos", () => {
    const items = [act("2026-11-16"), act("2026-11-17"), act("2026-11-17"), act("2026-11-19")];
    expect(mission("sequencia").progress(items)).toBe(2);
  });

  it("madrugador conta treinos antes das 8h", () => {
    const items = [act("2026-11-16", { activity_time: "06:30:00" }), act("2026-11-17", { activity_time: "08:00:00" })];
    expect(mission("madrugador").progress(items)).toBe(1);
  });

  it("fim de semana exige sábado e domingo", () => {
    expect(mission("fim-de-semana").progress([act("2026-11-21"), act("2026-11-22")])).toBe(2);
    expect(mission("fim-de-semana").progress([act("2026-11-21"), act("2026-11-21")])).toBe(1);
  });

  it("distância soma os km com uma casa decimal", () => {
    const items = [act("2026-11-16", { distance_km: 4.25 }), act("2026-11-17", { distance_km: 3.1 })];
    expect(mission("distancia").progress(items)).toBe(7.4);
  });
});
