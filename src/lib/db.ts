import "server-only";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// date (1082) como texto YYYY-MM-DD; bigint (20) como número.
types.setTypeParser(1082, (value: string) => value);
types.setTypeParser(20, (value: string) => Number(value));

/**
 * Pool único por processo. Em desenvolvimento o módulo pode ser recarregado,
 * então o pool fica preso ao objeto global para não abrir conexões demais.
 */
const globalForPg = globalThis as unknown as { __pgPool?: Pool };

export const pool: Pool =
  globalForPg.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    ssl: { rejectUnauthorized: true },
  });

if (process.env.NODE_ENV !== "production") globalForPg.__pgPool = pool;

export type Sql = PoolClient;

/**
 * Executa `fn` numa transação como o papel `app_user` (sem BYPASSRLS), com o
 * usuário autenticado definido em `app.user_id`. É isso que faz o RLS valer.
 * `userId = null` roda sem identidade (todas as políticas negam).
 */
export async function withUser<T>(userId: string | null, fn: (sql: Sql) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role app_user");
    await client.query("select set_config('app.user_id', $1, true)", [userId ?? ""]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Consulta como o dono do banco (sem RLS). Usada só por rotinas do servidor (cron). */
export async function queryAsOwner<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const { rows } = await pool.query<T>(text, params);
  return rows;
}
