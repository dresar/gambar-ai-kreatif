/**
 * Koneksi DB untuk API. Pakai pg (node-postgres) supaya stabil di Node.js;
 * driver Neon serverless HTTP sering error "could not parse the HTTP request body" dengan Drizzle.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

/** channel_binding sering bikin koneksi gagal di serverless — buang dari URL */
function normalizeDatabaseUrl(url: string): string {
  let u = url.trim();
  u = u.replace(/&channel_binding=[^&]*/g, "").replace(/\?channel_binding=[^&]*&/, "?").replace(/\?channel_binding=[^&]*$/, "");
  return u;
}
const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL || "");
if (!connectionString) throw new Error("DATABASE_URL is required");

// Serverless (Vercel): sedikit koneksi per instance; Neon pooler URL disarankan
const pool = new pg.Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX) || (process.env.VERCEL ? 3 : 10),
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 10_000,
});
export const db = drizzle(pool);
export { pool };
