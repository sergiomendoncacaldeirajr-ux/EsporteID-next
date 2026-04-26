"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "eid_dashboard_amistoso_hint_seen_day";

function getTodayLocalKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function AmistosoDailyHint() {
  const todayKey = useMemo(() => getTodayLocalKey(), []);
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const seenDay = window.localStorage.getItem(STORAGE_KEY);
      return seenDay !== getTodayLocalKey();
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!visible) return;
    const dismiss = () => {
      setVisible(false);
      try {
        window.localStorage.setItem(STORAGE_KEY, todayKey);
      } catch {
        // ignore storage failure
      }
    };
    window.addEventListener("pointerdown", dismiss, { capture: true });
    return () => window.removeEventListener("pointerdown", dismiss, { capture: true });
  }, [todayKey, visible]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none mt-1.5 w-full animate-[eid-vt-main-fade-in_.22s_ease-out]">
      <div className="mx-auto w-fit rounded-full border border-eid-action-500/30 bg-eid-card/92 px-2 py-[2px] text-[8px] font-semibold uppercase tracking-[0.03em] text-eid-action-400 sm:text-[9px]">
        Ative o modo amistoso acima..
      </div>
    </div>
  );
}
