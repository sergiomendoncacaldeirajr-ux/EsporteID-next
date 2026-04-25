import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CadastrarLocalOverlayTrigger } from "@/components/locais/cadastrar-local-overlay-trigger";
import { LocalAutocompleteInput } from "@/components/locais/local-autocomplete-input";
import { DesafioFlowCtaIcon } from "@/components/desafio/desafio-flow-cta-icon";
import { type ScoreRulesConfig } from "@/lib/desafio/score-rules";
import { DESAFIO_FLOW_CTA_BLOCK_CLASS, DESAFIO_FLOW_SECONDARY_CLASS } from "@/lib/desafio/flow-ui";
import { createClient } from "@/lib/supabase/server";
import { canLaunchTorneioScore, getTorneioStaffAccess } from "@/lib/torneios/staff";
import { confirmarPlacarAction, contestarPlacarAction, salvarAgendamentoAction, submitPlacarAction } from "./actions";

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

export default async function RegistrarPlacarPage({ params, searchParams }: Props) {
  const raw = (await params).id;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();
  const sp = (await searchParams) ?? {};
  const okMsg = typeof sp.ok === "string" ? sp.ok : null;
  const errMsg = typeof sp.erro === "string" ? sp.erro : null;
  const novoLocalId = typeof sp.novo_local_id === "string" ? Number(sp.novo_local_id) : 0;
  const modoRaw = typeof sp.modo === "string" ? sp.modo.trim() : "";
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
      "id, jogador1_id, jogador2_id, status, status_ranking, esporte_id, torneio_id, esportes(nome,desafio_modo_lancamento,desafio_regras_placar_json), placar_1, placar_2, lancado_por, mensagem, data_resultado, data_validacao, modalidade, time1_id, time2_id, data_partida, local_str"
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
  const aguardandoConfirmacao = status === "aguardando_confirmacao";
  const concluida =
    status === "concluida" || status === "concluída" || status === "concluido" || status === "validada" || status === "finalizada";
  /** Fluxo só-agenda (data/local): na Agenda. Resultado fica no Painel (comunidade). */
  const agendaSomente = modoRaw === "agenda" && !p.torneio_id;
  if (agendaSomente && status !== "agendada") {
    redirect("/comunidade#resultados-partida");
  }
  const podeLancar = p.torneio_id
    ? podeRegistrarTorneio
    : isColetivo
      ? isTeamOwner && (status === "agendada" || (aguardandoConfirmacao && p.lancado_por === user.id))
      : participant && (status === "agendada" || (aguardandoConfirmacao && p.lancado_por === user.id));
  const podeConfirmarOuContestar = !p.torneio_id && (isColetivo ? isTeamOwner : participant) && aguardandoConfirmacao && p.lancado_por !== user.id;

  const esp = Array.isArray(p.esportes) ? p.esportes[0] : p.esportes;
  const regrasPlacar = toRulesConfig((esp as { desafio_regras_placar_json?: unknown } | null)?.desafio_regras_placar_json);
  const variantes = Array.isArray(regrasPlacar.variantes) ? regrasPlacar.variantes : [];

  const voltarHref = agendaSomente ? "/agenda" : fromSafe ?? "/agenda";
  const voltarLabel = agendaSomente ? "← Voltar à agenda" : fromSafe === "/comunidade" ? "← Voltar ao painel" : "← Voltar à agenda";

  const { data: j1 } = p.jogador1_id
    ? await supabase.from("profiles").select("nome").eq("id", p.jogador1_id).maybeSingle()
    : { data: null };
  const { data: j2 } = p.jogador2_id
    ? await supabase.from("profiles").select("nome").eq("id", p.jogador2_id).maybeSingle()
    : { data: null };
  const { data: novoLocal } =
    Number.isFinite(novoLocalId) && novoLocalId > 0
      ? await supabase
          .from("espacos_genericos")
          .select("id, nome_publico, localizacao")
          .eq("id", novoLocalId)
          .maybeSingle()
      : { data: null };
  const defaultLocalStr = novoLocal
    ? `${novoLocal.nome_publico ?? "Local"}${novoLocal.localizacao ? ` — ${novoLocal.localizacao}` : ""}`
    : p.local_str ?? "";
  const returnToPath = `/registrar-placar/${id}${modoRaw === "agenda" || fromSafe ? "?" : ""}${
    modoRaw === "agenda" ? `modo=agenda${fromSafe ? `&from=${encodeURIComponent(fromSafe)}` : ""}` : fromSafe ? `from=${encodeURIComponent(fromSafe)}` : ""
  }`;
  const cadastrarLocalHref = `/locais/cadastrar?return_to=${encodeURIComponent(returnToPath)}`;

  return (
    <main className="mx-auto w-full max-w-lg px-3 py-4 sm:max-w-xl sm:px-4 sm:py-6">
        <Link href={voltarHref} className={`${DESAFIO_FLOW_SECONDARY_CLASS} max-w-fit normal-case`}>
          {voltarLabel}
        </Link>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-action-500)_32%,var(--eid-border-subtle)_68%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-action-500)_10%,var(--eid-card)_90%),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] p-4 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.28)] backdrop-blur-sm sm:mt-6 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-action-400">
            {agendaSomente ? "Agendar partida" : "Registrar resultado"}
          </p>
          <h1 className="mt-2 text-lg font-black tracking-tight text-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-fg)_96%,white_4%),color-mix(in_srgb,var(--eid-action-500)_72%,var(--eid-fg)_28%))] bg-clip-text md:text-xl">
            Partida #{id}
          </h1>
          <p className="mt-1 text-sm font-semibold text-eid-primary-300">{esp?.nome ?? "Esporte"}</p>
          <p className="mt-1 text-[11px] text-eid-text-secondary">
            Modo de placar deste esporte: {String((esp as { desafio_modo_lancamento?: string } | null)?.desafio_modo_lancamento ?? "simples")}
          </p>
          <p className="mt-2 text-xs text-eid-text-secondary">Status atual: {p.status ?? "—"}</p>
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
            <span className="text-[10px] font-black text-eid-text-secondary">VS</span>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-bold text-eid-fg md:font-black">{j2?.nome ?? "Jogador 2"}</p>
            </div>
          </div>

          {errMsg ? (
            <p className="mt-4 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">{errMsg}</p>
          ) : null}
          {okMsg ? (
            <p className="mt-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">{okMsg}</p>
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
              <p className="mt-1 text-lg font-black text-eid-fg">
                {p.placar_1 ?? "—"} x {p.placar_2 ?? "—"}
              </p>
              {p.mensagem ? <p className="mt-1 text-xs text-eid-text-secondary">{p.mensagem}</p> : null}
            </div>
          )}

          {podeLancar ? (
            <form action={salvarAgendamentoAction} className="mt-5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 p-3 sm:p-4">
              <input type="hidden" name="partida_id" value={id} />
              {agendaSomente ? <input type="hidden" name="modo_agenda" value="1" /> : null}
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Agendamento (opcional)</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Data e hora</span>
                  <input
                    type="datetime-local"
                    name="data_partida"
                    defaultValue={p.data_partida ? new Date(p.data_partida).toISOString().slice(0, 16) : ""}
                    className="eid-input-dark h-[46px] rounded-xl px-3.5 text-sm text-eid-fg"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Local</span>
                  <LocalAutocompleteInput
                    name="local_str"
                    defaultValue={defaultLocalStr}
                    placeholder="Quadra, clube, endereço..."
                    minChars={3}
                    className="eid-input-dark h-[46px] rounded-xl px-3.5 text-sm text-eid-fg"
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
              ) : (
                <p className="mt-2 text-[11px] text-eid-text-secondary">
                  Se já combinaram fora do app, você pode pular o agendamento e lançar o resultado direto abaixo.
                </p>
              )}
            </form>
          ) : null}

          {podeLancar && !agendaSomente ? (
            <form action={submitPlacarAction} className="mt-5 space-y-4">
              <input type="hidden" name="partida_id" value={id} />
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">
                    {j1?.nome ?? "Jogador 1"}
                  </span>
                  <input
                    type="number"
                    name="placar_1"
                    min={0}
                    defaultValue={p.placar_1 ?? ""}
                    required
                    className="eid-input-dark h-[46px] rounded-xl px-3.5 text-sm font-bold text-eid-fg"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">
                    {j2?.nome ?? "Jogador 2"}
                  </span>
                  <input
                    type="number"
                    name="placar_2"
                    min={0}
                    defaultValue={p.placar_2 ?? ""}
                    required
                    className="eid-input-dark h-[46px] rounded-xl px-3.5 text-sm font-bold text-eid-fg"
                  />
                </label>
              </div>
              {variantes.length > 0 ? (
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Placar alternativo</span>
                  <select
                    name="placar_variante"
                    defaultValue={String(variantes[0]?.key ?? "")}
                    className="eid-input-dark h-[46px] rounded-xl px-3.5 text-sm text-eid-fg"
                  >
                    {variantes.map((v) => (
                      <option key={String((v as { key?: unknown }).key ?? "")} value={String((v as { key?: unknown }).key ?? "")}>
                        {String((v as { label?: unknown }).label ?? (v as { key?: unknown }).key ?? "Alternativa")}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="grid gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Observação (opcional)</span>
                <textarea
                  name="observacao"
                  rows={3}
                  defaultValue={p.mensagem ?? ""}
                  placeholder="Ex.: 6/4 4/6 10/8 no tiebreak."
                  className="eid-input-dark rounded-xl px-3.5 py-2.5 text-sm text-eid-fg"
                />
              </label>
              <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 p-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-eid-fg">
                  <input type="checkbox" name="wo_ativo" value="1" className="h-4 w-4 accent-eid-action-500" />
                  Marcar vitória por W.O. (adversário não compareceu)
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card px-2 py-1.5 text-[11px] text-eid-fg">
                    <input type="radio" name="wo_vencedor" value="j1" className="mr-1.5 accent-eid-action-500" defaultChecked />
                    {j1?.nome ?? "Jogador 1"} venceu por W.O.
                  </label>
                  <label className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card px-2 py-1.5 text-[11px] text-eid-fg">
                    <input type="radio" name="wo_vencedor" value="j2" className="mr-1.5 accent-eid-action-500" />
                    {j2?.nome ?? "Jogador 2"} venceu por W.O.
                  </label>
                </div>
              </div>
              <button type="submit" className={DESAFIO_FLOW_CTA_BLOCK_CLASS}>
                <DesafioFlowCtaIcon />
                <span>{p.torneio_id ? "Salvar e validar resultado" : "Enviar resultado para confirmação"}</span>
              </button>
            </form>
          ) : null}

          {aguardandoConfirmacao && p.lancado_por === user.id && !agendaSomente ? (
            <p className="mt-5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/65 px-3 py-2 text-xs text-eid-text-secondary">
              Resultado enviado. Aguardando confirmação do oponente.
            </p>
          ) : null}

          {podeConfirmarOuContestar && !agendaSomente ? (
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

          {concluida ? (
            <p className="mt-5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">
              Partida concluída e resultado validado.
            </p>
          ) : null}
        </div>
      </main>
  );
}
