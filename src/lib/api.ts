/**
 * Client API untuk backend Hono. Semua response JSON: { success, data, error }.
 */
import { getApiUrl, getAuthHeaders } from "@/lib/db";
import type { ApiResponse } from "@/lib/api-types";

const base = () => getApiUrl();
const headers = () => getAuthHeaders();

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 60_000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Request timeout (${Math.round(timeoutMs / 1000)} detik). Coba lagi.`);
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

async function parse<T>(res: Response): Promise<ApiResponse<T>> {
  const json = (await res.json().catch(() => ({}))) as ApiResponse<T>;
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  if (json.success === false && json.error) throw new Error(json.error);
  return json;
}

function data<T>(json: ApiResponse<T>): T | null {
  return json.data ?? null;
}

// ---- Auth ----
export async function apiLogin(email: string, password: string): Promise<{ user: { id: string; email: string; username?: string | null }; token: string }> {
  const res = await fetchWithTimeout(`${base()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }, 60_000);
  const out = await parse<{ user: { id: string; email: string; username?: string | null }; token: string }>(res);
  const d = data(out);
  if (!d) throw new Error("Login gagal");
  return d;
}

export async function apiSignUp(
  email: string,
  password: string,
  username?: string
): Promise<{ user: { id: string; email: string; username?: string | null }; token: string }> {
  const res = await fetchWithTimeout(`${base()}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, username }),
  }, 60_000);
  const out = await parse<{ user: { id: string; email: string; username?: string | null }; token: string }>(res);
  const d = data(out);
  if (!d) throw new Error("Daftar gagal");
  return d;
}

export async function apiGetMe(): Promise<{ id: string; email: string; username?: string | null }> {
  const res = await fetch(`${base()}/api/auth/me`, { headers: headers() });
  const out = await parse<{ id: string; email: string; username?: string | null }>(res);
  const d = data(out);
  if (!d) throw new Error("Unauthorized");
  return d;
}

// ---- User: update & change password ----
export async function apiUpdateUser(body: { username?: string; email?: string }): Promise<Record<string, unknown>> {
  const res = await fetch(`${base()}/api/user/update`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const out = await parse<Record<string, unknown>>(res);
  const d = data(out);
  if (d === undefined) throw new Error("Gagal memperbarui");
  return d as Record<string, unknown>;
}

export async function apiChangePassword(body: {
  old_password: string;
  new_password: string;
  confirm_password: string;
}): Promise<void> {
  const res = await fetch(`${base()}/api/user/change-password`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(body),
  });
  await parse<{ message: string }>(res);
}

// ---- Stats ----
export async function apiGetStats(): Promise<{ totalPrompts: number; totalHistory: number }> {
  const res = await fetch(`${base()}/api/stats`, { headers: headers() });
  const out = await parse<{ totalPrompts: number; totalHistory: number }>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal memuat statistik");
  return d;
}

// ---- Profile (settings) ----
export async function apiGetProfile(): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${base()}/api/profiles/me`, { headers: headers() });
  if (res.status === 404) return null;
  const out = await parse<Record<string, unknown>>(res);
  return data(out);
}

export async function apiUpdateProfile(updates: {
  theme_preference?: string;
}): Promise<Record<string, unknown>> {
  const res = await fetch(`${base()}/api/profiles/me`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const out = await parse<Record<string, unknown>>(res);
  const d = data(out);
  if (d === undefined) throw new Error("Gagal menyimpan");
  return d as Record<string, unknown>;
}

// ---- AI (config dari .env di server; generasi dipicu dari client via endpoint ini) ----
export async function apiGetAiConfig(): Promise<{
  base_url: string;
  model: string;
  key_configured: boolean;
}> {
  const res = await fetch(`${base()}/api/ai/config`);
  const out = await parse<{ base_url: string; model: string; key_configured?: boolean }>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal memuat konfigurasi AI");
  return {
    base_url: d.base_url,
    model: d.model,
    key_configured: d.key_configured === true,
  };
}

export async function apiAiChat(messages: Array<{ role: "user" | "assistant" | "system"; content: string }>): Promise<{ content: string } | null> {
  const res = await fetch(`${base()}/api/ai/chat`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ messages }),
  });
  const out = await parse<{ content: string } | null>(res);
  return data(out);
}

/** AI vision: prompt sertifikat + banyak logo (data URL terkompres). */
export async function apiSertifikatDenganLogo(body: { instruction: string; logos: string[] }): Promise<string> {
  const res = await fetch(`${base()}/api/ai/sertifikat-logo`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const out = await parse<{ content: string }>(res);
  const d = data(out);
  if (!d?.content) throw new Error("Hasil kosong");
  return d.content;
}

export async function apiAnalyzeImage(imageDataUrl: string, instruction?: string): Promise<string> {
  const res = await fetch(`${base()}/api/ai/analyze-image`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ image_base64: imageDataUrl, instruction: instruction?.trim() || undefined }),
  });
  const out = await parse<{ content: string }>(res);
  const d = data(out);
  if (!d?.content) throw new Error("Hasil analisis kosong");
  return d.content;
}

export type AnalisisInstruksiRow = {
  id: string;
  user_id: string;
  judul: string;
  instruksi: string;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

export async function apiListAnalisisInstruksi(): Promise<AnalisisInstruksiRow[]> {
  const res = await fetch(`${base()}/api/analisis-instruksi`, { headers: headers() });
  const out = await parse<AnalisisInstruksiRow[]>(res);
  return (data(out) as AnalisisInstruksiRow[]) ?? [];
}

export async function apiCreateAnalisisInstruksi(body: {
  judul: string;
  instruksi: string;
  sort_order?: number;
}): Promise<AnalisisInstruksiRow> {
  const res = await fetch(`${base()}/api/analisis-instruksi`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const out = await parse<AnalisisInstruksiRow>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal menyimpan template instruksi");
  return d as AnalisisInstruksiRow;
}

export async function apiUpdateAnalisisInstruksi(
  id: string,
  body: { judul?: string; instruksi?: string; sort_order?: number }
): Promise<AnalisisInstruksiRow> {
  const res = await fetch(`${base()}/api/analisis-instruksi/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const out = await parse<AnalisisInstruksiRow>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal memperbarui");
  return d as AnalisisInstruksiRow;
}

export async function apiDeleteAnalisisInstruksi(id: string): Promise<void> {
  const res = await fetch(`${base()}/api/analisis-instruksi/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  await parse(res);
}

export type PromptImageFieldRow = {
  id: string;
  user_id: string;
  judul: string;
  prompting: string;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

export async function apiListPromptImageFields(): Promise<PromptImageFieldRow[]> {
  const res = await fetch(`${base()}/api/prompt-image-fields`, { headers: headers() });
  const out = await parse<PromptImageFieldRow[]>(res);
  return (data(out) as PromptImageFieldRow[]) ?? [];
}

export async function apiCreatePromptImageField(body: {
  judul: string;
  prompting: string;
  sort_order?: number;
}): Promise<PromptImageFieldRow> {
  const res = await fetch(`${base()}/api/prompt-image-fields`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const out = await parse<PromptImageFieldRow>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal menambah");
  return d as PromptImageFieldRow;
}

export async function apiUpdatePromptImageField(
  id: string,
  body: { judul?: string; prompting?: string; sort_order?: number }
): Promise<PromptImageFieldRow> {
  const res = await fetch(`${base()}/api/prompt-image-fields/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const out = await parse<PromptImageFieldRow>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal update");
  return d as PromptImageFieldRow;
}

export async function apiDeletePromptImageField(id: string): Promise<void> {
  const res = await fetch(`${base()}/api/prompt-image-fields/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  await parse(res);
}

// ---- Prompts ----
export async function apiGetPrompts(): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${base()}/api/prompts`, { headers: headers() });
  const out = await parse<Record<string, unknown>[]>(res);
  return (data(out) as Record<string, unknown>[]) ?? [];
}

export async function apiGetPrompt(id: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${base()}/api/prompts/${id}`, { headers: headers() });
  const out = await parse<Record<string, unknown>>(res);
  const d = data(out);
  if (!d) throw new Error("Tidak ditemukan");
  return d as Record<string, unknown>;
}

export async function apiCreatePrompt(body: {
  title?: string;
  prompt_text: string;
  parameters?: Record<string, unknown>;
  tags?: string[];
  is_favorite?: boolean;
  prompt_type?: string;
  /** Data URL atau URL CDN */
  cover_image?: string | null;
}): Promise<Record<string, unknown>> {
  const res = await fetch(`${base()}/api/prompts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const out = await parse<Record<string, unknown>>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal menyimpan");
  return d as Record<string, unknown>;
}

export async function apiUpdatePrompt(
  id: string,
  updates: { is_favorite?: boolean; title?: string; cover_image?: string | null; prompt_text?: string; parameters?: Record<string, unknown> }
): Promise<Record<string, unknown>> {
  const res = await fetch(`${base()}/api/prompts/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const out = await parse<Record<string, unknown>>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal memperbarui");
  return d as Record<string, unknown>;
}

export async function apiDeletePrompt(id: string): Promise<void> {
  const res = await fetch(`${base()}/api/prompts/${id}`, { method: "DELETE", headers: headers() });
  await parse<unknown>(res);
}

// ---- Prompt history ----
export async function apiGetPromptHistory(): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${base()}/api/prompt_history`, { headers: headers() });
  const out = await parse<Record<string, unknown>[]>(res);
  return (data(out) as Record<string, unknown>[]) ?? [];
}

export async function apiCreatePromptHistory(body: {
  prompt_text: string;
  parameters?: Record<string, unknown>;
  prompt_type?: string;
}): Promise<Record<string, unknown>> {
  const res = await fetch(`${base()}/api/prompt_history`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const out = await parse<Record<string, unknown>>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal menyimpan");
  return d as Record<string, unknown>;
}

export async function apiDeletePromptHistory(id: string): Promise<void> {
  const res = await fetch(`${base()}/api/prompt_history/${id}`, { method: "DELETE", headers: headers() });
  await parse<unknown>(res);
}

// ---- Gaya Sertifikat (dropdown dinamis) ----
export interface GayaSertifikatItem {
  id: string;
  name: string;
  prompt_fragment: string;
  sort_order?: number;
  [key: string]: unknown;
}

export async function apiGetGayaSertifikat(): Promise<GayaSertifikatItem[]> {
  const res = await fetch(`${base()}/api/dropdowns/gaya-sertifikat`, { headers: headers() });
  const out = await parse<GayaSertifikatItem[]>(res);
  return (data(out) as GayaSertifikatItem[]) ?? [];
}

export async function apiCreateGayaOption(body: {
  category_id: string;
  name: string;
  prompt_fragment: string;
  sort_order?: number;
}): Promise<GayaSertifikatItem> {
  const res = await fetch(`${base()}/api/dropdowns/options`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const out = await parse<GayaSertifikatItem>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal menambah gaya");
  return d as GayaSertifikatItem;
}

export async function apiUpdateGayaOption(
  id: string,
  body: { name?: string; prompt_fragment?: string }
): Promise<GayaSertifikatItem> {
  const res = await fetch(`${base()}/api/dropdowns/options/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const out = await parse<GayaSertifikatItem>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal memperbarui");
  return d as GayaSertifikatItem;
}

export async function apiDeleteGayaOption(id: string): Promise<void> {
  const res = await fetch(`${base()}/api/dropdowns/options/${id}`, { method: "DELETE", headers: headers() });
  await parse<unknown>(res);
}

/** Tambah gaya sertifikat baru (backend otomatis pakai/buat kategori) */
export async function apiCreateGayaSertifikat(body: { name: string; prompt_fragment: string }): Promise<GayaSertifikatItem> {
  const res = await fetch(`${base()}/api/dropdowns/gaya-sertifikat`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const out = await parse<GayaSertifikatItem>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal menambah gaya");
  return d as GayaSertifikatItem;
}

// ---- Dropdown categories & options (existing) ----
export async function apiGetDropdownCategories(): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${base()}/api/dropdown_categories`, { headers: headers() });
  const out = await parse<Record<string, unknown>[]>(res);
  return (data(out) as Record<string, unknown>[]) ?? [];
}

export async function apiGetDropdownOptions(): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${base()}/api/dropdown_options`, { headers: headers() });
  const out = await parse<Record<string, unknown>[]>(res);
  return (data(out) as Record<string, unknown>[]) ?? [];
}

/** Hapus semua dropdown user + isi 25 kategori gambar/iklan (prompt detail ID). Tanpa sertifikat. */
export async function apiResetSeedDropdownGambar(): Promise<{ categories: number; options: number; message?: string }> {
  const res = await fetch(`${base()}/api/dropdowns/reset-seed-gambar`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({}),
  });
  const out = await parse<{ categories: number; options: number; message?: string }>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal reset seed");
  return d;
}

export async function apiCreateDropdownCategory(body: {
  name: string;
  slug?: string;
  description?: string;
  /** ID urutan tampil: 1 = paling atas. Kosong = otomatis belakang */
  sort_order?: number;
}): Promise<Record<string, unknown>> {
  const res = await fetch(`${base()}/api/dropdown_categories`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const out = await parse<Record<string, unknown>>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal menambah kategori");
  return d as Record<string, unknown>;
}

export async function apiCreateDropdownOption(body: {
  category_id: string;
  name: string;
  prompt_fragment: string;
  metadata?: Record<string, unknown>;
  sort_order?: number;
}): Promise<Record<string, unknown>> {
  const res = await fetch(`${base()}/api/dropdown_options`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const out = await parse<Record<string, unknown>>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal menambah opsi");
  return d as Record<string, unknown>;
}

export async function apiDeleteDropdownCategory(id: string): Promise<void> {
  const res = await fetch(`${base()}/api/dropdown_categories/${id}`, { method: "DELETE", headers: headers() });
  await parse<unknown>(res);
}

export async function apiUpdateDropdownCategory(
  id: string,
  body: { name?: string; slug?: string; description?: string; sort_order?: number }
): Promise<Record<string, unknown>> {
  const res = await fetch(`${base()}/api/dropdown_categories/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const out = await parse<Record<string, unknown>>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal memperbarui kategori");
  return d as Record<string, unknown>;
}

export async function apiDeleteDropdownOption(id: string): Promise<void> {
  const res = await fetch(`${base()}/api/dropdown_options/${id}`, { method: "DELETE", headers: headers() });
  await parse<unknown>(res);
}

export async function apiUpdateDropdownOption(
  id: string,
  body: { name?: string; prompt_fragment?: string; metadata?: Record<string, unknown>; sort_order?: number }
): Promise<Record<string, unknown>> {
  const res = await fetch(`${base()}/api/dropdown_options/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const out = await parse<Record<string, unknown>>(res);
  const d = data(out);
  if (!d) throw new Error("Gagal memperbarui opsi");
  return d as Record<string, unknown>;
}
