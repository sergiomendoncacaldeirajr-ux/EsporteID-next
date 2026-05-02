import Image from "next/image";
import {
  EID_LOGO_WORDMARK_HEIGHT,
  EID_LOGO_WORDMARK_SRC,
  EID_LOGO_WORDMARK_WIDTH,
} from "@/lib/branding";

type Props = {
  className?: string;
  /** `left` no header; `center` em login / landing. */
  objectPosition?: "left" | "center";
  /**
   * Headers acima da dobra: melhora LCP (Next pede eager/priority para imagem que vira LCP).
   * Não use no rodapé — evita competir com o hero.
   */
  priority?: boolean;
};

/**
 * Somente texto ESPORTEID (sem ícone) — header e barras internas.
 */
export function LogoWordmark({ className, objectPosition = "left", priority = false }: Props) {
  const pos = objectPosition === "center" ? "object-center" : "object-left";
  return (
    <Image
      src={EID_LOGO_WORDMARK_SRC}
      alt="EsporteID"
      width={EID_LOGO_WORDMARK_WIDTH}
      height={EID_LOGO_WORDMARK_HEIGHT}
      priority={priority}
      className={`h-7 w-auto max-w-[min(55vw,220px)] object-contain md:h-8 ${pos} ${className ?? ""}`}
    />
  );
}
