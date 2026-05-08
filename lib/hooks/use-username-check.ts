"use client";
import { useEffect, useRef, useState } from "react";

export type UsernameCheckStatus = "idle" | "checking" | "available" | "taken" | "invalid";

/**
 * Debounced real-time username availability check.
 * Queries /api/username-check with the given username, table and optional excludeId.
 */
export function useUsernameCheck(
  username: string,
  table: "profiles" | "times" | "duplas",
  excludeId?: string | number | null,
  debounceMs = 650
): UsernameCheckStatus {
  const [status, setStatus] = useState<UsernameCheckStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const uname = username.trim().toLowerCase();

    if (!uname) {
      setStatus("idle");
      return;
    }

    if (!/^[a-z0-9_]{3,24}$/.test(uname)) {
      setStatus("invalid");
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("checking");

      try {
        const params = new URLSearchParams({ username: uname, table });
        if (excludeId != null) params.set("excludeId", String(excludeId));
        const res = await fetch(`/api/username-check?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setStatus("idle");
          return;
        }
        const data = (await res.json()) as { available: boolean };
        setStatus(data.available ? "available" : "taken");
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setStatus("idle");
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [username, table, excludeId, debounceMs]);

  return status;
}
