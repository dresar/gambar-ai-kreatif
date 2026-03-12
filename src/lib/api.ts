import { getApiUrl, getAuthHeaders } from "@/lib/db";

const api = () => getApiUrl();
const headers = () => getAuthHeaders();

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${api()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Login gagal");
  return data;
}

export async function apiSignUp(email: string, password: string, username?: string) {
  const res = await fetch(`${api()}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, username }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Daftar gagal");
  return data;
}

export async function apiGetMe() {
  const res = await fetch(`${api()}/api/auth/me`, { headers: headers() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Unauthorized");
  return data;
}

export async function apiGetStats() {
  const res = await fetch(`${api()}/api/stats`, { headers: headers() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memuat statistik");
  return data;
}

export async function apiGetProfile() {
  const res = await fetch(`${api()}/api/profiles/me`, { headers: headers() });
  if (res.status === 404) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memuat profil");
  return data;
}

export async function apiUpdateProfile(updates: {
  ai_endpoint_url?: string;
  ai_model_name?: string;
  theme_preference?: string;
}) {
  const res = await fetch(`${api()}/api/profiles/me`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
  return data;
}

export async function apiGetPrompts() {
  const res = await fetch(`${api()}/api/prompts`, { headers: headers() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memuat prompts");
  return data;
}

export async function apiCreatePrompt(body: {
  title?: string;
  prompt_text: string;
  parameters?: Record<string, unknown>;
  tags?: string[];
  is_favorite?: boolean;
  prompt_type?: string;
}) {
  const res = await fetch(`${api()}/api/prompts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
  return data;
}

export async function apiUpdatePrompt(
  id: string,
  updates: { is_favorite?: boolean; title?: string }
) {
  const res = await fetch(`${api()}/api/prompts/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memperbarui");
  return data;
}

export async function apiDeletePrompt(id: string) {
  const res = await fetch(`${api()}/api/prompts/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Gagal menghapus");
  }
}

export async function apiGetPromptHistory() {
  const res = await fetch(`${api()}/api/prompt_history`, { headers: headers() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memuat riwayat");
  return data;
}

export async function apiCreatePromptHistory(body: {
  prompt_text: string;
  parameters?: Record<string, unknown>;
  prompt_type?: string;
}) {
  const res = await fetch(`${api()}/api/prompt_history`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
  return data;
}

export async function apiDeletePromptHistory(id: string) {
  const res = await fetch(`${api()}/api/prompt_history/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Gagal menghapus");
  }
}

export async function apiGetPromptTemplates() {
  const res = await fetch(`${api()}/api/prompt_templates`, { headers: headers() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memuat template");
  return data;
}

export async function apiGetDropdownCategories() {
  const res = await fetch(`${api()}/api/dropdown_categories`, { headers: headers() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memuat kategori");
  return data;
}

export async function apiGetDropdownOptions() {
  const res = await fetch(`${api()}/api/dropdown_options`, { headers: headers() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memuat opsi");
  return data;
}

export async function apiCreateDropdownCategory(body: {
  name: string;
  slug?: string;
  description?: string;
  sort_order?: number;
}) {
  const res = await fetch(`${api()}/api/dropdown_categories`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal menambah kategori");
  return data;
}

export async function apiCreateDropdownOption(body: {
  category_id: string;
  name: string;
  prompt_fragment: string;
  metadata?: Record<string, unknown>;
  sort_order?: number;
}) {
  const res = await fetch(`${api()}/api/dropdown_options`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal menambah opsi");
  return data;
}

export async function apiDeleteDropdownCategory(id: string) {
  const res = await fetch(`${api()}/api/dropdown_categories/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Gagal menghapus");
  }
}

export async function apiDeleteDropdownOption(id: string) {
  const res = await fetch(`${api()}/api/dropdown_options/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Gagal menghapus");
  }
}
