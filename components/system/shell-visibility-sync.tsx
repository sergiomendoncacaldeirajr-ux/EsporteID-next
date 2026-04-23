"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function ShellVisibilitySync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const isMatchFull = pathname === "/match" && searchParams.get("view") !== "grid";
    if (isMatchFull) {
      document.body.classList.add("eid-force-hide-shell");
    } else {
      document.body.classList.remove("eid-force-hide-shell");
    }
    return () => {
      document.body.classList.remove("eid-force-hide-shell");
    };
  }, [pathname, searchParams]);

  return null;
}
