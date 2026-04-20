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
  layout?: "row" | "stacked";
  avatarSize?: "sm" | "md" | "lg";
}) {
  const isStacked = layout === "stacked";
  const avatarClass =
    avatarSize === "lg" ? PROFILE_AVATAR_LG : avatarSize === "md" ? PROFILE_AVATAR_MD : PROFILE_AVATAR_SM;
  const fallbackSize =
    avatarSize === "lg"
      ? "h-20 w-20 rounded-2xl text-sm"
      : avatarSize === "md"
        ? "h-12 w-12 rounded-xl text-[10px]"
        : "h-10 w-10 rounded-lg text-[10px]";

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
