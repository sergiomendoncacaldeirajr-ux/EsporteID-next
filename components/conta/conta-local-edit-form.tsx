"use client";

import { useActionState } from "react";
import { atualizarMeuLocal, type LocalActionState } from "@/app/locais/actions";

const initial: LocalActionState = { ok: false, message: "" };

export function ContaLocalEditForm({
  espacoId,
  nomePublico,
  localizacao,
  logoArquivo,
  tipoQuadra,
  lat,
  lng,
  aceitaReserva,
  ativoListagem,
}: {
  espacoId: number;
  nomePublico: string;
  localizacao: string;
  logoArquivo: string | null;
  tipoQuadra: string | null;
  lat: string | null;
  lng: string | null;
  aceitaReserva: boolean;
  ativoListagem: boolean;
}) {
  const [state, formAction, pending] = useActionState(atualizarMeuLocal, initial);

  return (
    <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="espaco_id" value={espacoId} />
      <div className="sm:col-span-2">
        <label htmlFor="nome_publico" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Nome do local
        </label>
        <input
          id="nome_publico"
          name="nome_publico"
          required
          minLength={2}
          defaultValue={nomePublico}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="localizacao" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Cidade / região ou endereço
        </label>
        <input
          id="localizacao"
          name="localizacao"
          required
          minLength={3}
          defaultValue={localizacao}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="logo_arquivo" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          URL do logo (opcional)
        </label>
        <input
          id="logo_arquivo"
          name="logo_arquivo"
          type="url"
          defaultValue={logoArquivo ?? ""}
          placeholder="https://…"
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        />
      </div>
      <div>
        <label htmlFor="tipo_quadra" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Tipo de quadra (opcional)
        </label>
        <input
          id="tipo_quadra"
          name="tipo_quadra"
          defaultValue={tipoQuadra ?? ""}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="lat" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
            Lat (opcional)
          </label>
          <input id="lat" name="lat" defaultValue={lat ?? ""} className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg" />
        </div>
        <div>
          <label htmlFor="lng" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
            Lng (opcional)
          </label>
          <input id="lng" name="lng" defaultValue={lng ?? ""} className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-eid-text-secondary sm:col-span-2">
        <input type="checkbox" name="aceita_reserva" defaultChecked={aceitaReserva} className="rounded border-eid-border-subtle" />
        Aceita reserva
      </label>
      <label className="flex items-center gap-2 text-xs text-eid-text-secondary sm:col-span-2">
        <input type="checkbox" name="ativo_listagem" defaultChecked={ativoListagem} className="rounded border-eid-border-subtle" />
        Aparecer na listagem pública de locais
      </label>
      <button
        type="submit"
        disabled={pending}
        className="eid-btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold sm:col-span-2"
      >
        {pending ? "Salvando..." : "Salvar local"}
      </button>
      {state.message ? (
        <p className={`text-xs sm:col-span-2 ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
