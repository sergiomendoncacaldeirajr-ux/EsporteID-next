"use client";

import {
  getNativeLocalStore,
  listNativeLocalStore,
  removeNativeLocalStore,
  setNativeLocalStore,
} from "@/lib/native/local-store";

export type NativeOfflineOutboxItem = {
  id: string;
  kind: string;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  payload?: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
};

const EID_NATIVE_OUTBOX_SCOPE = "offline-outbox";

function nativeOutboxId(kind: string) {
  return `${kind}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

export function enqueueNativeOfflineAction(
  item: Omit<NativeOfflineOutboxItem, "id" | "createdAt" | "attempts">
) {
  const queued: NativeOfflineOutboxItem = {
    ...item,
    id: nativeOutboxId(item.kind),
    createdAt: Date.now(),
    attempts: 0,
  };
  setNativeLocalStore(EID_NATIVE_OUTBOX_SCOPE, queued.id, queued, { ttlMs: 14 * 24 * 60 * 60_000 });
  return queued;
}

export function listNativeOfflineOutbox() {
  return listNativeLocalStore<NativeOfflineOutboxItem>(EID_NATIVE_OUTBOX_SCOPE).map((entry) => entry.entry.value);
}

export function getNativeOfflineOutboxItem(id: string) {
  return getNativeLocalStore<NativeOfflineOutboxItem>(EID_NATIVE_OUTBOX_SCOPE, id)?.value ?? null;
}

export function updateNativeOfflineOutboxItem(item: NativeOfflineOutboxItem) {
  setNativeLocalStore(EID_NATIVE_OUTBOX_SCOPE, item.id, item, { ttlMs: 14 * 24 * 60 * 60_000 });
}

export function removeNativeOfflineOutboxItem(id: string) {
  removeNativeLocalStore(EID_NATIVE_OUTBOX_SCOPE, id);
}
