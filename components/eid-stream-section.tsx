import { Suspense, type ReactNode } from "react";
import { SkBlock } from "@/components/loading/skeleton-primitives";

type EidStreamSectionProps = {
  children: ReactNode;
  /** Placeholder enquanto o filho async não resolve (ex.: seção abaixo da dobra). */
  fallback?: ReactNode;
  className?: string;
};

/**
 * Limite de `Suspense` para RSC. O HTML do shell da rota pode ir primeiro; cada
 * seção envolta assim faz streaming quando o filho é um Server Component `async`
 * (ou importa um que suspende).
 *
 * Para ganhar efeito “bloco a bloco”, extraia trechos pesados para um componente
 * `async` separado e envolva com `EidStreamSection`.
 */
export function EidStreamSection({ children, fallback, className }: EidStreamSectionProps) {
  return (
    <div className={className}>
      <Suspense fallback={fallback ?? <EidStreamSectionFallback />}>{children}</Suspense>
    </div>
  );
}

/** Placeholder curto — usa o mesmo `SkBlock` global (respiração suave, sem shimmer). */
export function EidStreamSectionFallback({ className }: { className?: string }) {
  return (
    <div className={`space-y-2 py-0.5 ${className ?? ""}`} aria-hidden>
      <SkBlock className="h-3 w-[min(88%,18rem)] rounded-md" />
      <SkBlock className="h-9 w-full rounded-xl" />
    </div>
  );
}
