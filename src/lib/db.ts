import type { PoolClient, QueryResult, QueryResultRow } from "pg";

import { supabasePool } from "./supabase";

const pool = supabasePool;

if (!pool) {
  throw new Error(
    "SUPABASE_DB_URL (or DATABASE_URL) must be configured to run queries.",
  );
}

export type QueryConfig = {
  text: string;
  values?: unknown[];
};

export const runQuery = async <T extends QueryResultRow = QueryResultRow>(
  textOrConfig: string | QueryConfig,
  values?: unknown[],
): Promise<T[]> => {
  const client = await pool.connect();
  try {
    const result =
      typeof textOrConfig === "string"
        ? await client.query(textOrConfig, values)
        : await client.query(textOrConfig);
    return (result as QueryResult<T>).rows;
  } finally {
    client.release();
  }
};

export const runSingle = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[],
): Promise<T | null> => {
  const rows = await runQuery<T>(text, values);
  return rows.length ? rows[0] : null;
};

export const withTransaction = async <T>(
  handler: (client: PoolClient) => Promise<T>,
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
