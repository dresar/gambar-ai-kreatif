/**
 * Vercel Serverless — semua request /api/* masuk ke Hono.
 */
import { handle } from "hono/vercel";
import app from "./app";

export default handle(app);

export const config = {
  maxDuration: 60,
  runtime: "nodejs",
};
