/**
 * Test AI chat: cek apakah base URL, model, dan API key dari .env bisa dapat respons.
 * Jalankan: node scripts/test-ai-chat.js
 */
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env (tanpa dependency dotenv)
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    console.error("File .env tidak ditemukan di:", envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = loadEnv();
const AI_BASE_URL = env.AI_BASE_URL || "https://one.apprentice.cyou/api/v1";
const AI_MODEL = env.AI_MODEL || "gemini-2.5-flash";
const AI_API_KEY = env.AI_API_KEY || "";

const url = AI_BASE_URL.replace(/\/+$/, "").endsWith("/chat/completions")
  ? AI_BASE_URL.replace(/\/+$/, "")
  : `${AI_BASE_URL.replace(/\/+$/, "")}/chat/completions`;

console.log("Testing AI chat...");
console.log("  URL:", url);
console.log("  Model:", AI_MODEL);
console.log("  API Key:", AI_API_KEY ? AI_API_KEY.slice(0, 8) + "..." : "(kosong)");
console.log("");

if (!AI_API_KEY) {
  console.error("ERROR: AI_API_KEY kosong di .env");
  process.exit(1);
}

const body = {
  model: AI_MODEL,
  messages: [{ role: "user", content: "Halo, jawab singkat dalam satu kalimat: apa warna langit?" }],
};

fetch(url, {
  method: "POST",
  headers: {
    Authorization: "Bearer " + AI_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
})
  .then(async (res) => {
    const text = await res.text();
    console.log("Status:", res.status, res.statusText);
    if (!res.ok) {
      console.error("Response body:", text);
      process.exit(1);
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Response bukan JSON:", text.slice(0, 300));
      process.exit(1);
    }
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (content) {
      console.log("AI merespons:");
      console.log(" ", content);
      console.log("");
      console.log("OK: AI merespon dengan baik.");
    } else {
      console.log("Response structure:", JSON.stringify(data, null, 2).slice(0, 500));
      console.log("(Tidak ada choices[0].message.content)");
    }
  })
  .catch((err) => {
    console.error("Request gagal:", err.message);
    process.exit(1);
  });
