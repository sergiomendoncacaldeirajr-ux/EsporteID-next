"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cadastrarLocalGenerico } from "@/app/locais/cadastrar/actions";
import { CadastrarLocalEnderecoFields, type EnderecoInitialValues } from "@/components/locais/cadastrar-local-endereco-fields";
import { LocalSubmitButton } from "@/components/locais/local-submit-button";
import { NomeLocalInputSuggestions } from "@/components/locais/nome-local-input-suggestions";
import { locaisSectionTitleClass } from "@/components/locais/locais-ui-tokens";
import { TeamShieldControl } from "@/components/perfil/team-shield-control";
import { normalizeEspacoDuplicateValue } from "@/lib/espacos/duplicate";

export type LocalHint = {
  id: number;
  nome_publico: string | null;
  localizacao: string | null;
  logo_arquivo?: string | null;
  lat?: string | null;
  lng?: string | null;
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  complemento?: string | null;
};

type Props = {
  locais: LocalHint[];
  canOpenLocais: boolean;
  returnTo: string;
  localLogoUrl?: string | null;
};

export function CadastrarLocalGenericoForm({ locais, canOpenLocais, returnTo, localLogoUrl = null }: Props) {
  const [nome, setNome] = useState("");
  const [claimMode, setClaimMode] = useState(false);
  const normalizedNome = useMemo(() => normalizeEspacoDuplicateValue(nome), [nome]);

  const exactMatch = useMemo(() => {
    if (normalizedNome.length < 2) return null;
    for (const local of locais) {
      const n = normalizeEspacoDuplicateValue(local.nome_publico ?? "");
      if (n && n === normalizedNome) return local;
    }
    return null;
  }, [locais, normalizedNome]);

  // Reset claim mode via the onNomeChange callback (handled inline in the JSX below)

  const canEditAddress = normalizedNome.length >= 2 && (!exactMatch || claimMode);

  const claimInitialValues: EnderecoInitialValues | undefined = exactMatch ? {
    endereco: exactMatch.endereco ?? "",
    numero: exactMatch.numero ?? "",
    bairro: exactMatch.bairro ?? "",
    cidade: exactMatch.cidade ?? "",
    estado: exactMatch.estado ?? "",
    cep: exactMatch.cep ?? "",
    complemento: exactMatch.complemento ?? "",
    lat: exactMatch.lat ?? "",
    lng: exactMatch.lng ?? "",
  } : undefined;

  return (
    <form
      action={cadastrarLocalGenerico}
      className="space-y-4"
      onSubmit={(e) => {
        if (!canEditAddress) e.preventDefault();
      }}
    >
      <input type="hidden" name="return_to" value={returnTo} />
      {/* When claiming an existing espaco, pass its ID so the action updates instead of creating */}
      {claimMode && exactMatch ? (
        <input type="hidden" name="espaco_id_reivindicado" value={String(exactMatch.id)} />
      ) : null}

      <NomeLocalInputSuggestions locais={locais} canOpenLocais={canOpenLocais} nome={nome} onNomeChange={(n) => { setNome(n); setClaimMode(false); }} />

      {/* Exact match: offer to claim the existing espaco */}
      {normalizedNome.length >= 2 && exactMatch && !claimMode ? (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            {exactMatch.logo_arquivo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={exactMatch.logo_arquivo} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-white/10 object-cover" />
            ) : (
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 text-[10px] font-black text-eid-fg">EID</div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-eid-fg">{exactMatch.nome_publico ?? "Local"}</p>
              <p className="truncate text-xs text-eid-text-secondary">{exactMatch.localizacao ?? "Sem localização"}</p>
            </div>
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-sky-200">
            Este local já está cadastrado. Você é o responsável por este espaço? Confirme ou ajuste os dados e solicite a posse — um administrador vai revisar e aprovar.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setClaimMode(true)}
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 text-[11px] font-bold text-sky-200 transition hover:bg-sky-500/22"
            >
              Sou o responsável — confirmar dados
            </button>
            {canOpenLocais ? (
              <Link
                href={`/local/${exactMatch.id}?from=/locais/cadastrar`}
                className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-3 text-[11px] font-semibold text-eid-fg transition hover:border-eid-primary-500/35"
              >
                Só ver o local
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {canEditAddress ? (
        <>
          {claimMode && exactMatch ? (
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/8 px-3 py-2.5">
              <p className="text-[11px] font-bold text-sky-300">
                ✓ Reivindicando: <span className="font-normal">{exactMatch.nome_publico}</span>
              </p>
              <p className="mt-0.5 text-[10px] text-sky-200/70">
                Confirme ou corrija os dados abaixo. O admin vai revisar e te conceder a posse oficial.
              </p>
            </div>
          ) : null}
          <CadastrarLocalEnderecoFields
            localLogoUrl={claimMode ? (exactMatch?.logo_arquivo ?? localLogoUrl) : localLogoUrl}
            initialValues={claimMode ? claimInitialValues : undefined}
          />
          <div className="rounded-xl border border-dashed border-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,var(--eid-primary-500)_12%)] bg-[color:color-mix(in_srgb,var(--eid-card)_86%,var(--eid-bg)_14%)] p-3 sm:p-4">
            <p className={locaisSectionTitleClass}>Foto / logo (opcional)</p>
            <p className="mt-1 text-[11px] text-eid-text-secondary">
              Mesmo fluxo de foto do app: conversão HEIC, otimização e enquadramento antes do envio. O arquivo vai como JPEG (até 5MB no servidor).
            </p>
            <TeamShieldControl
              currentUrl={claimMode ? (exactMatch?.logo_arquivo ?? null) : null}
              variant="espaco_logo"
              fileInputName="logo_file"
              removeFlagName="logo_remove"
            />
          </div>
          <LocalSubmitButton idleLabel={claimMode ? "Solicitar posse do espaço" : undefined} />
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
