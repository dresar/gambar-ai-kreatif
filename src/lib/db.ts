/**
 * Base URL untuk panggilan API.
 * - Development: proxy Vite ke localhost:5000, atau pakai VITE_API_URL.
 * - Production (Vercel): selalu same origin (window.location.origin) agar /api
 *   di-rewrite ke serverless backend di domain yang sama. Nilai localhost dari
 *   env di-build diabaikan saat origin bukan localhost.
 */
const API_URL = import.meta.env.VITE_API_URL ?? "";

export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const isProduction = !window.location.origin.startsWith("http://localhost");
    if (isProduction) {
      return window.location.origin;
    }
    return API_URL || "http://localhost:5000";
  }
  return API_URL || "http://localhost:5000";
}

import { getAuthToken } from "@/lib/auth";

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
