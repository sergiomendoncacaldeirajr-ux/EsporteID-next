"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { atualizarMinhaEquipe, type TeamActionState } from "@/app/times/actions";

const initial: TeamActionState = { ok: false, message: "" };

export function PerfilTimeEditForm({
  timeId,
  nome,
  username,
  bio,
  localizacao,
  escudo,
  vagas_abertas,
  aceita_pedidos,
  nivel_procurado,
  variant = "inline",
}: {
  timeId: number;
  nome: string;
  username: string | null;
  bio: string | null;
  localizacao: string | null;
  escudo: string | null;
  vagas_abertas: boolean;
  aceita_pedidos: boolean;
  nivel_procurado: string | null;
  /** `page`: tela dedicada (sem accordion). */
  variant?: "inline" | "page";
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(atualizarMinhaEquipe, initial);
  const [escudoPreview, setEscudoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!state.ok) return;
    setEscudoPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    router.refresh();
  }, [state.ok, router]);

  useEffect(() => {
    return () => {
      if (escudoPreview?.startsWith("blob:")) URL.revokeObjectURL(escudoPreview);
    };
  }, [escudoPreview]);

  const escudoDisplay = escudoPreview ?? (escudo?.trim() ? escudo : null);

  const blocoAjuda = (
    <p className="mt-2 text-[10px] leading-relaxed text-eid-text-secondary">
      Nome, @username, bio, escudo e vagas/convites podem ser alterados. Partidas de ranking e torneios são regras da
      plataforma para todas as formações. O <strong className="text-eid-fg">esporte e a cidade são fixos</strong> depois da
      criação. Se mudou de cidade ou de esporte,{" "}
      <Link href="/times" className="font-semibold text-eid-primary-300 underline">
        crie uma nova formação
      </Link>{" "}
      e reorganize o elenco.
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
        <div className="rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 px-3 py-2 sm:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-primary-300">Escudo</p>
          <p className="mt-1 text-[10px] text-eid-text-secondary">
            Troque a imagem do escudo quando quiser (JPG, PNG, WEBP ou HEIC, até 5MB). Se não escolher arquivo novo, mantém o atual.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {escudoDisplay ? (
              <img
                src={escudoDisplay}
                alt="Pré-visualização do escudo"
                className="h-16 w-16 rounded-lg border border-[color:var(--eid-border-subtle)] object-cover"
              />
            ) : (
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/50 text-[10px] text-eid-text-secondary">
                Sem foto
              </span>
            )}
            <input
              type="file"
              name="escudo_file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
              className="min-w-0 flex-1 text-[11px] text-eid-text-secondary file:mr-2 file:rounded-lg file:border file:border-[color:var(--eid-border-subtle)] file:bg-eid-surface/70 file:px-2.5 file:py-1 file:text-[10px] file:font-semibold file:text-eid-fg"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setEscudoPreview((prev) => {
                  if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                  return f ? URL.createObjectURL(f) : null;
                });
              }}
            />
          </div>
        </div>
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
          <input type="checkbox" name="vagas_abertas" defaultChecked={vagas_abertas} className="rounded border-eid-border-subtle" />
          Vagas abertas
        </label>
        <label className="flex items-center gap-2 text-xs text-eid-text-secondary sm:col-span-2">
          <input type="checkbox" name="aceita_pedidos" defaultChecked={aceita_pedidos} className="rounded border-eid-border-subtle" />
          Aceita pedidos / convites
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
      <section className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 text-left">
        <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
          <h2 className="text-sm font-semibold text-eid-fg">Dados da formação</h2>
          <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
            Editar
          </span>
        </div>
        <div className="p-4 sm:p-5">
          {blocoAjuda}
          {formInner}
        </div>
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
