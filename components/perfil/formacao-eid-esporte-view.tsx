import Link from "next/link";
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
  fmtDataPtBr,
  resultadoColetivo,
  trendTripletFromNotas,
  type PartidaColetivaRow,
} from "@/lib/perfil/formacao-eid-stats";

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
  nomeOponenteTime: Map<number, string>;
  timeId: number;
  linkPerfilFormacao: string;
  duplaRegistroLinks?: { id: number; href: string }[];
  avisoTopo?: string | null;
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
  nomeOponenteTime,
  timeId,
  linkPerfilFormacao,
  duplaRegistroLinks,
  avisoTopo,
}: FormacaoEidEsporteViewProps) {
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
    <main className={PROFILE_PUBLIC_MAIN_CLASS}>
        <PerfilBackLink href={backHref} label="Voltar" />

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

          <div className="grid grid-cols-2 gap-2 border-t border-[color:var(--eid-border-subtle)] px-3 py-3 sm:grid-cols-4">
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
            <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} text-center`}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Partidas (lista)</p>
              <p className="mt-0.5 text-lg font-black tabular-nums text-eid-fg">{partidas.length}</p>
            </div>
          </div>
        </div>

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

        <ProfileSection title="Panorama (só este esporte)" className="mt-4">
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

        <ProfileSection title="Histórico de partidas (formação)" className="mt-4">
          {partidas.length === 0 ? (
            <p className={`mt-2 ${PROFILE_CARD_BASE} p-3 text-[11px] text-eid-text-secondary`}>
              Nenhuma partida em equipe listada para esta formação neste esporte. Quando houver jogos válidos no ranking,
              eles aparecem aqui.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {partidas.map((p) => {
                const t1 = p.time1_id != null ? Number(p.time1_id) : null;
                const t2 = p.time2_id != null ? Number(p.time2_id) : null;
                const oppId = t1 === timeId ? t2 : t1;
                const onome = oppId != null ? nomeOponenteTime.get(oppId) ?? `Equipe #${oppId}` : "—";
                const res = resultadoColetivo(timeId, p);
                const when = fmtDataPtBr(p.data_resultado ?? p.data_registro);
                const torNome = p.torneio_id ? torneioNome.get(Number(p.torneio_id)) : null;
                return (
                  <li
                    key={p.id}
                    className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} relative flex items-center gap-2`}
                  >
                    <span className={`absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${res.tone} bg-eid-surface/90`}>
                      {res.label}
                    </span>
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[11px] font-black text-eid-primary-300">
                      {onome.trim().slice(0, 1).toUpperCase() || "E"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate pr-7 text-[11px] font-bold text-eid-fg">
                        vs{" "}
                        {oppId != null ? (
                          <Link
                            href={`/perfil-time/${oppId}?from=${encodeURIComponent(nextPath)}`}
                            className="text-eid-primary-400 hover:underline"
                          >
                            {onome}
                          </Link>
                        ) : (
                          onome
                        )}
                      </p>
                      <p className="text-[10px] text-eid-text-secondary">
                        {p.modalidade ? `${p.modalidade} · ` : ""}
                        {when}
                        {torNome ? (
                          <span className="text-eid-action-400"> · {torNome}</span>
                        ) : p.torneio_id ? (
                          <span className="text-eid-action-400"> · Torneio #{p.torneio_id}</span>
                        ) : null}
                        {p.tipo_partida ? ` · ${p.tipo_partida}` : ""}
                      </p>
                    </div>
                    <div className="text-right pr-7">
                      <p className="text-sm font-black tabular-nums text-eid-fg">
                        {Number.isFinite(Number(p.placar_1)) && Number.isFinite(Number(p.placar_2))
                          ? `${p.placar_1} × ${p.placar_2}`
                          : "—"}
                      </p>
                      <p className="text-[9px] uppercase text-eid-text-secondary">{p.status ?? "—"}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ProfileSection>
      </main>
  );
}
