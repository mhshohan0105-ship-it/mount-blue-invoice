// Postgres access (Neon over HTTP). Server-only.
import { neon } from "@neondatabase/serverless";
import { MIGRATIONS } from "./schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
type Runner = (text: string, params?: unknown[]) => Promise<Row[]>;

let runner: Runner | null = null;
let ready: Promise<void> | null = null;

/** Tests can swap in another Postgres (e.g. PGlite). */
export function setRunner(r: Runner) {
  runner = r;
  ready = null;
}

function getRunner(): Runner {
  if (runner) return runner;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Connect a Neon database in Vercel (Storage tab) or add it to .env.local");
  }
  const sql = neon(url);
  runner = (text, params = []) => sql.query(text, params) as Promise<Row[]>;
  return runner;
}

async function migrate(run: Runner) {
  await run(`create table if not exists app_meta (key text primary key, value jsonb not null)`);
  const rows = await run(`select value from app_meta where key = 'schema_version'`);
  const current = rows[0] ? Number(rows[0].value) : 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    for (const statement of MIGRATIONS[v]) await run(statement);
    await run(
      `insert into app_meta (key, value) values ('schema_version', $1::jsonb)
       on conflict (key) do update set value = excluded.value`,
      [JSON.stringify(v + 1)],
    );
  }
}

/** Run a query, creating/upgrading the schema first if needed. */
export async function q<T extends Row = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  const run = getRunner();
  if (!ready) ready = migrate(run).catch((e) => ((ready = null), Promise.reject(e)));
  await ready;
  return (await run(text, params)) as T[];
}

export async function getMeta<T>(key: string): Promise<T | null> {
  const rows = await q(`select value from app_meta where key = $1`, [key]);
  return rows[0] ? (rows[0].value as T) : null;
}

export async function setMeta(key: string, value: unknown) {
  await q(
    `insert into app_meta (key, value) values ($1, $2::jsonb) on conflict (key) do update set value = excluded.value`,
    [key, JSON.stringify(value)],
  );
}
