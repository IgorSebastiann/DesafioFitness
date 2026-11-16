import { describe, expect, it } from "vitest";
import { computeRecap, type RecapActivity } from "./recap";

const act = (date: string, over: Partial<RecapActivity> = {}): RecapActivity => ({
  activity_date: date,
  activity_time: "18:00:00",
  duration_minutes: 30,
  distance_km: null,
  category_name: "Corrida",
  ...over,
});

describe("computeRecap", () => {
  it("mês vazio não tem curiosidades", () => {
    const r = computeRecap([]);
    expect(r.activities).toBe(0);
    expect(r.favorite).toBeNull();
    expect(r.earliest).toBeNull();
  });

  it("soma números e acha favorita, dia da semana, mais cedo e mais longa", () => {
    const r = computeRecap([
      act("2026-11-02", { distance_km: 5 }), // segunda
      act("2026-11-09", { activity_time: "06:15:00", distance_km: 7.25 }), // segunda
      act("2026-11-11", { category_name: "Yoga", duration_minutes: 90 }), // quarta
      act("2026-11-11", { category_name: "Corrida", activity_time: "19:00:00" }),
    ]);
    expect(r.activities).toBe(4);
    expect(r.minutes).toBe(180);
    expect(r.km).toBe(12.3);
    expect(r.activeDays).toBe(3);
    expect(r.favorite).toEqual({ name: "Corrida", count: 3 });
    expect(r.bestWeekday).toEqual({ name: "segunda", count: 2 });
    expect(r.earliest).toEqual({ time: "06:15", date: "2026-11-09" });
    expect(r.longest).toEqual({ minutes: 90, name: "Yoga", date: "2026-11-11" });
  });
});
