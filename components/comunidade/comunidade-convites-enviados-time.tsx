"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cancelarConviteDaEquipe, type TeamActionState } from "@/app/times/actions";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";

export type ConviteTimeEnviadoItem = {
  id: number;
  equipeNome: string;
  equipeId: number;
  equipeTipo: string;
  equipeAvatarUrl?: string | null;
  equipeNotaEid?: number | null;
  equipeLocalizacao?: string | null;
  esporteNome: string;
  convidadoId: string;
  convidadoNome: string;
  convidadoUsername?: string | null;
  convidadoAvatarUrl?: string | null;
  convidadoNotaEid?: number | null;
  convidadoLocalizacao?: string | null;
  convidadoDistanceKm?: number | null;
  status: string;
  criadoEm: string | null;
  respondidoEm: string | null;
};

const cancelInitial: TeamActionState = { ok: false, message: "" };

function firstName(value?: string | null): string {
  const clean = String(value ?? "").trim();
  if (!clean) return "Atleta";
  return clean.split(/\s+/)[0] ?? clean;
}

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

function statusLabel(status: string): string {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "pendente") return "Pendente";
  if (s === "aceito" || s === "aprovado") return "Aceito";
  if (s === "recusado") return "Recusado";
  if (s === "cancelado") return "Cancelado";
  return "Status desconhecido";
}

function statusClass(status: string): string {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "aceito" || s === "aprovado") return "border-emerald-500/35 bg-emerald-500/12 text-emerald-100";
  if (s === "recusado" || s === "cancelado") return "border-rose-500/35 bg-rose-500/12 text-rose-100";
  return "border-eid-primary-500/35 bg-eid-primary-500/12 text-eid-primary-200";
}

export function ComunidadeConvitesEnviadosTime({ items }: { items: ConviteTimeEnviadoItem[] }) {
  const router = useRouter();
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelarConviteDaEquipe, cancelInitial);

  useEffect(() => {
    if (cancelState.ok) {
      router.refresh();
    }
  }, [cancelState.ok, router]);

  if (!items.length) {
    return (
      <p className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 text-sm text-eid-text-secondary">
        Você ainda não enviou convites de equipe.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {cancelState.message ? (
        <p
          className={`rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs ${
            cancelState.ok ? "text-eid-primary-700 dark:text-eid-primary-300" : "text-red-700 dark:text-red-300"
          }`}
        >
          {cancelState.message}
        </p>
      ) : null}
      <ul className="space-y-3">
        {items.map((c) => {
          const pendente = String(c.status ?? "").trim().toLowerCase() === "pendente";
          const localConvidado = splitCityState(c.convidadoLocalizacao);
          const localFormacao = splitCityState(c.equipeLocalizacao);
          return (
            <li
              key={c.id}
              className="relative rounded-xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_95%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-3"
            >
              <span className="absolute left-3 top-3 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-eid-primary-200">
                Convite
              </span>
              <span
                className={`absolute right-3 top-3 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] ${statusClass(c.status)}`}
              >
                {statusLabel(c.status)}
              </span>
              <div className="grid grid-cols-[88px_minmax(0,1fr)_88px] items-start gap-2">
                <div className="min-w-0 pt-9">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-eid-primary-300/90">Formação</p>
                  <ProfileEditDrawerTrigger
                    href={`/perfil-time/${c.equipeId}?from=/comunidade`}
                    title={c.equipeNome}
                    fullscreen
                    topMode="backOnly"
                    className="mt-1 block rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                  >
                    <div className="flex w-full flex-col items-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-transparent px-1.5 py-1.5">
                      <p className="max-w-full truncate text-center text-[10px] font-black text-eid-fg">{firstName(c.equipeNome)}</p>
                      <div className="relative mt-1 h-12 w-12 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                        {c.equipeAvatarUrl ? (
                          <Image src={c.equipeAvatarUrl} alt="" fill unoptimized className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                            {(c.equipeNome ?? "T").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="mt-0.5">
                        <ProfileEidPerformanceSeal
                          notaEid={Number(c.equipeNotaEid ?? 0)}
                          compact
                          className="scale-125"
                        />
                      </div>
                      <p className="mt-0.5 max-w-full truncate text-center text-[9px] font-semibold text-eid-fg">
                        {localFormacao.cidade}
                      </p>
                      <p className="max-w-full truncate text-center text-[9px] text-eid-text-secondary">
                        {localFormacao.estado}
                      </p>
                    </div>
                  </ProfileEditDrawerTrigger>
                </div>

                <div className="min-w-0 pt-5">
                  <div className="translate-y-6 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/25 px-2 py-2">
                    <div className="flex flex-wrap items-start gap-1.5">
                      <p className="inline-flex items-center rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[10px] font-semibold leading-none text-eid-action-200">
                        <span className="inline-flex items-center gap-1">
                          <SportGlyphIcon sportName={c.esporteNome} />
                          <span>{c.esporteNome}</span>
                        </span>
                      </p>
                      <p className="inline-flex items-center gap-1 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[10px] font-semibold leading-none text-eid-primary-200">
                        <ModalidadeGlyphIcon
                          modalidade={
                            String(c.equipeTipo ?? "").trim().toLowerCase() === "dupla"
                              ? "dupla"
                              : String(c.equipeTipo ?? "").trim().toLowerCase() === "time"
                                ? "time"
                                : "individual"
                          }
                        />
                        <span>{(c.equipeTipo ?? "time").toUpperCase()}</span>
                      </p>
                    </div>
                    <p className="mt-1 text-[10px] text-eid-text-secondary">
                      Enviado em {c.criadoEm ? new Date(c.criadoEm).toLocaleString("pt-BR") : "—"}
                    </p>
                    {c.respondidoEm ? (
                      <p className="mt-1 text-[10px] text-eid-text-secondary">
                        Respondido em {new Date(c.respondidoEm).toLocaleString("pt-BR")}
                      </p>
                    ) : null}
                  </div>
                  {pendente ? (
                    <form action={cancelAction} className="mt-8 flex justify-end">
                      <input type="hidden" name="time_id" value={c.equipeId} />
                      <input type="hidden" name="convite_id" value={c.id} />
                      <button
                        type="submit"
                        disabled={cancelPending}
                        className="inline-flex !h-[14px] !min-h-0 !max-h-[14px] items-center justify-center rounded border border-red-600/90 bg-red-600 px-1 text-[4.5px] font-black uppercase leading-none tracking-[0.01em] text-white transition hover:bg-red-500 disabled:opacity-60"
                        style={{ fontSize: "10px", lineHeight: 1 }}
                      >
                        {cancelPending ? (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="h-2 w-2 animate-spin" aria-hidden />
                            Cancelando...
                          </span>
                        ) : (
                          "Cancelar"
                        )}
                      </button>
                    </form>
                  ) : null}
                </div>

                <div className="min-w-0 !pt-9">
                  <p className="text-right text-[10px] font-black uppercase tracking-[0.08em] text-eid-primary-300/90">Convidado</p>
                  <ProfileEditDrawerTrigger
                    href={`/perfil/${c.convidadoId}?from=/comunidade`}
                    title={c.convidadoNome}
                    fullscreen
                    topMode="backOnly"
                    className="mt-1 block rounded-lg border border-transparent transition hover:border-eid-primary-500/35"
                  >
                    <div className="flex w-full flex-col items-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-transparent px-1.5 py-1.5">
                      <p className="max-w-full truncate text-center text-[10px] font-black text-eid-fg">{firstName(c.convidadoNome)}</p>
                      <div className="relative mt-1 h-12 w-12 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                        {c.convidadoAvatarUrl ? (
                          <Image src={c.convidadoAvatarUrl} alt="" fill unoptimized className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                            {(c.convidadoNome ?? "A").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="mt-0.5">
                        <ProfileEidPerformanceSeal
                          notaEid={Number(c.convidadoNotaEid ?? 0)}
                          compact
                          className="scale-125"
                        />
                      </div>
                      <p className="mt-0.5 max-w-full truncate text-center text-[9px] font-semibold text-eid-fg">
                        {localConvidado.cidade}
                      </p>
                      <p className="max-w-full truncate text-center text-[9px] text-eid-text-secondary">
                        {localConvidado.estado}
                      </p>
                    </div>
                  </ProfileEditDrawerTrigger>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
