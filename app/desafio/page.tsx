import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { DesafioEnviarForm } from "@/components/desafio/desafio-enviar-form";
import { DesafioEsporteRegrasModal } from "@/components/desafio/desafio-esporte-regras-modal";
import { DesafioImpactoResumo } from "@/components/desafio/desafio-impacto-resumo";
import { SugerirMatchLiderForm } from "@/components/perfil/sugerir-match-lider-form";
import { EidCancelLink } from "@/components/ui/eid-cancel-link";
import { fetchColetivoRankingPreview, fetchIndividualRankingPreview } from "@/lib/desafio/fetch-impact-preview";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";
import { formatCooldownRemaining } from "@/lib/match/cooldown-remaining";
import { getDesafioRankLockedSetFormat, getMatchUIConfig, type MatchUIConfig } from "@/lib/match-scoring";
import { redirectUnlessMatchMaioridadeConfirmada, safeNextInternalPath } from "@/lib/match/redirect-maioridade-match";
import { computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";
import {
  DESAFIO_CHOICE_ACTION,
  DESAFIO_CHOICE_AMISTOSO,
  DESAFIO_CHOICE_RANKING,
  DESAFIO_FLOW_SECONDARY_CLASS,
  DESAFIO_PAGE_MAIN_CLASS,
} from "@/lib/desafio/flow-ui";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { isSportMatchEnabled } from "@/lib/sport-capabilities";
import { createClient } from "@/lib/supabase/server";

type Params = {
  id?: string;
  tipo?: string;
  esporte?: string;
  finalidade?: string;
  embed?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function withDesafioEmbed(href: string, isEmbed: boolean): string {
  if (!isEmbed || href.includes("embed=1")) return href;
  return `${href}${href.includes("?") ? "&" : "?"}embed=1`;
}

function exitEmbedProps(isEmbed: boolean): { target?: "_parent" } {
  return isEmbed ? { target: "_parent" } : {};
}

function resumoFormaDisputa(cfg: MatchUIConfig): string {
  if (cfg.type === "sets") {
    const melhorDe = cfg.setsToWin * 2 - 1;
    const setTxt = `Melhor de ${melhorDe} sets`;
    const gamesTxt = cfg.gamesPerSet > 0 ? `sets até ${cfg.gamesPerSet} games` : "sets";
    const tieBreakSet =
      cfg.tiebreak && cfg.gamesPerSet > 0
        ? `com tie-break em ${cfg.gamesPerSet}x${cfg.gamesPerSet} (até ${cfg.tiebreakPoints} pontos, 2 de diferença)`
        : "";
    if (cfg.finalSetSuperTiebreak) {
      return `${setTxt}; ${gamesTxt}${tieBreakSet ? `, ${tieBreakSet},` : ","} e set decisivo em super tie-break até ${cfg.finalSetTargetPoints} pontos (2 de diferença).`;
    }
    return `${setTxt}; ${gamesTxt}${tieBreakSet ? `, ${tieBreakSet}` : ""}.`;
  }
  if (cfg.type === "gols") {
    return `Disputa por gols${cfg.hasOvertime ? ", com prorrogação" : ""}${cfg.hasPenalties ? " e pênaltis se necessário" : ""}.`;
  }
  if (cfg.type === "pontos") {
    return `Disputa por pontos${cfg.pointsLimit ? ` até ${cfg.pointsLimit}` : ""}${cfg.winByTwo ? ", com vantagem mínima de 2" : ""}.`;
  }
  return `Disputa por rounds (até ${cfg.maxRounds} round${cfg.maxRounds > 1 ? "s" : ""}).`;
}

function desafioPrimeiroNome(nome: string | null | undefined, fallback: string): string {
  const parts = String(nome ?? "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  return parts[0] ?? fallback;
}

const desafioRuleIconBadgeClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,var(--eid-card)_86%)] shadow-sm ring-1 ring-[color:color-mix(in_srgb,var(--eid-primary-500)_32%,var(--eid-border-subtle)_68%)]";

/** Ícone “info” em círculo à esquerda do título “Forma de disputa”. */
function DesafioInfoRuleIcon() {
  return (
    <span className={desafioRuleIconBadgeClass}>
      <svg
        viewBox="0 0 24 24"
        className="h-[1.15rem] w-[1.15rem] shrink-0 text-eid-fg"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    </span>
  );
}

/** Ícone de lista / regras (“desafio de ranking”). */
function DesafioRankingRuleIcon() {
  return (
    <span className={desafioRuleIconBadgeClass}>
      <svg
        viewBox="0 0 24 24"
        className="h-[1.15rem] w-[1.15rem] shrink-0 text-eid-fg"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    </span>
  );
}

export default async function DesafioPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const sp = (await searchParams) ?? {};
  const isEmbed = sp.embed === "1";
  const supabase = await createClient();
  const desafioQs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string" && v.length > 0) desafioQs.set(k, v);
  }
  const desafioNext = safeNextInternalPath(desafioQs.toString() ? `/desafio?${desafioQs}` : "/desafio");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(desafioNext)}`);

  await redirectUnlessMatchMaioridadeConfirmada(supabase, user.id, desafioNext);

  const tipoRaw = (sp.tipo ?? "individual").toLowerCase();
  const modalidade: "individual" | "dupla" | "time" =
    tipoRaw === "dupla" ? "dupla" : tipoRaw === "time" ? "time" : "individual";
  const alvoKey = (sp.id ?? "").trim();
  const esporteId = Number(sp.esporte ?? "");

  if (!Number.isFinite(esporteId) || esporteId < 1) {
    if (modalidade === "dupla" || modalidade === "time") {
      const tid = Number(alvoKey);
      if (Number.isFinite(tid) && tid > 0) {
        const { data: tr } = await supabase.from("times").select("id, esporte_id, tipo").eq("id", tid).maybeSingle();
        const tt = String(tr?.tipo ?? "").trim().toLowerCase();
        if (tr && Number(tr.esporte_id) > 0 && (tt === "dupla" || tt === "time") && tt === modalidade) {
          const next = new URLSearchParams();
          for (const [k, v] of Object.entries(sp)) {
            if (typeof v === "string" && v.length > 0) next.set(k, v);
          }
          next.set("esporte", String(tr.esporte_id));
          redirect(`/desafio?${next.toString()}`);
        }
      }
    }

    if (modalidade === "individual" && UUID_RE.test(alvoKey)) {
      const { data: perfilAlvo } = await supabase.from("profiles").select("id, nome").eq("id", alvoKey).maybeSingle();
      const [{ data: esportesAlvo }, { data: esportesViewer }] = await Promise.all([
        supabase
          .from("usuario_eid")
          .select("esporte_id, esportes(nome)")
          .eq("usuario_id", alvoKey)
          .order("pontos_ranking", { ascending: false }),
        supabase.from("usuario_eid").select("esporte_id").eq("usuario_id", user.id),
      ]);
      const viewerIds = new Set(
        (esportesViewer ?? [])
          .map((r) => Number((r as { esporte_id?: number | null }).esporte_id))
          .filter((n) => Number.isFinite(n) && n > 0)
      );

      const opcoes = (esportesAlvo ?? [])
        .map((e) => ({
          esporteId: Number(e.esporte_id),
          esporteNome: (Array.isArray(e.esportes) ? e.esportes[0] : e.esportes)?.nome ?? "Esporte",
        }))
        .filter(
          (e) =>
            Number.isFinite(e.esporteId) &&
            e.esporteId > 0 &&
            isSportMatchEnabled(e.esporteNome) &&
            viewerIds.has(e.esporteId)
        );

      if (perfilAlvo && perfilAlvo.id !== user.id && opcoes.length === 1) {
        redirect(
          withDesafioEmbed(
            `/desafio?id=${encodeURIComponent(alvoKey)}&tipo=individual&esporte=${opcoes[0]!.esporteId}`,
            isEmbed
          )
        );
      }

      if (perfilAlvo && perfilAlvo.id !== user.id && opcoes.length > 0) {
        return (
            <main className={DESAFIO_PAGE_MAIN_CLASS}>
              <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
              <p className="mt-2 text-sm text-eid-text-secondary">
                Escolha o esporte do desafio — só aparecem modalidades que{" "}
                <span className="text-eid-fg">você e {desafioPrimeiroNome(perfilAlvo.nome, "o atleta")}</span> têm no perfil (o confronto
                vale sempre no mesmo esporte para os dois).
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {opcoes.map((op) => (
                  <Link
                    key={op.esporteId}
                    href={withDesafioEmbed(
                      `/desafio?id=${encodeURIComponent(alvoKey)}&tipo=individual&esporte=${op.esporteId}`,
                      isEmbed
                    )}
                    className={DESAFIO_CHOICE_ACTION}
                  >
                    {op.esporteNome}
                  </Link>
                ))}
              </div>
              <Link
                href={`/perfil/${encodeURIComponent(alvoKey)}?from=/match`}
                {...exitEmbedProps(isEmbed)}
                className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-4`}
              >
                Voltar ao perfil
              </Link>
            </main>
        );
      }

      if (perfilAlvo && perfilAlvo.id !== user.id && opcoes.length === 0) {
        return (
          <main className={DESAFIO_PAGE_MAIN_CLASS}>
            <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
            <p className="mt-2 text-sm text-eid-text-secondary">
              Não há esporte em comum (com match ativo) entre você e{" "}
              <span className="text-eid-fg">{desafioPrimeiroNome(perfilAlvo.nome, "este atleta")}</span> no perfil. Adicionem o mesmo
              esporte para desafiar um ao outro.
            </p>
            <Link
              href={`/perfil/${encodeURIComponent(alvoKey)}?from=/match`}
              {...exitEmbedProps(isEmbed)}
              className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-4`}
            >
              Voltar ao perfil
            </Link>
          </main>
        );
      }
    }

    return (
      <main className={DESAFIO_PAGE_MAIN_CLASS}>
          <h1 className="text-2xl font-bold tracking-tight text-eid-fg">Solicitar desafio</h1>
          <p className="mt-2 text-sm text-eid-text-secondary">
            Defina o esporte do desafio (no radar, use um esporte específico — não &quot;Todos&quot;) ou abra o desafio a
            partir do perfil da dupla/time, que já traz o esporte certo.
          </p>
          <Link href="/match" {...exitEmbedProps(isEmbed)} className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-4`}>
            Voltar ao radar
          </Link>
        </main>
    );
  }

  const { data: esporteRow } = await supabase
    .from("esportes")
    .select("id, nome, desafio_regras_placar_json")
    .eq("id", esporteId)
    .maybeSingle();
  if (!esporteRow || !isSportMatchEnabled(esporteRow.nome)) {
    return (
      <main className={DESAFIO_PAGE_MAIN_CLASS}>
        <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
        <p className="mt-2 text-sm text-eid-text-secondary">Este esporte não aceita desafio/ranking no momento.</p>
        <Link href="/match" {...exitEmbedProps(isEmbed)} className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-4`}>
          Voltar ao radar
        </Link>
      </main>
    );
  }
  const esporteNome = esporteRow?.nome ?? `Esporte #${esporteId}`;
  const baseMatchCfg = getMatchUIConfig({
    sport: { name: esporteNome, scoring_type: "sets" },
    format: {},
  });
  const desafioLockedCfg = getDesafioRankLockedSetFormat({
    baseConfig: baseMatchCfg,
    sportName: esporteNome,
    rules: (esporteRow as { desafio_regras_placar_json?: unknown } | null)?.desafio_regras_placar_json ?? {},
  });
  const formaDisputaResumo = resumoFormaDisputa(desafioLockedCfg?.config ?? baseMatchCfg);

  if (modalidade === "individual") {
    if (!UUID_RE.test(alvoKey)) {
      return (
        <main className={DESAFIO_PAGE_MAIN_CLASS}>
            <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
            <p className="mt-2 text-sm text-red-200">Identificador do atleta inválido.</p>
            <Link href="/match" {...exitEmbedProps(isEmbed)} className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-4`}>
              Voltar ao radar
            </Link>
          </main>
      );
    }

    const { data: perfil } = await supabase
      .from("profiles")
      .select("id, nome, avatar_url, disponivel_amistoso, disponivel_amistoso_ate")
      .eq("id", alvoKey)
      .maybeSingle();
    if (!perfil || perfil.id === user.id) {
      return (
        <main className={DESAFIO_PAGE_MAIN_CLASS}>
            <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
            <p className="mt-2 text-sm text-eid-text-secondary">Atleta não encontrado ou inválido para desafio.</p>
            <Link href="/match" {...exitEmbedProps(isEmbed)} className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-4`}>
              Voltar ao radar
            </Link>
          </main>
      );
    }

    const { data: eidAlinhamento } = await supabase
      .from("usuario_eid")
      .select("usuario_id")
      .in("usuario_id", [user.id, perfil.id])
      .eq("esporte_id", esporteId);
    const temViewer = (eidAlinhamento ?? []).some((r) => String((r as { usuario_id?: string }).usuario_id) === user.id);
    const temAlvo = (eidAlinhamento ?? []).some((r) => String((r as { usuario_id?: string }).usuario_id) === perfil.id);
    if (!temViewer) {
      return (
        <main className={DESAFIO_PAGE_MAIN_CLASS}>
          <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
          <p className="mt-2 text-sm text-eid-text-secondary">
            Você não tem <span className="font-semibold text-eid-fg">{esporteNome}</span> no perfil. O desafio precisa ser
            no mesmo esporte para os dois — adicione o esporte ou escolha outro oponente/esporte.
          </p>
          <Link href="/match" {...exitEmbedProps(isEmbed)} className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-4`}>
            Voltar ao radar
          </Link>
        </main>
      );
    }
    if (!temAlvo) {
      return (
        <main className={DESAFIO_PAGE_MAIN_CLASS}>
          <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
          <p className="mt-2 text-sm text-eid-text-secondary">
            <span className="text-eid-fg">{desafioPrimeiroNome(perfil.nome, "Este atleta")}</span> não tem{" "}
            <span className="font-semibold text-eid-fg">{esporteNome}</span> no perfil. Escolha um esporte que vocês dois
            jogam.
          </p>
          <Link
            href={withDesafioEmbed(`/desafio?id=${encodeURIComponent(alvoKey)}&tipo=individual`, isEmbed)}
            className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-4 inline-block`}
          >
            Escolher esporte em comum
          </Link>
          <Link href="/match" {...exitEmbedProps(isEmbed)} className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-2 block`}>
            Voltar ao radar
          </Link>
        </main>
      );
    }

    const finRaw = String(sp.finalidade ?? "").trim().toLowerCase();
    const finalidadeEscolhida: "ranking" | "amistoso" | null =
      finRaw === "amistoso" ? "amistoso" : finRaw === "ranking" ? "ranking" : null;
    const cooldownMeses = await getMatchRankCooldownMeses(supabase);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - cooldownMeses);
    const cutoffMs = cutoff.getTime();
    let rankingBlockedUntil: string | null = null;
    const { data: cooldownRows } = await supabase
      .from("partidas")
      .select("status, status_ranking, data_resultado, data_partida, data_registro")
      .eq("esporte_id", esporteId)
      .is("torneio_id", null)
      .or(`and(jogador1_id.eq.${user.id},jogador2_id.eq.${perfil.id}),and(jogador1_id.eq.${perfil.id},jogador2_id.eq.${user.id})`)
      .order("id", { ascending: false })
      .limit(80);
    for (const r of cooldownRows ?? []) {
      const st = String((r as { status?: string | null }).status ?? "").trim().toLowerCase();
      const sr = String((r as { status_ranking?: string | null }).status_ranking ?? "").trim().toLowerCase();
      const valido =
        sr === "validado" ||
        ["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(st);
      if (!valido) continue;
      const dtRaw =
        (r as { data_resultado?: string | null }).data_resultado ??
        (r as { data_partida?: string | null }).data_partida ??
        (r as { data_registro?: string | null }).data_registro ??
        null;
      if (!dtRaw) continue;
      const base = new Date(dtRaw);
      if (Number.isNaN(base.getTime()) || base.getTime() < cutoffMs) continue;
      const until = new Date(base);
      until.setMonth(until.getMonth() + cooldownMeses);
      if (until.getTime() > Date.now()) {
        rankingBlockedUntil = until.toISOString();
        break;
      }
    }

    if (!finalidadeEscolhida) {
      const { data: viewerProf } = await supabase
        .from("profiles")
        .select("disponivel_amistoso, disponivel_amistoso_ate")
        .eq("id", user.id)
        .maybeSingle();
      const viewerAm = computeDisponivelAmistosoEffective(
        viewerProf?.disponivel_amistoso,
        viewerProf?.disponivel_amistoso_ate
      );
      const alvoAm = computeDisponivelAmistosoEffective(perfil.disponivel_amistoso, perfil.disponivel_amistoso_ate);
      const amistosoPermitido = viewerAm && alvoAm;
      const baseQs = `id=${encodeURIComponent(alvoKey)}&tipo=individual&esporte=${esporteId}`;

      return (
        <main className={DESAFIO_PAGE_MAIN_CLASS}>
            <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
            <p className="mt-2 text-sm text-eid-text-secondary">
              <span className="text-eid-fg">{desafioPrimeiroNome(perfil.nome, "Atleta")}</span> · {esporteNome} (individual). Escolha o tipo de confronto.
            </p>
            <div className="mt-3 rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 px-3 py-2 text-[11px] leading-relaxed text-eid-text-secondary">
              Forma de disputa deste esporte: <span className="font-semibold text-eid-fg">{formaDisputaResumo}</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {!rankingBlockedUntil ? (
                <Link
                  href={withDesafioEmbed(`/desafio?${baseQs}&finalidade=ranking`, isEmbed)}
                  className={`${DESAFIO_CHOICE_RANKING} block text-left`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-eid-primary-200">Desafio de ranking</p>
                  <p className="mt-2 text-sm font-semibold text-eid-fg">Vale pontos no ranking</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">
                    Após aceito, use a agenda para agendar e o lançador de resultado. Novo desafio de ranking com a mesma pessoa neste esporte só após{" "}
                    <span className="font-semibold text-eid-fg">{cooldownMeses}</span> meses do último confronto válido.
                  </p>
                </Link>
              ) : (
                <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4 opacity-80">
                  <p className="text-xs font-bold uppercase tracking-wide text-eid-text-secondary">Desafio de ranking</p>
                  <p className="mt-2 text-sm font-semibold text-eid-text-secondary">Bloqueado por carência</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">
                    Este confronto volta a liberar em{" "}
                    <span className="font-semibold text-eid-fg">{new Date(rankingBlockedUntil).toLocaleDateString("pt-BR")}</span>.
                  </p>
                </div>
              )}

              {amistosoPermitido ? (
                <Link
                  href={withDesafioEmbed(`/desafio?${baseQs}&finalidade=amistoso`, isEmbed)}
                  className={`${DESAFIO_CHOICE_AMISTOSO} block text-left`}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-200">Desafio amistoso</p>
                  <p className="mt-2 text-sm font-semibold text-eid-fg">Sem pontos · combinar no WhatsApp</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">
                    Não há carência de meses entre pedidos amistosos com a mesma pessoa: você pode solicitar de novo quando quiser. Não abre fluxo de agenda nem placar de ranking. Para pontos e agendamento oficial, use{" "}
                    <span className="font-semibold text-eid-fg">desafio de ranking</span>.
                  </p>
                </Link>
              ) : (
                <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4 opacity-70">
                  <p className="text-xs font-bold uppercase tracking-wide text-eid-text-secondary">Desafio amistoso</p>
                  <p className="mt-2 text-sm font-semibold text-eid-text-secondary">Indisponível</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">
                    Você e o oponente precisam estar com o <span className="font-semibold">modo amistoso</span> ligado no perfil (janela ativa).
                  </p>
                </div>
              )}
            </div>

            <Link
              href={`/perfil/${encodeURIComponent(alvoKey)}`}
              {...exitEmbedProps(isEmbed)}
              className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-6`}
            >
              Voltar ao perfil
            </Link>
          </main>
      );
    }

    const rankPrevInd =
      finalidadeEscolhida === "ranking" && !rankingBlockedUntil
        ? await fetchIndividualRankingPreview(supabase, {
            viewerId: user.id,
            opponentId: perfil.id,
            esporteId,
          })
        : null;

    return (
      <main className={DESAFIO_PAGE_MAIN_CLASS}>
          <h1 className="text-2xl font-bold tracking-tight text-eid-fg">Solicitar desafio</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-eid-text-secondary">
            Confirme o pedido no esporte{" "}
            <span className="inline-flex items-center gap-1 text-eid-fg">
              <SportGlyphIcon sportName={esporteNome} />
              <span>{esporteNome}</span>
            </span>{" "}
            ·{" "}
            <span className="inline-flex items-center gap-1 text-eid-fg">
              <ModalidadeGlyphIcon modalidade="individual" />
              <span>individual</span>
            </span>{" "}
            ·{" "}
            <span className="font-semibold text-eid-fg">
              {finalidadeEscolhida === "amistoso" ? "Desafio amistoso" : "Desafio de ranking"}
            </span>
            .
          </p>
          <div className="mt-5 flex flex-col gap-3">
          <div className="rounded-2xl border border-eid-primary-500/18 bg-eid-primary-500/8 px-3 py-2.5 text-[12px] leading-relaxed text-eid-text-secondary">
            <p className="inline-flex items-center gap-2.5 text-[11px] font-black uppercase tracking-[0.04em] text-eid-primary-300">
              <DesafioInfoRuleIcon />
              Forma de disputa deste esporte
            </p>
            <p className="mt-1"><span className="font-semibold text-eid-fg">{formaDisputaResumo}</span></p>
          </div>
          {finalidadeEscolhida === "amistoso" ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] leading-relaxed text-eid-text-secondary">
              Este pedido <span className="font-semibold text-emerald-200">não soma pontos</span> e não usa agenda de ranking. O WhatsApp será liberado após aceite, para vocês combinarem. Para confronto que valha ranking, agenda e resultado, volte ao perfil e escolha{" "}
              <span className="font-semibold text-eid-fg">desafio de ranking</span>.
            </div>
          ) : rankingBlockedUntil ? (
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2 text-[11px] leading-relaxed text-eid-text-secondary">
              Carência ativa para desafio de ranking neste esporte até{" "}
              <span className="font-semibold text-eid-fg">{new Date(rankingBlockedUntil).toLocaleDateString("pt-BR")}</span>.
            </div>
          ) : (
            <div className="rounded-2xl border border-eid-primary-500/18 bg-eid-primary-500/8 px-3 py-2.5 text-[12px] leading-relaxed text-eid-text-secondary">
              <p className="inline-flex items-center gap-2.5 text-[11px] font-black uppercase tracking-[0.04em] text-eid-primary-300">
                <DesafioRankingRuleIcon />
                Desafio de ranking
              </p>
              <p className="mt-1">
                Após aceito, use a <span className="font-semibold text-eid-fg">agenda</span> e o lançamento de resultado para atualizar o ranking.
              </p>
            </div>
          )}
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-eid-primary-500/30 bg-eid-surface">
                {perfil.avatar_url ? (
                  <Image src={perfil.avatar_url} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-base font-black text-eid-primary-300">
                    {desafioPrimeiroNome(perfil.nome, "A").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-eid-fg">{desafioPrimeiroNome(perfil.nome, "Atleta")}</p>
                <p className="mt-1 inline-flex flex-wrap items-center gap-1 text-xs text-eid-text-secondary">
                  <span>Modalidade:</span>
                  <ModalidadeGlyphIcon modalidade="individual" />
                  <span>individual</span>
                </p>
              </div>
            </div>
          </div>
          {finalidadeEscolhida === "ranking" && rankPrevInd ? (
            <DesafioImpactoResumo
              esporteNome={esporteNome}
              regras={rankPrevInd.regras}
              individual={rankPrevInd.perspective}
              className="!mt-0"
            />
          ) : null}
          {!rankingBlockedUntil || finalidadeEscolhida !== "ranking" ? (
            <DesafioEnviarForm
              modalidade="individual"
              esporteId={esporteId}
              alvoUsuarioId={perfil.id}
              finalidade={finalidadeEscolhida}
              className="!mt-0"
            />
          ) : null}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Link
              href={withDesafioEmbed(
                `/desafio?id=${encodeURIComponent(alvoKey)}&tipo=individual&esporte=${esporteId}`,
                isEmbed
              )}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-3 text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg"
            >
              Trocar tipo de desafio
            </Link>
            <EidCancelLink href="/match" {...exitEmbedProps(isEmbed)} className="!min-h-[44px] !rounded-xl !text-[11px] !font-black !tracking-[0.04em]" />
          </div>
          </div>
          {finalidadeEscolhida === "ranking" && rankPrevInd ? (
            <DesafioEsporteRegrasModal
              esporteId={esporteId}
              esporteNome={esporteNome}
              modalidade="individual"
              pontosVitoria={rankPrevInd.regras.pontos_vitoria}
              pontosDerrota={rankPrevInd.regras.pontos_derrota}
            />
          ) : null}
        </main>
    );
  }

  const timeId = Number(alvoKey);
  if (!Number.isFinite(timeId) || timeId < 1) {
    return (
      <main className={DESAFIO_PAGE_MAIN_CLASS}>
          <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
          <p className="mt-2 text-sm text-red-200">Identificador da formação inválido.</p>
          <Link href="/match" {...exitEmbedProps(isEmbed)} className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-4`}>
            Voltar ao radar
          </Link>
        </main>
    );
  }

  const { data: timeRow } = await supabase
    .from("times")
    .select("id, nome, tipo, esporte_id, criador_id, eid_time, escudo")
    .eq("id", timeId)
    .maybeSingle();

  const tipoFormacao = String(timeRow?.tipo ?? "")
    .trim()
    .toLowerCase();
  if (!timeRow || (tipoFormacao !== "dupla" && tipoFormacao !== "time") || tipoFormacao !== modalidade) {
    return (
      <main className={DESAFIO_PAGE_MAIN_CLASS}>
          <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
          <p className="mt-2 text-sm text-eid-text-secondary">Formação não encontrada ou modalidade diferente do link.</p>
          <Link href="/match" {...exitEmbedProps(isEmbed)} className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-4`}>
            Voltar ao radar
          </Link>
        </main>
    );
  }

  if (Number(timeRow.esporte_id) !== esporteId) {
    return (
      <main className={DESAFIO_PAGE_MAIN_CLASS}>
          <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
          <p className="mt-2 text-sm text-eid-text-secondary">
            Só é possível desafiar uma dupla ou time no <span className="font-semibold text-eid-fg">mesmo esporte</span>{" "}
            da formação deles. O link ou filtro do radar está com outro esporte — use o esporte desta formação ou volte ao
            radar com o filtro correto.
          </p>
          <Link href="/match" {...exitEmbedProps(isEmbed)} className={`${DESAFIO_FLOW_SECONDARY_CLASS} mt-4`}>
            Voltar ao radar
          </Link>
        </main>
    );
  }

  const cooldownMesesColetivo = await getMatchRankCooldownMeses(supabase);
  const cutoffColetivo = new Date();
  cutoffColetivo.setMonth(cutoffColetivo.getMonth() - cooldownMesesColetivo);
  const cutoffColetivoMs = cutoffColetivo.getTime();
  let rankingBlockedUntilColetivo: string | null = null;
  const { data: cooldownRowsColetivo } = await supabase
    .from("partidas")
    .select("status, status_ranking, data_resultado, data_partida, data_registro")
    .eq("esporte_id", esporteId)
    .is("torneio_id", null)
    .eq("modalidade", modalidade)
    .or(
      `and(jogador1_id.eq.${user.id},jogador2_id.eq.${timeRow.criador_id}),and(jogador1_id.eq.${timeRow.criador_id},jogador2_id.eq.${user.id}),and(desafiante_id.eq.${user.id},desafiado_id.eq.${timeRow.criador_id}),and(desafiante_id.eq.${timeRow.criador_id},desafiado_id.eq.${user.id})`
    )
    .order("id", { ascending: false })
    .limit(80);
  for (const r of cooldownRowsColetivo ?? []) {
    const st = String((r as { status?: string | null }).status ?? "").trim().toLowerCase();
    const sr = String((r as { status_ranking?: string | null }).status_ranking ?? "").trim().toLowerCase();
    const valido =
      sr === "validado" ||
      ["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(st);
    if (!valido) continue;
    const dtRaw =
      (r as { data_resultado?: string | null }).data_resultado ??
      (r as { data_partida?: string | null }).data_partida ??
      (r as { data_registro?: string | null }).data_registro ??
      null;
    if (!dtRaw) continue;
    const base = new Date(dtRaw);
    if (Number.isNaN(base.getTime()) || base.getTime() < cutoffColetivoMs) continue;
    const until = new Date(base);
    until.setMonth(until.getMonth() + cooldownMesesColetivo);
    if (until.getTime() > Date.now()) {
      rankingBlockedUntilColetivo = until.toISOString();
      break;
    }
  }

  const rankPrevCo = await fetchColetivoRankingPreview(supabase, {
    viewerUserId: user.id,
    opponentTeamId: timeRow.id,
    esporteId,
    modalidade: modalidade as "dupla" | "time",
  });
  const [{ data: minhasLideradas }, { data: minhasMembroRows }] = await Promise.all([
    supabase
      .from("times")
      .select("id")
      .eq("criador_id", user.id)
      .eq("esporte_id", esporteId)
      .eq("tipo", modalidade)
      .limit(1),
    supabase
      .from("membros_time")
      .select("time_id, times!inner(id, nome, criador_id, tipo, esporte_id)")
      .eq("usuario_id", user.id)
      .in("status", ["ativo", "aceito", "aprovado"]),
  ]);
  const canConfirmarRanking = (minhasLideradas ?? []).length > 0;
  const formacoesMembroNaoLider = (minhasMembroRows ?? [])
    .map((row) => {
      const rel = Array.isArray((row as { times?: unknown }).times)
        ? (row as { times?: Array<{ id?: number | null; nome?: string | null; criador_id?: string | null; tipo?: string | null; esporte_id?: number | null }> }).times?.[0]
        : (row as { times?: { id?: number | null; nome?: string | null; criador_id?: string | null; tipo?: string | null; esporte_id?: number | null } }).times;
      return rel ?? null;
    })
    .filter((t): t is { id: number; nome: string | null; criador_id: string | null; tipo: string | null; esporte_id: number | null } => Boolean(t && Number.isFinite(Number(t.id))))
    .filter((t) => String(t.criador_id ?? "") !== user.id)
    .filter((t) => String(t.tipo ?? "").trim().toLowerCase() === modalidade)
    .filter((t) => Number(t.esporte_id ?? 0) === esporteId)
    .map((t) => ({
      id: Number(t.id),
      nome: desafioPrimeiroNome(t.nome, "Minha formação"),
    }));
  const podeSugerirParaLider = !canConfirmarRanking && formacoesMembroNaoLider.length > 0;

  return (
    <main className={DESAFIO_PAGE_MAIN_CLASS}>
          <h1 className="text-2xl font-bold tracking-tight text-eid-fg">Solicitar desafio</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-eid-text-secondary">
          Confirme o pedido no esporte{" "}
          <span className="inline-flex items-center gap-1 text-eid-fg">
            <SportGlyphIcon sportName={esporteNome} />
            <span>{esporteNome}</span>
          </span>{" "}
          ·{" "}
          <span className="inline-flex items-center gap-1 text-eid-fg">
            <ModalidadeGlyphIcon modalidade={modalidade === "dupla" ? "dupla" : "time"} />
            <span>{modalidade === "dupla" ? "dupla" : "time"}</span>
          </span>
          .
        </p>
        <div className="mt-5 flex flex-col gap-3">
        <div className="rounded-2xl border border-eid-primary-500/18 bg-eid-primary-500/8 px-3 py-2.5 text-[12px] leading-relaxed text-eid-text-secondary">
          <p className="inline-flex items-center gap-2.5 text-[11px] font-black uppercase tracking-[0.04em] text-eid-primary-300">
            <DesafioInfoRuleIcon />
            Forma de disputa deste esporte
          </p>
          <p className="mt-1"><span className="font-semibold text-eid-fg">{formaDisputaResumo}</span></p>
        </div>
        {rankingBlockedUntilColetivo ? (
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2 text-[11px] leading-relaxed text-eid-text-secondary">
            Carência ativa para desafio de ranking neste esporte ({modalidade}) até{" "}
            <span className="font-semibold text-eid-fg">
              {new Date(rankingBlockedUntilColetivo).toLocaleDateString("pt-BR")}
            </span>
            .{" "}
            <span className="font-semibold text-eid-fg">{formatCooldownRemaining(rankingBlockedUntilColetivo)}</span>
          </div>
        ) : null}
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-eid-primary-500/30 bg-eid-surface">
              {timeRow.escudo ? (
                <Image src={timeRow.escudo} alt="" fill unoptimized className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-base font-black text-eid-primary-300">
                  {desafioPrimeiroNome(timeRow.nome, "F").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-eid-fg">{desafioPrimeiroNome(timeRow.nome, "Formação")}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-eid-text-secondary">
                <span>Modalidade:</span>
                <ModalidadeGlyphIcon modalidade={modalidade === "dupla" ? "dupla" : "time"} />
                <span>{modalidade}</span>
              </p>
            </div>
            <div className="shrink-0">
              <ProfileEidPerformanceSeal notaEid={Number(timeRow.eid_time ?? 0)} compact />
            </div>
          </div>
        </div>
        {rankPrevCo ? (
          <DesafioImpactoResumo
            esporteNome={esporteNome}
            regras={rankPrevCo.regras}
            coletivo={rankPrevCo.coletivo}
            className="!mt-0"
          />
        ) : (
          <p className="text-[11px] text-amber-200/90">
            Não foi possível carregar a estimativa: confira se você é líder de uma {modalidade} neste esporte (mesmo critério do envio do pedido).
          </p>
        )}
        {canConfirmarRanking && !rankingBlockedUntilColetivo ? (
          <DesafioEnviarForm
            modalidade={modalidade}
            esporteId={esporteId}
            alvoTimeId={timeRow.id}
            finalidade="ranking"
            className="!mt-0"
          />
        ) : null}
        {!canConfirmarRanking ? (
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2 text-[11px] leading-relaxed text-eid-text-secondary">
            Você não é líder de uma {modalidade} neste esporte. O desafio de ranking direto fica disponível apenas para o dono da formação.
          </div>
        ) : null}
        {podeSugerirParaLider ? (
            <SugerirMatchLiderForm
              alvoTimeId={timeRow.id}
              alvoNome={desafioPrimeiroNome(timeRow.nome, "Formação")}
              modalidadeLabel={modalidade === "dupla" ? "dupla" : "equipe"}
              formacoesMinhas={formacoesMembroNaoLider}
            />
        ) : null}
        <EidCancelLink href="/match" {...exitEmbedProps(isEmbed)} className="!mt-0 !min-h-[44px] !rounded-xl !text-[11px] !font-black !tracking-[0.04em]" />
        </div>
        {rankPrevCo ? (
          <DesafioEsporteRegrasModal
            esporteId={esporteId}
            esporteNome={esporteNome}
            modalidade={modalidade}
            pontosVitoria={rankPrevCo.regras.pontos_vitoria}
            pontosDerrota={rankPrevCo.regras.pontos_derrota}
          />
        ) : null}
      </main>
  );
}
