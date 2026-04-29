import Link from "next/link";
import type { ReactNode } from "react";
import {
  PROFILE_AVATAR_LG,
  PROFILE_AVATAR_MD,
  PROFILE_AVATAR_SM,
  PROFILE_CARD_BASE,
  PROFILE_CARD_PAD_MD,
  PROFILE_CARD_SUBTITLE,
  PROFILE_CARD_TITLE,
} from "@/components/perfil/profile-ui-tokens";

export function ProfileTeamCard({
  href,
  title,
  subtitle,
  imageUrl,
}: {
  href: string;
  title: string;
  subtitle: string;
  imageUrl?: string | null;
}) {
  return (
    <Link
      href={href}
      className={`min-w-[160px] snap-start transition hover:border-eid-primary-500/35 hover:shadow-[0_2px_16px_rgba(37,99,235,0.15)] ${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className={PROFILE_AVATAR_MD} />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eid-primary-900/60 text-[8px] font-black tracking-widest text-eid-primary-300">
          EID
        </div>
      )}
      <p className={`mt-2 truncate ${PROFILE_CARD_TITLE}`}>{title}</p>
      <p className={PROFILE_CARD_SUBTITLE}>{subtitle}</p>
    </Link>
  );
}

function ListRowChevron({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 text-eid-primary-400 ${className}`.trim()}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function ProfileMemberCard({
  href,
  name,
  subtitle,
  avatarUrl,
  fallbackLabel = "EID",
  trailing,
  layout = "row",
  avatarSize = "sm",
}: {
  href: string;
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  fallbackLabel?: string;
  trailing?: ReactNode;
  /** `list` = linha horizontal estilo app (avatar redondo, chevron). */
  layout?: "row" | "stacked" | "list";
  avatarSize?: "sm" | "md" | "lg";
}) {
  const isStacked = layout === "stacked";
  const isList = layout === "list";
  const avatarClass =
    avatarSize === "lg" ? PROFILE_AVATAR_LG : avatarSize === "md" ? PROFILE_AVATAR_MD : PROFILE_AVATAR_SM;
  const fallbackSize =
    avatarSize === "lg"
      ? "h-20 w-20 rounded-2xl text-sm"
      : avatarSize === "md"
        ? "h-12 w-12 rounded-xl text-[10px]"
        : "h-10 w-10 rounded-lg text-[10px]";

  if (isList) {
    return (
      <div className={`${PROFILE_CARD_BASE} p-3 sm:rounded-2xl`}>
        <Link
          href={href}
          className="group flex w-full items-center gap-3.5 transition hover:opacity-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eid-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-eid-card rounded-xl"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-full border border-[color:var(--eid-border-subtle)] object-cover sm:h-12 sm:w-12"
            />
          ) : (
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-xs font-black text-eid-primary-300 sm:h-12 sm:w-12">
              {fallbackLabel}
            </span>
          )}
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[13px] font-semibold leading-snug text-eid-fg">{name}</p>
            {subtitle ? <p className="mt-0.5 truncate text-[11px] text-eid-text-secondary">{subtitle}</p> : null}
          </div>
          <ListRowChevron className="opacity-75 transition group-hover:opacity-100" />
        </Link>
        {trailing ? <div className="mt-3 border-t border-[color:var(--eid-border-subtle)] pt-3">{trailing}</div> : null}
      </div>
    );
  }

  return (
    <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}>
      <Link
        href={href}
        className={`transition hover:border-eid-primary-500/35 ${
          isStacked ? "flex flex-col items-center text-center" : "flex items-center gap-2"
        }`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className={avatarClass} />
        ) : (
          <div className={`flex items-center justify-center bg-eid-surface font-bold text-eid-primary-300 ${fallbackSize}`}>
            {fallbackLabel}
          </div>
        )}
        <div className={`min-w-0 ${isStacked ? "mt-2 w-full" : ""}`}>
          <p className={`${PROFILE_CARD_TITLE} truncate ${isStacked ? "text-center" : ""}`}>{name}</p>
          {subtitle ? <p className={`${PROFILE_CARD_SUBTITLE} ${isStacked ? "text-center" : ""}`}>{subtitle}</p> : null}
        </div>
      </Link>
      {trailing ? <div className="mt-2">{trailing}</div> : null}
    </div>
  );
}
