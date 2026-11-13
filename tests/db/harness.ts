/**
 * Ambiente de teste do banco: PostgreSQL real (PGlite/WASM). As migrations de db/migrations
 * rodam sem alterações. A identidade é definida como na aplicação: papel app_user + app.user_id.
 */
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");

export async function createDb(): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { pgcrypto } });
  const dir = join(ROOT, "db", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }
  await db.exec(readFileSync(join(ROOT, "db", "seed.sql"), "utf8"));
  return db;
}

/** Executa como o papel da aplicação (app_user) com o usuário informado, ou sem identidade. */
export async function asUser<T = unknown>(
  db: PGlite,
  userId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  await db.exec(`set role app_user; select set_config('app.user_id', '${userId ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role; select set_config('app.user_id', '', false);");
  }
}

/** Mensagem de erro do Postgres, ou null se a operação deu certo. */
export async function errorOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
