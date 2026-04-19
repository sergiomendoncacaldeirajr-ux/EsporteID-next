"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_LINKS } from "@/lib/admin/nav-links";

export function AdminNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-3 pb-4 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-2 sm:px-6 [&::-webkit-scrollbar]:hidden"
      aria-label="Seções do admin"
    >
      {ADMIN_NAV_LINKS.map((l) => {
        const active = l.href === "/admin" ? pathname === "/admin" : pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 rounded-xl border px-2.5 py-2 text-center transition sm:px-3 ${
              active
                ? "border-eid-primary-500/45 bg-eid-primary-500/12 text-eid-fg shadow-[0_0_0_1px_rgba(37,99,235,0.15)]"
                : "border-transparent text-eid-text-secondary hover:border-[color:var(--eid-border-subtle)] hover:bg-eid-card/80 hover:text-eid-fg"
            }`}
          >
            <span className="block text-[11px] font-bold sm:text-xs">{l.label}</span>
            <span className="mt-0.5 hidden text-[10px] font-normal leading-tight text-eid-text-muted sm:block">{l.hint}</span>
          </Link>
        );
      })}
    </nav>
  );
}
