import {
  EID_LOGO_WORDMARK_HEIGHT,
  EID_LOGO_WORDMARK_SRC,
  EID_LOGO_WORDMARK_WIDTH,
} from "@/lib/branding";

type Props = {
  className?: string;
};

/**
 * Somente texto ESPORTEID (sem ícone) — header e barras internas.
 */
export function LogoWordmark({ className }: Props) {
  return (
    <img
      src={EID_LOGO_WORDMARK_SRC}
      alt="EsporteID"
      width={EID_LOGO_WORDMARK_WIDTH}
      height={EID_LOGO_WORDMARK_HEIGHT}
      className={`h-7 w-auto max-w-[min(55vw,220px)] object-contain object-left md:h-8 ${className ?? ""}`}
      decoding="async"
    />
  );
}
