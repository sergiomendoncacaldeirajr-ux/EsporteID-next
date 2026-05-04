"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { EidColetivoPartidaRow } from "@/components/perfil/eid-coletivo-partida-row";
import { EidConfrontoResumoModal } from "@/components/perfil/eid-confronto-resumo-modal";
import { PROFILE_CARD_BASE } from "@/components/perfil/profile-ui-tokens";
import type { PartidaColetivaRow } from "@/lib/perfil/formacao-eid-stats";

export type FormacaoResultadoItem = {
  id: string;
  resultado: "V" | "D" | "E" | "—";
  origem: "Rank" | "Torneio";
  placar: string;
  dataFmt: string;
  /** Data/hora completa usada no modal; fallback para dataFmt. */
  dataHora?: string | null;
  tone: "positive" | "negative" | "neutral";
  adversarioLabel: string;
  torneioLabel?: string | null;
  local?: string | null;
  localHref?: string | null;
  mensagem?: string | null;
  partida?: PartidaColetivaRow;
  opponentTimeId?: number;
  opponentEscudoUrl?: string | null;
  opponentNotaEid?: number | null;
  modalidadeLinha?: string | null;
};

type Filtro = "todos" | "rank" | "torneio";

type Props = {
  totais: { vitorias: number; derrotas: number; empates: number; rank: number; torneio: number };
  items: FormacaoResultadoItem[];
  resumoCount?: number;
  emptyText?: string;
  historicoCompletoHref?: string;
  selfLabel?: string;
  selfProfileHref?: string | null;
  selfEscudoUrl?: string | null;
  /** Base para `?from=` nos links do card (ex.: `/perfil-time/12`). */
  profileLinkFrom?: string | null;
  esporteLabel?: string | null;
  modalidadeLabel?: string | null;
  /** `times.id` da formação (modal / link fallback). */
  selfTimeId?: number | null;
};

export function ProfileFormacaoResultados({
  totais,
  items,
  resumoCount = 4,
  emptyText = "Nenhum resultado registrado ainda nesta formação.",
  historicoCompletoHref,
  selfLabel = "Formação",
  selfProfileHref = null,
  selfEscudoUrl = null,
  profileLinkFrom = null,
  esporteLabel = null,
  modalidadeLabel = null,
  selfTimeId = null,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [expandido, setExpandido] = useState(false);

  const filtrados = useMemo(() => {
    if (filtro === "rank") return items.filter((i) => i.origem === "Rank");
    if (filtro === "torneio") return items.filter((i) => i.origem === "Torneio");
    return items;
  }, [items, filtro]);

  const visiveis = expandido ? filtrados : filtrados.slice(0, resumoCount);
  const podeExpandir = filtrados.length > resumoCount;

  if (items.length === 0) {
    return (
      <div className="space-y-2">
        <div
          className={`${PROFILE_CARD_BASE} flex items-start gap-3.5 p-3.5 sm:rounded-2xl bg-[color:color-mix(in_srgb,var(--eid-card)_93%,var(--eid-primary-500)_7%)] text-left`}
        >
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-eid-primary-500 text-white shadow-[0_6px_16px_-8px_rgba(37,99,235,0.65)]"
            aria-hidden
          >
            <Trophy className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <p className="min-w-0 flex-1 pt-0.5 text-[11px] leading-relaxed text-eid-text-secondary">{emptyText}</p>
        </div>
        {historicoCompletoHref ? (
          <div className="flex justify-end">
            <Link
              href={historicoCompletoHref}
              className="inline-flex min-h-[30px] items-center justify-center gap-1 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/12 px-2.5 py-1 text-[8px] font-bold uppercase leading-none tracking-[0.08em] text-eid-fg transition-all hover:border-eid-primary-500/50 hover:bg-eid-primary-500/18"
            >
              Ver histórico completo
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
          <p className="text-[11px] font-black text-emerald-300">{totais.vitorias}</p>
          <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">V</p>
        </div>
        <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
          <p className="text-[11px] font-black text-red-300">{totais.derrotas}</p>
          <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">D</p>
        </div>
        <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
          <p className="text-[11px] font-black text-eid-primary-300">{totais.empates}</p>
          <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">E</p>
        </div>
        <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
          <p className="text-[11px] font-black text-eid-fg">{totais.rank}</p>
          <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">Rank</p>
        </div>
        <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
          <p className="text-[11px] font-black text-eid-fg">{totais.torneio}</p>
          <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">Torneio</p>
        </div>
      </div>

      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-eid-text-secondary">Filtrar lista</p>
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { id: "todos" as const, label: "Todos" },
            { id: "rank" as const, label: "Só ranking" },
            { id: "torneio" as const, label: "Só torneio" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              setFiltro(opt.id);
              setExpandido(false);
            }}
            className={`rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide transition ${
              filtro === opt.id
                ? "bg-eid-primary-500/18 text-eid-fg ring-1 ring-eid-primary-500/35"
                : "bg-eid-surface/45 text-eid-text-secondary hover:text-eid-fg"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <ul className="mt-1 grid gap-1.5">
        {visiveis.map((item) => {
          const fromQ = profileLinkFrom ?? selfProfileHref ?? "/";
          const selfHrefComFrom =
            selfProfileHref != null && selfProfileHref.length > 0
              ? `${selfProfileHref.split("?")[0]}?from=${encodeURIComponent(fromQ)}`
              : null;
          if (
            item.partida &&
            item.opponentTimeId != null &&
            Number.isFinite(item.opponentTimeId) &&
            item.opponentTimeId > 0
          ) {
            const p = item.partida;
            const origemLabel: "Ranking" | "Torneio" = item.origem === "Torneio" ? "Torneio" : "Ranking";
            const confrontosMesmos = items.filter(
              (h) => h.opponentTimeId === item.opponentTimeId && h.partida != null
            );
            let saldoV = 0;
            let saldoD = 0;
            let saldoE = 0;
            for (const h of confrontosMesmos) {
              if (h.resultado === "V") saldoV += 1;
              else if (h.resultado === "D") saldoD += 1;
              else if (h.resultado === "E") saldoE += 1;
            }
            const saldoResumo =
              `Saldo: ${selfLabel} ${saldoV}V · ${item.adversarioLabel} ${saldoD}V` +
              (saldoE > 0 ? ` · ${saldoE} empate${saldoE !== 1 ? "s" : ""}` : "");
            const ultimosConfrontos = confrontosMesmos.slice(0, 5).map((h) => {
              const hp = h.partida!;
              const hOrigem: "Ranking" | "Torneio" =
                h.origem === "Torneio" ? "Torneio" : "Ranking";
              const dataHora = new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(hp.data_partida ?? hp.data_resultado ?? hp.data_registro ?? Date.now()));
              const [pa, pb] = h.placar.split(/[x×]/i).map((x) => Number(String(x).trim()));
              const placar = Number.isFinite(pa) && Number.isFinite(pb) ? `${pa} × ${pb}` : h.placar.replace("x", " × ");
              return {
                id: h.id,
                dataHora,
                local: h.local ?? null,
                localHref: h.localHref ?? null,
                placar,
                origem: hOrigem,
                confronto: `${selfLabel} vs ${item.adversarioLabel}`,
                mensagem: hp.mensagem ?? null,
                sportLabel: esporteLabel ?? null,
              };
            });
            const tSelf =
              selfTimeId != null && selfTimeId > 0
                ? selfTimeId
                : (() => {
                    const t1 = p.time1_id != null ? Number(p.time1_id) : null;
                    const t2 = p.time2_id != null ? Number(p.time2_id) : null;
                    const opp = item.opponentTimeId;
                    if (t1 === opp) return t2 ?? 0;
                    if (t2 === opp) return t1 ?? 0;
                    return 0;
                  })();
            const resTone =
              item.tone === "positive"
                ? "text-emerald-400"
                : item.tone === "negative"
                  ? "text-rose-400"
                  : "text-eid-primary-300";
            return (
              <EidColetivoPartidaRow
                key={item.id}
                partida={p}
                selfTimeId={tSelf > 0 ? tSelf : null}
                selfNome={selfLabel}
                selfEscudoUrl={selfEscudoUrl ?? null}
                selfProfileHref={selfHrefComFrom ?? selfProfileHref ?? "/"}
                opponentTimeId={item.opponentTimeId}
                opponentNome={item.adversarioLabel}
                opponentEscudoUrl={item.opponentEscudoUrl ?? null}
                opponentNotaEid={item.opponentNotaEid ?? null}
                res={{ label: item.resultado === "—" ? "—" : item.resultado, tone: resTone }}
                profileLinkFrom={fromQ}
                torneioLabel={
                  item.torneioLabel ?? (p.torneio_id ? `Torneio #${p.torneio_id}` : null)
                }
                origemLabel={origemLabel}
                esporteLabel={esporteLabel ?? null}
                modalidadeLabel={item.modalidadeLinha ?? modalidadeLabel ?? null}
                totalConfrontos={confrontosMesmos.length}
                saldoResumo={saldoResumo}
                ultimosConfrontos={ultimosConfrontos}
              />
            );
          }

          const confrontoLabel = `${selfLabel} vs ${item.adversarioLabel}`;
          const confrontoHistorico = items
            .filter((h) => h.adversarioLabel === item.adversarioLabel)
            .slice(0, 5)
            .map((h) => ({
              id: h.id,
              dataHora: h.dataHora ?? h.dataFmt,
              local: h.local ?? null,
              localHref: h.localHref ?? null,
              placar: h.placar,
              origem: (h.origem === "Torneio" ? "Torneio" : "Ranking") as "Torneio" | "Ranking",
              confronto: confrontoLabel,
              mensagem: h.partida?.mensagem ?? null,
              sportLabel: esporteLabel ?? null,
            }));
          return (
            <EidConfrontoResumoModal
              key={item.id}
              titulo={`${item.adversarioLabel} · ${esporteLabel ?? "Esporte"}`}
              subtitulo={modalidadeLabel ? `Modalidade: ${modalidadeLabel}` : undefined}
              ladoA={selfLabel}
              ladoB={item.adversarioLabel}
              ladoAProfileHref={selfProfileHref ?? null}
              origem={item.origem === "Torneio" ? "Torneio" : "Ranking"}
              dataHora={item.dataHora ?? item.dataFmt}
              local={item.local ?? null}
              localHref={item.localHref ?? null}
              placarBase={item.placar}
              mensagem={item.mensagem ?? null}
              sportLabel={esporteLabel ?? null}
              totalConfrontos={confrontoHistorico.length}
              ultimosConfrontos={confrontoHistorico}
              asListItem
              rowClassName={`relative flex items-center gap-2 rounded-lg border bg-eid-surface/45 px-2 py-1.5 text-[10px] ${
                item.tone === "positive"
                  ? "border-emerald-400/30"
                  : item.tone === "negative"
                    ? "border-red-400/30"
                    : "border-[color:var(--eid-border-subtle)]"
              }`}
            >
              <span
                className={`absolute right-2 top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[9px] font-black ${
                  item.tone === "positive"
                    ? "bg-emerald-500/18 text-emerald-300"
                    : item.tone === "negative"
                      ? "bg-red-500/18 text-red-300"
                      : "bg-eid-primary-500/18 text-eid-primary-300"
                }`}
              >
                {item.resultado}
              </span>
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[11px] font-black text-eid-primary-300">
                {item.adversarioLabel.trim().slice(0, 1).toUpperCase() || "E"}
              </span>
              <div className="min-w-0 flex-1 pr-6">
                <p className="truncate text-[10px] font-bold text-eid-fg">vs {item.adversarioLabel}</p>
                <p className="mt-0.5 text-[9px] text-eid-text-secondary">
                  <span className="font-semibold text-eid-fg">{item.origem}</span> · {item.placar} · {item.dataFmt}
                </p>
                {item.torneioLabel ? (
                  <p className="mt-0.5 text-[8px] font-semibold text-eid-action-400">{item.torneioLabel}</p>
                ) : null}
              </div>
            </EidConfrontoResumoModal>
          );
        })}
      </ul>

      {filtrados.length === 0 ? <p className="text-[10px] text-eid-text-secondary">Nenhum jogo neste filtro.</p> : null}

      <div className="flex items-center justify-between gap-2">
        {podeExpandir ? (
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="text-[9px] font-bold uppercase tracking-[0.12em] text-eid-primary-400 underline-offset-2 hover:underline"
          >
            {expandido ? "Ver menos" : `Ver mais resultados (${filtrados.length})`}
          </button>
        ) : (
          <span />
        )}
        {historicoCompletoHref ? (
          <Link
            href={historicoCompletoHref}
            className="inline-flex min-h-[30px] items-center justify-center gap-1 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/12 px-2.5 py-1 text-[8px] font-bold uppercase leading-none tracking-[0.08em] text-eid-fg transition-all hover:border-eid-primary-500/50 hover:bg-eid-primary-500/18"
          >
            Ver histórico completo
          </Link>
        ) : null}
      </div>
    </div>
  );
}
