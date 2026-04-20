import Link from "next/link";
import type { ReactNode } from "react";
import { PROFILE_CARD_BASE, PROFILE_CARD_PAD_LG, PROFILE_SECTION_TITLE } from "@/components/perfil/profile-ui-tokens";

export function ProfileSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className ?? ""}>
      <h2 className={PROFILE_SECTION_TITLE}>{title}</h2>
      {children}
    </section>
  );
}

export function ProfilePrimaryCta({
  href,
  label = "⚡ Solicitar Match",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`eid-btn-match-cta eid-match-cta-pulse eid-shimmer-btn relative overflow-hidden inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 text-[13px] font-black uppercase tracking-[0.1em] ${className ?? ""}`}
    >
      {label}
    </Link>
  );
}

export function ProfileIdentityHeader({
  avatar,
  badge,
  name,
  username,
  location,
  extra,
}: {
  avatar: ReactNode;
  badge?: ReactNode;
  name: string;
  username?: string | null;
  location?: string | null;
  extra?: ReactNode;
}) {
  return (
    <div className={`mt-3 text-center ${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_LG}`}>
      {avatar}
      {badge ? <div className="mt-2">{badge}</div> : null}
      <h1 className="mt-1.5 text-base font-black tracking-tight text-eid-fg sm:text-lg">{name}</h1>
      {username ? <p className="mt-0.5 text-[11px] font-semibold text-eid-primary-400">@{username}</p> : null}
      {location ? <p className="mt-0.5 text-[11px] text-eid-text-secondary">{location}</p> : null}
      {extra}
    </div>
  );
}
