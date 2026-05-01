"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
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
  genero,
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
  genero: string | null;
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
  const isPage = variant === "page";

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
      <form action={formAction} className={`grid gap-2 sm:grid-cols-2 ${isPage ? "mt-3.5" : "mt-3"}`}>
        <input type="hidden" name="time_id" value={timeId} />
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2 sm:col-span-2">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            Cidade da formação (fixa)
          </p>
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
        <div className="sm:col-span-2">
          <div className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#64748B]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="8.5" cy="8.5" r="2.5" />
              <circle cx="15.5" cy="10" r="2.2" />
              <path d="M4 18a5 5 0 0 1 9 0" />
              <path d="M13 18a4 4 0 0 1 7 0" />
            </svg>
            <input
              name="nome"
              required
              defaultValue={nome}
              placeholder="Nome da equipe"
              className="h-10 w-full bg-transparent text-sm text-eid-fg placeholder:text-[#64748B] focus:outline-none"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#64748B]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="8" />
              <path d="M8.5 14.8c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4" />
              <path d="M9.8 9.8h4.4" />
            </svg>
            <input
              name="username"
              defaultValue={username ?? ""}
              placeholder="@username (opcional)"
              className="h-10 w-full bg-transparent text-sm text-eid-fg placeholder:text-[#64748B] focus:outline-none"
            />
          </div>
        </div>
        <div className="rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 px-3 py-2 sm:col-span-2">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-primary-300">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
              <path d="m12 2 7 2.4V11c0 4.1-2.8 7.7-7 9-4.2-1.3-7-4.9-7-9V4.4L12 2Z" />
            </svg>
            Escudo
          </p>
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
        <div className="sm:col-span-2">
          <p className={`${isPage ? "inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg" : "text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary"}`}>
            {isPage ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4H19v16H7.5A2.5 2.5 0 0 0 5 22V6.5Z" />
                <path d="M8.5 8H16M8.5 12h7M8.5 16h5" />
              </svg>
            ) : null}
            Bio da equipe
          </p>
          <textarea
            name="bio"
            rows={2}
            defaultValue={bio ?? ""}
            placeholder="A união é nossa força! Juntos somos mais fortes."
            className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
          />
        </div>
        <div className="sm:col-span-2">
          <p className={`${isPage ? "inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg" : "text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary"}`}>
            {isPage ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 18h16M7 18V9m5 9V6m5 12v-7" />
              </svg>
            ) : null}
            Nível procurado (opcional)
          </p>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3">
            <select
              name="nivel_procurado"
              defaultValue={nivel_procurado ?? ""}
              className="h-10 w-full bg-transparent text-sm text-eid-fg focus:outline-none"
            >
              <option value="">Selecione o nível</option>
              <option value="iniciante">Iniciante</option>
              <option value="intermediário">Intermediário</option>
              <option value="avançado">Avançado</option>
              <option value="profissional">Profissional</option>
            </select>
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className={`${isPage ? "inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg" : "text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary"}`}>
            Gênero da formação
          </p>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3">
            <select
              name="genero"
              defaultValue={String(genero ?? "misto").toLowerCase()}
              className="h-10 w-full bg-transparent text-sm text-eid-fg focus:outline-none"
            >
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="misto">Misto</option>
            </select>
          </div>
          <p className="mt-1 text-[10px] text-eid-text-secondary">
            Se a formação tiver membros de gêneros diferentes, o ranking por gênero considera como misto.
          </p>
        </div>

        {isPage ? (
          <div className="sm:col-span-2 rounded-[14px] border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2.5">
            <label className="flex items-start justify-between gap-2.5 rounded-xl border border-[color:var(--eid-border-subtle)] px-2.5 py-2">
              <input type="checkbox" name="vagas_abertas" defaultChecked={vagas_abertas} className="mt-0.5 rounded border-[color:var(--eid-border-subtle)]" />
              <span className="min-w-0">
                <span className="block text-[11px] font-bold text-eid-fg">Vagas abertas</span>
                <span className="mt-0.5 block text-[10px] text-[#64748B]">Permite que atletas se candidatem para a equipe.</span>
              </span>
              <span className="ml-2 mt-0.5 inline-flex shrink-0 items-center">
                <svg viewBox="0 0 48 24" className="h-6 w-12" fill="none" aria-hidden>
                  <circle cx="10" cy="9" r="5" fill="#3B82F6" />
                  <circle cx="25" cy="9" r="4.5" fill="#93C5FD" />
                  <circle cx="37" cy="10" r="4" fill="#DBEAFE" />
                  <circle cx="40" cy="18" r="5" fill="#86EFAC" />
                  <path d="M40 15.6v4.8M37.6 18h4.8" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
            </label>
            <label className="mt-2 flex items-start justify-between gap-2.5 rounded-xl border border-[color:var(--eid-border-subtle)] px-2.5 py-2">
              <input type="checkbox" name="aceita_pedidos" defaultChecked={aceita_pedidos} className="mt-0.5 rounded border-[color:var(--eid-border-subtle)]" />
              <span className="min-w-0">
                <span className="block text-[11px] font-bold text-eid-fg">Aceita pedidos / convites</span>
                <span className="mt-0.5 block text-[10px] text-[#64748B]">Permite que outros enviem pedidos ou convites.</span>
              </span>
              <span className="ml-2 mt-0.5 inline-flex shrink-0 items-center">
                <svg viewBox="0 0 44 24" className="h-6 w-11" fill="none" aria-hidden>
                  <rect x="2.5" y="3.5" width="27" height="17" rx="3.5" stroke="#93C5FD" strokeWidth="1.6" />
                  <path d="m4 5 12 8 12-8" stroke="#93C5FD" strokeWidth="1.6" />
                  <circle cx="35.5" cy="17.5" r="5" fill="#86EFAC" />
                  <path d="M35.5 15.2v4.6M33.2 17.5h4.6" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
            </label>
          </div>
        ) : (
          <>
            <label className="flex items-center gap-2 text-xs text-eid-text-secondary sm:col-span-2">
              <input type="checkbox" name="vagas_abertas" defaultChecked={vagas_abertas} className="rounded border-eid-border-subtle" />
              Vagas abertas
            </label>
            <label className="flex items-center gap-2 text-xs text-eid-text-secondary sm:col-span-2">
              <input type="checkbox" name="aceita_pedidos" defaultChecked={aceita_pedidos} className="rounded border-eid-border-subtle" />
              Aceita pedidos / convites
            </label>
          </>
        )}
        <div className={`sm:col-span-2 ${isPage ? "flex justify-center" : "flex justify-start"}`}>
          <button
            type="submit"
            disabled={pending}
            className={`${isPage ? "inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[12px] border border-[#F97316] bg-[#FF6A00] px-4 text-[12px] font-black uppercase tracking-[0.03em] text-white shadow-[0_10px_20px_-14px_rgba(249,115,22,0.8)] transition hover:brightness-105 disabled:opacity-60" : "eid-btn-primary inline-flex !min-h-[32px] min-w-[132px] items-center justify-center gap-1.5 rounded-lg px-5 py-1.5 text-[12px] font-extrabold leading-none sm:!min-h-[34px] sm:min-w-[148px] sm:px-6 sm:text-[13px]"}`}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Salvando...
              </>
            ) : (
              <>
                {isPage ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                    <path d="M7 3h10l1 2h2v2H4V5h2l1-2Zm1 7h8v9H8v-9Zm2 2v5h4v-5h-4Z" />
                  </svg>
                ) : null}
                <span>Salvar alterações</span>
              </>
            )}
          </button>
        </div>
        {state.message ? (
          <p className={`text-xs sm:col-span-2 ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
        ) : null}
      </form>
    </>
  );

  if (variant === "page") {
    return (
      <section className="overflow-hidden rounded-[18px] border border-[color:var(--eid-border-subtle)] bg-eid-card/90 text-left">
        <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
          <h2 className="inline-flex items-center gap-1.5 text-[13px] font-black text-eid-fg">
            Dados da formação
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.04em] text-eid-primary-300">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
              <path d="m4 17.2 9.8-9.8 3 3L7 20.2H4v-3Z" />
              <path d="m14.6 5.6 2-2a1.4 1.4 0 0 1 2 0l1.8 1.8a1.4 1.4 0 0 1 0 2l-2 2-3.8-3.8Z" />
            </svg>
            Editar
          </span>
        </div>
        <div className="p-3.5 sm:p-4">
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
