"use client";

import { useState } from "react";
import { FormacaoTransferirLiderancaForm } from "@/components/times/formacao-transferir-lideranca-form";

type Props = {
  timeId: number;
  membroUsuarioId: string;
  membroNome: string;
  membroAvatarUrl: string | null;
  transferButtonClassName: string;
  removerAction: (formData: FormData) => Promise<void>;
  removerButtonClassName: string;
};

/**
 * Linha “Transferir liderança” + “Remover”: ao abrir o painel de transferência, o Remover some
 * para não ficar espremido no flex (bug visual no perfil do time).
 */
export function PerfilTimeMembroLiderAcoes({
  timeId,
  membroUsuarioId,
  membroNome,
  membroAvatarUrl,
  transferButtonClassName,
  removerAction,
  removerButtonClassName,
}: Props) {
  const [transferPainelAberto, setTransferPainelAberto] = useState(false);

  return (
    <div
      className={`flex w-full min-w-0 gap-2 ${transferPainelAberto ? "flex-col" : "flex-row items-stretch"}`}
    >
      {/* Coluna: flex-1 + basis-0 + min-w-0 (evita w-0 no botão interno, que quebrava após o wrapper extra) */}
      <div className={transferPainelAberto ? "w-full min-w-0" : "min-w-0 flex-1 basis-0"}>
        <FormacaoTransferirLiderancaForm
          timeId={timeId}
          novoLiderUsuarioId={membroUsuarioId}
          novoLiderNome={membroNome}
          novoLiderAvatarUrl={membroAvatarUrl}
          formacaoTipo="time"
          onTransferFlowOpenChange={setTransferPainelAberto}
          className={transferButtonClassName}
        />
      </div>
      {!transferPainelAberto ? (
        <form action={removerAction} className="min-w-0 flex-1 basis-0">
          <input type="hidden" name="usuario_id" value={membroUsuarioId} />
          <button type="submit" className={removerButtonClassName}>
            Remover
          </button>
        </form>
      ) : null}
    </div>
  );
}
