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
    <div className="border-t border-[color:var(--eid-border-subtle)] px-2.5 pb-2.5 pt-2">
      <div className="flex flex-wrap gap-2">
        <EidNotaMetric value={eidValue} label={eidLabel} size="sm" />
        <EidRankingPtsMetric value={rankValue} label={rankLabel} size="sm" />
      </div>
      <div className="mt-2 rounded-md border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 p-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-eid-text-secondary">{trendLabel}</p>
        <svg viewBox="0 0 120 34" className="mt-1 h-7 w-full" aria-hidden>
          <defs>
            <linearGradient id="eid-trend-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--eid-primary-500)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--eid-action-500)" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <polyline fill="none" stroke="url(#eid-trend-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={`4,${toY(p1)} 58,${toY(p2)} 116,${toY(p3)}`} />
          <circle cx="4" cy={toY(p1)} r="2.5" fill="var(--eid-primary-500)" fillOpacity="0.7" />
          <circle cx="58" cy={toY(p2)} r="2.5" fill="var(--eid-primary-400)" fillOpacity="0.8" />
          <circle cx="116" cy={toY(p3)} r="2.5" fill="var(--eid-action-500)" fillOpacity="0.9" />
        </svg>
        {footer ? <div className="mt-1 text-[10px] text-eid-text-secondary">{footer}</div> : null}
      </div>
    </div>
  );
}
