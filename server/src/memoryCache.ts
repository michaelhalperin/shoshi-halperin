type CacheEntry = { value: unknown; expiresAt: number };

const store = new Map<string, CacheEntry>();

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(key: string | RegExp) {
  if (typeof key === "string") {
    store.delete(key);
    return;
  }
  for (const k of store.keys()) {
    if (key.test(k)) store.delete(k);
  }
}

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  setCached(key, value, ttlMs);
  return value;
}
