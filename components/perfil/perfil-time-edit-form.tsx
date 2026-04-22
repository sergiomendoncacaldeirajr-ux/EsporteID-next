"use client";

import Link from "next/link";
import { useActionState } from "react";
import { atualizarMinhaEquipe, type TeamActionState } from "@/app/times/actions";

const initial: TeamActionState = { ok: false, message: "" };

export function PerfilTimeEditForm({
  timeId,
  nome,
  username,
  bio,
  localizacao,
  escudo,
  interesse_rank_match,
  disponivel_amistoso,
  vagas_abertas,
  aceita_pedidos,
  interesse_torneio,
  nivel_procurado,
  variant = "inline",
}: {
  timeId: number;
  nome: string;
  username: string | null;
  bio: string | null;
  localizacao: string | null;
  escudo: string | null;
  interesse_rank_match: boolean;
  disponivel_amistoso: boolean;
  vagas_abertas: boolean;
  aceita_pedidos: boolean;
  interesse_torneio: boolean;
  nivel_procurado: string | null;
  /** `page`: tela dedicada (sem accordion). */
  variant?: "inline" | "page";
}) {
  const [state, formAction, pending] = useActionState(atualizarMinhaEquipe, initial);

  const blocoAjuda = (
    <p className="mt-2 text-[10px] leading-relaxed text-eid-text-secondary">
      Nome, @username, bio, escudo e preferências podem ser alterados. O{" "}
      <strong className="text-eid-fg">esporte e a cidade da formação são fixos</strong> depois da criação (ranking e radar
      dependem disso). Se o time mudou de cidade ou for atuar em outro esporte, é preciso{" "}
      <Link href="/times" className="font-semibold text-eid-primary-300 underline">
        criar uma nova formação
      </Link>{" "}
      e reorganizar o elenco.
    </p>
  );

  const formInner = (
    <>
      <form action={formAction} className={`grid gap-2 sm:grid-cols-2 ${variant === "page" ? "mt-4" : "mt-3"}`}>
        <input type="hidden" name="time_id" value={timeId} />
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2 sm:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Cidade da formação (fixa)</p>
          <input type="hidden" name="localizacao" value={localizacao ?? ""} />
          <input
            type="text"
            value={localizacao?.trim() ? localizacao : "Não informada"}
            disabled
            className="mt-1 w-full cursor-not-allowed rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-2.5 py-1.5 text-sm text-eid-text-secondary opacity-85"
          />
          <p className="mt-1 rounded-lg border border-[#f5c56b] bg-[#fff3cd] px-2 py-1 text-[11px] font-bold text-[#5a3200]">
            Esta cidade não pode ser editada. Para mudar a localização, crie outra equipe/dupla.
          </p>
        </div>
        <input
          name="nome"
          required
          defaultValue={nome}
          placeholder="Nome da equipe"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2"
        />
        <input
          name="username"
          defaultValue={username ?? ""}
          placeholder="@username (opcional)"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2"
        />
        <input
          name="escudo"
          defaultValue={escudo ?? ""}
          placeholder="URL do escudo (imagem)"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2"
        />
        <textarea
          name="bio"
          rows={2}
          defaultValue={bio ?? ""}
          placeholder="Bio da equipe"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2"
        />
        <input
          name="nivel_procurado"
          defaultValue={nivel_procurado ?? ""}
          placeholder="Nível procurado (opcional)"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2"
        />
        <label className="flex items-center gap-2 text-xs text-eid-text-secondary sm:col-span-2">
          <input type="checkbox" name="interesse_rank_match" defaultChecked={interesse_rank_match} className="rounded border-eid-border-subtle" />
          Interesse em match no ranking
        </label>
        <label className="flex items-center gap-2 text-xs text-eid-text-secondary sm:col-span-2">
          <input type="checkbox" name="disponivel_amistoso" defaultChecked={disponivel_amistoso} className="rounded border-eid-border-subtle" />
          Disponível para amistoso
        </label>
        <label className="flex items-center gap-2 text-xs text-eid-text-secondary sm:col-span-2">
          <input type="checkbox" name="vagas_abertas" defaultChecked={vagas_abertas} className="rounded border-eid-border-subtle" />
          Vagas abertas
        </label>
        <label className="flex items-center gap-2 text-xs text-eid-text-secondary sm:col-span-2">
          <input type="checkbox" name="aceita_pedidos" defaultChecked={aceita_pedidos} className="rounded border-eid-border-subtle" />
          Aceita pedidos / convites
        </label>
        <label className="flex items-center gap-2 text-xs text-eid-text-secondary sm:col-span-2">
          <input type="checkbox" name="interesse_torneio" defaultChecked={interesse_torneio} className="rounded border-eid-border-subtle" />
          Interesse em torneios
        </label>
        <button
          type="submit"
          disabled={pending}
          className="eid-btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold sm:col-span-2"
        >
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
        {state.message ? (
          <p className={`text-xs sm:col-span-2 ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
        ) : null}
      </form>
    </>
  );

  if (variant === "page") {
    return (
      <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 text-left sm:p-5">
        <h2 className="text-sm font-semibold text-eid-fg">Dados da formação</h2>
        {blocoAjuda}
        {formInner}
      </section>
    );
  }

  return (
    <details className="mt-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-3 text-left">
      <summary className="cursor-pointer text-sm font-semibold text-eid-fg">Editar dados da formação</summary>
      {blocoAjuda}
      {formInner}
    </details>
  );
}
