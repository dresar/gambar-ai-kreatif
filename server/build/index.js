import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./lib/db.js";
import { users, profiles, prompts, promptHistory, promptTemplates, dropdownCategories, dropdownOptions, } from "./schema.js";
import { eq, and, desc } from "drizzle-orm";
import { rowsToSnake, rowToSnake } from "./lib/snake.js";
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const PORT = process.env.PORT || 5000;
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.email = decoded.email;
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}
// ---- Auth ----
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        res.status(400).json({ error: "Email dan password wajib" });
        return;
    }
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ error: "Email atau password salah" });
        return;
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({
        user: { id: user.id, email: user.email, username: user.username },
        token,
    });
});
app.post("/api/auth/signup", async (req, res) => {
    const { email, password, username } = req.body || {};
    if (!email || !password) {
        res.status(400).json({ error: "Email dan password wajib" });
        return;
    }
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
        res.status(400).json({ error: "Email sudah terdaftar" });
        return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
        .insert(users)
        .values({ email, passwordHash, username: username || null })
        .returning();
    if (!user) {
        res.status(500).json({ error: "Gagal membuat akun" });
        return;
    }
    await db.insert(profiles).values({ userId: user.id, displayName: username || email });
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({
        user: { id: user.id, email: user.email, username: user.username },
        token,
    });
});
// ---- Profiles ----
app.get("/api/profiles/me", authMiddleware, async (req, res) => {
    const userId = req.userId;
    const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!p)
        res.status(404).json({ error: "Profile not found" });
    else
        res.json(rowToSnake(p));
});
app.patch("/api/profiles/me", authMiddleware, async (req, res) => {
    const userId = req.userId;
    const { ai_endpoint_url, ai_model_name, theme_preference } = req.body || {};
    await db
        .update(profiles)
        .set({
        aiEndpointUrl: ai_endpoint_url ?? undefined,
        aiModelName: ai_model_name ?? undefined,
        themePreference: theme_preference ?? undefined,
    })
        .where(eq(profiles.userId, userId));
    const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    res.json(p ? rowToSnake(p) : {});
});
// ---- Prompts ----
app.get("/api/prompts", authMiddleware, async (req, res) => {
    const userId = req.userId;
    const rows = await db
        .select()
        .from(prompts)
        .where(eq(prompts.userId, userId))
        .orderBy(desc(prompts.createdAt));
    res.json(rowsToSnake(rows));
});
app.post("/api/prompts", authMiddleware, async (req, res) => {
    const userId = req.userId;
    const { title, prompt_text, parameters, tags, is_favorite, prompt_type } = req.body || {};
    const [row] = await db
        .insert(prompts)
        .values({
        userId,
        title: title ?? null,
        promptText: prompt_text,
        parameters: parameters ?? {},
        tags: tags ?? [],
        isFavorite: is_favorite ?? false,
        promptType: prompt_type ?? "image",
    })
        .returning();
    res.status(201).json(rowToSnake(row));
});
app.patch("/api/prompts/:id", authMiddleware, async (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    const body = req.body || {};
    await db
        .update(prompts)
        .set({
        ...(body.is_favorite !== undefined && { isFavorite: body.is_favorite }),
        ...(body.title !== undefined && { title: body.title }),
    })
        .where(and(eq(prompts.id, id), eq(prompts.userId, userId)));
    const [row] = await db
        .select()
        .from(prompts)
        .where(and(eq(prompts.id, id), eq(prompts.userId, userId)))
        .limit(1);
    if (!row)
        res.status(404).json({ error: "Not found" });
    else
        res.json(rowToSnake(row));
});
app.delete("/api/prompts/:id", authMiddleware, async (req, res) => {
    const userId = req.userId;
    await db.delete(prompts).where(and(eq(prompts.id, req.params.id), eq(prompts.userId, userId)));
    res.status(204).send();
});
// ---- Prompt history ----
app.get("/api/prompt_history", authMiddleware, async (req, res) => {
    const userId = req.userId;
    const rows = await db
        .select()
        .from(promptHistory)
        .where(eq(promptHistory.userId, userId))
        .orderBy(desc(promptHistory.createdAt));
    res.json(rowsToSnake(rows));
});
app.post("/api/prompt_history", authMiddleware, async (req, res) => {
    const userId = req.userId;
    const { prompt_text, parameters, prompt_type } = req.body || {};
    const [row] = await db
        .insert(promptHistory)
        .values({
        userId,
        promptText: prompt_text,
        parameters: parameters ?? {},
        promptType: prompt_type ?? "image",
    })
        .returning();
    res.status(201).json(rowToSnake(row));
});
app.delete("/api/prompt_history/:id", authMiddleware, async (req, res) => {
    const userId = req.userId;
    await db
        .delete(promptHistory)
        .where(and(eq(promptHistory.id, req.params.id), eq(promptHistory.userId, userId)));
    res.status(204).send();
});
// ---- Prompt templates ----
app.get("/api/prompt_templates", authMiddleware, async (req, res) => {
    const userId = req.userId;
    const rows = await db
        .select()
        .from(promptTemplates)
        .where(eq(promptTemplates.userId, userId))
        .orderBy(desc(promptTemplates.createdAt));
    res.json(rowsToSnake(rows));
});
// ---- Dropdown categories ----
app.get("/api/dropdown_categories", authMiddleware, async (req, res) => {
    const userId = req.userId;
    const rows = await db
        .select()
        .from(dropdownCategories)
        .where(eq(dropdownCategories.userId, userId))
        .orderBy(dropdownCategories.sortOrder);
    res.json(rowsToSnake(rows));
});
app.post("/api/dropdown_categories", authMiddleware, async (req, res) => {
    const userId = req.userId;
    const { name, slug, description, sort_order } = req.body || {};
    const slugVal = slug || name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "";
    const [row] = await db
        .insert(dropdownCategories)
        .values({
        userId,
        name: name || "",
        slug: slugVal,
        description: description ?? null,
        sortOrder: sort_order ?? 0,
    })
        .returning();
    res.status(201).json(rowToSnake(row));
});
app.delete("/api/dropdown_categories/:id", authMiddleware, async (req, res) => {
    const userId = req.userId;
    await db
        .delete(dropdownCategories)
        .where(and(eq(dropdownCategories.id, req.params.id), eq(dropdownCategories.userId, userId)));
    res.status(204).send();
});
// ---- Dropdown options ----
app.get("/api/dropdown_options", authMiddleware, async (req, res) => {
    const userId = req.userId;
    const rows = await db
        .select()
        .from(dropdownOptions)
        .where(eq(dropdownOptions.userId, userId))
        .orderBy(dropdownOptions.sortOrder);
    res.json(rowsToSnake(rows));
});
app.post("/api/dropdown_options", authMiddleware, async (req, res) => {
    const userId = req.userId;
    const { category_id, name, prompt_fragment, metadata, sort_order } = req.body || {};
    const [row] = await db
        .insert(dropdownOptions)
        .values({
        userId,
        categoryId: category_id,
        name: name || "",
        promptFragment: prompt_fragment || "",
        metadata: metadata ?? {},
        sortOrder: sort_order ?? 0,
    })
        .returning();
    res.status(201).json(rowToSnake(row));
});
app.delete("/api/dropdown_options/:id", authMiddleware, async (req, res) => {
    const userId = req.userId;
    await db
        .delete(dropdownOptions)
        .where(and(eq(dropdownOptions.id, req.params.id), eq(dropdownOptions.userId, userId)));
    res.status(204).send();
});
// ---- Counts for dashboard ----
app.get("/api/stats", authMiddleware, async (req, res) => {
    const userId = req.userId;
    const totalPrompts = await db.select().from(prompts).where(eq(prompts.userId, userId));
    const totalTemplates = await db.select().from(promptTemplates).where(eq(promptTemplates.userId, userId));
    const totalHistory = await db.select().from(promptHistory).where(eq(promptHistory.userId, userId));
    res.json({
        totalPrompts: totalPrompts.length,
        totalTemplates: totalTemplates.length,
        totalHistory: totalHistory.length,
    });
});
app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
});
