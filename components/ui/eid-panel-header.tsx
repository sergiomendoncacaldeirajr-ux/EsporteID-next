import type { ReactNode } from "react";

type Props = {
  title: string;
  badge?: ReactNode;
  id?: string;
  className?: string;
  titleAs?: "h2" | "h3";
};

export const EID_PANEL_HEADER_CLASS =
  "flex min-h-10 items-center justify-between gap-2 border-b border-[rgba(37,99,235,0.14)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_13%,var(--eid-card)_87%)] px-3 py-2 eid-light:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_9%,white_91%)] md:px-4";

export const EID_PANEL_TITLE_CLASS =
  "min-w-0 truncate font-[family-name:var(--font-barlow),ui-sans-serif] text-[10px] font-black uppercase leading-none tracking-[0.18em] text-eid-primary-300 eid-light:text-eid-primary-600";

export function EidPanelHeader({ title, badge, id, className, titleAs: Title = "h2" }: Props) {
  return (
    <div className={`${EID_PANEL_HEADER_CLASS} ${className ?? ""}`.trim()}>
      <Title id={id} className={EID_PANEL_TITLE_CLASS}>
        {title}
      </Title>
      {badge ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">{badge}</div> : null}
    </div>
  );
}
