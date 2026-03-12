/**
 * Hono API server - Unified monorepo backend.
 * Semua response JSON: { success, data, error }.
 */
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { jwt } from "hono/jwt";
import { serve } from "@hono/node-server";
import bcrypt from "bcryptjs";
import jwtSign from "jsonwebtoken";
import { db } from "./db";
import {
  users,
  profiles,
  prompts,
  promptHistory,
  promptTemplates,
  dropdownCategories,
  dropdownOptions,
} from "./schema";
import { eq, and, desc } from "drizzle-orm";
import { rowToSnake, rowsToSnake } from "./snake";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const PORT = Number(process.env.PORT) || 5000;

type ApiResponse<T> = { success: boolean; data: T | null; error: string | null };

function jsonSuccess<T>(c: { json: (body: ApiResponse<T>, status?: number) => Response }, data: T, status = 200) {
  return c.json({ success: true, data, error: null } as ApiResponse<T>, status);
}
function jsonError(c: { json: (body: ApiResponse<null>) => Response }, message: string, status = 400) {
  return c.json({ success: false, data: null, error: message } as ApiResponse<null>, status);
}

type JWTPayload = { userId: string; email: string };

const app = new Hono();

// CORS: origin harus string[] atau string, bukan boolean (optsOrigin.includes)
const DEV_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
];
app.use(
  "*",
  cors({
    origin: (origin) =>
      process.env.NODE_ENV !== "production"
        ? origin || null
        : DEV_ORIGINS.includes(origin)
          ? origin
          : null,
    credentials: true,
  })
);

// Hono JWT middleware perlu opsi alg, gunakan HS256
const authMiddleware = jwt({
  secret: JWT_SECRET,
  alg: "HS256",
});

function createToken(userId: string, email: string): string {
  return jwtSign.sign({ userId, email } as JWTPayload, JWT_SECRET, { expiresIn: "7d" });
}

// ---- Auth ----
app.post("/api/auth/login", async (c) => {
  const body = (await c.req.json()) as { email?: string; password?: string };
  const { email, password } = body;
  if (!email || !password) return jsonError(c, "Email dan password wajib", 400);
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return jsonError(c, "Email atau password salah", 401);
  }
  const token = createToken(user.id, user.email);
  return jsonSuccess(c, { user: { id: user.id, email: user.email, username: user.username }, token }, 200);
});

app.post("/api/auth/signup", async (c) => {
  const body = (await c.req.json()) as { email?: string; password?: string; username?: string };
  const { email, password, username } = body;
  if (!email || !password) return jsonError(c, "Email dan password wajib", 400);
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
});

app.get("/api/auth/me", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user) return jsonError(c, "User not found", 404);
  return jsonSuccess(c, { id: user.id, email: user.email, username: user.username });
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
  const body = (await c.req.json()) as { ai_endpoint_url?: string; ai_model_name?: string; theme_preference?: string };
  await db
    .update(profiles)
    .set({
      aiEndpointUrl: body.ai_endpoint_url ?? undefined,
      aiModelName: body.ai_model_name ?? undefined,
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
        sortOrder: 0,
      })
      .returning();
  }
  if (!cat) return jsonError(c, "Gagal membuat kategori", 500);
  const [row] = await db
    .insert(dropdownOptions)
    .values({
      userId: payload.userId,
      categoryId: cat.id,
      name,
      promptFragment: prompt_fragment,
      sortOrder: 0,
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

// ---- Prompt templates ----
app.get("/api/prompt_templates", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const rows = await db
    .select()
    .from(promptTemplates)
    .where(eq(promptTemplates.userId, payload.userId))
    .orderBy(desc(promptTemplates.createdAt));
  return jsonSuccess(c, rowsToSnake(rows as Record<string, unknown>[]));
});

// ---- Dropdown categories & options ----
app.get("/api/dropdown_categories", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const rows = await db
    .select()
    .from(dropdownCategories)
    .where(eq(dropdownCategories.userId, payload.userId))
    .orderBy(dropdownCategories.sortOrder);
  return jsonSuccess(c, rowsToSnake(rows as Record<string, unknown>[]));
});

app.post("/api/dropdown_categories", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const body = (await c.req.json()) as Record<string, unknown>;
  const name = (body.name as string) || "";
  const slugVal =
    (body.slug as string) || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const [row] = await db
    .insert(dropdownCategories)
    .values({
      userId: payload.userId,
      name,
      slug: slugVal,
      description: (body.description as string) ?? null,
      sortOrder: (body.sort_order as number) ?? 0,
    })
    .returning();
  return jsonSuccess(c, row ? rowToSnake(row as Record<string, unknown>) : null, 201);
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

app.get("/api/dropdown_options", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const rows = await db
    .select()
    .from(dropdownOptions)
    .where(eq(dropdownOptions.userId, payload.userId))
    .orderBy(dropdownOptions.sortOrder);
  return jsonSuccess(c, rowsToSnake(rows as Record<string, unknown>[]));
});

app.post("/api/dropdown_options", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const body = (await c.req.json()) as Record<string, unknown>;
  const [row] = await db
    .insert(dropdownOptions)
    .values({
      userId: payload.userId,
      categoryId: (body.category_id as string) ?? "",
      name: (body.name as string) ?? "",
      promptFragment: (body.prompt_fragment as string) ?? "",
      metadata: (body.metadata as Record<string, unknown>) ?? {},
      sortOrder: (body.sort_order as number) ?? 0,
    })
    .returning();
  return jsonSuccess(c, row ? rowToSnake(row as Record<string, unknown>) : null, 201);
});

app.put("/api/dropdown_options/:id", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload") as JWTPayload;
  const id = c.req.param("id");
  const body = (await c.req.json()) as Record<string, unknown>;
  const [row] = await db
    .update(dropdownOptions)
    .set({
      name: (body.name as string) ?? undefined,
      promptFragment: (body.prompt_fragment as string) ?? undefined,
      metadata: (body.metadata as Record<string, unknown>) ?? undefined,
      sortOrder: (body.sort_order as number) ?? undefined,
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
  const [p, t, h] = await Promise.all([
    db.select().from(prompts).where(eq(prompts.userId, payload.userId)),
    db.select().from(promptTemplates).where(eq(promptTemplates.userId, payload.userId)),
    db.select().from(promptHistory).where(eq(promptHistory.userId, payload.userId)),
  ]);
  return jsonSuccess(c, {
    totalPrompts: p.length,
    totalTemplates: t.length,
    totalHistory: h.length,
  });
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`API (Hono) running at http://localhost:${info.port}`);
});

export default app;
