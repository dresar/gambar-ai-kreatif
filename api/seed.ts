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
  promptTemplates,
} from "./schema";

const DEV_EMAIL = "eka@example.com";
const DEV_USERNAME = "admin_eka";
const DEV_PASSWORD = "password123";

const DEFAULT_GAYA = [
  {
    name: "Klasik",
    fragment:
      "classic elegant certificate with ornate gold borders, serif typography, and traditional formal design",
  },
  {
    name: "Elegan",
    fragment:
      "sophisticated elegant certificate with subtle gradients, refined typography, and luxurious minimalist aesthetics",
  },
  {
    name: "Modern Minimal",
    fragment:
      "modern minimalist certificate with clean lines, sans-serif typography, and contemporary design elements",
  },
  {
    name: "Formal Akademik",
    fragment:
      "formal academic certificate with institutional seal, structured layout, and professional academic styling",
  },
];

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

  // ---- Dropdown: Gaya Sertifikat ----
  const [gayaCat] = await db
    .insert(dropdownCategories)
    .values({
      userId,
      name: "Gaya Sertifikat",
      slug: "gaya-sertifikat",
      description: "Gaya visual untuk generator sertifikat",
      sortOrder: 0,
    })
    .onConflictDoNothing()
    .returning();

  const gayaCategoryId = gayaCat?.id;
  if (gayaCategoryId) {
    for (let i = 0; i < DEFAULT_GAYA.length; i++) {
      await db
        .insert(dropdownOptions)
        .values({
          userId,
          categoryId: gayaCategoryId,
          name: DEFAULT_GAYA[i].name,
          promptFragment: DEFAULT_GAYA[i].fragment,
          sortOrder: i,
        })
        .onConflictDoNothing();
    }
  }

  // ---- Dropdown builder (contoh kategori untuk BuatPrompt) ----
  const builderCategories = [
    { name: "Pencahayaan", slug: "pencahayaan" },
    { name: "Gaya Kamera", slug: "gaya-kamera" },
    { name: "Mood", slug: "mood" },
  ];

  const [lightCat] = await db
    .insert(dropdownCategories)
    .values({
      userId,
      name: builderCategories[0].name,
      slug: builderCategories[0].slug,
      sortOrder: 10,
    })
    .onConflictDoNothing()
    .returning();

  const [cameraCat] = await db
    .insert(dropdownCategories)
    .values({
      userId,
      name: builderCategories[1].name,
      slug: builderCategories[1].slug,
      sortOrder: 20,
    })
    .onConflictDoNothing()
    .returning();

  const [moodCat] = await db
    .insert(dropdownCategories)
    .values({
      userId,
      name: builderCategories[2].name,
      slug: builderCategories[2].slug,
      sortOrder: 30,
    })
    .onConflictDoNothing()
    .returning();

  if (lightCat) {
    await db
      .insert(dropdownOptions)
      .values([
        {
          userId,
          categoryId: lightCat.id,
          name: "Golden hour",
          promptFragment: "warm golden hour lighting, soft shadows",
          sortOrder: 0,
        },
        {
          userId,
          categoryId: lightCat.id,
          name: "Neon",
          promptFragment: "neon lights, high contrast, cyberpunk atmosphere",
          sortOrder: 1,
        },
      ])
      .onConflictDoNothing();
  }

  if (cameraCat) {
    await db
      .insert(dropdownOptions)
      .values([
        {
          userId,
          categoryId: cameraCat.id,
          name: "Wide angle",
          promptFragment: "wide angle lens, dramatic perspective",
          sortOrder: 0,
        },
        {
          userId,
          categoryId: cameraCat.id,
          name: "Portrait 50mm",
          promptFragment: "50mm portrait lens, shallow depth of field, bokeh background",
          sortOrder: 1,
        },
      ])
      .onConflictDoNothing();
  }

  if (moodCat) {
    await db
      .insert(dropdownOptions)
      .values([
        {
          userId,
          categoryId: moodCat.id,
          name: "Ceria",
          promptFragment: "bright, cheerful, vibrant colors, optimistic mood",
          sortOrder: 0,
        },
        {
          userId,
          categoryId: moodCat.id,
          name: "Dramatis",
          promptFragment: "dramatic, high contrast, cinematic atmosphere",
          sortOrder: 1,
        },
      ])
      .onConflictDoNothing();
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

  // ---- Template prompt ----
  await db
    .insert(promptTemplates)
    .values([
      {
        userId,
        name: "Thumbnail YouTube Tech",
        description: "Template untuk thumbnail video teknologi / coding",
        category: "thumbnail",
        presetParameters: {
          style: "bold, high contrast, big title text",
        },
        promptFragment:
          "high contrast youtube thumbnail, large bold title text, tech background, clean composition",
      },
      {
        userId,
        name: "Product Shot Minimalis",
        description: "Template foto produk gaya minimalis di studio",
        category: "produk",
        presetParameters: {
          lighting: "softbox",
        },
        promptFragment:
          "minimalist product photo on clean background, soft studio lighting, high detail, editorial style",
      },
    ])
    .onConflictDoNothing();

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
