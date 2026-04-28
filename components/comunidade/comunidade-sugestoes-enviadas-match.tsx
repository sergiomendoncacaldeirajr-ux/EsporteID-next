"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  limparSugestaoEnviadaNotificacao,
  type LimparSugestaoEnviadaState,
} from "@/app/comunidade/actions";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { PEDIDO_LIMPAR_COMPACT_BTN_CLASS } from "@/lib/desafio/flow-ui";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";

export type SugestaoEnviadaMatchItem = {
  id: number;
  statusRaw: string;
  statusLabel: string;
  statusClass: string;
  criadoEm: string;
  respondidoEm?: string | null;
  sugeridorId: string;
  sugeridorNome: string;
  sugeridorAvatarUrl?: string | null;
  meuTimeId?: number | null;
  meuTimeTipo?: string | null;
  meuTimeNome: string;
  meuTimeAvatarUrl?: string | null;
  meuTimeNotaEid?: number | null;
  meuTimeLocalizacao?: string | null;
  alvoTimeNome: string;
  esporte: string;
  modalidade: string;
  mensagem: string | null;
};

const initial: LimparSugestaoEnviadaState = { ok: false, message: "" };

function splitCityState(location?: string | null): { cidade: string; estado: string } {
  const raw = String(location ?? "").trim();
  if (!raw) return { cidade: "-", estado: "-" };
  const parts = raw
    .split(/\/| - |–|—|,|\|/g)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) return { cidade: parts[0] ?? "-", estado: parts.slice(1).join(" ") || "-" };
  return { cidade: raw, estado: "-" };
}

function firstName(value?: string | null): string {
  const clean = String(value ?? "").trim();
  if (!clean) return "";
  return clean.split(/\s+/)[0] ?? clean;
}

export function ComunidadeSugestoesEnviadasMatch({ items }: { items: SugestaoEnviadaMatchItem[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(limparSugestaoEnviadaNotificacao, initial);
  const [clickedClearId, setClickedClearId] = useState<number | null>(null);
  const err = "ok" in state && !state.ok ? state.message : null;

  useEffect(() => {
    if ("ok" in state && state.ok) {
      setClickedClearId(null);
      router.refresh();
    }
  }, [state, router]);

  function formacaoHref(item: SugestaoEnviadaMatchItem): string {
    const tipo = String(item.meuTimeTipo ?? item.modalidade ?? "").trim().toLowerCase();
    const base = tipo === "dupla" ? "/perfil-dupla" : "/perfil-time";
    return `${base}/${item.meuTimeId}?from=/comunidade`;
  }

  if (!items.length) {
    return (
      <p className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 text-sm text-eid-text-secondary">
        Você ainda não enviou sugestão de desafio para liderança.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {err ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{err}</p> : null}
      <ul className="space-y-3">
        {items.map((s) => (
          <li
            key={s.id}
            className="relative overflow-hidden rounded-xl border border-amber-500/25 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-warning-500)_12%,var(--eid-card)_88%),color-mix(in_srgb,var(--eid-surface)_93%,transparent))] p-3 text-sm shadow-[0_8px_18px_-14px_rgba(217,119,6,0.45)] md:p-4"
          >
            <span className={`absolute right-3 top-3 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.06em] ${s.statusClass}`}>
              {s.statusLabel}
            </span>
            <div className="grid grid-cols-[88px_minmax(0,1fr)_88px] items-start gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-amber-200/90">Sua formação</p>
                {s.meuTimeId ? (
                  <ProfileEditDrawerTrigger
                    href={formacaoHref(s)}
                    title={s.meuTimeNome}
                    fullscreen
                    topMode="backOnly"
                    className="mt-1 block rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                  >
                    <div className="flex w-full flex-col items-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-transparent px-1.5 py-1.5">
                      <p className="max-w-full truncate text-center text-[10px] font-black text-eid-fg">{firstName(s.meuTimeNome)}</p>
                      <div className="relative mt-1 h-12 w-12 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                        {s.meuTimeAvatarUrl ? (
                          <Image src={s.meuTimeAvatarUrl} alt="" fill unoptimized className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                            {(s.meuTimeNome ?? "F").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="mt-0.5">
                        <ProfileEidPerformanceSeal notaEid={Number(s.meuTimeNotaEid ?? 0)} compact className="scale-125" />
                      </div>
                    </div>
                  </ProfileEditDrawerTrigger>
                ) : null}
              </div>
              <div className="min-w-0 pt-9">
                <div className="mx-auto flex w-full max-w-[150px] flex-col items-center gap-1.5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/25 px-1.5 py-1.5">
                  <p className="inline-flex min-w-0 items-center gap-1 self-center rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[10px] font-semibold leading-none text-eid-primary-200">
                    <ModalidadeGlyphIcon modalidade={String(s.modalidade).toLowerCase() === "dupla" ? "dupla" : String(s.modalidade).toLowerCase() === "time" ? "time" : "individual"} />
                    <span className="truncate">{s.modalidade}</span>
                  </p>
                  <p className="inline-flex min-w-0 items-center gap-1 self-center rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[10px] font-semibold leading-none text-eid-action-200">
                    <SportGlyphIcon sportName={s.esporte} />
                    <span className="truncate">{s.esporte}</span>
                  </p>
                  <p className="inline-flex min-w-0 items-center self-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card/75 px-2 py-0.5 text-[10px] leading-none text-eid-text-secondary">
                    <span className="truncate">{splitCityState(s.meuTimeLocalizacao).cidade}</span>
                  </p>
                  <p className="inline-flex min-w-0 items-center self-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card/75 px-2 py-0.5 text-[10px] leading-none text-eid-text-secondary">
                    <span className="truncate">{splitCityState(s.meuTimeLocalizacao).estado}</span>
                  </p>
                </div>
                {s.mensagem ? (
                  <p className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card/80 px-2 py-1.5 text-xs text-eid-fg">
                    “{s.mensagem}”
                  </p>
                ) : null}
              </div>
              <div className="min-w-0 pt-7">
                <p className="text-right text-[10px] font-black uppercase tracking-[0.08em] text-amber-200/90">Sugerido por</p>
                <ProfileEditDrawerTrigger
                  href={`/perfil/${s.sugeridorId}?from=/comunidade`}
                  title={s.sugeridorNome}
                  fullscreen
                  topMode="backOnly"
                  className="mt-1 block rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                >
                  <div className="flex w-full flex-col items-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-transparent px-1.5 py-1.5">
                    <p className="max-w-full truncate text-center text-[10px] font-black text-eid-fg">{firstName(s.sugeridorNome)}</p>
                    <div className="relative mt-1 h-12 w-12 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                      {s.sugeridorAvatarUrl ? (
                        <Image src={s.sugeridorAvatarUrl} alt="" fill unoptimized className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                          {(s.sugeridorNome ?? "A").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </ProfileEditDrawerTrigger>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-eid-text-secondary">
              Enviado em {new Date(s.criadoEm).toLocaleString("pt-BR")}
              {s.respondidoEm ? ` · atualizado em ${new Date(s.respondidoEm).toLocaleString("pt-BR")}` : ""}
              {s.statusRaw === "aprovado" ? " · confira também na Agenda." : ""}
            </p>
            {s.statusRaw !== "pendente" ? (
              <form action={formAction} className="mt-2">
                <input type="hidden" name="sugestao_id" value={String(s.id)} />
                <button
                  type="submit"
                  disabled={pending}
                  onClick={() => setClickedClearId(s.id)}
                  className={PEDIDO_LIMPAR_COMPACT_BTN_CLASS}
                >
                  {pending && clickedClearId === s.id ? "Limpando..." : "Limpar"}
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
