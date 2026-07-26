/**
 * Safe reads of JSON values kept in `localStorage`.
 *
 * Storage survives app upgrades and is editable outside the app, so a key can
 * hold truncated, hand-edited or stale-shaped JSON. Parsing it unguarded threw
 * during page init and left the page stuck on its skeleton with no error shown,
 * so a value that does not parse is treated as absent instead.
 */

/** Parse a stored JSON string. Returns null when it is missing or corrupt. */
export function parseStoredJson<T>(raw: string | null | undefined): T | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Read and parse a `localStorage` key. A corrupt value is dropped from storage
 * so the same broken entry cannot keep failing on every visit.
 */
export function readStoredJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key);

  if (raw === null) {
    return null;
  }

  const parsed = parseStoredJson<T>(raw);

  if (parsed === null) {
    localStorage.removeItem(key);
  }

  return parsed;
}
