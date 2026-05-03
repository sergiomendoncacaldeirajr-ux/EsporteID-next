import Link from "next/link";
import { EidBadge } from "@/components/eid/eid-badge";
import { ProfileCompactTimeline } from "@/components/perfil/profile-history-widgets";
import { ProfilePrimaryCta, ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { ProfileSportsMetricsCard } from "@/components/perfil/profile-sports-metrics-card";
import { ProfileMemberCard } from "@/components/perfil/profile-team-members-cards";
import { SugerirMatchLiderForm } from "@/components/perfil/sugerir-match-lider-form";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileFormacaoResultados } from "@/components/perfil/profile-formacao-resultados";
import { PROFILE_CARD_BASE } from "@/components/perfil/profile-ui-tokens";
import {
  MSG_CONFRONTO_REQUER_ESPORTE_NO_PERFIL_VIEWER,
} from "@/lib/match/viewer-esporte-confronto";
import { formatCooldownRemaining } from "@/lib/match/cooldown-remaining";
import { TeamPublicInviteBlock } from "@/components/times/team-public-invite-block";
import { FormacaoCandidaturaCta } from "@/components/times/formacao-candidatura-cta";
import { FormacaoElencoCallout } from "@/components/times/formacao-elenco-callout";
import { PerfilTimeMembroLiderAcoes } from "@/components/times/perfil-time-membro-lider-acoes";
import { BarChart3, ChevronRight } from "lucide-react";
import { getPerfilTimePayload } from "./perfil-time-payload";

export type PerfilTimeBodyBlockProps = {
  timeId: number;
  viewerId: string;
  removerMembroAction: (formData: FormData) => Promise<void>;
};

export async function PerfilTimeBodyBlock({ timeId, viewerId, removerMembroAction }: PerfilTimeBodyBlockProps) {
  const p = await getPerfilTimePayload(timeId, viewerId);
  const {
    id,
    t,
    posicao,
    hist,
    eidLogs,
    membros,
    minhaCandidaturaPendente,
    modalidade,
    vagasDisponiveis,
    esp,
    canChallenge,
    isMember,
    isLeader,
    viewerPodeConfrontarNesteEsporte,
    formacoesMembroNaoLider,
    canSugerirMatch,
    linkWpp,
    hasAceitoRank,
    rankingBlockedUntilTime,
    temBlocoAcaoVisitante,
    mostrarAvisoSemEidNoEsporte,
    fromPublic,
    editarTimeHref,
    idsExcluirConvite,
    convitesPendentesPublic,
    bundleResultados,
  } = p;

  return (
    <>
      {!isLeader ? (
        <FormacaoElencoCallout>
          <FormacaoCandidaturaCta
            timeId={id}
            vagasAbertas={Boolean(t.vagas_abertas)}
            aceitaPedidos={Boolean(t.aceita_pedidos)}
            vagasDisponiveis={vagasDisponiveis}
            minhaCandidaturaPendenteId={minhaCandidaturaPendente?.id ?? null}
            jaSouMembro={isMember}
            textAlign="start"
          />
        </FormacaoElencoCallout>
      ) : null}

      <div className="mt-6 grid gap-6">
        {!isLeader ? (
          <section className="overflow-hidden rounded-xl border border-transparent bg-eid-card/55 p-3">
            <h2 className="sr-only">Ação principal</h2>
            <div className="mb-2 flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Ação principal</p>
              <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
                Desafio
              </span>
            </div>
            {mostrarAvisoSemEidNoEsporte ? (
              <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-eid-text-secondary">
                {MSG_CONFRONTO_REQUER_ESPORTE_NO_PERFIL_VIEWER}{" "}
                <Link href="/conta/esportes-eid" className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline">
                  Abrir Esportes e EID
                </Link>
                .
              </p>
            ) : null}
            {temBlocoAcaoVisitante ? (
              <div className="grid gap-3">
                {linkWpp ? (
                  <a
                    href={linkWpp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-[13px] font-black uppercase tracking-[0.1em] text-white shadow-[0_0_18px_rgba(37,211,102,0.45)] transition hover:bg-[#1da851]"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.534 5.853L.054 23.25a.75.75 0 0 0 .916.916l5.396-1.479A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.986 0-3.84-.552-5.418-1.51l-.388-.232-4.021 1.1 1.1-4.022-.232-.388A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                    </svg>
                    Chamar no WhatsApp (líder)
                  </a>
                ) : null}
                {canChallenge &&
                viewerPodeConfrontarNesteEsporte &&
                !hasAceitoRank &&
                t.esporte_id &&
                !rankingBlockedUntilTime ? (
                  <ProfilePrimaryCta
                    href={`/desafio?id=${id}&tipo=${encodeURIComponent(modalidade)}&esporte=${t.esporte_id}`}
                    label={linkWpp ? "⚡ Desafio no ranking" : undefined}
                  />
                ) : null}
                {canChallenge &&
                viewerPodeConfrontarNesteEsporte &&
                !hasAceitoRank &&
                rankingBlockedUntilTime ? (
                  <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2 text-[11px] text-eid-text-secondary">
                    Carência ativa para novo desafio de ranking nesta formação até{" "}
                    <span className="font-semibold text-eid-fg">
                      {new Date(rankingBlockedUntilTime).toLocaleDateString("pt-BR")}
                    </span>
                    .{" "}
                    <span className="font-semibold text-eid-fg">{formatCooldownRemaining(rankingBlockedUntilTime)}</span>
                  </p>
                ) : null}
              </div>
            ) : canChallenge && hasAceitoRank ? (
              <p className="text-xs text-eid-text-secondary">
                Desafio aceito nesta modalidade. Registre o resultado na agenda quando jogarem.
              </p>
            ) : (
              <p className="text-xs text-eid-text-secondary">
                Para desafiar direto, você precisa ser líder de uma {modalidade} neste esporte — ou use a sugestão abaixo
                se você já faz parte de uma formação.
              </p>
            )}
            {canSugerirMatch && viewerPodeConfrontarNesteEsporte ? (
              <div className="mt-3">
                <SugerirMatchLiderForm
                  alvoTimeId={id}
                  alvoNome={t.nome ?? "Formação"}
                  modalidadeLabel={modalidade === "dupla" ? "dupla" : "equipe"}
                  formacoesMinhas={formacoesMembroNaoLider}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        <ProfileSection
          title="EID e estatísticas"
          info="Nota e métricas do time neste esporte: ranking, jogos e desempenho coletivo."
        >
          <div className={`${PROFILE_CARD_BASE} mt-2 overflow-hidden p-3 sm:rounded-2xl sm:p-4`}>
            <p className="text-[11px] font-semibold leading-snug sm:text-[12px]">
              <span className="text-eid-text-secondary">Esporte: </span>
              <span className="font-bold text-eid-primary-300">{esp?.nome ?? "Esporte não definido"}</span>
            </p>
            <div className="mt-2">
              <div className="flex justify-center">
                <EidBadge
                  score={Number(t.eid_time ?? 0)}
                  history={eidLogs ?? []}
                  label={`EID · ${(esp?.nome ?? "Esporte").toUpperCase()}`}
                  className="px-3 py-1.5 text-[11px] shadow-[0_8px_20px_-14px_rgba(249,115,22,0.45)]"
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[color:var(--eid-border-subtle)] pt-3">
                <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-2.5 text-center shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
                  <p className="text-base font-bold tabular-nums text-eid-action-500 sm:text-lg">{Number(t.eid_time ?? 0).toFixed(1)}</p>
                  <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Nota EID</p>
                </div>
                <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-2.5 text-center shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
                  <p className="text-base font-bold tabular-nums text-eid-fg sm:text-lg">{t.pontos_ranking ?? 0}</p>
                  <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Pontos</p>
                </div>
                <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-2.5 text-center shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
                  <p className="text-base font-bold tabular-nums text-eid-primary-300 sm:text-lg">#{posicao}</p>
                  <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Posição</p>
                </div>
              </div>
              {t.esporte_id ? (
                <ProfileEditDrawerTrigger
                  href={`/perfil-time/${id}/eid/${t.esporte_id}?from=${encodeURIComponent(fromPublic)}`}
                  title={`Estatísticas · ${esp?.nome ?? "Esporte"}`}
                  fullscreen
                  topMode="backOnly"
                  className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-eid-action-500/45 bg-eid-action-500/10 px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-eid-action-400 transition hover:border-eid-action-500/70 hover:bg-eid-action-500/15"
                >
                  <BarChart3 className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
                  <span className="min-w-0 flex-1 text-center leading-tight">
                    Estatísticas completas · {(esp?.nome ?? "este esporte").toUpperCase()}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-85" strokeWidth={2.5} aria-hidden />
                </ProfileEditDrawerTrigger>
              ) : null}
              <ProfileSportsMetricsCard
                sportName={esp?.nome ?? "Esporte"}
                eidValue={Number(t.eid_time ?? 0)}
                rankValue={Number(t.pontos_ranking ?? 0)}
                trendLabel="Evolução EID"
                trendPoints={
                  (hist ?? []).length >= 3
                    ? ([
                        Number((hist ?? [])[2]?.nota_nova ?? t.eid_time ?? 0),
                        Number((hist ?? [])[1]?.nota_nova ?? t.eid_time ?? 0),
                        Number((hist ?? [])[0]?.nota_nova ?? t.eid_time ?? 0),
                      ] as [number, number, number])
                    : [Number(t.eid_time ?? 0), Number(t.eid_time ?? 0), Number(t.eid_time ?? 0)]
                }
                showScoreTiles={false}
              />
            </div>
          </div>
          <ProfileCompactTimeline
            title="Histórico de notas EID"
            emptyText="Sem histórico recente de EID."
            items={[...(hist ?? [])]
              .reverse()
              .map((h, i) => ({
                id: `${h.data_alteracao ?? "sem-data"}-${i}`,
                label: `${Number(h.nota_nova).toFixed(1)} ${h.data_alteracao ? new Date(h.data_alteracao).toLocaleDateString("pt-BR") : ""}`.trim(),
                tone: "neutral" as const,
              }))}
          />
        </ProfileSection>

        <ProfileSection
          title="Histórico de confrontos"
          info="Mesmo padrão do perfil de atleta: totais de vitórias/derrotas/empates e lista dos confrontos da formação."
        >
          <ProfileFormacaoResultados
            totais={bundleResultados.totais}
            items={bundleResultados.items}
            emptyText="Nenhuma partida em equipe concluída listada ainda para esta formação."
          />
        </ProfileSection>

        <ProfileSection
          title="Participantes"
          info="Elenco: líderes e membros com link para o perfil de cada atleta."
        >
          {isLeader ? (
            <div className="mt-2 space-y-3">
              <p className="text-[11px] leading-relaxed text-eid-text-secondary">
                Convide por nome ou <span className="font-semibold text-eid-fg">@usuário</span>. Com três letras aparecem
                sugestões para escolher o atleta.
              </p>
              <TeamPublicInviteBlock
                timeId={id}
                excludeUserIds={idsExcluirConvite}
                pendingInvites={convitesPendentesPublic}
                collapsibleTrigger
              />
            </div>
          ) : null}
          <ul className="mt-4 flex flex-col gap-2.5">
            {(membros ?? []).map((m, idx) => {
              const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
              if (!prof?.id) return null;
              return (
                <li key={`${m.usuario_id}-${idx}`}>
                  <ProfileMemberCard
                    href={`/perfil/${prof.id}?from=/perfil-time/${id}`}
                    name={prof.nome ?? "Membro"}
                    subtitle={prof.id === t.criador_id ? "Líder" : (m.cargo ?? "Membro")}
                    avatarUrl={prof.avatar_url}
                    layout="list"
                    avatarSize="sm"
                    trailing={
                      isLeader && prof.id !== t.criador_id ? (
                        <PerfilTimeMembroLiderAcoes
                          timeId={id}
                          membroUsuarioId={prof.id}
                          membroNome={prof.nome ?? "Membro"}
                          membroAvatarUrl={prof.avatar_url ?? null}
                          transferButtonClassName="flex h-9 min-h-9 w-full min-w-0 items-center justify-center rounded-lg border border-eid-primary-500/45 px-1.5 py-0 text-center text-[10px] font-semibold leading-snug text-eid-primary-300 transition hover:bg-eid-primary-500/10 disabled:opacity-60 eid-light:border-sky-700/40 eid-light:bg-sky-50 eid-light:text-sky-950 eid-light:hover:bg-sky-100 sm:px-2 sm:text-[11px]"
                          removerAction={removerMembroAction}
                          removerButtonClassName="flex h-9 min-h-9 w-full items-center justify-center rounded-lg border border-red-400/50 px-1.5 py-0 text-center text-[10px] font-semibold leading-snug text-red-300 transition hover:bg-red-500/12 eid-light:border-red-700/45 eid-light:bg-red-50 eid-light:text-red-900 eid-light:hover:bg-red-100 sm:px-2 sm:text-[11px]"
                        />
                      ) : null
                    }
                  />
                </li>
              );
            })}
          </ul>
        </ProfileSection>

        {isLeader ? (
          <div className="eid-list-item overflow-hidden rounded-xl border border-transparent bg-eid-card/55">
            <div className="flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Gestão da formação</p>
              <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-action-400">
                Líder
              </span>
            </div>
            <div className="p-3">
              <ProfileEditDrawerTrigger
                href={editarTimeHref}
                title="Gerenciar equipe"
                fullscreen
                topMode="backOnly"
                className="mt-1 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/65 hover:bg-eid-primary-500/16"
              >
                <span>Gerenciar equipe</span>
              </ProfileEditDrawerTrigger>
              <p className="mt-1.5 text-[10px] leading-relaxed text-eid-text-secondary">
                Elenco, convites, dados e escudo — mesmo painel em tela cheia da área Editar.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
