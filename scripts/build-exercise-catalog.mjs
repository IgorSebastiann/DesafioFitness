#!/usr/bin/env node
/**
 * Gera db/migrations/0014_exercise_catalog.sql a partir de db/data/exercises/*.json.
 *
 * Os textos vêm do free-exercise-db (https://github.com/yuhonas/free-exercise-db, Unlicense,
 * domínio público), traduzidos e adaptados para pt-BR; os marcados "own" foram escritos aqui.
 * A migration usa `on conflict do nothing`: reaplicar não sobrescreve edições do admin.
 *
 * Uso: node scripts/build-exercise-catalog.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DATA = join(ROOT, "db", "data", "exercises");
const OUT = join(ROOT, "db", "migrations", "0014_exercise_catalog.sql");

const MUSCLES = new Set([
  "chest", "front_delts", "side_delts", "rear_delts", "biceps", "triceps", "forearms", "abs", "obliques",
  "traps", "lats", "middle_back", "lower_back", "glutes", "quadriceps", "hamstrings", "adductors", "abductors", "calves",
]);
const EQUIPMENT = new Set([
  "barbell", "dumbbell", "machine", "cable", "body_weight", "band", "kettlebell", "ez_bar", "smith", "bench",
  "medicine_ball", "exercise_ball", "foam_roll", "other",
]);
const LEVELS = new Set(["beginner", "intermediate", "advanced"]);
const MECHANICS = new Set(["compound", "isolation"]);
const CATEGORIES = new Set(["strength", "stretching", "cardio", "plyometrics", "mobility"]);

const files = readdirSync(DATA).filter((f) => f.endsWith(".json")).sort();
const exercises = files.flatMap((f) => JSON.parse(readFileSync(join(DATA, f), "utf8")));

const errors = [];
const slugs = new Set();
const names = new Set();
for (const e of exercises) {
  const where = e.slug ?? e.name ?? "?";
  const fail = (msg) => errors.push(`${where}: ${msg}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.slug ?? "") || e.slug.length > 80) fail("slug inválido");
  if (slugs.has(e.slug)) fail("slug repetido");
  slugs.add(e.slug);
  if (typeof e.name !== "string" || e.name.length < 3 || e.name.length > 80) fail("nome inválido");
  if (names.has(e.name)) fail("nome repetido");
  names.add(e.name);
  if (!MUSCLES.has(e.primary_muscle)) fail(`músculo principal ${e.primary_muscle}`);
  for (const m of e.secondary_muscles ?? []) if (!MUSCLES.has(m) || m === e.primary_muscle) fail(`secundário ${m}`);
  if (new Set(e.secondary_muscles).size !== (e.secondary_muscles ?? []).length) fail("secundário repetido");
  if (!EQUIPMENT.has(e.equipment)) fail(`equipamento ${e.equipment}`);
  if (!LEVELS.has(e.level)) fail(`nível ${e.level}`);
  if (!MECHANICS.has(e.mechanic)) fail(`mecânica ${e.mechanic}`);
  if (!CATEGORIES.has(e.category)) fail(`categoria ${e.category}`);
  if (!Array.isArray(e.steps) || e.steps.length < 1 || e.steps.length > 15) fail("passos");
  if (!Array.isArray(e.common_mistakes) || e.common_mistakes.length > 10) fail("erros comuns");
  if (!Array.isArray(e.tips) || e.tips.length > 10) fail("dicas");
  if (!["free-exercise-db", "own"].includes(e.text_source)) fail("origem do texto");
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const arr = (xs) => (xs.length ? `array[${xs.map(q).join(", ")}]::text[]` : "'{}'::text[]");

let sql = `-- 0014 · Catálogo inicial de exercícios (${exercises.length}), em pt-BR.
-- GERADO por scripts/build-exercise-catalog.mjs a partir de db/data/exercises/*.json — não edite à mão.
-- Textos: free-exercise-db (Unlicense, domínio público), traduzidos e adaptados; "own" = escritos para o app.
-- Idempotente e não destrutivo: exercício que já existe (mesmo slug ou nome) fica como está.

`;
for (const e of exercises) {
  sql += `insert into public.exercises (slug, name, name_en, primary_muscle, equipment, level, mechanic, category, steps, common_mistakes, tips, text_source)
values (${[q(e.slug), q(e.name), q(e.name_en), q(e.primary_muscle), q(e.equipment), q(e.level), q(e.mechanic), q(e.category), arr(e.steps), arr(e.common_mistakes), arr(e.tips), q(e.text_source)].join(", ")})
on conflict do nothing;
`;
  if (e.secondary_muscles.length) {
    sql += `insert into public.exercise_secondary_muscles (exercise_id, muscle)
select e.id, m from public.exercises e, unnest(${arr(e.secondary_muscles)}) as m
 where e.slug = ${q(e.slug)} and m <> e.primary_muscle
on conflict do nothing;
`;
  }
  sql += "\n";
}

writeFileSync(OUT, sql);
console.log(`${exercises.length} exercícios → ${OUT}`);
