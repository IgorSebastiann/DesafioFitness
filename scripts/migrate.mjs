// Aplica db/migrations/*.sql e db/seed.sql no banco de DATABASE_URL.
// Cada migration roda uma vez (registrada em schema_migrations). Uso: npm run db:migrate
import { Pool } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definida. Rode com: npm run db:migrate (carrega .env.local).");
  process.exit(1);
}

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: true } });
const client = await pool.connect();
try {
  await client.query(`create table if not exists schema_migrations (
    name text primary key, applied_at timestamptz not null default now())`);

  const dir = join(root, "db", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const { rows } = await client.query("select 1 from schema_migrations where name = $1", [file]);
    if (rows.length) {
      console.log(`- ${file} (já aplicada)`);
      continue;
    }
    const sql = readFileSync(join(dir, file), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`+ ${file}`);
    } catch (err) {
      await client.query("rollback");
      throw new Error(`Falha em ${file}: ${err.message}`);
    }
  }

  // seed.sql é idempotente (on conflict do nothing).
  await client.query(readFileSync(join(root, "db", "seed.sql"), "utf8"));
  console.log("+ seed.sql aplicado");
} finally {
  client.release();
  await pool.end();
}
