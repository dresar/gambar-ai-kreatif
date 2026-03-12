import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, } from "drizzle-orm/pg-core";
// Tabel users (menggantikan auth.users dari Supabase)
export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    username: text("username"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const profiles = pgTable("profiles", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    themePreference: text("theme_preference").default("dark"),
    aiEndpointUrl: text("ai_endpoint_url"),
    aiModelName: text("ai_model_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const dropdownCategories = pgTable("dropdown_categories", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const dropdownOptions = pgTable("dropdown_options", {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id").notNull().references(() => dropdownCategories.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    promptFragment: text("prompt_fragment").notNull(),
    metadata: jsonb("metadata").default({}),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const prompts = pgTable("prompts", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    promptText: text("prompt_text").notNull(),
    parameters: jsonb("parameters").default({}),
    tags: text("tags").array().default([]),
    isFavorite: boolean("is_favorite").default(false),
    promptType: text("prompt_type").default("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const promptTemplates = pgTable("prompt_templates", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").default("umum"),
    presetParameters: jsonb("preset_parameters").default({}),
    promptFragment: text("prompt_fragment"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const promptHistory = pgTable("prompt_history", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    promptText: text("prompt_text").notNull(),
    parameters: jsonb("parameters").default({}),
    promptType: text("prompt_type").default("image"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
