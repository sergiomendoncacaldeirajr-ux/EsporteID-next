import { PROFILE_CARD_BASE, PROFILE_CARD_PAD_MD, PROFILE_META_TITLE, PROFILE_TROPHY_CHIP } from "@/components/perfil/profile-ui-tokens";

function HistoricoEidEmptyIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 56 56"
      className={`h-14 w-14 shrink-0 text-eid-primary-400 ${className}`.trim()}
      aria-hidden
    >
      <rect x="10" y="6" width="36" height="44" rx="5" fill="color-mix(in srgb, var(--eid-primary-500) 18%, var(--eid-card))" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.25" />
      <rect x="16" y="14" width="24" height="3" rx="1" fill="currentColor" fillOpacity="0.25" />
      <rect x="16" y="22" width="18" height="2.5" rx="0.8" fill="currentColor" fillOpacity="0.18" />
      <rect x="16" y="28" width="20" height="2.5" rx="0.8" fill="currentColor" fillOpacity="0.18" />
      <circle cx="40" cy="38" r="9" fill="var(--eid-primary-500)" opacity="0.92" />
      <path d="M36.2 38.2 38.8 40.8 44.5 35" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type TimelineTone = "positive" | "negative" | "neutral";

type TimelineItem = {
  id: string;
  label: string;
  tone?: TimelineTone;
};

function toneClass(tone: TimelineTone): string {
  if (tone === "positive") return "border-emerald-400/35 text-emerald-300";
  if (tone === "negative") return "border-red-400/35 text-red-300";
  return "border-[color:var(--eid-border-subtle)] text-eid-text-secondary";
}

export function ProfileCompactTimeline({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: TimelineItem[];
  emptyText: string;
}) {
  const empty = items.length === 0;

  return (
    <div className={`mt-2 ${PROFILE_CARD_BASE} overflow-hidden p-3 sm:rounded-2xl sm:p-3.5`}>
      {!empty ? <p className={PROFILE_META_TITLE}>{title}</p> : null}
      {empty ? (
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,transparent)] text-eid-primary-400"
            aria-hidden
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className={PROFILE_META_TITLE}>{title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">{emptyText}</p>
          </div>
          <HistoricoEidEmptyIllustration className="hidden min-[380px]:block" />
        </div>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li key={item.id} className={`rounded border px-2 py-0.5 text-[10px] font-bold ${toneClass(item.tone ?? "neutral")}`}>
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProfileAchievementsShelf({
  title = "Conquistas",
  achievements,
  emptyText,
}: {
  title?: string;
  achievements: string[];
  emptyText: string;
}) {
  return (
    <div className={`mt-2 ${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}>
      <p className={PROFILE_META_TITLE}>{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {achievements.length > 0 ? (
          achievements.map((achievement) => (
            <span key={achievement} className={PROFILE_TROPHY_CHIP}>
              🏆 {achievement}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-eid-text-secondary">{emptyText}</span>
        )}
      </div>
    </div>
  );
}
