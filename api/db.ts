/**
 * Koneksi DB untuk API. Pakai pg (node-postgres) supaya stabil di Node.js;
 * driver Neon serverless HTTP sering error "could not parse the HTTP request body" dengan Drizzle.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const pool = new pg.Pool({ connectionString });
export const db = drizzle(pool);
export { pool };
