import type { ReactNode } from "react";

type Props = {
  title: string;
  badge?: ReactNode;
  info?: ReactNode;
  id?: string;
  className?: string;
  titleAs?: "h2" | "h3";
};

export const EID_PANEL_HEADER_CLASS =
  "flex min-h-10 items-center justify-between gap-2 border-b border-[rgba(37,99,235,0.14)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_13%,var(--eid-card)_87%)] px-3 py-2 eid-light:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_9%,white_91%)] md:px-4";

export const EID_PANEL_TITLE_CLASS =
  "min-w-0 truncate font-[family-name:var(--font-barlow),ui-sans-serif] text-[10px] font-black uppercase leading-none tracking-[0.18em] text-eid-primary-300 eid-light:text-eid-primary-600";

export function EidPanelHeader({ title, badge, info, id, className, titleAs: Title = "h2" }: Props) {
  return (
    <div className={`${EID_PANEL_HEADER_CLASS} ${info ? "items-start" : ""} ${className ?? ""}`.trim()}>
      {info ? (
        <details className="group min-w-0 flex-1">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden">
            <Title id={id} className={EID_PANEL_TITLE_CLASS}>
              {title}
            </Title>
            <span
              aria-hidden
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 text-[10px] font-black normal-case leading-none tracking-normal text-eid-primary-300 transition group-open:bg-eid-primary-500/18 group-open:text-eid-primary-200 eid-light:text-eid-primary-600"
            >
              i
            </span>
          </summary>
          <div className="mt-2 max-w-3xl rounded-lg border border-eid-primary-500/20 bg-eid-surface/80 px-2.5 py-2 text-[11px] font-medium normal-case leading-relaxed tracking-normal text-eid-text-secondary shadow-sm eid-light:bg-white/85 md:text-xs">
            {info}
          </div>
        </details>
      ) : (
        <Title id={id} className={`${EID_PANEL_TITLE_CLASS} flex-1`}>
          {title}
        </Title>
      )}
      {badge ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">{badge}</div> : null}
    </div>
  );
}
