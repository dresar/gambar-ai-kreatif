/**
 * Konfigurasi akses database via API backend.
 * Koneksi langsung ke Neon hanya di server; frontend memanggil API ini.
 */
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function getApiUrl(): string {
  return API_URL;
}

import { getAuthToken } from "@/lib/auth";

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
