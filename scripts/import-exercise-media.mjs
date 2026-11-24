#!/usr/bin/env node
/**
 * Importa mídias de execução de fontes ABERTAS para o Blob público de mídias e para exercise_media.
 *
 * Fontes (nesta ordem) e o que é aceito:
 *  1. wger (API pública): imagens e vídeos com licença CC0, CC BY ou CC BY-SA. ODbL e imagens
 *     marcadas como geradas por IA ficam de fora.
 *  2. Everkinetic: ilustrações de início e fim do movimento (licença conferida em EVERKINETIC abaixo).
 *  3. Wikimedia Commons: só arquivos cuja licença na API seja CC0, CC BY ou CC BY-SA.
 * Mídia sem licença conhecida não entra (o banco também recusa, migration 0013).
 *
 * Idempotente: cada mídia tem uma chave de origem (source_key); o que já está no banco é pulado,
 * e os arquivos vão para caminhos fixos no Blob (exercises/{slug}/{source_key}.{ext}).
 *
 * Conversão: imagens → WebP (até 1080 px); GIF animado e vídeo → MP4 H.264 curto, sem som,
 * até 720 px e 10 s, com poster WebP. Usa o ffmpeg do pacote ffmpeg-static (ou FFMPEG_PATH).
 *
 * Uso:
 *   node scripts/import-exercise-media.mjs                    # simulação: só consulta as fontes e mostra o resumo
 *   node --env-file=.env.local scripts/import-exercise-media.mjs --apply
 *        (precisa de DATABASE_URL e MEDIA_READ_WRITE_TOKEN)
 *   Opções: --only=slug1,slug2   --sources=wger,everkinetic,wikimedia   --report=arquivo.md
 */
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const ROOT = join(import.meta.dirname, "..");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const APPLY = Boolean(args.apply);
const ONLY = args.only ? new Set(String(args.only).split(",")) : null;
const SOURCES = new Set(String(args.sources ?? "wger,everkinetic,wikimedia").split(","));
const UA = "DesafioFitness-media-import/1.0 (importação de mídias com licença aberta)";

/** Exercícios do treino do usuário: precisam de mídia ou entram na lista "falta gravar". */
const TRAINING = [
  "flexao-de-braco", "elevacao-lateral-com-halteres", "supino-reto-com-barra", "elevacao-frontal-com-halteres",
  "supino-inclinado-com-halteres", "flexao-militar", "voador-polia-alta", "triceps-coice-com-halteres",
  "agachamento-peso-do-corpo", "cadeira-extensora", "leg-press-45", "mesa-flexora", "agachamento-hack",
  "cadeira-abdutora", "panturrilha-em-pe", "remada-cavalinho", "puxada-alta", "remada-com-halteres",
  "crucifixo-invertido-com-halteres", "remada-baixa", "biceps-martelo", "elevacao-de-pernas-joelho-flexionado",
  "abdominal-crunch", "abdominal-remador", "prancha-abdominal",
];

// ---------------------------------------------------------------------------
// Licenças
// ---------------------------------------------------------------------------
/** wger: ids da tabela de licenças da API (/api/v2/license/). 5 = ODbL → recusada. */
const WGER_LICENSES = {
  1: { license: "cc_by_sa", version: "3.0" },
  2: { license: "cc_by_sa", version: "4.0" },
  3: { license: "cc0", version: "1.0" },
  4: { license: "cc_by", version: "4.0" },
};

/**
 * Everkinetic: licença conferida em 24/11/2026 em https://github.com/everkinetic/data/blob/main/LICENSE.md
 * ("Attribution-ShareAlike 4.0 International"; package.json "CC-BY-SA-4.0"). Autoria pelo README:
 * "Open data project based on http://everkinetic.com created by Greg Priday".
 */
const EVERKINETIC = {
  rawBase: "https://raw.githubusercontent.com/everkinetic/data/main/",
  pageBase: "https://github.com/everkinetic/data/blob/main/",
  license: "cc_by_sa",
  version: "4.0",
  author: "Greg Priday (Everkinetic)",
};

/** Commons: nome curto da licença na API → enum do banco. Qualquer outra é recusada. */
function commonsLicense(shortName) {
  const s = String(shortName ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  if (s === "CC0" || s.startsWith("CC0 ")) return { license: "cc0", version: "1.0" };
  const m = s.match(/^CC (BY|BY-SA) (\d\.\d)/);
  if (!m) return null;
  return { license: m[1] === "BY" ? "cc_by" : "cc_by_sa", version: m[2] };
}

const stripHtml = (s) => String(s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() || null;

// ---------------------------------------------------------------------------
// Catálogo e vínculos
// ---------------------------------------------------------------------------
const catalogDir = join(ROOT, "db", "data", "exercises");
const catalog = readdirSync(catalogDir)
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => JSON.parse(readFileSync(join(catalogDir, f), "utf8")));
const links = JSON.parse(readFileSync(join(ROOT, "db", "data", "exercise-sources.json"), "utf8"));
const exercises = catalog.filter((e) => !ONLY || ONLY.has(e.slug));

async function getJson(url) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (res.ok) return res.json();
    if (attempt >= 3 || (res.status !== 429 && res.status < 500)) throw new Error(`${res.status} em ${url}`);
    await new Promise((r) => setTimeout(r, 3000 * attempt));
  }
}

/**
 * Candidatos de mídia de um exercício: { sourceKey, origin, kind, angle, url, author, license,
 * version, sourceUrl, position, isMain }
 */
async function candidatesFor(slug, wgerCache) {
  const link = links[slug] ?? {};
  const out = [];
  const rejected = [];

  if (SOURCES.has("wger")) {
    for (const id of link.wger ?? []) {
      const info = wgerCache.get(id) ?? (await getJson(`https://wger.de/api/v2/exerciseinfo/${id}/?format=json`));
      wgerCache.set(id, info);
      const pageUrl = `https://wger.de/exercise/${id}/view-base`;
      for (const img of info.images ?? []) {
        const lic = WGER_LICENSES[img.license];
        if (!lic) rejected.push(`wger imagem ${img.id}: licença ${img.license} não permitida`);
        else if (img.is_ai_generated) rejected.push(`wger imagem ${img.id}: gerada por IA`);
        else
          out.push({
            sourceKey: `wger-image-${img.id}`,
            origin: "wger",
            kind: /\.gif$/i.test(img.image) ? "gif" : "image",
            angle: link.angles?.[`wger-image-${img.id}`] ?? "side",
            url: img.image,
            author: img.license_author?.trim() || null,
            ...lic,
            sourceUrl: pageUrl,
            isMain: Boolean(img.is_main),
          });
      }
      for (const vid of info.videos ?? []) {
        const lic = WGER_LICENSES[vid.license];
        if (!lic) rejected.push(`wger vídeo ${vid.id}: licença ${vid.license} não permitida`);
        else
          out.push({
            sourceKey: `wger-video-${vid.id}`,
            origin: "wger",
            kind: "video",
            angle: link.angles?.[`wger-video-${vid.id}`] ?? "side",
            url: vid.video,
            author: vid.license_author?.trim() || null,
            ...lic,
            sourceUrl: pageUrl,
            isMain: Boolean(vid.is_main),
          });
      }
    }
  }

  if (SOURCES.has("everkinetic")) {
    for (const item of link.everkinetic ?? []) {
      const file = typeof item === "string" ? item : item.file;
      out.push({
        sourceKey: `everkinetic-${file.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`.slice(0, 120),
        origin: "everkinetic",
        kind: /\.gif$/i.test(file) ? "gif" : "image",
        angle: item.angle ?? "side",
        url: EVERKINETIC.rawBase + file,
        author: EVERKINETIC.author,
        license: EVERKINETIC.license,
        version: EVERKINETIC.version,
        sourceUrl: EVERKINETIC.pageBase + file,
        isMain: false,
      });
    }
  }

  if (SOURCES.has("wikimedia")) {
    for (const item of link.wikimedia ?? []) {
      const title = typeof item === "string" ? item : item.title;
      const api =
        "https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata|mime&format=json&titles=" +
        encodeURIComponent(title);
      const data = await getJson(api);
      const page = Object.values(data.query?.pages ?? {})[0];
      const info = page?.imageinfo?.[0];
      const meta = info?.extmetadata ?? {};
      const lic = commonsLicense(meta.LicenseShortName?.value);
      if (!info) {
        rejected.push(`Commons ${title}: arquivo não encontrado`);
        continue;
      }
      if (!lic) {
        rejected.push(`Commons ${title}: licença "${meta.LicenseShortName?.value ?? "?"}" não permitida`);
        continue;
      }
      out.push({
        sourceKey: `commons-${title.replace(/^File:/, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`.slice(0, 120),
        origin: "wikimedia",
        kind: info.mime?.startsWith("video/") ? "video" : info.mime === "image/gif" ? "gif" : "image",
        angle: item.angle ?? "side",
        url: info.url,
        author: stripHtml(meta.Artist?.value),
        ...lic,
        sourceUrl: info.descriptionurl,
        isMain: false,
      });
    }
  }

  // Atribuição obrigatória em CC BY/BY-SA: sem autor informado, credita os contribuidores da fonte
  // (decisão do usuário em 24/11/2026).
  for (const c of out) {
    if (!c.author && c.license !== "cc0") c.author = c.origin === "wger" ? "Contribuidores do wger" : null;
  }
  const valid = out.filter((c) => c.license === "cc0" || c.author);
  for (const c of out) if (!valid.includes(c)) rejected.push(`${c.sourceKey}: sem autor para atribuição`);
  return { candidates: valid, rejected };
}

// ---------------------------------------------------------------------------
// Conversão e envio (só com --apply)
// ---------------------------------------------------------------------------
async function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    return (await import("ffmpeg-static")).default;
  } catch {
    throw new Error("ffmpeg não encontrado: rode `npm install` (ffmpeg-static) ou defina FFMPEG_PATH.");
  }
}

/** Baixa com novas tentativas: o servidor de arquivos do Commons devolve 429 quando há muitas seguidas. */
async function download(url, dest) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) {
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      return;
    }
    if (attempt >= 6 || (res.status !== 429 && res.status < 500)) throw new Error(`${res.status} ao baixar ${url}`);
    const retryAfter = Number(res.headers.get("retry-after"));
    await new Promise((r) => setTimeout(r, (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 5 * attempt) * 1000));
  }
}

/** Converte para formato leve. Retorna { file, contentType, ext, poster?, width, height, durationMs, kind }. */
async function convert(c, dir) {
  const sharp = (await import("sharp")).default;
  const src = join(dir, "src");
  await download(c.url, src);

  if (c.kind === "image" || c.kind === "gif") {
    const meta = await sharp(src, { animated: true }).metadata();
    const animated = (meta.pages ?? 1) > 1;
    if (!animated) {
      const out = join(dir, "out.webp");
      // Ilustrações com fundo transparente (Everkinetic, SVG) ganham fundo branco; senão os traços
      // pretos somem no tema escuro. Isso é uma adaptação: a mídia fica marcada como editada.
      const edited = Boolean(meta.hasAlpha);
      let pipeline = sharp(src, { density: 144 }).rotate().resize({ width: 1080, height: 1080, fit: "inside", withoutEnlargement: true });
      if (edited) pipeline = pipeline.flatten({ background: "#ffffff" });
      const info = await pipeline.webp({ quality: 82 }).toFile(out);
      return { file: out, contentType: "image/webp", ext: "webp", width: info.width, height: info.height, durationMs: null, kind: "image", edited };
    }
  }

  // Vídeo ou GIF animado → MP4 H.264 sem som + poster.
  const ffmpeg = await ffmpegPath();
  const out = join(dir, "out.mp4");
  await run(ffmpeg, [
    "-y", "-i", src, "-t", "10", "-an",
    "-vf", "scale='min(720,iw)':-2:flags=lanczos,format=yuv420p",
    "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-movflags", "+faststart", out,
  ]);
  const posterPng = join(dir, "poster.png");
  await run(ffmpeg, ["-y", "-ss", "0.3", "-i", out, "-frames:v", "1", posterPng]);
  const poster = join(dir, "poster.webp");
  const pinfo = await sharp(posterPng).webp({ quality: 80 }).toFile(poster);
  const { stderr } = await run(ffmpeg, ["-i", out], { encoding: "utf8" }).catch((e) => e);
  const dur = String(stderr).match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  const durationMs = dur ? Math.round((Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3])) * 1000) : null;
  return { file: out, contentType: "video/mp4", ext: "mp4", poster, width: pinfo.width, height: pinfo.height, durationMs, kind: "video" };
}

async function main() {
  const wgerCache = new Map();
  const report = { bySource: {}, rejected: [], withMedia: new Set(), plan: [] };

  for (const e of exercises) {
    const { candidates, rejected } = await candidatesFor(e.slug, wgerCache);
    report.rejected.push(...rejected.map((r) => `${e.slug}: ${r}`));
    candidates.sort((a, b) => Number(b.isMain) - Number(a.isMain));
    candidates.forEach((c, i) => report.plan.push({ slug: e.slug, position: i, ...c }));
    if (candidates.length) report.withMedia.add(e.slug);
    for (const c of candidates) {
      const key = `${c.origin}|${c.license}|${c.version}`;
      report.bySource[key] ??= { exercises: new Set(), files: 0 };
      report.bySource[key].exercises.add(e.slug);
      report.bySource[key].files++;
    }
  }

  let imported = 0;
  let skipped = 0;
  const failures = [];
  if (APPLY) {
    const { Pool } = await import("pg");
    const { put } = await import("@vercel/blob");
    const token = process.env.MEDIA_READ_WRITE_TOKEN;
    if (!process.env.DATABASE_URL || !token) throw new Error("Defina DATABASE_URL e MEDIA_READ_WRITE_TOKEN.");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });
    try {
      const ids = new Map((await pool.query(`select id, slug from exercises`)).rows.map((r) => [r.slug, r.id]));
      const existing = new Set((await pool.query(`select source_key from exercise_media where source_key is not null`)).rows.map((r) => r.source_key));
      for (const c of report.plan) {
        if (existing.has(c.sourceKey)) {
          skipped++;
          continue;
        }
        const exerciseId = ids.get(c.slug);
        if (!exerciseId) {
          failures.push(`${c.slug}: exercício não está no banco (aplique as migrations)`);
          continue;
        }
        const dir = await mkdtemp(join(tmpdir(), "media-"));
        try {
          const conv = await convert(c, dir);
          const base = `exercises/${c.slug}/${c.sourceKey}`;
          const opts = { access: "public", token, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31536000 };
          const main = await put(`${base}.${conv.ext}`, await readFile(conv.file), { ...opts, contentType: conv.contentType });
          const poster = conv.poster
            ? await put(`${base}-poster.webp`, await readFile(conv.poster), { ...opts, contentType: "image/webp" })
            : null;
          await pool.query(
            `insert into exercise_media (exercise_id, kind, angle, position, url, poster_url, origin, author, license,
                                         license_version, source_url, source_key, is_edited, width, height, duration_ms)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $16, $13, $14, $15)
             on conflict (source_key) do nothing`,
            [exerciseId, conv.kind, c.angle, 10 + c.position, main.url, poster?.url ?? null, c.origin, c.author, c.license,
             c.version, c.sourceUrl, c.sourceKey, conv.width, conv.height, conv.kind === "video" ? conv.durationMs : null, Boolean(conv.edited)],
          );
          imported++;
          console.log(`+ ${c.slug} ← ${c.sourceKey}`);
        } catch (error) {
          failures.push(`${c.slug} ← ${c.sourceKey}: ${error.message}`);
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      }
    } finally {
      await pool.end();
    }
  }

  // Resumo
  const names = new Map(catalog.map((e) => [e.slug, e.name]));
  const lic = (l, v) => ({ cc0: "CC0", cc_by: "CC BY", cc_by_sa: "CC BY-SA" })[l] + ` ${v}`;
  const lines = [
    `# Importação de mídias — ${APPLY ? "execução" : "simulação"} (${new Date().toISOString().slice(0, 10)})`,
    "",
    "| Fonte | Licença | Exercícios | Arquivos |",
    "|---|---|---|---|",
    ...Object.entries(report.bySource).map(([k, v]) => {
      const [origin, l, ver] = k.split("|");
      return `| ${origin} | ${lic(l, ver)} | ${v.exercises.size} | ${v.files} |`;
    }),
    "",
    `Exercícios com mídia: **${report.withMedia.size} de ${exercises.length}**.`,
    "",
    "## Treino do usuário sem mídia (falta gravar)",
    ...TRAINING.filter((s) => (!ONLY || ONLY.has(s)) && !report.withMedia.has(s)).map((s) => `- ${names.get(s) ?? s}`),
    "",
    "## Demais exercícios sem mídia",
    ...exercises.filter((e) => !report.withMedia.has(e.slug) && !TRAINING.includes(e.slug)).map((e) => `- ${e.name}`),
    "",
    `## Recusadas (${report.rejected.length})`,
    ...report.rejected.map((r) => `- ${r}`),
  ];
  if (APPLY) lines.push("", `Importadas: ${imported}. Já existiam: ${skipped}. Falhas: ${failures.length}.`, ...failures.map((f) => `- ${f}`));
  const text = lines.join("\n");
  if (args.report) await writeFile(String(args.report), text);
  console.log(text);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
