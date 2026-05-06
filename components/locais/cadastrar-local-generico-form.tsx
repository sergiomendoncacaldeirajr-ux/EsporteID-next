"use client";

import { useMemo, useState } from "react";
import { cadastrarLocalGenerico } from "@/app/locais/cadastrar/actions";
import { CadastrarLocalEnderecoFields } from "@/components/locais/cadastrar-local-endereco-fields";
import { LocalSubmitButton } from "@/components/locais/local-submit-button";
import { NomeLocalInputSuggestions } from "@/components/locais/nome-local-input-suggestions";
import { locaisSectionTitleClass } from "@/components/locais/locais-ui-tokens";
import { TeamShieldControl } from "@/components/perfil/team-shield-control";
import { normalizeEspacoDuplicateValue } from "@/lib/espacos/duplicate";
import Link from "next/link";

type LocalHint = {
  id: number;
  nome_publico: string | null;
  localizacao: string | null;
};

type Props = {
  locais: LocalHint[];
  canOpenLocais: boolean;
  returnTo: string;
  localLogoUrl?: string | null;
};

export function CadastrarLocalGenericoForm({ locais, canOpenLocais, returnTo, localLogoUrl = null }: Props) {
  const [nome, setNome] = useState("");
  const normalizedNome = useMemo(() => normalizeEspacoDuplicateValue(nome), [nome]);

  const exactMatch = useMemo(() => {
    if (normalizedNome.length < 2) return null;
    for (const local of locais) {
      const n = normalizeEspacoDuplicateValue(local.nome_publico ?? "");
      if (n && n === normalizedNome) return local;
    }
    return null;
  }, [locais, normalizedNome]);

  const canEditAddress = normalizedNome.length >= 2 && !exactMatch;

  return (
    <form
      action={cadastrarLocalGenerico}
      className="space-y-4"
      onSubmit={(e) => {
        if (!canEditAddress) e.preventDefault();
      }}
    >
      <input type="hidden" name="return_to" value={returnTo} />
      <NomeLocalInputSuggestions locais={locais} canOpenLocais={canOpenLocais} nome={nome} onNomeChange={setNome} />

      {normalizedNome.length >= 2 && exactMatch ? (
        <div className="rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2.5" role="alert">
          <p className="text-sm font-semibold text-red-200">Este nome já está cadastrado</p>
          <p className="mt-1 text-xs text-red-200/90">
            Não é possível criar outro local com o mesmo nome. Use um nome diferente ou abra o cadastro existente.
          </p>
          {canOpenLocais ? (
            <Link
              href={`/local/${exactMatch.id}?from=/locais/cadastrar`}
              className="mt-2 inline-flex rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg"
            >
              Abrir “{exactMatch.nome_publico ?? "Local"}”
            </Link>
          ) : null}
        </div>
      ) : null}

      {canEditAddress ? (
        <>
          <CadastrarLocalEnderecoFields localLogoUrl={localLogoUrl} />
          <div className="rounded-xl border border-dashed border-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,var(--eid-primary-500)_12%)] bg-[color:color-mix(in_srgb,var(--eid-card)_86%,var(--eid-bg)_14%)] p-3 sm:p-4">
            <p className={locaisSectionTitleClass}>Foto / logo (opcional)</p>
            <p className="mt-1 text-[11px] text-eid-text-secondary">
              Mesmo fluxo de foto do app: conversão HEIC, otimização e enquadramento antes do envio. O arquivo vai como JPEG (até 5MB no servidor).
            </p>
            <TeamShieldControl
              currentUrl={null}
              variant="espaco_logo"
              fileInputName="logo_file"
              removeFlagName="logo_remove"
            />
          </div>
          <LocalSubmitButton />
        </>
      ) : normalizedNome.length < 2 && nome.trim().length > 0 ? (
        <p className="rounded-xl border border-dashed border-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-card)_88%,var(--eid-bg)_12%)] px-3 py-3 text-[12px] text-eid-text-secondary">
          Preencha o nome do local acima. Depois disso você informa o endereço e pode enviar a sugestão.
        </p>
      ) : normalizedNome.length < 2 ? (
        <p className="rounded-xl border border-dashed border-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-card)_88%,var(--eid-bg)_12%)] px-3 py-3 text-[12px] text-eid-text-secondary">
          Comece pelo nome do local. Com pelo menos 3 letras mostramos sugestões de locais parecidos.
        </p>
      ) : null}
    </form>
  );
}
