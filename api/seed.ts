/**
 * Seed database dengan banyak data dummy.
 * Pakai pg driver agar insert stabil (Neon serverless kadang error saat batch).
 * Jalankan: npm run seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./seed-db";
import {
  users,
  profiles,
  dropdownCategories,
  dropdownOptions,
  prompts,
  promptHistory,
} from "./schema";
import { DROPDOWN_SEED_GAMBAR } from "./dropdown-seed-gambar";

const DEV_EMAIL = "eka@example.com";
const DEV_USERNAME = "admin_eka";
const DEV_PASSWORD = "password123";

async function seed() {
  console.log("Seeding...");

  // ---- User & profile ----
  const existing = await db.select().from(users).where(eq(users.email, DEV_EMAIL)).limit(1);
  let userId: string;

  if (existing.length > 0) {
    userId = existing[0].id;
    // Reset password ke password123 agar Dev Login selalu bisa dipakai
    const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
    console.log("User admin_eka sudah ada, password direset ke password123.");
  } else {
    const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
    const [user] = await db
      .insert(users)
      .values({
        email: DEV_EMAIL,
        username: DEV_USERNAME,
        passwordHash,
      })
      .returning();

    if (!user) {
      console.error("Gagal membuat user");
      process.exit(1);
    }

    userId = user.id;

    await db.insert(profiles).values({
      userId,
      displayName: DEV_USERNAME,
      themePreference: "dark",
    });
  }

  // ---- Dropdown gambar (25 kategori, tanpa sertifikat) — hanya jika user belum punya kategori ----
  const existingCats = await db.select().from(dropdownCategories).where(eq(dropdownCategories.userId, userId)).limit(1);
  if (existingCats.length === 0) {
    let sortCat = 1;
    for (const cat of DROPDOWN_SEED_GAMBAR) {
      const [row] = await db
        .insert(dropdownCategories)
        .values({
          userId,
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
          userId,
          categoryId: row.id,
          name: opt.name,
          promptFragment: opt.prompt,
          sortOrder: sortOpt++,
        });
      }
    }
    console.log("Dropdown gambar:", DROPDOWN_SEED_GAMBAR.length, "kategori diisi.");
  }

  // ---- Prompts & riwayat ----
  const [p1] = await db
    .insert(prompts)
    .values({
      userId,
      title: "Poster Workshop AI",
      promptText:
        "modern flat illustration of people collaborating with AI tools in a bright workspace, isometric style, vibrant colors",
      parameters: { tema: "AI Workshop", gaya: "flat illustration" },
      tags: ["poster", "ai", "workshop"],
      promptType: "image",
    })
    .returning();

  const [p2] = await db
    .insert(prompts)
    .values({
      userId,
      title: "Landscape Futuristik",
      promptText:
        "futuristic city skyline at night, neon lights, flying cars, high detail, ultra wide shot",
      parameters: { tema: "futuristic city" },
      tags: ["landscape", "cyberpunk"],
      promptType: "image",
    })
    .returning();

  if (p1) {
    await db.insert(promptHistory).values({
      userId,
      promptText: p1.promptText,
      parameters: p1.parameters,
      promptType: "image",
    });
  }

  if (p2) {
    await db.insert(promptHistory).values({
      userId,
      promptText: p2.promptText,
      parameters: p2.parameters,
      promptType: "image",
    });
  }

  console.log("Seed berhasil:");
  console.log("  Email:", DEV_EMAIL);
  console.log("  Username:", DEV_USERNAME);
  console.log("  Password:", DEV_PASSWORD);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
