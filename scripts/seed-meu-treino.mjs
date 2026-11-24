#!/usr/bin/env node
/**
 * Cadastra um treino pessoal (fichas + agenda da semana) na conta de um usuário.
 *
 * O conteúdo do treino NÃO fica no repositório: vem de um arquivo JSON local (padrão
 * private/meu-treino.json, pasta ignorada pelo Git). O e-mail da conta e os dias da semana
 * são informados na hora de rodar (perguntados no terminal, ou por --email e --dias).
 *
 * Idempotente: fichas com o mesmo nome na conta são atualizadas (não duplica); a agenda dessas
 * fichas é refeita com os dias informados. Fichas e agenda que não estão no arquivo ficam como estão.
 *
 * Uso:
 *   node --env-file=.env.local scripts/seed-meu-treino.mjs
 *   node --env-file=.env.local scripts/seed-meu-treino.mjs --email=fulano@exemplo.com --dias="A=seg,qua;B=ter;C=qui;D=sex"
 *   Opções: --arquivo=caminho.json   --simular (mostra o que faria, sem gravar)
 *
 * Formato do arquivo: { "fichas": [{ "nome", "descricao", "blocos": [ ...mesmo formato de replace_workout_blocks ] }] }
 * Nos --dias, a letra é a do nome da ficha ("Treino A — ..." → A), ou o nome inteiro.
 */
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { join } from "node:path";
import pg from "pg";

const ROOT = join(import.meta.dirname, "..");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);
const DRY = Boolean(args.simular);
const DAY = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, "sáb": 6 };
const DAY_NAME = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const file = String(args.arquivo ?? join(ROOT, "private", "meu-treino.json"));
let plan;
try {
  plan = JSON.parse(readFileSync(file, "utf8"));
} catch (error) {
  console.error(`Não consegui ler ${file}: ${error.message}`);
  process.exit(1);
}
if (!Array.isArray(plan.fichas) || plan.fichas.length === 0) {
  console.error("O arquivo não tem a lista \"fichas\".");
  process.exit(1);
}

/** "Treino A — Peito" → "A". */
const letterOf = (name) => name.match(/^Treino\s+([A-Z])\b/i)?.[1]?.toUpperCase() ?? null;

function parseDays(text) {
  const out = [];
  for (const raw of String(text).split(/[,\s]+/).filter(Boolean)) {
    const d = DAY[raw.toLowerCase().slice(0, 3)];
    if (d === undefined) throw new Error(`Dia desconhecido: "${raw}". Use dom, seg, ter, qua, qui, sex ou sab.`);
    if (!out.includes(d)) out.push(d);
  }
  return out;
}

const rl = process.stdin.isTTY ? createInterface({ input: process.stdin, output: process.stdout }) : null;
const ask = async (q) => (rl ? (await rl.question(q)).trim() : "");

const email = String(args.email ?? (await ask("E-mail da conta: "))).trim().toLowerCase();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Informe um e-mail válido (--email=... ou no terminal).");
  process.exit(1);
}

// Dias de cada ficha: de --dias ("A=seg,qua;B=ter") ou perguntados um a um.
const daysBySheet = new Map();
if (typeof args.dias === "string") {
  for (const part of args.dias.split(";").filter(Boolean)) {
    const [key, list] = part.split("=");
    const sheet = plan.fichas.find((f) => letterOf(f.nome) === key.trim().toUpperCase() || f.nome === key.trim());
    if (!sheet) throw new Error(`Ficha não encontrada em --dias: "${key}".`);
    daysBySheet.set(sheet.nome, parseDays(list ?? ""));
  }
} else if (rl) {
  console.log("Dias da semana de cada ficha (ex.: seg,qui). Deixe em branco para não pôr na agenda.");
  for (const f of plan.fichas) daysBySheet.set(f.nome, parseDays(await ask(`  ${f.nome}: `)));
}
rl?.close();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não definida. Rode com: node --env-file=.env.local scripts/seed-meu-treino.mjs");
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes("sslmode=disable") ? false : { rejectUnauthorized: true } });
const client = await pool.connect();
try {
  const { rows: users } = await client.query(`select u.id from users u join profiles p on p.id = u.id where lower(u.email) = $1`, [email]);
  if (!users[0]) throw new Error("Nenhuma conta com esse e-mail.");
  const userId = users[0].id;

  await client.query("begin");
  for (const [index, ficha] of plan.fichas.entries()) {
    const existing = await client.query(`select id from workout_sheets where owner_id = $1 and name = $2`, [userId, ficha.nome]);
    let sheetId = existing.rows[0]?.id;
    if (sheetId) {
      await client.query(`update workout_sheets set description = $2, position = $3 where id = $1`, [sheetId, ficha.descricao ?? null, index]);
    } else {
      const { rows } = await client.query(
        `insert into workout_sheets (owner_id, name, description, position) values ($1, $2, $3, $4) returning id`,
        [userId, ficha.nome, ficha.descricao ?? null, index],
      );
      sheetId = rows[0].id;
    }
    await client.query(`select replace_workout_blocks($1, $2::jsonb)`, [sheetId, JSON.stringify(ficha.blocos)]);

    const days = daysBySheet.get(ficha.nome);
    if (days) {
      await client.query(`delete from workout_schedule where user_id = $1 and sheet_id = $2`, [userId, sheetId]);
      for (const d of days) {
        await client.query(`insert into workout_schedule (user_id, weekday, sheet_id, position) values ($1, $2, $3, $4)`, [userId, d, sheetId, index]);
      }
    }
    const exercises = ficha.blocos.reduce((n, b) => n + (b.items?.length ?? 0), 0);
    console.log(
      `${existing.rows[0] ? "~" : "+"} ${ficha.nome}: ${ficha.blocos.length} blocos, ${exercises} exercícios` +
        (days ? ` · agenda: ${days.length ? days.map((d) => DAY_NAME[d]).join(", ") : "nenhum dia"}` : ""),
    );
  }
  // As constraints de formato dos blocos são conferidas aqui (fim da transação).
  await client.query(DRY ? "rollback" : "commit");
  console.log(DRY ? "Simulação: nada foi gravado." : "Pronto.");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error(`Erro: ${error.message}`);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
