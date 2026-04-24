/** Ícone do CTA principal de desafio (igual ao “Pedir desafio” no perfil). */
export function DesafioFlowCtaIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`${className} shrink-0 text-white drop-shadow-sm`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2L5 13h5l-1 9 10-13h-6l0-7z" />
    </svg>
  );
}
