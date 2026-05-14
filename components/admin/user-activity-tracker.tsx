"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Props = {
  userId: string | null;
};

function currentPath(pathname: string | null, searchParams: URLSearchParams | null) {
  const qs = searchParams?.toString();
  return `${pathname || "/"}${qs ? `?${qs}` : ""}`;
}

export function UserActivityTracker({ userId }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSentAtRef = useRef<number>(0);
  const pathRef = useRef(currentPath(pathname, searchParams));

  useEffect(() => {
    pathRef.current = currentPath(pathname, searchParams);
    lastSentAtRef.current = Date.now();
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!userId) return;

    let stopped = false;
    lastSentAtRef.current = Date.now();

    const sendHeartbeat = (activeSeconds = 0, keepalive = false) => {
      if (stopped) return;
      const payload = {
        path: pathRef.current,
        title: document.title,
        activeSeconds,
      };
      void fetch("/api/activity/heartbeat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive,
      }).catch(() => {});
    };

    const tick = () => {
      if (document.visibilityState !== "visible") {
        lastSentAtRef.current = Date.now();
        return;
      }
      const now = Date.now();
      const activeSeconds = Math.max(0, Math.min(60, Math.round((now - lastSentAtRef.current) / 1000)));
      lastSentAtRef.current = now;
      sendHeartbeat(activeSeconds);
    };

    sendHeartbeat(0);
    const interval = window.setInterval(tick, 30000);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        const now = Date.now();
        const activeSeconds = Math.max(0, Math.min(60, Math.round((now - lastSentAtRef.current) / 1000)));
        lastSentAtRef.current = now;
        sendHeartbeat(activeSeconds, true);
      } else {
        lastSentAtRef.current = Date.now();
        sendHeartbeat(0);
      }
    };

    const onPageHide = () => {
      const now = Date.now();
      const activeSeconds = Math.max(0, Math.min(60, Math.round((now - lastSentAtRef.current) / 1000)));
      sendHeartbeat(activeSeconds, true);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [userId]);

  return null;
}
