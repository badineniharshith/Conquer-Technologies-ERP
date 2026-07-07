type CacheEntry = {
  data: any;
  expiry: number;
};

const cacheStore = new Map<string, CacheEntry>();

export function getCached<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached(key: string, data: any, ttlMs: number): void {
  cacheStore.set(key, { data, expiry: Date.now() + ttlMs });
}

export function clearCache(prefix?: string): void {
  if (!prefix) {
    cacheStore.clear();
  } else {
    for (const key of cacheStore.keys()) {
      if (key.startsWith(prefix)) {
        cacheStore.delete(key);
      }
    }
  }
}
