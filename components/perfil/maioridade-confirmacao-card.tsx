import Link from "next/link";

/**
 * Card apresentado no dashboard para atletas que ainda não confirmaram maioridade.
 * Cobre dois cenários: nunca iniciou a verificação (gate = "ok"/null) ou já está
 * em um estado intermediário (pendente_documento, em_analise, reprovado).
 */
export function MaioridadeConfirmacaoCard({ gate }: { gate: string }) {
  const emAnalise = gate === "em_analise";
  const reprovado = gate === "reprovado";
  const pendente = gate === "pendente_documento" || gate === "ok" || !gate;

  if (emAnalise) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-eid-primary-500/30 bg-eid-primary-500/[0.07] px-4 py-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-eid-primary-500/35 bg-eid-primary-500/15">
          <svg className="h-4 w-4 text-eid-primary-300" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-eid-fg">Verificação em processamento</p>
          <p className="mt-0.5 text-xs leading-snug text-eid-text-secondary">
            Recebemos seus arquivos e estamos analisando. Em breve você poderá usar o sistema de desafios.
          </p>
        </div>
      </div>
    );
  }

  if (reprovado) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-500/35 bg-red-500/[0.07] px-4 py-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-500/35 bg-red-500/12">
          <svg className="h-4 w-4 text-red-300" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-eid-fg">Verificação não aprovada</p>
          <p className="mt-0.5 text-xs leading-snug text-eid-text-secondary">
            Não foi possível confirmar correspondência entre documento e selfie. Tente novamente com imagens mais nítidas.
          </p>
          <Link
            href="/conta/verificacao-idade"
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-eid-action-400 underline underline-offset-2"
          >
            Tentar novamente
          </Link>
        </div>
      </div>
    );
  }

  // Estado principal: nunca iniciou ou pendente_documento
  if (!pendente) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-eid-primary-500/30 bg-gradient-to-br from-eid-card via-eid-card to-eid-primary-500/[0.08]">
      {/* Blobs decorativos */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-eid-primary-500/10 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-6 left-4 h-20 w-20 rounded-full bg-eid-action-500/8 blur-2xl" aria-hidden />

      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5">
        {/* Ícone */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-eid-primary-500/30 bg-eid-primary-500/12 shadow-[0_0_20px_rgba(37,99,235,0.18)]">
          <svg className="h-7 w-7 text-eid-primary-300" viewBox="0 0 32 32" fill="none" aria-hidden>
            <path d="M16 4a7 7 0 0 1 7 7v4H9v-4a7 7 0 0 1 7-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <rect x="6" y="15" width="20" height="14" rx="3.5" stroke="currentColor" strokeWidth="2"/>
            <circle cx="16" cy="22" r="2" fill="currentColor"/>
            <path d="M16 24v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Texto */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black tracking-tight text-eid-fg">Confirme sua maioridade</p>
            <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-eid-primary-300">
              Necessário para desafios
            </span>
          </div>
          <p className="mt-1 text-xs leading-snug text-eid-text-secondary">
            Para pedir e receber desafios na plataforma você precisa confirmar que é maior de 18 anos. O processo é rápido — basta enviar um documento e uma selfie.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href="/conta/verificacao-idade"
              className="inline-flex items-center gap-1.5 rounded-xl bg-eid-primary-500 px-4 py-2 text-xs font-bold text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)] transition hover:bg-eid-primary-600 active:scale-95"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 1a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9ZM2 14.5c0-2.485 2.686-4.5 6-4.5s6 2.015 6 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Confirmar agora
            </Link>
            <span className="inline-flex items-center gap-1 text-[10px] text-eid-text-muted">
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Rápido e seguro
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
