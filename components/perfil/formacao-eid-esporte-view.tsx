import Link from "next/link";
import { SkBlock } from "@/components/loading/skeleton-primitives";
import { EidColetivoPartidaRow } from "@/components/perfil/eid-coletivo-partida-row";
import { ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { ProfileSportsMetricsCard } from "@/components/perfil/profile-sports-metrics-card";
import {
  PROFILE_CARD_BASE,
  PROFILE_CARD_PAD_MD,
  PROFILE_HERO_PANEL_CLASS,
  PROFILE_PUBLIC_MAIN_CLASS,
} from "@/components/perfil/profile-ui-tokens";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import {
  resultadoColetivo,
  trendTripletFromNotas,
  type OponenteTimeDetalhe,
  type PartidaColetivaRow,
} from "@/lib/perfil/formacao-eid-stats";

/** Topo da página EID da formação (até o painel com EID / pts / rank / contagem de partidas). */
export type FormacaoEidEsporteHeroStripProps = {
  backHref: string;
  nomeEsporte: string;
  titulo: string;
  subtitulo?: string | null;
  escudoUrl: string | null;
  escudoFallbackLetter: string;
  tipoLabel: string;
  eidTime: number;
  pontosRanking: number;
  posicaoRank: number | null;
  /** `null` = ainda carregando a lista de partidas (4º bloco do painel). */
  partidasListadoCount: number | null;
  /** Quando true, não renderiza o 4º tile (streaming: a contagem aparece no bloco de detalhes). */
  omitPartidasListadoTile?: boolean;
  linkPerfilFormacao: string;
  duplaRegistroLinks?: { id: number; href: string }[];
  avisoTopo?: string | null;
  showBackLink?: boolean;
};

export function FormacaoEidEsporteHeroStrip({
  backHref,
  nomeEsporte,
  titulo,
  subtitulo,
  escudoUrl,
  escudoFallbackLetter,
  tipoLabel,
  eidTime,
  pontosRanking,
  posicaoRank,
  partidasListadoCount,
  omitPartidasListadoTile = false,
  linkPerfilFormacao,
  duplaRegistroLinks,
  avisoTopo,
  showBackLink = true,
}: FormacaoEidEsporteHeroStripProps) {
  return (
    <>
      {showBackLink ? <PerfilBackLink href={backHref} label="Voltar" /> : null}

      {avisoTopo ? (
        <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">{avisoTopo}</p>
      ) : null}

      <div className={`mt-3 overflow-hidden ${PROFILE_HERO_PANEL_CLASS}`}>
        <div className={`flex flex-wrap items-start gap-3 ${PROFILE_CARD_PAD_MD}`}>
          <Link
            href={linkPerfilFormacao}
            className="shrink-0 rounded-2xl ring-2 ring-eid-action-500/40 transition hover:ring-eid-action-500/80 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-eid-primary-400"
            aria-label={`Ver perfil da formação ${titulo}`}
          >
            {escudoUrl ? (
              <img
                src={escudoUrl}
                alt=""
                className="h-16 w-16 rounded-2xl border border-[color:var(--eid-border-subtle)] object-cover sm:h-20 sm:w-20"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-eid-primary-500/40 bg-eid-surface text-lg font-black text-eid-primary-300 sm:h-20 sm:w-20">
                {escudoFallbackLetter}
              </div>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <span className="inline-block rounded border border-eid-action-500/35 bg-eid-action-500/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-eid-action-500">
              {tipoLabel} · {nomeEsporte}
            </span>
            <h1 className="mt-1 text-base font-black leading-tight text-eid-fg sm:text-lg">{titulo}</h1>
            {subtitulo ? <p className="mt-0.5 text-[11px] text-eid-text-secondary">{subtitulo}</p> : null}
            {duplaRegistroLinks && duplaRegistroLinks.length > 0 ? (
              <p className="mt-1 text-[10px] text-eid-text-secondary">
                Registro:{" "}
                {duplaRegistroLinks.map((d, i) => (
                  <span key={d.id}>
                    {i > 0 ? ", " : null}
                    <Link href={d.href} className="font-semibold text-eid-primary-400 hover:underline">
                      dupla #{d.id}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={`grid grid-cols-2 gap-2 border-t border-[color:var(--eid-border-subtle)] px-3 py-3 ${
            omitPartidasListadoTile ? "sm:grid-cols-3" : "sm:grid-cols-4"
          }`}
        >
          <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} text-center`}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">EID</p>
            <p className="mt-0.5 text-lg font-black tabular-nums text-eid-fg">{eidTime.toFixed(2)}</p>
          </div>
          <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} text-center`}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Pts ranking</p>
            <p className="mt-0.5 text-lg font-black tabular-nums text-eid-fg">{pontosRanking}</p>
          </div>
          <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} text-center`}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Rank</p>
            <p className="mt-0.5 text-lg font-black tabular-nums text-eid-primary-300">
              {posicaoRank != null ? `#${posicaoRank}` : "—"}
            </p>
          </div>
          {!omitPartidasListadoTile ? (
            <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} text-center`}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Partidas (lista)</p>
              <div className="mt-0.5 flex min-h-[1.75rem] items-center justify-center">
                {partidasListadoCount == null ? (
                  <SkBlock className="mx-auto h-6 w-10 rounded-md" />
                ) : (
                  <p className="text-lg font-black tabular-nums text-eid-fg">{partidasListadoCount}</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export type FormacaoEidEsporteDetailsBlocksProps = {
  nomeEsporte: string;
  titulo: string;
  eidTime: number;
  pontosRanking: number;
  /** Quando definido, exibe faixa acima da tendência (streaming sem 4º tile no hero). */
  partidasListadoCountLabel?: number;
  partidas: PartidaColetivaRow[];
  historicoNotas: number[];
  torneioNome: Map<number, string>;
  oponenteDetalhes: Map<number, OponenteTimeDetalhe>;
  timeId: number;
  nextPath: string;
  linkPerfilFormacao: string;
  formacaoEscudoUrl: string | null;
  /** Ex.: "Dupla" ou "Time" quando `partidas.modalidade` vier vazio. */
  formacaoTipoLabel?: string;
};

function modalidadeLinhaColetiva(raw: string | null | undefined, fallbackTipoLabel: string): string {
  const m = String(raw ?? "").trim();
  if (m) return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
  return fallbackTipoLabel;
}

export function FormacaoEidEsporteDetailsBlocks({
  nomeEsporte,
  titulo,
  eidTime,
  pontosRanking,
  partidasListadoCountLabel,
  partidas,
  historicoNotas,
  torneioNome,
  oponenteDetalhes,
  timeId,
  nextPath,
  linkPerfilFormacao,
  formacaoEscudoUrl,
  formacaoTipoLabel = "Equipe",
}: FormacaoEidEsporteDetailsBlocksProps) {
  let cv = 0;
  let cd = 0;
  let ce = 0;
  for (const p of partidas) {
    const r = resultadoColetivo(timeId, p);
    if (r.label === "V") cv++;
    else if (r.label === "D") cd++;
    else if (r.label === "E") ce++;
  }
  const decResultado = cv + cd;
  const wrCol = decResultado > 0 ? Math.round((cv / decResultado) * 100) : null;
  const trendPoints = trendTripletFromNotas(historicoNotas, eidTime);

  return (
    <>
      {partidasListadoCountLabel != null ? (
        <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wide text-eid-text-secondary">
          Partidas na lista: <span className="text-eid-fg">{partidasListadoCountLabel}</span>
        </p>
      ) : null}
      <div className={`mt-3 overflow-hidden ${PROFILE_CARD_BASE}`}>
        <ProfileSportsMetricsCard
          sportName={`${nomeEsporte} · ${titulo}`}
          eidValue={eidTime}
          rankValue={pontosRanking}
          eidLabel="EID da formação"
          rankLabel="Pontos"
          trendLabel="Evolução EID (este esporte)"
          trendPoints={trendPoints}
          footer={
            historicoNotas.length === 0 ? (
              <span>Sem histórico de alterações — linha reflete a nota atual neste esporte.</span>
            ) : (
              <span>{historicoNotas.length} registro(s) no histórico coletivo.</span>
            )
          }
        />
      </div>

      <ProfileSection
        title="Panorama (só este esporte)"
        className="mt-4"
        info="Aproveitamento da formação (vitórias, derrotas, empates) considerando só as partidas listadas neste esporte."
      >
        <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} mt-2`}>
          <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Aproveitamento nas partidas listadas</p>
          <p className="mt-1 text-sm font-bold text-eid-fg">
            {decResultado > 0 ? (
              <>
                {wrCol}% (V+D) · {cv}V {cd}D
                {ce > 0 ? ` · ${ce} empate${ce !== 1 ? "s" : ""}` : ""}
              </>
            ) : ce > 0 ? (
              <>{ce} empate{ce !== 1 ? "s" : ""}</>
            ) : (
              "—"
            )}
          </p>
        </div>
      </ProfileSection>

      <ProfileSection
        title="Histórico de partidas (formação)"
        className="mt-4"
        info="Jogos em equipe registrados no ranking para esta formação neste esporte, com adversário e resultado."
      >
        {partidas.length === 0 ? (
          <p className={`mt-2 ${PROFILE_CARD_BASE} p-3 text-[11px] text-eid-text-secondary`}>
            Nenhuma partida em equipe listada para esta formação neste esporte. Quando houver jogos válidos no ranking,
            eles aparecem aqui.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {partidas.flatMap((p) => {
              const t1 = p.time1_id != null ? Number(p.time1_id) : null;
              const t2 = p.time2_id != null ? Number(p.time2_id) : null;
              const oppId = t1 === timeId ? t2 : t1;
              if (oppId == null) return [];
              const det = oponenteDetalhes.get(oppId);
              const onome = det?.nome ?? `Equipe #${oppId}`;
              const res = resultadoColetivo(timeId, p);
              const torNome = p.torneio_id ? torneioNome.get(Number(p.torneio_id)) : null;
              const origemLabel: "Ranking" | "Torneio" =
                p.torneio_id != null || String(p.tipo_partida ?? "").toLowerCase() === "torneio"
                  ? "Torneio"
                  : "Ranking";
              const confrontosMesmos = partidas.filter((h) => {
                const h1 = h.time1_id != null ? Number(h.time1_id) : null;
                const h2 = h.time2_id != null ? Number(h.time2_id) : null;
                if (h1 == null || h2 == null) return false;
                return (h1 === timeId && h2 === oppId) || (h2 === timeId && h1 === oppId);
              });
              let saldoV = 0;
              let saldoD = 0;
              let saldoE = 0;
              for (const h of confrontosMesmos) {
                const rr = resultadoColetivo(timeId, h).label;
                if (rr === "V") saldoV += 1;
                else if (rr === "D") saldoD += 1;
                else if (rr === "E") saldoE += 1;
              }
              const saldoResumo =
                `Saldo: ${titulo} ${saldoV}V · ${onome} ${saldoD}V` +
                (saldoE > 0 ? ` · ${saldoE} empate${saldoE !== 1 ? "s" : ""}` : "");
              const ultimosConfrontos = confrontosMesmos.slice(0, 5).map((h) => {
                const hOrigem: "Ranking" | "Torneio" =
                  h.torneio_id != null || String(h.tipo_partida ?? "").toLowerCase() === "torneio"
                    ? "Torneio"
                    : "Ranking";
                const dataHora = new Intl.DateTimeFormat("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(h.data_partida ?? h.data_resultado ?? h.data_registro ?? Date.now()));
                const placar = `${Number(h.placar_1 ?? 0)} × ${Number(h.placar_2 ?? 0)}`;
                return {
                  id: h.id,
                  dataHora,
                  local: h.local_str ?? null,
                  localHref:
                    h.local_espaco_id != null && Number(h.local_espaco_id) > 0
                      ? `/local/${Number(h.local_espaco_id)}`
                      : null,
                  placar,
                  origem: hOrigem,
                  confronto: `${titulo} vs ${onome}`,
                  mensagem: h.mensagem ?? null,
                  sportLabel: nomeEsporte,
                };
              });
              return [
                <EidColetivoPartidaRow
                  key={p.id}
                  partida={p}
                  selfTimeId={timeId}
                  selfNome={titulo}
                  selfEscudoUrl={formacaoEscudoUrl}
                  selfProfileHref={linkPerfilFormacao}
                  opponentTimeId={oppId}
                  opponentNome={onome}
                  opponentEscudoUrl={det?.escudo ?? null}
                  opponentNotaEid={det != null && Number.isFinite(det.eid_time) ? det.eid_time : null}
                  res={res}
                  profileLinkFrom={nextPath}
                  torneioLabel={torNome ?? (p.torneio_id ? `Torneio #${p.torneio_id}` : null)}
                  origemLabel={origemLabel}
                  esporteLabel={nomeEsporte}
                  modalidadeLabel={modalidadeLinhaColetiva(p.modalidade, formacaoTipoLabel)}
                  totalConfrontos={confrontosMesmos.length}
                  saldoResumo={saldoResumo}
                  ultimosConfrontos={ultimosConfrontos}
                />,
              ];
            })}
          </ul>
        )}
      </ProfileSection>
    </>
  );
}

export type FormacaoEidEsporteViewProps = {
  backHref: string;
  nextPath: string;
  nomeEsporte: string;
  titulo: string;
  subtitulo?: string | null;
  escudoUrl: string | null;
  escudoFallbackLetter: string;
  tipoLabel: string;
  eidTime: number;
  pontosRanking: number;
  posicaoRank: number | null;
  partidas: PartidaColetivaRow[];
  historicoNotas: number[];
  torneioNome: Map<number, string>;
  oponenteDetalhes: Map<number, OponenteTimeDetalhe>;
  timeId: number;
  linkPerfilFormacao: string;
  formacaoTipoLabel?: string;
  duplaRegistroLinks?: { id: number; href: string }[];
  avisoTopo?: string | null;
  /** Em iframe (embed=1), o painel já tem “Voltar”; esconde o link duplicado. */
  showBackLink?: boolean;
};

export function FormacaoEidEsporteView({
  backHref,
  nextPath,
  nomeEsporte,
  titulo,
  subtitulo,
  escudoUrl,
  escudoFallbackLetter,
  tipoLabel,
  eidTime,
  pontosRanking,
  posicaoRank,
  partidas,
  historicoNotas,
  torneioNome,
  oponenteDetalhes,
  timeId,
  linkPerfilFormacao,
  formacaoTipoLabel,
  duplaRegistroLinks,
  avisoTopo,
  showBackLink = true,
}: FormacaoEidEsporteViewProps) {
  return (
    <main className={PROFILE_PUBLIC_MAIN_CLASS}>
      <FormacaoEidEsporteHeroStrip
        backHref={backHref}
        nomeEsporte={nomeEsporte}
        titulo={titulo}
        subtitulo={subtitulo}
        escudoUrl={escudoUrl}
        escudoFallbackLetter={escudoFallbackLetter}
        tipoLabel={tipoLabel}
        eidTime={eidTime}
        pontosRanking={pontosRanking}
        posicaoRank={posicaoRank}
        partidasListadoCount={partidas.length}
        linkPerfilFormacao={linkPerfilFormacao}
        duplaRegistroLinks={duplaRegistroLinks}
        avisoTopo={avisoTopo}
        showBackLink={showBackLink}
      />
      <FormacaoEidEsporteDetailsBlocks
        nomeEsporte={nomeEsporte}
        titulo={titulo}
        eidTime={eidTime}
        pontosRanking={pontosRanking}
        partidas={partidas}
        historicoNotas={historicoNotas}
        torneioNome={torneioNome}
        oponenteDetalhes={oponenteDetalhes}
        timeId={timeId}
        nextPath={nextPath}
        linkPerfilFormacao={linkPerfilFormacao}
        formacaoEscudoUrl={escudoUrl}
        formacaoTipoLabel={formacaoTipoLabel ?? tipoLabel}
      />
    </main>
  );
}
