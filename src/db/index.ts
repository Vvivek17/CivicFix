import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const rawUrl = process.env.DATABASE_URL?.trim();
const connectionString = rawUrl || "postgres://postgres:postgres@127.0.0.1:5432/civic_platform";

const globalForDb = globalThis as typeof globalThis & {
  __civicPool?: Pool;
};

const pool =
  globalForDb.__civicPool ??
  new Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    ssl:
      connectionString.includes("sslmode=require") ||
      connectionString.includes("neon.tech") ||
      connectionString.includes("supabase.com") ||
      connectionString.includes("pooler.supabase.com") ||
      connectionString.includes("vercel-storage.com") ||
      connectionString.includes("aivencloud.com")
        ? { rejectUnauthorized: false }
        : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__civicPool = pool;
}

export const db = drizzle(pool);
export { pool };


