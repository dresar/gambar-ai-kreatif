/**
 * Format response API standar: { success, data, error }.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export async function apiFetch<T>(
  url: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(url, init);
  const json = (await res.json().catch(() => ({}))) as ApiResponse<T>;
  if (!res.ok) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  if (json.success === false && json.error) {
    throw new Error(json.error);
  }
  return json;
}

/** Mengembalikan data dari response; melempar jika success false atau error. */
export async function apiData<T>(url: string, init?: RequestInit): Promise<T | null> {
  const json = await apiFetch<T>(url, init);
  return json.data ?? null;
}
