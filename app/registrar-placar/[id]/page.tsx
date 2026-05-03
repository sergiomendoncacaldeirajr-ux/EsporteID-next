import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DismissibleTapAwayHint } from "@/components/agenda/dismissible-tapaway-hint";
import { RankingConfrontoDatetimeInput } from "@/components/agenda/ranking-confronto-datetime-input";
import { CONFRONTO_AGENDAMENTO_JANELA_HORAS } from "@/lib/agenda/confronto-agendamento-janela";
import { CadastrarLocalOverlayTrigger } from "@/components/locais/cadastrar-local-overlay-trigger";
import { LocalAutocompleteInput } from "@/components/locais/local-autocomplete-input";
import { MatchScoreForm } from "@/components/placar/match-score-form";
import { StatusSubmitButton } from "@/components/placar/status-submit-button";
import { type ScoreRulesConfig } from "@/lib/desafio/score-rules";
import { DESAFIO_FLOW_CTA_BLOCK_CLASS, DESAFIO_FLOW_SECONDARY_CLASS } from "@/lib/desafio/flow-ui";
import { goalsPayloadHasAny, type MatchScorePayload } from "@/lib/match-scoring";
import { buildSetFormatOptions, getDesafioRankLockedSetFormat, getMatchUIConfig } from "@/lib/match-scoring";
import { GoalsScoreboardSummary } from "@/components/placar/goals-scoreboard-summary";
import { createClient } from "@/lib/supabase/server";
import { getIsPlatformAdmin } from "@/lib/auth/platform-admin";
import { canLaunchTorneioScore, getTorneioStaffAccess } from "@/lib/torneios/staff";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { ContestarPlacarForm } from "@/components/placar/contestar-placar-form";
import { abrirMediacaoAdminAction, confirmarPlacarAction, salvarAgendamentoAction } from "./actions";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

function normStatus(v: string | null | undefined): string {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

function iniciaisConfronto(label: string): string {
  const parts = label.trim().split(/\s+/u).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
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
  const adminMode = sp.admin === "1";
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
  const isPlatformAdmin = adminMode ? await getIsPlatformAdmin() : false;

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
        supabase.from("times").select("id, criador_id, nome, escudo").in("id", timeIds),
        supabase
          .from("membros_time")
          .select("time_id, usuario_id, status")
          .in("time_id", timeIds)
          .eq("usuario_id", user.id)
          .in("status", ["ativo", "aceito", "aprovado"]),
      ])
    : [{ data: [] as Array<{ id: number; criador_id: string | null; nome: string | null; escudo: string | null }> }, { data: [] as Array<{ time_id: number }> }];
  const isTeamLeader = (ownerRows ?? []).some((t) => t.criador_id === user.id);
  const isTeamMember = (memberRows ?? []).length > 0;
  const torneioAccess = p.torneio_id ? await getTorneioStaffAccess(supabase, Number(p.torneio_id), user.id) : null;
  const podeRegistrarTorneio = torneioAccess ? canLaunchTorneioScore(torneioAccess) : false;
  if (p.torneio_id) {
    if (!podeRegistrarTorneio && !isPlatformAdmin) notFound();
  } else if (!(isPlatformAdmin || (isColetivo ? isTeamLeader : participant))) {
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
  const podeLancar = !emAnaliseAdmin && (isPlatformAdmin || (p.torneio_id
    ? podeRegistrarTorneio
    : resultadoContestado
      ? (isColetivo ? isTeamLeader : participant) &&
        p.lancado_por === user.id &&
        (status === "aguardando_confirmacao" || status === "agendada")
      : isColetivo
        ? isTeamLeader && (status === "agendada" || (aguardandoConfirmacao && p.lancado_por === user.id))
        : participant && (status === "agendada" || (aguardandoConfirmacao && p.lancado_por === user.id))));
  const podeConfirmarOuContestar =
    !emAnaliseAdmin && !p.torneio_id && (isColetivo ? isTeamLeader : participant) && aguardandoConfirmacao && p.lancado_por !== user.id;
  const podeAbrirMediacao =
    !p.torneio_id &&
    !emAnaliseAdmin &&
    (isColetivo ? isTeamLeader : participant) &&
    aguardandoConfirmacao &&
    p.lancado_por !== user.id &&
    resultadoContestado;
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
  const timeRow1 =
    typeof p.time1_id === "number" && p.time1_id > 0
      ? (ownerRows ?? []).find((t) => t.id === p.time1_id) ?? null
      : null;
  const timeRow2 =
    typeof p.time2_id === "number" && p.time2_id > 0
      ? (ownerRows ?? []).find((t) => t.id === p.time2_id) ?? null
      : null;
  /** Lançador de placar: time/dupla usa nome e escudo da formação, não do líder. */
  const placarSideA = {
    label: (timeRow1?.nome ?? j1?.nome ?? "Jogador 1").trim() || "Jogador 1",
    avatarUrl: timeRow1 ? (timeRow1.escudo?.trim() || null) : (j1?.avatar_url ?? null),
    avatarEhFormacao: Boolean(timeRow1),
  };
  const placarSideB = {
    label: (timeRow2?.nome ?? j2?.nome ?? "Jogador 2").trim() || "Jogador 2",
    avatarUrl: timeRow2 ? (timeRow2.escudo?.trim() || null) : (j2?.avatar_url ?? null),
    avatarEhFormacao: Boolean(timeRow2),
  };
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
  const placarGols =
    scorePayload?.type === "gols" && scorePayload.goals && goalsPayloadHasAny(scorePayload.goals) ? scorePayload.goals : null;
  const resultadoTemPlacar =
    p.data_resultado != null ||
    p.placar_1 != null ||
    p.placar_2 != null ||
    (scorePayload?.type === "sets" && placarSets.length > 0) ||
    placarGols != null;
  const resultadoEnviadoAguardando =
    status === "aguardando_confirmacao" && p.lancado_por === user.id && resultadoTemPlacar && !agendaSomente;
  /** Evita formulário de lançamento junto da revisão (ex.: Enter não envia placar vazio enquanto o líder confirma/contesta). */
  const exibirLancamentoPlacar =
    podeLancar &&
    !agendaSomente &&
    !resultadoEnviadoAguardando &&
    !(podeConfirmarOuContestar && resultadoTemPlacar);

  return (
    <main
      data-eid-desafio-ui
      className={
        agendaSomente
          ? "mx-auto w-full max-w-lg px-3 pt-0 pb-[calc(var(--eid-shell-footer-offset)+1rem)] sm:max-w-2xl sm:px-6 sm:pt-1 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]"
          : "mx-auto w-full max-w-lg px-3 py-3 sm:max-w-xl sm:px-4 sm:py-5"
      }
    >
        {!isEmbed ? (
          <Link
            href={voltarHref}
            className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-2 max-w-fit rounded-xl normal-case md:mt-1`}
          >
            {voltarLabel}
          </Link>
        ) : null}

        <div
          className={
            agendaSomente
              ? `mt-3 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-4 sm:py-4`
              : "mt-4 overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-action-500)_32%,var(--eid-border-subtle)_68%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-action-500)_10%,var(--eid-card)_90%),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] p-4 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.28)] backdrop-blur-sm sm:mt-6 sm:p-6"
          }
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-eid-action-400 md:font-black md:tracking-[0.16em]">
            {agendaSomente ? "Agendar partida" : "Registrar resultado"}
          </p>
          <h1
            className={
              agendaSomente
                ? "mt-1 text-base font-black leading-tight tracking-tight text-eid-fg sm:text-lg"
                : "mt-2 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-fg)_96%,white_4%),color-mix(in_srgb,var(--eid-action-500)_72%,var(--eid-fg)_28%))] bg-clip-text text-lg font-black tracking-tight text-transparent md:text-xl"
            }
          >
            Partida #{id}
          </h1>
          <p className="mt-1 text-sm font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_62%,var(--eid-primary-500)_38%)]">
            {esp?.nome ?? "Esporte"}
          </p>
          {p.torneio_id ? (
            <p className="mt-2 text-xs text-eid-action-400">
              Partida de torneio: o lançamento é restrito ao organizador e aos lançadores autorizados.
            </p>
          ) : null}
          {isColetivo && !isTeamLeader ? (
            <p className="mt-2 text-xs text-eid-text-secondary">
              Você é membro da formação: visualização liberada. Somente o dono da dupla/time pode agendar, lançar, confirmar ou contestar resultado.
            </p>
          ) : null}

          <div
            className={
              agendaSomente
                ? "mt-4 flex items-center justify-between gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-3 sm:mt-6 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-4"
                : "mt-4 flex items-center justify-between gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color-mix(in_srgb,var(--eid-bg)_35%,var(--eid-surface)_65%)] px-3 py-3 sm:mt-6 sm:rounded-2xl sm:px-4 sm:py-4"
            }
          >
            <div className="min-w-0 flex-1 text-center">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-fg ${
                    placarSideA.avatarEhFormacao ? "rounded-xl" : "rounded-full"
                  }`}
                >
                  {placarSideA.avatarUrl ? (
                    <img src={placarSideA.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    iniciaisConfronto(placarSideA.label)
                  )}
                </span>
                <p
                  className={
                    agendaSomente
                      ? "w-full truncate text-sm font-black text-eid-fg"
                      : "w-full truncate text-sm font-bold text-eid-fg md:font-black"
                  }
                >
                  {placarSideA.label}
                </p>
              </div>
            </div>
            {agendaSomente ? (
              <div className="flex shrink-0 flex-col items-center justify-center self-center">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-eid-action-500/35 bg-eid-action-500/12 text-[9px] font-black uppercase tracking-[0.08em] text-eid-action-300 shadow-[0_6px_16px_-10px_rgba(249,115,22,0.6)] md:h-8 md:w-8 md:text-[10px]">
                  VS
                </span>
              </div>
            ) : (
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
            )}
            <div className="min-w-0 flex-1 text-center">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-fg ${
                    placarSideB.avatarEhFormacao ? "rounded-xl" : "rounded-full"
                  }`}
                >
                  {placarSideB.avatarUrl ? (
                    <img src={placarSideB.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    iniciaisConfronto(placarSideB.label)
                  )}
                </span>
                <p
                  className={
                    agendaSomente
                      ? "w-full truncate text-sm font-black text-eid-fg"
                      : "w-full truncate text-sm font-bold text-eid-fg md:font-black"
                  }
                >
                  {placarSideB.label}
                </p>
              </div>
            </div>
          </div>

          {errMsg ? (
            <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-center text-[11px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_55%,#f43f5e_45%)] md:text-xs">
              {errMsg}
            </p>
          ) : null}
          {okMsg ? (
            <p className="mt-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--eid-success-500)_82%,var(--eid-fg)_18%)]">
              {okMsg}
            </p>
          ) : null}

          {agendaSomente ? (
            <p className="mt-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 px-3 py-2 text-[11px] leading-relaxed text-eid-text-secondary md:text-xs">
              O <strong className="text-eid-fg">lançamento e a confirmação do placar</strong> são feitos no{" "}
              <Link
                href="/comunidade#resultados-partida"
                className="font-bold text-[color:color-mix(in_srgb,var(--eid-fg)_65%,var(--eid-primary-500)_35%)] hover:underline"
              >
                Painel de controle
              </Link>
              .
            </p>
          ) : null}

          {!agendaSomente && (p.placar_1 != null || p.placar_2 != null || placarGols != null) && (
            <div className="mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2.5 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Placar atual</p>
              {placarSets.length > 0 ? (
                <div className="mt-2 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color-mix(in_srgb,var(--eid-bg)_38%,var(--eid-surface)_62%)]">
                  <div
                    className="grid min-w-max items-stretch"
                    style={{ gridTemplateColumns: `minmax(128px,1fr) repeat(${Math.max(1, placarSets.length)}, minmax(30px,34px))` }}
                  >
                    <div className="border-b border-r border-[color:var(--eid-border-subtle)] px-1.5 py-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[8px] font-bold text-eid-fg ${
                            placarSideA.avatarEhFormacao ? "rounded-md" : "rounded-full"
                          }`}
                        >
                          {placarSideA.avatarUrl ? (
                            <img src={placarSideA.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            iniciaisConfronto(placarSideA.label)
                          )}
                        </span>
                        <span className="truncate text-[10px] font-black uppercase tracking-[0.02em] text-eid-fg">
                          {placarSideA.label}
                        </span>
                      </div>
                    </div>
                    {placarSets.map((set, idx) => {
                      const a = Number(set.a ?? 0);
                      const tbA = Number(set.tiebreakA ?? 0);
                      const tbB = Number(set.tiebreakB ?? 0);
                      const hasTb = tbA > 0 || tbB > 0;
                      return (
                        <div key={`a-${idx}`} className="border-b border-r border-[color:var(--eid-border-subtle)] px-0.5 py-1 text-center">
                          <span className="inline-flex items-start justify-center text-[18px] font-black leading-none text-eid-fg">
                            <span>{a}</span>
                            {hasTb ? <sup className="ml-0.5 text-[9px] font-bold leading-none text-eid-text-secondary">{tbA}</sup> : null}
                          </span>
                        </div>
                      );
                    })}
                    <div className="border-r border-[color:var(--eid-border-subtle)] px-1.5 py-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[8px] font-bold text-eid-fg ${
                            placarSideB.avatarEhFormacao ? "rounded-md" : "rounded-full"
                          }`}
                        >
                          {placarSideB.avatarUrl ? (
                            <img src={placarSideB.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            iniciaisConfronto(placarSideB.label)
                          )}
                        </span>
                        <span className="truncate text-[10px] font-black uppercase tracking-[0.02em] text-eid-fg">
                          {placarSideB.label}
                        </span>
                      </div>
                    </div>
                    {placarSets.map((set, idx) => {
                      const b = Number(set.b ?? 0);
                      const tbA = Number(set.tiebreakA ?? 0);
                      const tbB = Number(set.tiebreakB ?? 0);
                      const hasTb = tbA > 0 || tbB > 0;
                      return (
                        <div key={`b-${idx}`} className="border-r border-[color:var(--eid-border-subtle)] px-0.5 py-1 text-center">
                          <span className="inline-flex items-start justify-center text-[18px] font-black leading-none text-eid-fg">
                            <span>{b}</span>
                            {hasTb ? <sup className="ml-0.5 text-[9px] font-bold leading-none text-eid-text-secondary">{tbB}</sup> : null}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : placarGols ? (
                <div className="mt-2">
                  <GoalsScoreboardSummary
                    goals={placarGols}
                    sportName={(esp as { nome?: string } | null)?.nome ?? sportNameForFormats}
                    variant="card"
                    caption={null}
                  />
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
              className="mt-4 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 open:shadow-[0_10px_18px_-14px_rgba(15,23,42,0.35)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2.5 sm:px-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">
                  {agendaSomente ? "Data e local" : "Agendamento (opcional)"}
                </span>
                <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_65%,var(--eid-primary-500)_35%)]">
                  Agenda
                </span>
              </summary>
              <div className="px-3 pb-3 pt-2.5 sm:px-4 sm:pb-4">
                <form action={salvarAgendamentoAction} className="grid gap-0">
                  <input type="hidden" name="partida_id" value={id} />
                  {agendaSomente ? <input type="hidden" name="modo_agenda" value="1" /> : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Data e hora</span>
                      {p.torneio_id ? (
                        <input
                          type="datetime-local"
                          name="data_partida"
                          defaultValue={p.data_partida ? new Date(p.data_partida).toISOString().slice(0, 16) : ""}
                          className="eid-input-dark h-10 rounded-xl px-3 !text-[14px] text-eid-fg placeholder:!text-[12px]"
                          style={{ fontSize: "14px" }}
                        />
                      ) : (
                        <RankingConfrontoDatetimeInput
                          name="data_partida"
                          defaultValue={p.data_partida ? new Date(p.data_partida).toISOString().slice(0, 16) : ""}
                          className="eid-input-dark h-10 rounded-xl px-3 !text-[14px] text-eid-fg placeholder:!text-[12px]"
                          style={{ fontSize: "14px" }}
                        />
                      )}
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
                    className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-3 w-full rounded-xl text-center !min-h-[34px]`}
                  >
                    + Cadastrar local genérico
                  </CadastrarLocalOverlayTrigger>
                  <button
                    type="submit"
                    className={
                      agendaSomente
                        ? "mt-3 inline-flex min-h-[40px] w-full items-center justify-center rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/15 px-3 text-[10px] font-black uppercase tracking-wide text-[color:color-mix(in_srgb,var(--eid-fg)_68%,var(--eid-primary-500)_32%)] shadow-[0_4px_14px_-6px_rgba(37,99,235,0.25)] transition hover:bg-eid-primary-500/22 md:text-[11px]"
                        : `${DESAFIO_FLOW_SECONDARY_CLASS} mt-3 w-full rounded-xl !min-h-[36px]`
                    }
                  >
                    Salvar agendamento
                  </button>
                  {!p.torneio_id ? (
                    <p className="mt-2 text-[10px] leading-relaxed text-eid-text-secondary md:text-[11px]">
                      {agendaSomente ? "Defina data e local aqui." : "Agendamento opcional."} Confronto de ranking (individual,
                      dupla ou time): data entre agora e as próximas {CONFRONTO_AGENDAMENTO_JANELA_HORAS} horas, como nas opções de
                      reagendamento.
                      {agendaSomente ? " Para o placar após o jogo, use o Painel de controle." : ""}
                    </p>
                  ) : null}
                </form>
              </div>
            </details>
          ) : null}
          {exibirLancamentoPlacar ? (
            <DismissibleTapAwayHint className="mt-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2 text-[11px] text-eid-text-secondary">
              Se já combinaram fora do app, você pode pular o agendamento e lançar o resultado direto abaixo.
            </DismissibleTapAwayHint>
          ) : null}

          {exibirLancamentoPlacar ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55">
              <div className="flex items-center justify-between gap-2 border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Lançamento de resultado</p>
                <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-eid-action-300">
                  Placar
                </span>
              </div>
              <div className="px-3 pb-3 pt-2.5 sm:px-4 sm:pb-4">
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
                sideALabel={placarSideA.label}
                sideBLabel={placarSideB.label}
                sideAAvatarUrl={placarSideA.avatarUrl}
                sideBAvatarUrl={placarSideB.avatarUrl}
                sideAAvatarEhFormacao={placarSideA.avatarEhFormacao}
                sideBAvatarEhFormacao={placarSideB.avatarEhFormacao}
                isTorneio={Boolean(p.torneio_id)}
              />
              </div>
            </div>
          ) : null}

          {resultadoEnviadoAguardando ? (
            <p className="mt-5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/65 px-3 py-2 text-xs text-eid-text-secondary">
              Resultado enviado. Aguardando confirmação do oponente.
            </p>
          ) : null}

          {podeConfirmarOuContestar && !agendaSomente && resultadoTemPlacar ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55">
              <div className="flex items-center justify-between gap-2 border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Ação sobre resultado</p>
                <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_65%,var(--eid-primary-500)_35%)]">
                  Aprovação
                </span>
              </div>
              <div className="grid gap-2 px-3 py-3 sm:grid-cols-2 sm:px-4 sm:py-4">
              <form action={confirmarPlacarAction}>
                <input type="hidden" name="partida_id" value={id} />
                <StatusSubmitButton
                  idleLabel={resultadoContestado ? "Aceitar resultado contestado" : "Confirmar resultado"}
                  pendingLabel="Salvando..."
                  className={`${DESAFIO_FLOW_CTA_BLOCK_CLASS} disabled:opacity-60`}
                />
              </form>
              {!resultadoContestado ? <ContestarPlacarForm partidaId={id} /> : null}
              </div>
            </div>
          ) : null}
          {podeAbrirMediacao && !agendaSomente ? (
            <div className="mt-5">
              <form action={abrirMediacaoAdminAction}>
                <input type="hidden" name="partida_id" value={id} />
                <StatusSubmitButton
                  idleLabel="Abrir mediação com o admin"
                  pendingLabel="Enviando..."
                  className={`${DESAFIO_FLOW_SECONDARY_CLASS} w-full rounded-xl border-amber-500/45 bg-amber-500/14 text-[color:color-mix(in_srgb,var(--eid-fg)_55%,#f59e0b_45%)] hover:bg-amber-500/20 disabled:opacity-60`}
                />
              </form>
            </div>
          ) : null}

          {concluida ? (
            <p className="mt-5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--eid-success-500)_82%,var(--eid-fg)_18%)]">
              Partida concluída e resultado validado.
            </p>
          ) : null}
          {emAnaliseAdmin ? (
            <p className="mt-5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,#f59e0b_42%)] md:text-xs">
              Resultado em análise administrativa após contestação de ambos. O admin fará a mediação por WhatsApp.
            </p>
          ) : null}
        </div>
      </main>
  );
}
