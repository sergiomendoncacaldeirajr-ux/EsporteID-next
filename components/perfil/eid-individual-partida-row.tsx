"use client";

import Link from "next/link";
import { EidConfrontoResumoModal } from "@/components/perfil/eid-confronto-resumo-modal";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { fmtDataPtBr } from "@/lib/perfil/formacao-eid-stats";
import { PROFILE_CARD_BASE, PROFILE_CARD_PAD_MD } from "@/components/perfil/profile-ui-tokens";

export type EidPartidaIndividualRow = {
  id: number | string;
  jogador1_id: string | null;
  jogador2_id: string | null;
  placar_1: number | null;
  placar_2: number | null;
  torneio_id?: number | null;
  local_espaco_id?: number | null;
  local_str?: string | null;
  data_partida?: string | null;
  mensagem?: string | null;
  tipo_partida?: string | null;
  data_resultado: string | null;
  data_registro: string | null;
  status?: string | null;
};

type Props = {
  partida: EidPartidaIndividualRow;
  selfNome: string;
  selfAvatarUrl?: string | null;
  selfProfileHref?: string | null;
  opponentId: string;
  opponentNome: string;
  opponentAvatarUrl: string | null;
  res: { label: "V" | "D" | "E" | "—"; tone: string };
  profileLinkFrom: string;
  torneioLabel?: string | null;
  origemLabel?: "Ranking" | "Torneio";
  esporteLabel?: string | null;
  modalidadeLabel?: string | null;
  opponentNotaEid?: number | null;
  totalConfrontos: number;
  saldoResumo?: string | null;
  ultimosConfrontos: Array<{
    id: number | string;
    dataHora: string;
    local: string | null;
    localHref?: string | null;
    placar: string;
    origem: "Ranking" | "Torneio";
    confronto?: string | null;
  }>;
};

export function EidIndividualPartidaRow({
  partida: p,
  selfNome,
  selfAvatarUrl,
  selfProfileHref,
  opponentId,
  opponentNome,
  opponentAvatarUrl,
  res,
  profileLinkFrom,
  torneioLabel,
  origemLabel = "Ranking",
  esporteLabel,
  modalidadeLabel,
  opponentNotaEid,
  totalConfrontos,
  saldoResumo,
  ultimosConfrontos,
}: Props) {
  const when = fmtDataPtBr(p.data_resultado ?? p.data_registro);
  const whenWithTime = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(p.data_partida ?? p.data_resultado ?? p.data_registro ?? Date.now()));
  const placarOk =
    Number.isFinite(Number(p.placar_1)) && Number.isFinite(Number(p.placar_2));
  const placarTxt = placarOk ? `${p.placar_1} × ${p.placar_2}` : "—";
  const perfilHref = `/perfil/${encodeURIComponent(opponentId)}?from=${encodeURIComponent(profileLinkFrom)}`;
  const origemLinha = origemLabel === "Ranking" ? "Rank" : origemLabel;

  const resultadoClass =
    res.label === "V"
      ? "bg-emerald-500/18 text-emerald-300 ring-emerald-400/25"
      : res.label === "D"
        ? "bg-rose-500/18 text-rose-300 ring-rose-400/25"
        : res.label === "E"
          ? "bg-eid-primary-500/18 text-eid-primary-300 ring-eid-primary-400/25"
          : "bg-eid-surface/80 text-eid-text-secondary ring-[color:var(--eid-border-subtle)]";

  return (
    <EidConfrontoResumoModal
      titulo={`${opponentNome} · ${esporteLabel ?? "Esporte"}`}
      subtitulo={modalidadeLabel ? `Modalidade: ${modalidadeLabel}` : undefined}
      ladoA={selfNome}
      ladoB={opponentNome}
      ladoAAvatarUrl={selfAvatarUrl ?? null}
      ladoBAvatarUrl={opponentAvatarUrl ?? null}
      ladoAProfileHref={selfProfileHref ?? null}
      ladoBProfileHref={perfilHref}
      origem={origemLabel}
      dataHora={whenWithTime}
      local={p.local_str ?? null}
      localHref={p.local_espaco_id != null && Number(p.local_espaco_id) > 0 ? `/local/${Number(p.local_espaco_id)}` : null}
      placarBase={placarTxt}
      mensagem={p.mensagem ?? null}
      totalConfrontos={totalConfrontos}
      saldoResumo={saldoResumo}
      ultimosConfrontos={ultimosConfrontos}
      asListItem
      rowClassName={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} relative flex items-center gap-3 border-[color:var(--eid-border-subtle)] cursor-pointer`}
    >
      <span
        className={`absolute right-2 top-2 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-[10px] font-black ring-1 ${resultadoClass}`}
        aria-label={`Resultado ${res.label}`}
      >
        {res.label}
      </span>
      <div className="flex shrink-0 flex-col items-center justify-center">
        <Link
          href={perfilHref}
          data-no-modal="1"
          className="rounded-full ring-2 ring-transparent transition hover:ring-eid-primary-500/40"
          aria-label={`Perfil de ${opponentNome}`}
        >
          {opponentAvatarUrl ? (
            <img
              src={opponentAvatarUrl}
              alt=""
              className="h-11 w-11 rounded-full border border-[color:var(--eid-border-subtle)] object-cover"
            />
          ) : (
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-sm font-black text-eid-primary-300">
              {opponentNome.trim().slice(0, 1).toUpperCase() || "A"}
            </span>
          )}
        </Link>
        {typeof opponentNotaEid === "number" ? (
          <ProfileEidPerformanceSeal notaEid={opponentNotaEid} compact className="-mt-0.5 scale-110" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pr-8">
          <Link
            href={perfilHref}
            data-no-modal="1"
            className="truncate text-[12px] font-bold text-eid-fg hover:text-eid-primary-300 hover:underline"
          >
            {opponentNome}
          </Link>
        </div>
        <p className="mt-0.5 text-[10px] text-eid-text-secondary">
          {esporteLabel ?? "Esporte"}
          {modalidadeLabel ? ` · ${modalidadeLabel}` : ""}
          <span className="mx-1">·</span>
          <span
            className={
              origemLabel === "Torneio"
                ? "font-bold text-eid-action-400"
                : "font-bold text-eid-primary-300"
            }
          >
            {origemLinha}
          </span>
          <span className="mx-1 text-eid-text-secondary">·</span>
          <span
            className="inline-flex items-center rounded-md border border-eid-primary-500/30 bg-eid-primary-500/[0.1] px-1.5 py-0.5 text-[11px] font-black tabular-nums tracking-tight text-eid-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-inset ring-eid-primary-500/10"
            title="Placar"
          >
            {placarTxt}
          </span>
          <span className="mx-1 text-eid-text-secondary">·</span>
          {when}
          {torneioLabel ? (
            <>
              <span className="mx-1">·</span>
              <span className="text-eid-action-400">{torneioLabel}</span>
            </>
          ) : null}
        </p>
      </div>
    </EidConfrontoResumoModal>
  );
}
