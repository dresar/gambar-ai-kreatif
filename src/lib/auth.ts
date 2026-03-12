export const AUTH_TOKEN_KEY = "auth_token";

export function getAuthToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}
