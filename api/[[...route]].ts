/**
 * Vercel Serverless — semua request /api/* masuk ke Hono.
 *
 * WAJIB di Vercel → Environment Variables: NODEJS_HELPERS=0
 * Tanpa itu, POST + body JSON (login, dll.) sering 500 Internal Server Error.
 * @see https://github.com/honojs/hono/issues/1256
 */
import { handle } from "hono/vercel";
import app from "./app.js";

export default handle(app);

export const config = {
  maxDuration: 60,
  runtime: "nodejs",
};
