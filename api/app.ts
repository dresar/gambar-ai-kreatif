/**
 * Hono API server - Unified monorepo backend.
 * Semua response JSON: { success, data, error }.
 */
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { jwt } from "hono/jwt";
import bcrypt from "bcryptjs";
import jwtSign from "jsonwebtoken";
import { db, pool } from "./db.js";
import {
  users,
  profiles,
  prompts,
  promptHistory,
  analisisInstruksiTemplates,
  promptImageInstructionFields,
  dropdownCategories,
  dropdownOptions,
} from "./schema.js";
import { eq, and, desc, asc } from "drizzle-orm";
import { rowToSnake, rowsToSnake } from "./snake.js";
import { chatCompletions, analyzeImageToPromptJson, certificatePromptWithLogos } from "./ai-chat.js";
import { DROPDOWN_SEED_GAMBAR } from "./dropdown-seed-gambar.js";

const IS_PROD = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
const JWT_SECRET = process.env.JWT_SECRET || (IS_PROD ? "unset-production-jwt" : "dev-only-secret-not-for-production");
if (IS_PROD && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.error("[api] Set JWT_SECRET (≥32 karakter) di Vercel — login akan gagal sampai diisi.");
}

type ApiResponse<T> = { success: boolean; data: T | null; error: string | null };

function jsonSuccess<T>(c: { json: (body: ApiResponse<T>, status?: number) => Response }, data: T, status = 200) {
  return c.json({ success: true, data, error: null } as ApiResponse<T>, status);
}
function jsonError(c: { json: (body: ApiResponse<null>) => Response }, message: string, status = 400) {
  const body = { success: false, data: null, error: message } as ApiResponse<null>;
  if (status === 400) return c.json(body);
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type JWTPayload = { userId: string; email: string };

const app = new Hono();

const DEV_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
];
function corsAllowedOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  if (!IS_PROD) return origin;
  const allow = new Set(DEV_ORIGINS);
  const front = process.env.FRONTEND_URL?.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  if (front) allow.add(front);
  if (vercel) allow.add(vercel);
  process.env.CORS_ORIGINS?.split(",").forEach((o) => {
    const x = o.trim().replace(/\/$/, "");
    if (x) allow.add(x);
  });
  if (allow.has(origin)) return origin;
  try {
    const u = new URL(origin);
    if (u.hostname.endsWith(".vercel.app")) return origin;
  } catch {
    /* ignore */
  }
  return null;
}
app.use(
  "*",
  cors({
    origin: (origin) => corsAllowedOrigin(origin || undefined),
    credentials: true,
  })
);

// Hono JWT middleware perlu opsi alg, gunakan HS256
const authMiddleware = jwt({
  secret: JWT_SECRET,
  alg: "HS256",
});

// ---- Health (cek koneksi database, tidak pakai auth)
app.get("/api/health", async (c) => {
  try {
    await pool.query("SELECT 1");
    return jsonSuccess(c, { ok: true, database: "connected" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error";
    return c.json(
      { success: false, data: null, error: msg } as ApiResponse<null>,
      503
    );
  }
});

function createToken(userId: string, email: string): string {
  return jwtSign.sign({ userId, email } as JWTPayload, JWT_SECRET, { expiresIn: "7d" });
}

// ---- Auth ----
app.post("/api/auth/login", async (c) => {
  try {
    let body: { email?: string; password?: string };
    try {
      body = (await c.req.json()) as { email?: string; password?: string };
    } catch {
      return jsonError(c, "Body JSON tidak valid", 400);
    }
    const { email, password } = body;
    if (!email || !password) return jsonError(c, "Email dan password wajib", 400);
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user?.passwordHash) {
      return jsonError(c, "Email atau password salah", 401);
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return jsonError(c, "Email atau password salah", 401);
    if (!JWT_SECRET || JWT_SECRET.length < 8) {
      console.error("[login] JWT_SECRET kurang / kosong — set di environment (production min 32 karakter)");
      return jsonError(c, "Server: JWT_SECRET belum dikonfigurasi dengan benar", 503);
    }
    const token = createToken(user.id, user.email);
    return jsonSuccess(c, { user: { id: user.id, email: user.email, username: user.username }, token }, 200);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[login]", msg);
    if (msg.includes("DATABASE_URL") || msg.includes("connect") || msg.includes("ECONNREFUSED")) {
      return jsonError(c, "Database tidak terhubung — cek DATABASE_URL di environment (Vercel)", 503);
    }
    return jsonError(c, "Login gagal (server). Cek log / DATABASE_URL / JWT_SECRET.", 500);
  }
});

app.post("/api/auth/signup", async (c) => {
  try {
    let body: { email?: string; password?: string; username?: string };
    try {
      body = (await c.req.json()) as { email?: string; password?: string; username?: string };
    } catch {
      return jsonError(c, "Body JSON tidak valid", 400);
    }
    const { email, password, username } = body;
    if (!email || !password) return jsonError(c, "Email dan password wajib", 400);
    if (!JWT_SECRET || JWT_SECRET.length < 8) {
      return jsonError(c, "Server: JWT_SECRET belum dikonfigurasi", 503);
    }
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) return jsonError(c, "Email sudah terdaftar", 400);
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, username: username || null })
      .returning();
    if (!user) return jsonError(c, "Gagal membuat akun", 500);
    await db.insert(profiles).values({ userId: user.id, displayName: username || email });
    const token = createToken(user.id, user.email);
    return jsonSuccess(c, { user: { id: user.id, email: user.email, username: user.username }, token }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[signup]", msg);
    if (msg.includes("DATABASE_URL") || msg.includes("connect")) {
      return jsonError(c, "Database tidak terhubung — cek DATABASE_URL", 503);
    }
    return jsonError(c, "Daftar gagal (server).", 500);
  }
});

app.get("/api/auth/me", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user) return jsonError(c, "User not found", 404);
  return jsonSuccess(c, { id: user.id, email: user.email, username: user.username });
});

// ---- AI chat (custom endpoint dari .env, untuk prompting; client memicu request) ----
app.get("/api/ai/config", (c) => {
  const baseUrl = process.env.AI_BASE_URL || "https://one.apprentice.cyou/api/v1";
  const model = process.env.AI_MODEL || "gemini-2.5-flash";
  /** Hanya proses Node (dev:api) yang membaca .env — bukan Vite. */
  const keyConfigured = Boolean(String(process.env.AI_API_KEY ?? "").trim());
  return jsonSuccess(c, {
    base_url: baseUrl,
    model,
    key_configured: keyConfigured,
  });
});

app.post("/api/ai/chat", authMiddleware, async (c) => {
  const body = (await c.req.json()) as { messages?: Array<{ role?: string; content?: string }> };
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError(c, "messages wajib (array minimal 1 item)", 400);
  }
  const normalized = messages.map((m) => ({
    role: (m.role === "assistant" || m.role === "system" ? m.role : "user") as "user" | "assistant" | "system",
    content: typeof m.content === "string" ? m.content : "",
  }));
  try {
    const result = await chatCompletions(normalized);
    return jsonSuccess(c, result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memanggil AI";
    return jsonError(c, msg, 502);
  }
});

app.post("/api/ai/analyze-image", authMiddleware, async (c) => {
  const body = (await c.req.json()) as { image_base64?: string; instruction?: string };
  const dataUrl = body.image_base64;
  if (!dataUrl || typeof dataUrl !== "string") {
    return jsonError(c, "image_base64 wajib (data URL atau string base64 gambar)", 400);
  }
  const maxLen = 12 * 1024 * 1024; // ~12MB string; hindari body terlalu besar
  if (dataUrl.length > maxLen) {
    return jsonError(c, "Gambar terlalu besar. Kecilkan resolusi atau kompres dulu (mis. max 1600px).", 413);
  }
  try {
    const jsonString = await analyzeImageToPromptJson(dataUrl, body.instruction);
    return jsonSuccess(c, { content: jsonString });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menganalisis gambar";
    console.error("[analyze-image]", msg);
    return jsonError(c, msg, 502);
  }
});

/** Sertifikat + banyak logo (kompres di klien). Maks ~10MB total body. */
app.post("/api/ai/sertifikat-logo", authMiddleware, async (c) => {
  const body = (await c.req.json()) as { instruction?: string; logos?: string[] };
  const logos = Array.isArray(body.logos) ? body.logos.filter((x) => typeof x === "string") : [];
  if (!body.instruction?.trim() && logos.length === 0) {
    return jsonError(c, "instruction atau logos wajib", 400);
  }
  const joined = logos.join("");
  if (joined.length > 10 * 1024 * 1024) {
    return jsonError(c, "Total logo terlalu besar — kurangi atau kompres lagi", 413);
  }
  try {
    const content = await certificatePromptWithLogos(body.instruction || "", logos);
    return jsonSuccess(c, { content });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal AI sertifikat";
    console.error("[sertifikat-logo]", msg);
    return jsonError(c, msg, 502);
  }
});

// ---- User: update profile & change password ----
app.patch("/api/user/update", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const body = (await c.req.json()) as { username?: string; email?: string };
  const updates: { username?: string; email?: string } = {};
  if (body.username !== undefined) updates.username = body.username;
  if (body.email !== undefined) {
    const existing = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    if (existing.length > 0 && existing[0].id !== payload.userId) {
      return jsonError(c, "Email sudah digunakan", 400);
    }
    updates.email = body.email;
  }
  if (Object.keys(updates).length === 0) {
    const [u] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    return jsonSuccess(c, u ? rowToSnake(u as Record<string, unknown>) : null);
  }
  const [updated] = await db.update(users).set(updates).where(eq(users.id, payload.userId)).returning();
  return jsonSuccess(c, updated ? rowToSnake(updated as Record<string, unknown>) : null);
});

app.patch("/api/user/change-password", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const body = (await c.req.json()) as { old_password?: string; new_password?: string; confirm_password?: string };
  const { old_password, new_password, confirm_password } = body;
  if (!old_password || !new_password || confirm_password !== new_password) {
    return jsonError(c, "Password lama, baru, dan konfirmasi wajib dan harus cocok", 400);
  }
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user || !(await bcrypt.compare(old_password, user.passwordHash))) {
    return jsonError(c, "Password lama salah", 401);
  }
  const passwordHash = await bcrypt.hash(new_password, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, payload.userId));
  return jsonSuccess(c, { message: "Password berhasil diubah" });
});

// ---- Profiles ----
app.get("/api/profiles/me", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, payload.userId)).limit(1);
  if (!p) return jsonError(c, "Profile not found", 404);
  return jsonSuccess(c, rowToSnake(p as Record<string, unknown>));
});

app.patch("/api/profiles/me", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const body = (await c.req.json()) as { theme_preference?: string };
  await db
    .update(profiles)
    .set({
      themePreference: body.theme_preference ?? undefined,
    })
    .where(eq(profiles.userId, payload.userId));
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, payload.userId)).limit(1);
  return jsonSuccess(c, p ? rowToSnake(p as Record<string, unknown>) : null);
});

// ---- Dropdowns: Gaya Sertifikat ----
app.get("/api/dropdowns/gaya-sertifikat", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const [cat] = await db
    .select()
    .from(dropdownCategories)
    .where(and(eq(dropdownCategories.userId, payload.userId), eq(dropdownCategories.slug, "gaya-sertifikat")))
    .limit(1);
  if (!cat) return jsonSuccess(c, []);
  const opts = await db
    .select()
    .from(dropdownOptions)
    .where(eq(dropdownOptions.categoryId, cat.id))
    .orderBy(dropdownOptions.sortOrder);
  return jsonSuccess(c, rowsToSnake(opts as Record<string, unknown>[]));
});

app.post("/api/dropdowns/options", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const body = (await c.req.json()) as {
    category_id?: string;
    name?: string;
    prompt_fragment?: string;
    sort_order?: number;
  };
  const { category_id, name, prompt_fragment, sort_order } = body;
  if (!category_id || !name || !prompt_fragment) {
    return jsonError(c, "category_id, name, dan prompt_fragment wajib", 400);
  }
  const [row] = await db
    .insert(dropdownOptions)
    .values({
      userId: payload.userId,
      categoryId: category_id,
      name,
      promptFragment: prompt_fragment,
      sortOrder: sort_order ?? 0,
    })
    .returning();
  return jsonSuccess(c, row ? rowToSnake(row as Record<string, unknown>) : null, 201);
});

/** Tambah opsi Gaya Sertifikat (otomatis pakai/buat kategori gaya-sertifikat) */
app.post("/api/dropdowns/gaya-sertifikat", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const body = (await c.req.json()) as { name?: string; prompt_fragment?: string };
  const { name, prompt_fragment } = body;
  if (!name || !prompt_fragment) return jsonError(c, "name dan prompt_fragment wajib", 400);
  let [cat] = await db
    .select()
    .from(dropdownCategories)
    .where(and(eq(dropdownCategories.userId, payload.userId), eq(dropdownCategories.slug, "gaya-sertifikat")))
    .limit(1);
  if (!cat) {
    [cat] = await db
      .insert(dropdownCategories)
      .values({
        userId: payload.userId,
        name: "Gaya Sertifikat",
        slug: "gaya-sertifikat",
        sortOrder: 99999,
      })
      .returning();
  }
  if (!cat) return jsonError(c, "Gagal membuat kategori", 500);
  const existingOpts = await db
    .select({ s: dropdownOptions.sortOrder })
    .from(dropdownOptions)
    .where(and(eq(dropdownOptions.userId, payload.userId), eq(dropdownOptions.categoryId, cat.id)));
  const nextOpt =
    existingOpts.length > 0 ? Math.max(...existingOpts.map((o) => o.s ?? 0), 0) + 1 : 1;
  const [row] = await db
    .insert(dropdownOptions)
    .values({
      userId: payload.userId,
      categoryId: cat.id,
      name,
      promptFragment: prompt_fragment,
      sortOrder: nextOpt,
    })
    .returning();
  return jsonSuccess(c, row ? rowToSnake(row as Record<string, unknown>) : null, 201);
});

app.put("/api/dropdowns/options/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const id = c.req.param("id");
  const body = (await c.req.json()) as { name?: string; prompt_fragment?: string };
  await db
    .update(dropdownOptions)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.prompt_fragment !== undefined && { promptFragment: body.prompt_fragment }),
    })
    .where(and(eq(dropdownOptions.id, id), eq(dropdownOptions.userId, payload.userId)));
  const [row] = await db
    .select()
    .from(dropdownOptions)
    .where(and(eq(dropdownOptions.id, id), eq(dropdownOptions.userId, payload.userId)))
    .limit(1);
  if (!row) return jsonError(c, "Not found", 404);
  return jsonSuccess(c, rowToSnake(row as Record<string, unknown>));
});

app.delete("/api/dropdowns/options/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const id = c.req.param("id");
  await db.delete(dropdownOptions).where(and(eq(dropdownOptions.id, id), eq(dropdownOptions.userId, payload.userId)));
  return jsonSuccess(c, { deleted: true });
});

// ---- Prompts ----
app.get("/api/prompts", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const rows = await db
    .select()
    .from(prompts)
    .where(eq(prompts.userId, payload.userId))
    .orderBy(desc(prompts.createdAt));
  return jsonSuccess(c, rowsToSnake(rows as Record<string, unknown>[]));
});

app.get("/api/prompts/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(prompts)
    .where(and(eq(prompts.id, id), eq(prompts.userId, payload.userId)))
    .limit(1);
  if (!row) return jsonError(c, "Tidak ditemukan", 404);
  return jsonSuccess(c, rowToSnake(row as Record<string, unknown>));
});

app.post("/api/prompts", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const body = (await c.req.json()) as Record<string, unknown>;
  const [row] = await db
    .insert(prompts)
    .values({
      userId: payload.userId,
      title: (body.title as string) ?? null,
      promptText: (body.prompt_text as string) ?? "",
      parameters: (body.parameters as Record<string, unknown>) ?? {},
      tags: (body.tags as string[]) ?? [],
      isFavorite: (body.is_favorite as boolean) ?? false,
      promptType: (body.prompt_type as string) ?? "image",
      coverImage: (body.cover_image as string) || null,
    })
    .returning();
  return jsonSuccess(c, row ? rowToSnake(row as Record<string, unknown>) : null, 201);
});

app.patch("/api/prompts/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const id = c.req.param("id");
  const body = (await c.req.json()) as Record<string, unknown>;
  await db
    .update(prompts)
    .set({
      ...(body.is_favorite !== undefined && { isFavorite: body.is_favorite as boolean }),
      ...(body.title !== undefined && { title: body.title as string }),
      ...(body.cover_image !== undefined && { coverImage: (body.cover_image as string) || null }),
      ...(body.prompt_text !== undefined && { promptText: body.prompt_text as string }),
      ...(body.parameters !== undefined && { parameters: body.parameters as Record<string, unknown> }),
      updatedAt: new Date(),
    })
    .where(and(eq(prompts.id, id), eq(prompts.userId, payload.userId)));
  const [row] = await db
    .select()
    .from(prompts)
    .where(and(eq(prompts.id, id), eq(prompts.userId, payload.userId)))
    .limit(1);
  if (!row) return jsonError(c, "Not found", 404);
  return jsonSuccess(c, rowToSnake(row as Record<string, unknown>));
});

app.delete("/api/prompts/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  await db.delete(prompts).where(and(eq(prompts.id, c.req.param("id")), eq(prompts.userId, payload.userId)));
  return jsonSuccess(c, { deleted: true });
});

// ---- Prompt history ----
app.get("/api/prompt_history", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const rows = await db
    .select()
    .from(promptHistory)
    .where(eq(promptHistory.userId, payload.userId))
    .orderBy(desc(promptHistory.createdAt));
  return jsonSuccess(c, rowsToSnake(rows as Record<string, unknown>[]));
});

app.post("/api/prompt_history", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const body = (await c.req.json()) as Record<string, unknown>;
  const [row] = await db
    .insert(promptHistory)
    .values({
      userId: payload.userId,
      promptText: (body.prompt_text as string) ?? "",
      parameters: (body.parameters as Record<string, unknown>) ?? {},
      promptType: (body.prompt_type as string) ?? "image",
    })
    .returning();
  return jsonSuccess(c, row ? rowToSnake(row as Record<string, unknown>) : null, 201);
});

app.delete("/api/prompt_history/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  await db
    .delete(promptHistory)
    .where(and(eq(promptHistory.id, c.req.param("id")), eq(promptHistory.userId, payload.userId)));
  return jsonSuccess(c, { deleted: true });
});

/** Default template instruksi analisis gambar (di-seed per user kalau belum ada satupun). */
const DEFAULT_ANALISIS_INSTRUKSI: { judul: string; instruksi: string; sortOrder: number }[] = [
  {
    judul: "Mirip desain (bawaan)",
    instruksi:
      "Tolong analisis gambar ini dan buatkan prompting supaya desainnya sama atau sangat mirip saat di-generate ulang dengan AI gambar.",
    sortOrder: 0,
  },
  {
    judul: "Prompt singkat + JSON",
    instruksi:
      "Ringkas analisis dalam JSON (judul, ringkasan, parameter, prompt_utama). Fokus prompt_utama agar bisa recreate gaya visual ini.",
    sortOrder: 1,
  },
  {
    judul: "Sertifikat / dokumen formal",
    instruksi:
      "Analisis sebagai layout sertifikat atau dokumen formal: margin, ornamen, font feel, warna, dan prompt_utama untuk regenerate serupa.",
    sortOrder: 2,
  },
  {
    judul: "Ilustrasi / karakter",
    instruksi:
      "Analisis gaya ilustrasi, proporsi karakter, palet, line art/shading, lalu JSON + prompt_utama detail untuk gambar serupa.",
    sortOrder: 3,
  },
];

// ---- Template instruksi Analisis Gambar (CRUD, per user) ----
app.get("/api/analisis-instruksi", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  let rows = await db
    .select()
    .from(analisisInstruksiTemplates)
    .where(eq(analisisInstruksiTemplates.userId, payload.userId))
    .orderBy(asc(analisisInstruksiTemplates.sortOrder), desc(analisisInstruksiTemplates.createdAt));
  if (rows.length === 0) {
    await db.insert(analisisInstruksiTemplates).values(
      DEFAULT_ANALISIS_INSTRUKSI.map((d) => ({
        userId: payload.userId,
        judul: d.judul,
        instruksi: d.instruksi,
        sortOrder: d.sortOrder,
      }))
    );
    rows = await db
      .select()
      .from(analisisInstruksiTemplates)
      .where(eq(analisisInstruksiTemplates.userId, payload.userId))
      .orderBy(asc(analisisInstruksiTemplates.sortOrder), desc(analisisInstruksiTemplates.createdAt));
  }
  return jsonSuccess(c, rowsToSnake(rows as Record<string, unknown>[]));
});

app.post("/api/analisis-instruksi", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const body = (await c.req.json()) as { judul?: string; instruksi?: string; sort_order?: number };
  const judul = (body.judul || "").trim();
  const instruksi = (body.instruksi || "").trim();
  if (!judul || !instruksi) return jsonError(c, "judul dan instruksi wajib", 400);
  const [row] = await db
    .insert(analisisInstruksiTemplates)
    .values({
      userId: payload.userId,
      judul,
      instruksi,
      sortOrder: body.sort_order ?? 0,
    })
    .returning();
  return jsonSuccess(c, row ? rowToSnake(row as Record<string, unknown>) : null, 201);
});

app.put("/api/analisis-instruksi/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const id = c.req.param("id");
  const body = (await c.req.json()) as { judul?: string; instruksi?: string; sort_order?: number };
  const judul = body.judul !== undefined ? String(body.judul).trim() : undefined;
  const instruksi = body.instruksi !== undefined ? String(body.instruksi).trim() : undefined;
  if (judul !== undefined && !judul) return jsonError(c, "judul tidak boleh kosong", 400);
  if (instruksi !== undefined && !instruksi) return jsonError(c, "instruksi tidak boleh kosong", 400);
  const [row] = await db
    .update(analisisInstruksiTemplates)
    .set({
      ...(judul !== undefined && { judul }),
      ...(instruksi !== undefined && { instruksi }),
      ...(body.sort_order !== undefined && { sortOrder: body.sort_order }),
      updatedAt: new Date(),
    })
    .where(and(eq(analisisInstruksiTemplates.id, id), eq(analisisInstruksiTemplates.userId, payload.userId)))
    .returning();
  if (!row) return jsonError(c, "Tidak ditemukan", 404);
  return jsonSuccess(c, rowToSnake(row as Record<string, unknown>));
});

app.delete("/api/analisis-instruksi/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const id = c.req.param("id");
  const deleted = await db
    .delete(analisisInstruksiTemplates)
    .where(and(eq(analisisInstruksiTemplates.id, id), eq(analisisInstruksiTemplates.userId, payload.userId)))
    .returning();
  if (deleted.length === 0) return jsonError(c, "Tidak ditemukan", 404);
  return jsonSuccess(c, { deleted: true });
});

// ---- Parameter instruksi gambar (Buat Prompt): judul + prompting, CRUD ----
const SEED_PROMPT_IMAGE_FIELDS: { judul: string; prompting: string; sortOrder: number }[] = [
  { judul: "Subjek", prompting: "Fokus utama gambar: siapa atau apa (orang, produk, hewan, objek).", sortOrder: 0 },
  { judul: "Gaya", prompting: "Gaya visual: realistis, anime, 3D, ilustrasi flat, foto, digital art.", sortOrder: 1 },
  { judul: "Latar", prompting: "Tempat/setting: studio, outdoor, kota, alam, ruangan minimal, abstrak.", sortOrder: 2 },
  { judul: "Cahaya", prompting: "Pencahayaan: softbox, golden hour, neon, high contrast, low key.", sortOrder: 3 },
  { judul: "Mood", prompting: "Suasana: tenang, dramatis, playful, cinematic, elegan.", sortOrder: 4 },
  { judul: "Warna", prompting: "Palet atau aksen warna dominan (mis. pastel, monokrom, emas-biru).", sortOrder: 5 },
  { judul: "Komposisi", prompting: "Framing: close-up, wide, rule of thirds, simetris, dari atas.", sortOrder: 6 },
  { judul: "Detail tambahan", prompting: "Aksesori, tekstur, merek feel, atau larangan (tanpa teks, tanpa logo).", sortOrder: 7 },
];

app.get("/api/prompt-image-fields", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  let rows = await db
    .select()
    .from(promptImageInstructionFields)
    .where(eq(promptImageInstructionFields.userId, payload.userId))
    .orderBy(asc(promptImageInstructionFields.sortOrder), desc(promptImageInstructionFields.createdAt));
  if (rows.length === 0) {
    await db.insert(promptImageInstructionFields).values(
      SEED_PROMPT_IMAGE_FIELDS.map((d) => ({
        userId: payload.userId,
        judul: d.judul,
        prompting: d.prompting,
        sortOrder: d.sortOrder,
      }))
    );
    rows = await db
      .select()
      .from(promptImageInstructionFields)
      .where(eq(promptImageInstructionFields.userId, payload.userId))
      .orderBy(asc(promptImageInstructionFields.sortOrder), desc(promptImageInstructionFields.createdAt));
  }
  return jsonSuccess(c, rowsToSnake(rows as Record<string, unknown>[]));
});

app.post("/api/prompt-image-fields", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const body = (await c.req.json()) as { judul?: string; prompting?: string; sort_order?: number };
  const judul = (body.judul || "").trim();
  const prompting = (body.prompting || "").trim();
  if (!judul || !prompting) return jsonError(c, "judul dan prompting wajib", 400);
  const [row] = await db
    .insert(promptImageInstructionFields)
    .values({
      userId: payload.userId,
      judul,
      prompting,
      sortOrder: body.sort_order ?? 0,
    })
    .returning();
  return jsonSuccess(c, row ? rowToSnake(row as Record<string, unknown>) : null, 201);
});

app.put("/api/prompt-image-fields/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const id = c.req.param("id");
  const body = (await c.req.json()) as { judul?: string; prompting?: string; sort_order?: number };
  const judul = body.judul !== undefined ? String(body.judul).trim() : undefined;
  const prompting = body.prompting !== undefined ? String(body.prompting).trim() : undefined;
  if (judul !== undefined && !judul) return jsonError(c, "judul tidak boleh kosong", 400);
  if (prompting !== undefined && !prompting) return jsonError(c, "prompting tidak boleh kosong", 400);
  const [row] = await db
    .update(promptImageInstructionFields)
    .set({
      ...(judul !== undefined && { judul }),
      ...(prompting !== undefined && { prompting }),
      ...(body.sort_order !== undefined && { sortOrder: body.sort_order }),
      updatedAt: new Date(),
    })
    .where(and(eq(promptImageInstructionFields.id, id), eq(promptImageInstructionFields.userId, payload.userId)))
    .returning();
  if (!row) return jsonError(c, "Tidak ditemukan", 404);
  return jsonSuccess(c, rowToSnake(row as Record<string, unknown>));
});

app.delete("/api/prompt-image-fields/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const id = c.req.param("id");
  const deleted = await db
    .delete(promptImageInstructionFields)
    .where(and(eq(promptImageInstructionFields.id, id), eq(promptImageInstructionFields.userId, payload.userId)))
    .returning();
  if (deleted.length === 0) return jsonError(c, "Tidak ditemukan", 404);
  return jsonSuccess(c, { deleted: true });
});

// ---- Dropdown categories & options ----
app.get("/api/dropdown_categories", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const rows = await db
    .select()
    .from(dropdownCategories)
    .where(eq(dropdownCategories.userId, payload.userId))
    .orderBy(asc(dropdownCategories.sortOrder), asc(dropdownCategories.name));
  return jsonSuccess(c, rowsToSnake(rows as Record<string, unknown>[]));
});

app.post("/api/dropdown_categories", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return jsonError(c, "Body JSON tidak valid", 400);
  }
  const name = String((body.name as string) ?? "").trim();
  if (!name) return jsonError(c, "Nama kategori wajib diisi", 400);
  let slugVal =
    String((body.slug as string) ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") ||
    name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  if (!slugVal) slugVal = `kategori-${Date.now()}`;
  let sortOrder = Number(body.sort_order);
  if (!Number.isFinite(sortOrder) || sortOrder < 1) {
    const cats = await db
      .select({ s: dropdownCategories.sortOrder })
      .from(dropdownCategories)
      .where(eq(dropdownCategories.userId, payload.userId));
    const max = cats.length ? Math.max(...cats.map((x) => x.s ?? 0), 0) : 0;
    sortOrder = max + 1;
  }
  try {
    const [row] = await db
      .insert(dropdownCategories)
      .values({
        userId: payload.userId,
        name,
        slug: slugVal,
        description: (body.description as string) ?? null,
        sortOrder,
      })
      .returning();
    if (!row) return jsonError(c, "Gagal menyimpan kategori", 500);
    return jsonSuccess(c, rowToSnake(row as Record<string, unknown>), 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error";
    console.error("[dropdown_categories POST]", msg);
    return jsonError(c, msg.includes("duplicate") ? "Slug/kategori bentrok, coba nama lain" : msg, 500);
  }
});

app.put("/api/dropdown_categories/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const id = c.req.param("id");
  const body = (await c.req.json()) as Record<string, unknown>;
  const name = (body.name as string) ?? "";
  const slugVal =
    (body.slug as string) || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [row] = await db
    .update(dropdownCategories)
    .set({
      name: name || undefined,
      slug: slugVal || undefined,
      description: (body.description as string) ?? undefined,
      sortOrder: (body.sort_order as number) ?? undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(dropdownCategories.id, id), eq(dropdownCategories.userId, payload.userId)))
    .returning();
  return jsonSuccess(c, row ? rowToSnake(row as Record<string, unknown>) : null);
});

app.delete("/api/dropdown_categories/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  await db
    .delete(dropdownCategories)
    .where(and(eq(dropdownCategories.id, c.req.param("id")), eq(dropdownCategories.userId, payload.userId)));
  return jsonSuccess(c, { deleted: true });
});

/** Hapus SEMUA kategori+opsi dropdown user, lalu isi 25 kategori gambar/iklan (tanpa sertifikat). */
app.post("/api/dropdowns/reset-seed-gambar", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  await db.delete(dropdownCategories).where(eq(dropdownCategories.userId, payload.userId));
  let sortCat = 1;
  let totalOpts = 0;
  for (const cat of DROPDOWN_SEED_GAMBAR) {
    const [row] = await db
      .insert(dropdownCategories)
      .values({
        userId: payload.userId,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        sortOrder: sortCat++,
      })
      .returning();
    if (!row) continue;
    let sortOpt = 1;
    for (const opt of cat.options) {
      await db.insert(dropdownOptions).values({
        userId: payload.userId,
        categoryId: row.id,
        name: opt.name,
        promptFragment: opt.prompt,
        sortOrder: sortOpt++,
      });
      totalOpts++;
    }
  }
  return jsonSuccess(c, {
    categories: DROPDOWN_SEED_GAMBAR.length,
    options: totalOpts,
    message: "Dropdown gambar diisi ulang. Gaya sertifikat: tambah lagi di Generator Sertifikat jika perlu.",
  });
});

app.get("/api/dropdown_options", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const rows = await db
    .select()
    .from(dropdownOptions)
    .where(eq(dropdownOptions.userId, payload.userId))
    .orderBy(asc(dropdownOptions.categoryId), asc(dropdownOptions.sortOrder));
  return jsonSuccess(c, rowsToSnake(rows as Record<string, unknown>[]));
});

app.post("/api/dropdown_options", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const body = (await c.req.json()) as Record<string, unknown>;
  const categoryId = (body.category_id as string) ?? "";
  let optSort = Number(body.sort_order);
  if (!Number.isFinite(optSort) || optSort < 1) {
    const opts = await db
      .select({ s: dropdownOptions.sortOrder })
      .from(dropdownOptions)
      .where(and(eq(dropdownOptions.userId, payload.userId), eq(dropdownOptions.categoryId, categoryId)));
    optSort = opts.length ? Math.max(...opts.map((o) => o.s ?? 0), 0) + 1 : 1;
  }
  const [row] = await db
    .insert(dropdownOptions)
    .values({
      userId: payload.userId,
      categoryId,
      name: (body.name as string) ?? "",
      promptFragment: (body.prompt_fragment as string) ?? "",
      metadata: (body.metadata as Record<string, unknown>) ?? {},
      sortOrder: optSort,
    })
    .returning();
  return jsonSuccess(c, row ? rowToSnake(row as Record<string, unknown>) : null, 201);
});

app.put("/api/dropdown_options/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const id = c.req.param("id");
  const body = (await c.req.json()) as Record<string, unknown>;
  const so = body.sort_order;
  const [row] = await db
    .update(dropdownOptions)
    .set({
      name: (body.name as string) ?? undefined,
      promptFragment: (body.prompt_fragment as string) ?? undefined,
      metadata: (body.metadata as Record<string, unknown>) ?? undefined,
      ...(so !== undefined && Number.isFinite(Number(so)) ? { sortOrder: Number(so) } : {}),
    })
    .where(and(eq(dropdownOptions.id, id), eq(dropdownOptions.userId, payload.userId)))
    .returning();
  return jsonSuccess(c, row ? rowToSnake(row as Record<string, unknown>) : null);
});

app.delete("/api/dropdown_options/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  await db
    .delete(dropdownOptions)
    .where(and(eq(dropdownOptions.id, c.req.param("id")), eq(dropdownOptions.userId, payload.userId)));
  return jsonSuccess(c, { deleted: true });
});

// ---- Stats ----
app.get("/api/stats", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const [p, h] = await Promise.all([
    db.select().from(prompts).where(eq(prompts.userId, payload.userId)),
    db.select().from(promptHistory).where(eq(promptHistory.userId, payload.userId)),
  ]);
  return jsonSuccess(c, {
    totalPrompts: p.length,
    totalHistory: h.length,
  });
});

/** Buat tabel template instruksi analisis gambar jika belum ada (hindari error 42P01 tanpa drizzle push). */
async function ensureAnalisisInstruksiTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analisis_instruksi_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      judul TEXT NOT NULL,
      instruksi TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_analisis_instruksi_user ON analisis_instruksi_templates(user_id);`
  );
}

async function ensurePromptsCoverImageColumn(): Promise<void> {
  await pool.query(`
    ALTER TABLE prompts ADD COLUMN IF NOT EXISTS cover_image TEXT;
  `);
}

async function ensurePromptImageFieldsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prompt_image_instruction_fields (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      judul TEXT NOT NULL,
      prompting TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_prompt_image_fields_user ON prompt_image_instruction_fields(user_id);`
  );
}

ensureAnalisisInstruksiTable()
  .then(() => ensurePromptsCoverImageColumn())
  .then(() => ensurePromptImageFieldsTable())
  .catch((e) => console.error("Gagal siapkan DB (non-fatal di serverless):", e));

export default app;
