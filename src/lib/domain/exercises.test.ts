import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  MUSCLES,
  SOURCE_MUSCLE_MAP,
  creditParts,
  foldText,
  licenseLabel,
  licenseUrl,
  mediaByAngle,
  slugify,
  sortMedia,
  type MediaLike,
} from "./exercises";
import { drawFigure, viewsOf } from "../body-map/figures";

describe("músculos", () => {
  it("todo músculo da fonte vira um grupo do mapa", () => {
    const codes = new Set(MUSCLES.map((m) => m.code));
    for (const target of Object.values(SOURCE_MUSCLE_MAP)) expect(codes.has(target)).toBe(true);
    expect(Object.keys(SOURCE_MUSCLE_MAP)).toHaveLength(17);
  });

  it("cada grupo aparece no desenho em pelo menos uma vista, nos dois corpos", () => {
    for (const m of MUSCLES) {
      expect(viewsOf(m.code).length, m.code).toBeGreaterThan(0);
      for (const figure of ["male", "female"] as const) {
        const found = viewsOf(m.code).some((v) => drawFigure(figure, v).regions.some((r) => r.code === m.code && r.paths.length >= 2));
        expect(found, `${figure} ${m.code}`).toBe(true);
      }
    }
  });

  it("os caminhos do SVG são válidos e ficam dentro da área do desenho", () => {
    for (const figure of ["male", "female"] as const) {
      for (const view of ["front", "back"] as const) {
        const d = drawFigure(figure, view);
        for (const path of [...d.silhouette, ...d.regions.flatMap((r) => r.paths)]) {
          expect(path).toMatch(/^M[\d.-]+,[\d.-]+ C/);
          const nums = path.match(/-?\d+(\.\d+)?/g)!.map(Number);
          for (let i = 0; i < nums.length; i += 2) {
            expect(nums[i]).toBeGreaterThanOrEqual(-5);
            expect(nums[i]).toBeLessThanOrEqual(205);
          }
        }
      }
    }
  });
});

describe("texto", () => {
  it("busca ignora acento e maiúsculas", () => {
    expect(foldText("ELEVAÇÃO Pélvica")).toBe("elevacao pelvica");
  });

  it("slug sem acento, com hífens e até 80 caracteres", () => {
    expect(slugify("Supino Inclinado c/ Halteres (45°)")).toBe("supino-inclinado-c-halteres-45");
    expect(slugify("a".repeat(100))).toHaveLength(80);
  });
});

describe("mídias", () => {
  const m = (id: string, over: Partial<MediaLike>): MediaLike => ({
    id,
    kind: "image",
    angle: "side",
    position: 0,
    origin: "wger",
    is_primary: false,
    ...over,
  });

  it("própria primeiro, depois a principal, depois vídeo antes de imagem e a ordem", () => {
    const sorted = sortMedia([
      m("a", { position: 0 }),
      m("b", { kind: "video", position: 5 }),
      m("c", { is_primary: true, position: 9 }),
      m("d", { origin: "own", position: 3 }),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(["d", "c", "b", "a"]);
  });

  it("agrupa por ângulo pela melhor mídia de cada um", () => {
    const groups = mediaByAngle([m("a", { angle: "front" }), m("b", { angle: "side", origin: "own" }), m("c", { angle: "front", kind: "video" })]);
    expect(groups.map((g) => [g.angle, g.media.id])).toEqual([
      ["side", "b"],
      ["front", "c"],
    ]);
  });

  it("crédito: autor, licença e fonte; sem autor vira 'Contribuidores do wger'", () => {
    const base = { origin: "wger" as const, license: "cc_by_sa" as const, license_version: "4.0", is_edited: false };
    expect(creditParts({ ...base, author: "Goulart" })).toMatchObject({ author: "Goulart", license: "CC BY-SA 4.0", source: "wger" });
    expect(creditParts({ ...base, author: null }).author).toBe("Contribuidores do wger");
    expect(creditParts({ ...base, author: "X", is_edited: true }).edited).toMatch(/continua sob CC BY-SA 4.0/);
  });

  it("licenças com link para o texto oficial; própria sem link", () => {
    expect(licenseLabel("cc0")).toBe("CC0");
    expect(licenseUrl("cc_by", "4.0")).toBe("https://creativecommons.org/licenses/by/4.0/deed.pt-br");
    expect(licenseUrl("cc_by_sa", "3.0")).toContain("by-sa/3.0");
    expect(licenseUrl("own")).toBeNull();
  });
});

describe("catálogo (db/data/exercises)", () => {
  const dir = join(import.meta.dirname, "..", "..", "..", "db", "data", "exercises");
  const all = readdirSync(dir).flatMap((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Array<{ slug: string }>);

  it("tem todos os exercícios do treino do usuário", () => {
    const slugs = new Set(all.map((e) => e.slug));
    const treino = [
      "flexao-de-braco", "elevacao-lateral-com-halteres", "supino-reto-com-barra", "elevacao-frontal-com-halteres",
      "supino-inclinado-com-halteres", "flexao-militar", "voador-polia-alta", "triceps-coice-com-halteres",
      "agachamento-peso-do-corpo", "cadeira-extensora", "leg-press-45", "mesa-flexora", "agachamento-hack",
      "cadeira-abdutora", "panturrilha-em-pe", "remada-cavalinho", "puxada-alta", "remada-com-halteres",
      "crucifixo-invertido-com-halteres", "remada-baixa", "biceps-martelo", "elevacao-de-pernas-joelho-flexionado",
      "abdominal-crunch", "abdominal-remador", "prancha-abdominal",
    ];
    for (const s of treino) expect(slugs.has(s), s).toBe(true);
  });

  it("a migration 0014 está atualizada com o JSON", () => {
    const sql = readFileSync(join(dir, "..", "..", "migrations", "0014_exercise_catalog.sql"), "utf8");
    for (const e of all) expect(sql, e.slug).toContain(`'${e.slug}'`);
  });
});
