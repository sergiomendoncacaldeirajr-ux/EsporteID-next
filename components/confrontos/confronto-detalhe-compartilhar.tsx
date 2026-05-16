"use client";

/**
 * Botão "Arte para Stories" na página de detalhe de um confronto encerrado.
 * Abre o EidConfrontoResumoModal já com o painel de compartilhamento expandido.
 */

import { Share2 } from "lucide-react";
import { EidConfrontoResumoModal } from "@/components/perfil/eid-confronto-resumo-modal";

interface Props {
  ladoA: string;
  ladoB: string;
  ladoAAvatarUrl?: string | null;
  ladoBAvatarUrl?: string | null;
  ladoAProfileHref?: string | null;
  ladoBProfileHref?: string | null;
  placar: string;
  esporteNome?: string | null;
  modalidadeLabel?: string | null;
  mensagem?: string | null;
  dataHora?: string | null;
  local?: string | null;
  localLogoUrl?: string | null;
  origem?: "Ranking" | "Torneio";
}

export function ConfrontoDetalheCompartilhar({
  ladoA,
  ladoB,
  ladoAAvatarUrl,
  ladoBAvatarUrl,
  ladoAProfileHref,
  ladoBProfileHref,
  placar,
  esporteNome,
  modalidadeLabel,
  mensagem,
  dataHora,
  local,
  localLogoUrl,
  origem = "Ranking",
}: Props) {
  return (
    <EidConfrontoResumoModal
      titulo={`${ladoA} · ${esporteNome ?? "Esporte"}`}
      subtitulo={modalidadeLabel ? `Modalidade: ${modalidadeLabel}` : undefined}
      ladoA={ladoA}
      ladoB={ladoB}
      ladoAAvatarUrl={ladoAAvatarUrl ?? null}
      ladoBAvatarUrl={ladoBAvatarUrl ?? null}
      ladoAProfileHref={ladoAProfileHref ?? null}
      ladoBProfileHref={ladoBProfileHref ?? null}
      origem={origem}
      dataHora={dataHora ?? "—"}
      local={local ?? null}
      localLogoUrl={localLogoUrl ?? null}
      placarBase={placar}
      mensagem={mensagem ?? null}
      sportLabel={esporteNome ?? null}
      totalConfrontos={0}
      ultimosConfrontos={[]}
      defaultSharePanelOpen
    >
      <button
        type="button"
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-eid-primary-500/35 bg-eid-primary-500/10 text-[13px] font-black text-eid-primary-300 transition active:scale-[0.97] eid-light:border-eid-primary-500/30 eid-light:text-eid-primary-700"
      >
        <Share2 className="h-4 w-4 shrink-0" aria-hidden />
        Compartilhar resultado
      </button>
    </EidConfrontoResumoModal>
  );
}
