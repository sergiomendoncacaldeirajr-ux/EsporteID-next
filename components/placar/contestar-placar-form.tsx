"use client";

import { contestarPlacarAction } from "@/app/registrar-placar/[id]/actions";
import { DESAFIO_FLOW_SECONDARY_CLASS } from "@/lib/desafio/flow-ui";
import { StatusSubmitButton } from "@/components/placar/status-submit-button";

type Props = {
  partidaId: number;
};

export function ContestarPlacarForm({ partidaId }: Props) {
  return (
    <form
      action={async (formData) => {
        const ok = window.confirm(
          "A contestação anula o placar enviado pelo oponente. Nada é enviado para aprovação agora: depois você preenche e envia o novo resultado. O oponente só verá o placar para revisar após esse envio. Se houver nova divergência após o reenvio, o caso segue para mediação do admin. Deseja contestar?"
        );
        if (!ok) return;
        await contestarPlacarAction(formData);
      }}
    >
      <input type="hidden" name="partida_id" value={partidaId} />
      <StatusSubmitButton
        idleLabel="Contestar resultado"
        pendingLabel="Contestando..."
        className={`${DESAFIO_FLOW_SECONDARY_CLASS} w-full rounded-xl hover:border-amber-500/45 hover:text-[color:color-mix(in_srgb,var(--eid-fg)_55%,#f59e0b_45%)] disabled:opacity-60`}
      />
    </form>
  );
}
