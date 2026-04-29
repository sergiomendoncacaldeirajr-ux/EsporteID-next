import Link from "next/link";
import type { ReactNode } from "react";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { PROFILE_CARD_BASE, PROFILE_CARD_PAD_LG, PROFILE_SECTION_TITLE } from "@/components/perfil/profile-ui-tokens";
import { EidSectionInfo } from "@/components/ui/eid-section-info";

export function ProfileSection({
  title,
  info,
  children,
  className,
}: {
  title: string;
  /** Explicação curta ao clicar no ícone (i) ao lado do título. */
  info?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className ?? ""}>
      <h2 className={PROFILE_SECTION_TITLE}>
        <span className="inline-flex items-center gap-1.5">
          {title}
          {info != null ? <EidSectionInfo sectionLabel={title}>{info}</EidSectionInfo> : null}
        </span>
      </h2>
      {children}
    </section>
  );
}

export function ProfilePrimaryCta({
  href,
  label = "Pedir Desafio",
  className,
  fullscreen = false,
}: {
  href: string;
  label?: string;
  className?: string;
  fullscreen?: boolean;
}) {
  const isFullscreenTarget = fullscreen || href.startsWith("/desafio");
  if (isFullscreenTarget) {
    return (
      <ProfileEditDrawerTrigger
        href={href}
        title={label}
        fullscreen
        topMode="backOnly"
        className={`eid-btn-dashboard-cta eid-profile-match-cta relative inline-flex w-full items-center justify-center gap-2.5 ${className ?? ""}`}
      >
        <>
          <svg className="h-5 w-5 shrink-0 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M13 2L5 13h5l-1 9 10-13h-6l0-7z" />
          </svg>
          <span>{label}</span>
        </>
      </ProfileEditDrawerTrigger>
    );
  }
  return (
    <Link
      href={href}
      className={`eid-btn-dashboard-cta eid-profile-match-cta relative inline-flex w-full items-center justify-center gap-2.5 ${className ?? ""}`}
    >
      <svg className="h-5 w-5 shrink-0 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M13 2L5 13h5l-1 9 10-13h-6l0-7z" />
      </svg>
      <span>{label}</span>
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
