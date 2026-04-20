import Link from "next/link";
import type { ReactNode } from "react";
import { PROFILE_AVATAR_MD, PROFILE_AVATAR_SM, PROFILE_CARD_BASE, PROFILE_CARD_PAD_MD } from "@/components/perfil/profile-ui-tokens";

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
      className={`min-w-[210px] snap-start rounded-2xl hover:border-eid-primary-500/35 ${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}
    >
      {imageUrl ? <img src={imageUrl} alt="" className={PROFILE_AVATAR_MD} /> : null}
      <p className="mt-2 truncate text-sm font-semibold text-eid-fg">{title}</p>
      <p className="text-xs text-eid-text-secondary">{subtitle}</p>
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
}: {
  href: string;
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  fallbackLabel?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}>
      <Link href={href} className="flex items-center gap-2 transition hover:border-eid-primary-500/35">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className={PROFILE_AVATAR_SM} />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eid-surface text-[10px] font-bold text-eid-primary-300">
            {fallbackLabel}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eid-fg">{name}</p>
          {subtitle ? <p className="text-[10px] text-eid-text-secondary">{subtitle}</p> : null}
        </div>
      </Link>
      {trailing ? <div className="mt-2">{trailing}</div> : null}
    </div>
  );
}
