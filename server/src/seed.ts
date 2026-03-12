import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { db } from "./lib/db.js";
import { users, profiles } from "./schema.js";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const DEV_EMAIL = "eka@example.com";
const DEV_USERNAME = "admin_eka";
const DEV_PASSWORD = "password123";

async function seed() {
  console.log("Seeding...");

  const existing = await db.select().from(users).where(eq(users.email, DEV_EMAIL)).limit(1);
  if (existing.length > 0) {
    console.log("User admin_eka sudah ada, skip seeding.");
    process.exit(0);
  }

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

  await db.insert(profiles).values({
    userId: user.id,
    displayName: DEV_USERNAME,
    themePreference: "dark",
  });

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
