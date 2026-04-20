import type { ReactNode } from "react";
import { EidNotaMetric, EidRankingPtsMetric } from "@/components/ui/eid-metrics";
import { PROFILE_CARD_BASE, PROFILE_CARD_PAD_MD } from "@/components/perfil/profile-ui-tokens";

type ProfileSportsMetricsCardProps = {
  sportName: string;
  eidValue: number;
  rankValue: number;
  eidLabel?: string;
  rankLabel?: string;
  trendLabel?: string;
  trendPoints?: [number, number, number];
  footer?: ReactNode;
};

export function ProfileSportsMetricsCard({
  sportName,
  eidValue,
  rankValue,
  eidLabel,
  rankLabel,
  trendLabel = "Gráfico de evolução",
  trendPoints,
  footer,
}: ProfileSportsMetricsCardProps) {
  const [p1, p2, p3] = trendPoints ?? [eidValue, eidValue, eidValue];
  const toY = (value: number) => 32 - Math.max(0.8, value) * 3;

  return (
    <div className={`mt-3 ${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}>
      <p className="text-sm font-semibold text-eid-fg">{sportName}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <EidNotaMetric value={eidValue} label={eidLabel} size="sm" />
        <EidRankingPtsMetric value={rankValue} label={rankLabel} size="sm" />
      </div>
      <div className="mt-3 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-eid-text-secondary">{trendLabel}</p>
        <svg viewBox="0 0 120 34" className="mt-1 h-9 w-full text-eid-primary-400" aria-hidden>
          <polyline fill="none" stroke="currentColor" strokeWidth="2" points={`4,${toY(p1)} 58,${toY(p2)} 116,${toY(p3)}`} />
        </svg>
        {footer ? <div className="mt-1 text-[10px] text-eid-text-secondary">{footer}</div> : null}
      </div>
    </div>
  );
}
