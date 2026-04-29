"use client";

import Image from "next/image";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cancelarConviteDaEquipe, type TeamActionState } from "@/app/times/actions";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";

export type ConviteTimeEnviadoItem = {
  id: number;
  equipeNome: string;
  equipeId: number;
  equipeTipo: string;
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
          return (
            <li
              key={c.id}
              className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_95%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-3"
            >
              <div className="grid grid-cols-[72px_30px_minmax(0,1fr)] items-start sm:grid-cols-[72px_34px_minmax(0,1fr)]">
                <ProfileEditDrawerTrigger
                  href={`/perfil/${c.convidadoId}?from=/comunidade`}
                  title={c.convidadoNome}
                  fullscreen
                  topMode="backOnly"
                  className="-ml-1 block justify-self-start rounded-xl border border-transparent transition hover:border-eid-primary-500/35 sm:-ml-1.5"
                >
                  <div className="flex w-[72px] flex-col items-center">
                    <p className="mb-1 max-w-[72px] truncate text-center text-[11px] font-black text-eid-fg">
                      {(c.convidadoNome ?? "Atleta").trim().split(/\s+/)[0] ?? "Atleta"}
                    </p>
                    <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-eid-primary-500/30 bg-eid-surface">
                      {c.convidadoAvatarUrl ? (
                        <Image src={c.convidadoAvatarUrl} alt="" fill unoptimized className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                          {(c.convidadoNome ?? "A").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="mt-1">
                      <ProfileEidPerformanceSeal
                        notaEid={Number(c.convidadoNotaEid ?? 0)}
                        compact
                        className="scale-125"
                        locationLabel={c.convidadoLocalizacao}
                        distanceKm={c.convidadoDistanceKm}
                      />
                    </div>
                  </div>
                </ProfileEditDrawerTrigger>
                <div aria-hidden className="h-full w-full" />

                <div className="min-w-0 flex-1 pl-3 sm:pl-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-eid-fg">{c.convidadoNome}</p>
                      {c.convidadoUsername ? (
                        <p className="text-[11px] text-eid-text-secondary">@{c.convidadoUsername.replace(/^@/, "")}</p>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] ${statusClass(c.status)}`}
                    >
                      {statusLabel(c.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-eid-text-secondary">
                    Convite para {c.equipeNome} ({(c.equipeTipo ?? "time").toUpperCase()} · {c.esporteNome})
                  </p>
                  <p className="mt-1 text-[11px] text-eid-text-secondary">
                    Enviado em {c.criadoEm ? new Date(c.criadoEm).toLocaleString("pt-BR") : "—"}
                    {c.respondidoEm ? ` · Respondido em ${new Date(c.respondidoEm).toLocaleString("pt-BR")}` : ""}
                  </p>
                  {pendente ? (
                    <form action={cancelAction} className="mt-2">
                      <input type="hidden" name="time_id" value={c.equipeId} />
                      <input type="hidden" name="convite_id" value={c.id} />
                      <button
                        type="submit"
                        disabled={cancelPending}
                        className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 text-[11px] font-bold text-rose-100 transition hover:border-rose-400/55 hover:bg-rose-500/16 disabled:opacity-50"
                      >
                        {cancelPending ? "Cancelando…" : "Cancelar convite"}
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
