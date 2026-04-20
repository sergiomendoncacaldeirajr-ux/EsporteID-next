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
  label = "Solicitar Match",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`eid-btn-match-cta inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold ${className ?? ""}`}
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
    <div className={`mt-4 text-center ${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_LG}`}>
      {avatar}
      {badge ? <div className="mt-4">{badge}</div> : null}
      <h1 className="mt-2 text-xl font-bold tracking-tight text-eid-fg sm:text-2xl">{name}</h1>
      {username ? <p className="mt-1 text-xs font-medium text-eid-primary-300">@{username}</p> : null}
      {location ? <p className="mt-1 text-sm text-eid-text-secondary">{location}</p> : null}
      {extra}
    </div>
  );
}
