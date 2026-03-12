/**
 * Convert Drizzle camelCase row to snake_case for API response (Supabase-compatible).
 */
function toSnakeKeys(obj) {
    if (obj == null)
        return null;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        const snake = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        out[snake] = v;
    }
    return out;
}
export function rowToSnake(row) {
    return toSnakeKeys(row);
}
export function rowsToSnake(rows) {
    return rows.map((r) => rowToSnake(r));
}
