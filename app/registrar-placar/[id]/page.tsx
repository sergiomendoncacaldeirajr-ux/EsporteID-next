import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DismissibleTapAwayHint } from "@/components/agenda/dismissible-tapaway-hint";
import { CadastrarLocalOverlayTrigger } from "@/components/locais/cadastrar-local-overlay-trigger";
import { LocalAutocompleteInput } from "@/components/locais/local-autocomplete-input";
import { MatchScoreForm } from "@/components/placar/match-score-form";
import { DesafioFlowCtaIcon } from "@/components/desafio/desafio-flow-cta-icon";
import { type ScoreRulesConfig } from "@/lib/desafio/score-rules";
import { DESAFIO_FLOW_CTA_BLOCK_CLASS, DESAFIO_FLOW_SECONDARY_CLASS } from "@/lib/desafio/flow-ui";
import { type MatchScorePayload } from "@/lib/match-scoring";
import { buildSetFormatOptions, getDesafioRankLockedSetFormat, getMatchUIConfig } from "@/lib/match-scoring";
import { createClient } from "@/lib/supabase/server";
import { canLaunchTorneioScore, getTorneioStaffAccess } from "@/lib/torneios/staff";
import { abrirMediacaoAdminAction, confirmarPlacarAction, contestarPlacarAction, salvarAgendamentoAction } from "./actions";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

function normStatus(v: string | null | undefined): string {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

function toRulesConfig(v: unknown): ScoreRulesConfig {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return v as ScoreRulesConfig;
}

function parseScorePayloadFromMessage(message: string | null | undefined): MatchScorePayload | null {
  const raw = String(message ?? "").trim();
  if (!raw) return null;
  const marker = "score_payload:";
  const idx = raw.indexOf(marker);
  if (idx < 0) return null;
  const jsonRaw = raw.slice(idx + marker.length).trim();
  if (!jsonRaw) return null;
  try {
    const parsed = JSON.parse(jsonRaw) as MatchScorePayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function stripScorePayloadFromMessage(message: string | null | undefined): string {
  const raw = String(message ?? "").trim();
  if (!raw) return "";
  const marker = "| score_payload:";
  const idx = raw.indexOf(marker);
  if (idx >= 0) return raw.slice(0, idx).trim();
  return raw;
}

function meaningfulSets(sets: Array<{ a?: number; b?: number; tiebreakA?: number; tiebreakB?: number }> | undefined) {
  const list = Array.isArray(sets) ? sets : [];
  let lastIndex = -1;
  for (let i = 0; i < list.length; i += 1) {
    const s = list[i] ?? {};
    const a = Number(s.a ?? 0);
    const b = Number(s.b ?? 0);
    const ta = Number(s.tiebreakA ?? 0);
    const tb = Number(s.tiebreakB ?? 0);
    if (a !== 0 || b !== 0 || ta !== 0 || tb !== 0) lastIndex = i;
  }
  return lastIndex >= 0 ? list.slice(0, lastIndex + 1) : [];
}

export default async function RegistrarPlacarPage({ params, searchParams }: Props) {
  const raw = (await params).id;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();
  const sp = (await searchParams) ?? {};
  const okMsg = typeof sp.ok === "string" ? sp.ok : null;
  const errMsg = typeof sp.erro === "string" ? sp.erro : null;
  const novoLocalId = typeof sp.novo_local_id === "string" ? Number(sp.novo_local_id) : 0;
  const modoRaw = typeof sp.modo === "string" ? sp.modo.trim() : "";
  const isEmbed = typeof sp.embed === "string" && sp.embed === "1";
  const fromRaw = typeof sp.from === "string" ? sp.from.trim() : "";
  const fromSafe = fromRaw.startsWith("/") && !fromRaw.startsWith("//") ? fromRaw : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const nextQs = new URLSearchParams();
    if (modoRaw === "agenda") nextQs.set("modo", "agenda");
    if (fromSafe) nextQs.set("from", fromSafe);
    const nextPath = nextQs.toString() ? `/registrar-placar/${id}?${nextQs}` : `/registrar-placar/${id}`;
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: p } = await supabase
    .from("partidas")
    .select(
      "id, match_id, jogador1_id, jogador2_id, status, status_ranking, esporte_id, torneio_id, esportes(nome,desafio_modo_lancamento,desafio_regras_placar_json), placar_1, placar_2, lancado_por, mensagem, data_resultado, data_validacao, modalidade, time1_id, time2_id, data_partida, local_str"
    )
    .eq("id", id)
    .maybeSingle();

  if (!p) notFound();

  const participant = p.jogador1_id === user.id || p.jogador2_id === user.id;
  const modalidade = String(p.modalidade ?? "").trim().toLowerCase();
  const isColetivo = modalidade === "dupla" || modalidade === "time" || Boolean(p.time1_id || p.time2_id);
  const timeIds = [p.time1_id, p.time2_id].filter((v): v is number => typeof v === "number" && v > 0);
  const [{ data: ownerRows }, { data: memberRows }] = timeIds.length
    ? await Promise.all([
        supabase.from("times").select("id, criador_id, nome").in("id", timeIds),
        supabase
          .from("membros_time")
          .select("time_id, usuario_id, status")
          .in("time_id", timeIds)
          .eq("usuario_id", user.id)
          .in("status", ["ativo", "aceito", "aprovado"]),
      ])
    : [{ data: [] as Array<{ id: number; criador_id: string | null; nome: string | null }> }, { data: [] as Array<{ time_id: number }> }];
  const isTeamOwner = (ownerRows ?? []).some((t) => t.criador_id === user.id);
  const isTeamMember = (memberRows ?? []).length > 0;
  const torneioAccess = p.torneio_id ? await getTorneioStaffAccess(supabase, Number(p.torneio_id), user.id) : null;
  const podeRegistrarTorneio = torneioAccess ? canLaunchTorneioScore(torneioAccess) : false;
  if (p.torneio_id) {
    if (!podeRegistrarTorneio) notFound();
  } else if (isColetivo ? !(isTeamOwner || isTeamMember) : !participant) {
    notFound();
  }
  const status = normStatus(p.status);
  const statusRanking = normStatus(p.status_ranking);
  const emAnaliseAdmin = statusRanking === "em_analise_admin";
  const resultadoContestado =
    statusRanking === "contestado" || statusRanking === "resultado_contestado" || statusRanking === "pendente_confirmacao_revisao";
  const aguardandoConfirmacao = status === "aguardando_confirmacao" || (status === "agendada" && resultadoContestado);
  const concluida =
    status === "concluida" || status === "concluída" || status === "concluido" || status === "validada" || status === "finalizada";
  /** Fluxo só-agenda (data/local): na Agenda. Resultado fica no Painel (comunidade). */
  const agendaSomente = modoRaw === "agenda" && !p.torneio_id;
  if (agendaSomente && status !== "agendada") {
    redirect("/comunidade#resultados-partida");
  }
  const podeLancar = !emAnaliseAdmin && (p.torneio_id
    ? podeRegistrarTorneio
    : resultadoContestado
      ? (isColetivo ? isTeamOwner : participant) &&
        p.lancado_por === user.id &&
        (status === "aguardando_confirmacao" || status === "agendada")
      : isColetivo
        ? isTeamOwner && (status === "agendada" || (aguardandoConfirmacao && p.lancado_por === user.id))
        : participant && (status === "agendada" || (aguardandoConfirmacao && p.lancado_por === user.id)));
  const podeConfirmarOuContestar =
    !emAnaliseAdmin && !p.torneio_id && (isColetivo ? isTeamOwner : participant) && aguardandoConfirmacao && p.lancado_por !== user.id;
  const podeAbrirMediacao =
    !p.torneio_id &&
    !emAnaliseAdmin &&
    (isColetivo ? isTeamOwner : participant) &&
    aguardandoConfirmacao &&
    p.lancado_por !== user.id &&
    resultadoContestado;
  const resultadoEnviadoAguardando = aguardandoConfirmacao && p.lancado_por === user.id && !agendaSomente;

  const esp = Array.isArray(p.esportes) ? p.esportes[0] : p.esportes;
  const regrasPlacar = toRulesConfig((esp as { desafio_regras_placar_json?: unknown } | null)?.desafio_regras_placar_json);
  const variantes = Array.isArray(regrasPlacar.variantes) ? regrasPlacar.variantes : [];

  const voltarHref = agendaSomente ? "/agenda" : fromSafe ?? "/agenda";
  const voltarLabel = agendaSomente ? "← Voltar à agenda" : fromSafe === "/comunidade" ? "← Voltar ao painel" : "← Voltar à agenda";
  const abrirAgendamentoPorPadrao = agendaSomente || fromSafe === "/agenda";

  const { data: j1 } = p.jogador1_id
    ? await supabase.from("profiles").select("nome, avatar_url").eq("id", p.jogador1_id).maybeSingle()
    : { data: null };
  const { data: j2 } = p.jogador2_id
    ? await supabase.from("profiles").select("nome, avatar_url").eq("id", p.jogador2_id).maybeSingle()
    : { data: null };
  const { data: novoLocal } =
    Number.isFinite(novoLocalId) && novoLocalId > 0
      ? await supabase
          .from("espacos_genericos")
          .select("id, nome_publico, localizacao")
          .eq("id", novoLocalId)
          .maybeSingle()
      : { data: null };

  const [{ data: sportFormatRow }, { data: sportRow }] = await Promise.all([
    p.match_id
      ? supabase
          .from("matches")
          .select(
            "format_id, sport_formats(sets_to_win,games_per_set,tiebreak,tiebreak_points,final_set_super_tiebreak,points_limit,win_by_two,has_overtime,has_penalties,max_rounds)"
          )
          .eq("id", p.match_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as { data: null }),
    p.match_id
      ? supabase.from("matches").select("sport_id, sports(name, scoring_type)").eq("id", p.match_id).maybeSingle()
      : Promise.resolve({ data: null } as { data: null }),
  ]);
  const formatObj = Array.isArray((sportFormatRow as { sport_formats?: unknown[] } | null)?.sport_formats)
    ? (sportFormatRow as { sport_formats?: unknown[] }).sport_formats?.[0]
    : (sportFormatRow as { sport_formats?: unknown } | null)?.sport_formats;
  const sportObj = Array.isArray((sportRow as { sports?: unknown[] } | null)?.sports)
    ? (sportRow as { sports?: unknown[] }).sports?.[0]
    : (sportRow as { sports?: unknown } | null)?.sports;
  const matchUiConfig = getMatchUIConfig({
    sport: {
      name: (sportObj as { name?: string } | null)?.name ?? (esp as { nome?: string } | null)?.nome ?? null,
      scoring_type: (sportObj as { scoring_type?: string } | null)?.scoring_type ?? "sets",
    },
    format: (formatObj as Record<string, unknown> | null) ?? {
      sets_to_win: 1,
      games_per_set: 6,
      tiebreak: false,
      tiebreak_points: 7,
      final_set_super_tiebreak: false,
      points_limit: null,
      win_by_two: false,
      has_overtime: false,
      has_penalties: false,
      max_rounds: 3,
    },
  });
  const sportNameForFormats = (esp as { nome?: string } | null)?.nome ?? (sportObj as { name?: string } | null)?.name ?? null;
  const allSetFormatOptions =
    matchUiConfig.type === "sets"
      ? buildSetFormatOptions({
          sportName: sportNameForFormats,
          baseConfig: matchUiConfig,
          rules: regrasPlacar,
        })
      : [];
  const desafioRankLock =
    !p.torneio_id && matchUiConfig.type === "sets" && allSetFormatOptions.length > 0
      ? getDesafioRankLockedSetFormat({
          baseConfig: matchUiConfig,
          sportName: sportNameForFormats,
          rules: regrasPlacar,
        })
      : null;
  const setFormatOptions = desafioRankLock ? [] : allSetFormatOptions;
  const matchScoreFormConfig = desafioRankLock?.config ?? matchUiConfig;
  const matchScoreInitialSetFormatKey = desafioRankLock?.formatKey ?? null;
  const defaultLocalStr = novoLocal
    ? `${novoLocal.nome_publico ?? "Local"}${novoLocal.localizacao ? ` — ${novoLocal.localizacao}` : ""}`
    : p.local_str ?? "";
  const returnToPath = `/registrar-placar/${id}${modoRaw === "agenda" || fromSafe ? "?" : ""}${
    modoRaw === "agenda" ? `modo=agenda${fromSafe ? `&from=${encodeURIComponent(fromSafe)}` : ""}` : fromSafe ? `from=${encodeURIComponent(fromSafe)}` : ""
  }`;
  const cadastrarLocalHref = `/locais/cadastrar?return_to=${encodeURIComponent(returnToPath)}`;
  const scorePayload = parseScorePayloadFromMessage(p.mensagem);
  const cleanMensagem = stripScorePayloadFromMessage(p.mensagem);
  const placarSets = scorePayload?.type === "sets" ? meaningfulSets(scorePayload.sets) : [];

  return (
    <main data-eid-desafio-ui className="mx-auto w-full max-w-lg px-3 py-4 sm:max-w-xl sm:px-4 sm:py-6">
        {!isEmbed ? (
          <Link href={voltarHref} className={`${DESAFIO_FLOW_SECONDARY_CLASS} max-w-fit normal-case`}>
            {voltarLabel}
          </Link>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-action-500)_32%,var(--eid-border-subtle)_68%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-action-500)_10%,var(--eid-card)_90%),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] p-4 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.28)] backdrop-blur-sm sm:mt-6 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-action-400">
            {agendaSomente ? "Agendar partida" : "Registrar resultado"}
          </p>
          <h1 className="mt-2 text-lg font-black tracking-tight text-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-fg)_96%,white_4%),color-mix(in_srgb,var(--eid-action-500)_72%,var(--eid-fg)_28%))] bg-clip-text md:text-xl">
            Partida #{id}
          </h1>
          <p className="mt-1 text-sm font-semibold text-eid-primary-300">{esp?.nome ?? "Esporte"}</p>
          {p.torneio_id ? (
            <p className="mt-2 text-xs text-eid-action-400">
              Partida de torneio: o lançamento é restrito ao organizador e aos lançadores autorizados.
            </p>
          ) : null}
          {isColetivo && !isTeamOwner ? (
            <p className="mt-2 text-xs text-eid-text-secondary">
              Você é membro da formação: visualização liberada. Somente o dono da dupla/time pode agendar, lançar, confirmar ou contestar resultado.
            </p>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color-mix(in_srgb,var(--eid-bg)_35%,var(--eid-surface)_65%)] px-3 py-3 sm:mt-6 sm:rounded-2xl sm:px-4 sm:py-4">
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-bold text-eid-fg md:font-black">{j1?.nome ?? "Jogador 1"}</p>
            </div>
            <div className="flex shrink-0 flex-col items-center justify-end self-end pb-0.5">
              <span className="block">
                <svg viewBox="0 0 36 36" aria-hidden className="h-[22px] w-[22px]">
                  <text x="7" y="22" fontSize="14" fontWeight="900" fill="currentColor" className="text-eid-fg">
                    V
                  </text>
                  <text x="21" y="26" fontSize="14" fontWeight="900" fill="currentColor" className="text-eid-fg">
                    S
                  </text>
                  <path d="M22 3 16 16h4l-5 17 13-17h-4l5-13Z" fill="currentColor" className="text-eid-action-400" />
                </svg>
              </span>
            </div>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-bold text-eid-fg md:font-black">{j2?.nome ?? "Jogador 2"}</p>
            </div>
          </div>

          {errMsg ? (
            <p className="mt-4 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">{errMsg}</p>
          ) : null}
          {okMsg ? (
            <p className="mt-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--eid-success-500)_82%,var(--eid-fg)_18%)]">
              {okMsg}
            </p>
          ) : null}

          {agendaSomente ? (
            <p className="mt-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2 text-xs text-eid-text-secondary">
              O <strong className="text-eid-fg">lançamento e a confirmação do placar</strong> são feitos no{" "}
              <Link href="/comunidade#resultados-partida" className="font-bold text-eid-primary-300 hover:underline">
                Painel de controle
              </Link>
              .
            </p>
          ) : null}

          {!agendaSomente && (p.placar_1 != null || p.placar_2 != null) && (
            <div className="mt-5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Placar atual</p>
              {placarSets.length > 0 ? (
                <div className="mt-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color-mix(in_srgb,var(--eid-bg)_38%,var(--eid-surface)_62%)]">
                  <div className="grid grid-cols-[1.2fr_repeat(5,minmax(0,1fr))] items-stretch">
                    <div className="border-b border-r border-[color:var(--eid-border-subtle)] px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[9px] font-bold text-eid-fg">
                          {j1?.avatar_url ? <img src={j1.avatar_url} alt="" className="h-full w-full object-cover" /> : (j1?.nome ?? "J1").slice(0, 2)}
                        </span>
                        <span className="truncate text-[11px] font-black uppercase tracking-[0.02em] text-eid-fg">{j1?.nome ?? "Jogador 1"}</span>
                      </div>
                    </div>
                    {placarSets.map((set, idx) => {
                      const a = Number(set.a ?? 0);
                      const tbA = Number(set.tiebreakA ?? 0);
                      const tbB = Number(set.tiebreakB ?? 0);
                      const hasTb = tbA > 0 || tbB > 0;
                      return (
                        <div key={`a-${idx}`} className="border-b border-r border-[color:var(--eid-border-subtle)] px-1 py-1.5 text-center">
                          <span className="inline-flex items-start justify-center text-[21px] font-black leading-none text-eid-fg">
                            <span>{a}</span>
                            {hasTb ? <sup className="ml-0.5 text-[10px] font-bold leading-none text-eid-text-secondary">{tbA}</sup> : null}
                          </span>
                        </div>
                      );
                    })}
                    {Array.from({ length: Math.max(0, 5 - placarSets.length) }).map((_, idx) => (
                      <div key={`a-empty-${idx}`} className="border-b border-r border-[color:var(--eid-border-subtle)]" />
                    ))}
                    <div className="border-r border-[color:var(--eid-border-subtle)] px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[9px] font-bold text-eid-fg">
                          {j2?.avatar_url ? <img src={j2.avatar_url} alt="" className="h-full w-full object-cover" /> : (j2?.nome ?? "J2").slice(0, 2)}
                        </span>
                        <span className="truncate text-[11px] font-black uppercase tracking-[0.02em] text-eid-fg">{j2?.nome ?? "Jogador 2"}</span>
                      </div>
                    </div>
                    {placarSets.map((set, idx) => {
                      const b = Number(set.b ?? 0);
                      const tbA = Number(set.tiebreakA ?? 0);
                      const tbB = Number(set.tiebreakB ?? 0);
                      const hasTb = tbA > 0 || tbB > 0;
                      return (
                        <div key={`b-${idx}`} className="border-r border-[color:var(--eid-border-subtle)] px-1 py-1.5 text-center">
                          <span className="inline-flex items-start justify-center text-[21px] font-black leading-none text-eid-fg">
                            <span>{b}</span>
                            {hasTb ? <sup className="ml-0.5 text-[10px] font-bold leading-none text-eid-text-secondary">{tbB}</sup> : null}
                          </span>
                        </div>
                      );
                    })}
                    {Array.from({ length: Math.max(0, 5 - placarSets.length) }).map((_, idx) => (
                      <div key={`b-empty-${idx}`} className="border-r border-[color:var(--eid-border-subtle)]" />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-lg font-black text-eid-fg">
                  {p.placar_1 ?? "—"} x {p.placar_2 ?? "—"}
                </p>
              )}
              {cleanMensagem ? <p className="mt-1 text-xs text-eid-text-secondary">{cleanMensagem}</p> : null}
            </div>
          )}

          {podeLancar && !resultadoEnviadoAguardando ? (
            <details
              open={abrirAgendamentoPorPadrao}
              className="mt-5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 open:shadow-[0_10px_18px_-14px_rgba(15,23,42,0.5)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Agendamento (opcional)</span>
                <span className="text-xs text-eid-text-secondary">▾</span>
              </summary>
              <div className="border-t border-[color:var(--eid-border-subtle)] px-3 pb-3 pt-2.5 sm:px-4 sm:pb-4">
                <form action={salvarAgendamentoAction}>
                  <input type="hidden" name="partida_id" value={id} />
                  {agendaSomente ? <input type="hidden" name="modo_agenda" value="1" /> : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Data e hora</span>
                      <input
                        type="datetime-local"
                        name="data_partida"
                        defaultValue={p.data_partida ? new Date(p.data_partida).toISOString().slice(0, 16) : ""}
                        className="eid-input-dark h-10 rounded-xl px-3 !text-[14px] text-eid-fg placeholder:!text-[12px]"
                        style={{ fontSize: "14px" }}
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Local</span>
                      <LocalAutocompleteInput
                        name="local_str"
                        defaultValue={defaultLocalStr}
                        placeholder="Quadra, clube, endereço..."
                        minChars={3}
                        className="eid-input-dark h-10 rounded-xl px-3 !text-[14px] text-eid-fg placeholder:!text-[12px]"
                        inputStyle={{ fontSize: "14px" }}
                      />
                    </label>
                  </div>
                  <CadastrarLocalOverlayTrigger
                    href={cadastrarLocalHref}
                    className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-3 w-full text-center`}
                  >
                    + Cadastrar local genérico
                  </CadastrarLocalOverlayTrigger>
                  <button type="submit" className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-3 w-full`}>
                    Salvar agendamento
                  </button>
                  {agendaSomente ? (
                    <p className="mt-2 text-[11px] text-eid-text-secondary">
                      Defina data e local aqui. Para registrar o placar após o jogo, use o Painel de controle.
                    </p>
                  ) : null}
                </form>
              </div>
            </details>
          ) : null}
          {podeLancar && !agendaSomente && !resultadoEnviadoAguardando ? (
            <DismissibleTapAwayHint className="mt-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2 text-[11px] text-eid-text-secondary">
              Se já combinaram fora do app, você pode pular o agendamento e lançar o resultado direto abaixo.
            </DismissibleTapAwayHint>
          ) : null}

          {podeLancar && !agendaSomente && !resultadoEnviadoAguardando ? (
            <div className="mt-5">
              {variantes.length > 0 ? (
                <p className="mb-2 text-[11px] text-eid-text-secondary">
                  Variante ativa deste esporte: {String((variantes[0] as { label?: unknown }).label ?? (variantes[0] as { key?: unknown }).key ?? "padrão")}
                </p>
              ) : null}
              <MatchScoreForm
                partidaId={id}
                config={matchScoreFormConfig}
                setFormatOptions={setFormatOptions}
                initialSetFormatKey={matchScoreInitialSetFormatKey}
                sideALabel={j1?.nome ?? "Jogador 1"}
                sideBLabel={j2?.nome ?? "Jogador 2"}
                sideAAvatarUrl={j1?.avatar_url ?? null}
                sideBAvatarUrl={j2?.avatar_url ?? null}
                isTorneio={Boolean(p.torneio_id)}
              />
            </div>
          ) : null}

          {aguardandoConfirmacao && p.lancado_por === user.id && !agendaSomente ? (
            <p className="mt-5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/65 px-3 py-2 text-xs text-eid-text-secondary">
              Resultado enviado. Aguardando confirmação do oponente.
            </p>
          ) : null}

          {podeConfirmarOuContestar && !agendaSomente && !resultadoContestado ? (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <form action={confirmarPlacarAction}>
                <input type="hidden" name="partida_id" value={id} />
                <button type="submit" className={DESAFIO_FLOW_CTA_BLOCK_CLASS}>
                  <DesafioFlowCtaIcon />
                  <span>Confirmar resultado</span>
                </button>
              </form>
              <form action={contestarPlacarAction}>
                <input type="hidden" name="partida_id" value={id} />
                <button
                  type="submit"
                  className={`${DESAFIO_FLOW_SECONDARY_CLASS} w-full hover:border-amber-500/45 hover:text-amber-200`}
                >
                  Contestar resultado
                </button>
              </form>
            </div>
          ) : null}
          {podeAbrirMediacao && !agendaSomente ? (
            <div className="mt-5">
              <form action={abrirMediacaoAdminAction}>
                <input type="hidden" name="partida_id" value={id} />
                <button
                  type="submit"
                  className={`${DESAFIO_FLOW_SECONDARY_CLASS} w-full border-amber-500/45 bg-amber-500/14 text-amber-200 hover:bg-amber-500/20`}
                >
                  Abrir mediação com o admin
                </button>
              </form>
            </div>
          ) : null}

          {concluida ? (
            <p className="mt-5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--eid-success-500)_82%,var(--eid-fg)_18%)]">
              Partida concluída e resultado validado.
            </p>
          ) : null}
          {emAnaliseAdmin ? (
            <p className="mt-5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
              Resultado em análise administrativa após contestação de ambos. O admin fará a mediação por WhatsApp.
            </p>
          ) : null}
        </div>
      </main>
  );
}
