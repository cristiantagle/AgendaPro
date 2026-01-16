import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";

// Force Node.js to ignore SSL certificate errors in development
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseDbUrl =
  process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? null;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.",
  );
}

export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  : null;


export const supabasePool = supabaseDbUrl
  ? new Pool({
    connectionString: supabaseDbUrl,
    max: 10,
    ssl: { rejectUnauthorized: false },
  })
  : null;

export const getDbClient = async () => {
  if (!supabasePool) {
    throw new Error("SUPABASE_DB_URL is not configured.");
  }
  return supabasePool.connect();
};
