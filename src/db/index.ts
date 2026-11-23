import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";

const rawUrl = process.env.DATABASE_URL?.trim();
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NEXT_RUNTIME === "edge");
const isLocalhost = !rawUrl || rawUrl.includes("127.0.0.1") || rawUrl.includes("localhost");

const globalForDb = globalThis as typeof globalThis & {
  __civicPool?: Pool;
  __civicPglite?: PGlite;
  __civicDb?: any;
};

function initDb() {
  if (globalForDb.__civicDb) return globalForDb.__civicDb;

  // On Vercel / serverless without a remote PostgreSQL DATABASE_URL, use embedded PGlite WASM
  if (isVercel && isLocalhost) {
    const client = globalForDb.__civicPglite ?? new PGlite();
    globalForDb.__civicPglite = client;
    const dbInstance = drizzlePglite(client);
    globalForDb.__civicDb = dbInstance;
    return dbInstance;
  }

  // Standard PostgreSQL connection (Neon, Supabase, local Docker/PGlite server)
  const connectionString = rawUrl || "postgres://postgres:postgres@127.0.0.1:5432/civic_platform";
  const pool =
    globalForDb.__civicPool ??
    new Pool({
      connectionString,
      ssl: connectionString.includes("sslmode=require") || connectionString.includes("neon.tech") || connectionString.includes("supabase.com")
        ? { rejectUnauthorized: false }
        : undefined,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__civicPool = pool;
  }

  const dbInstance = drizzleNodePg(pool);
  globalForDb.__civicDb = dbInstance;
  return dbInstance;
}

export type DbInstance = ReturnType<typeof drizzleNodePg>;
export const db = initDb() as DbInstance;
export const pool = globalForDb.__civicPool;

