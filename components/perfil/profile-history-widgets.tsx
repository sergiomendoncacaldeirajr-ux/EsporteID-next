import { PROFILE_CARD_BASE, PROFILE_CARD_PAD_MD, PROFILE_META_TITLE, PROFILE_TROPHY_CHIP } from "@/components/perfil/profile-ui-tokens";
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
  return (
    <div className={`mt-3 ${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}>
      <p className={PROFILE_META_TITLE}>{title}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <li key={item.id} className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${toneClass(item.tone ?? "neutral")}`}>
              {item.label}
            </li>
          ))
        ) : (
          <li className="text-xs text-eid-text-secondary">{emptyText}</li>
        )}
      </ul>
    </div>
  );
}

export function ProfileAchievementsShelf({
  title = "Estante de troféus",
  achievements,
  emptyText,
}: {
  title?: string;
  achievements: string[];
  emptyText: string;
}) {
  return (
    <div className={`mt-3 ${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}>
      <p className={PROFILE_META_TITLE}>{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {achievements.length > 0 ? (
          achievements.map((achievement) => (
            <span key={achievement} className={PROFILE_TROPHY_CHIP}>
              🏆 {achievement}
            </span>
          ))
        ) : (
          <span className="text-xs text-eid-text-secondary">{emptyText}</span>
        )}
      </div>
    </div>
  );
}
