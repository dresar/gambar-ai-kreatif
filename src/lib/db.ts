/**
 * Base URL untuk panggilan API. Di development dengan Vite proxy gunakan ''.
 */
const API_URL = import.meta.env.VITE_API_URL ?? "";

export function getApiUrl(): string {
  return API_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000");
}

import { getAuthToken } from "@/lib/auth";

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
