/**
 * Convert Drizzle camelCase row to snake_case for API response (Supabase-compatible).
 */
function toSnakeKeys(obj: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (obj == null) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const snake = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    out[snake] = v;
  }
  return out;
}

export function rowToSnake<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  return toSnakeKeys(row) as Record<string, unknown>;
}

export function rowsToSnake<T extends Record<string, unknown>>(rows: T[]): Record<string, unknown>[] {
  return rows.map((r) => rowToSnake(r));
}
