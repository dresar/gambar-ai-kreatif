/**
 * API lokal: npm run dev:api
 */
import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app.js";

const PORT = Number(process.env.PORT) || 5000;

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`API (Hono) running at http://localhost:${info.port}`);
});
