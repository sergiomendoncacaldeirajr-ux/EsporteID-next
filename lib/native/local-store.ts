"use client";

export type NativeLocalStoreEntry<T> = {
  value: T;
  updatedAt: number;
  expiresAt?: number;
  version: 1;
};

export const EID_NATIVE_STORE_PREFIX = "eid:native-store:";

type NativeLocalStoreOptions = {
  ttlMs?: number;
};

function scopedPrefix(scope: string) {
  return `${EID_NATIVE_STORE_PREFIX}${scope}:`;
}

export function nativeStoreKey(scope: string, key: string) {
  return `${scopedPrefix(scope)}${encodeURIComponent(key)}`;
}

export function isNativeLocalStoreAvailable() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function setNativeLocalStore<T>(scope: string, key: string, value: T, options: NativeLocalStoreOptions = {}) {
  if (!isNativeLocalStoreAvailable()) return false;
  const now = Date.now();
  const entry: NativeLocalStoreEntry<T> = {
    value,
    updatedAt: now,
    version: 1,
    ...(options.ttlMs ? { expiresAt: now + options.ttlMs } : {}),
  };
  try {
    window.localStorage.setItem(nativeStoreKey(scope, key), JSON.stringify(entry));
    return true;
  } catch {
    return false;
  }
}

export function getNativeLocalStore<T>(scope: string, key: string) {
  if (!isNativeLocalStoreAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(nativeStoreKey(scope, key));
    if (!raw) return null;
    const entry = JSON.parse(raw) as NativeLocalStoreEntry<T>;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      window.localStorage.removeItem(nativeStoreKey(scope, key));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export function removeNativeLocalStore(scope: string, key: string) {
  if (!isNativeLocalStoreAvailable()) return;
  try {
    window.localStorage.removeItem(nativeStoreKey(scope, key));
  } catch {
    /* ignore */
  }
}

export function listNativeLocalStore<T>(scope: string) {
  if (!isNativeLocalStoreAvailable()) return [];
  const prefix = scopedPrefix(scope);
  const entries: Array<{ key: string; entry: NativeLocalStoreEntry<T> }> = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const storageKey = window.localStorage.key(i);
      if (!storageKey?.startsWith(prefix)) continue;
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) continue;
      const entry = JSON.parse(raw) as NativeLocalStoreEntry<T>;
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        window.localStorage.removeItem(storageKey);
        continue;
      }
      entries.push({ key: decodeURIComponent(storageKey.slice(prefix.length)), entry });
    }
  } catch {
    return entries;
  }
  return entries.sort((a, b) => b.entry.updatedAt - a.entry.updatedAt);
}

export function pruneNativeLocalStore(scope: string, maxEntries: number) {
  const entries = listNativeLocalStore(scope);
  for (const stale of entries.slice(Math.max(0, maxEntries))) {
    removeNativeLocalStore(scope, stale.key);
  }
}
