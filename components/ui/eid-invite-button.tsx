import { Loader2, Send } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
  compact?: boolean;
};

export const EID_INVITE_ACTION_CLASS =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_42%,var(--eid-border-subtle)_58%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_13%,var(--eid-card)_87%)] text-[color:color-mix(in_srgb,var(--eid-primary-500)_78%,var(--eid-fg)_22%)] shadow-[0_6px_18px_-14px_rgba(37,99,235,0.45)] transition hover:border-[color:color-mix(in_srgb,var(--eid-primary-500)_56%,var(--eid-border-subtle)_44%)] hover:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_19%,var(--eid-card)_81%)]";

export function EidInviteButton({
  loading = false,
  label = "Convite",
  loadingLabel = "Enviando...",
  compact = false,
  className = "",
  disabled,
  ...props
}: Props) {
  const isDisabled = disabled || loading;
  const sizeClass = compact
    ? "min-h-[28px] px-2.5 text-[10px] font-extrabold tracking-[0.04em]"
    : "min-h-[38px] px-3.5 text-xs font-black tracking-[0.05em]";
  const iconClass = compact ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={`${EID_INVITE_ACTION_CLASS} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      {loading ? <Loader2 className={`${iconClass} animate-spin`} aria-hidden /> : <Send className={iconClass} aria-hidden />}
      <span>{loading ? loadingLabel : label}</span>
    </button>
  );
}
