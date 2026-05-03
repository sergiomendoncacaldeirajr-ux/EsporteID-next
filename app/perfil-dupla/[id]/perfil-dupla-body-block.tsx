import Link from "next/link";
import { EidBadge } from "@/components/eid/eid-badge";
import { ProfileAchievementsShelf, ProfileCompactTimeline } from "@/components/perfil/profile-history-widgets";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfilePrimaryCta, ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { ProfileSportsMetricsCard } from "@/components/perfil/profile-sports-metrics-card";
import { ProfileMemberCard } from "@/components/perfil/profile-team-members-cards";
import { SugerirMatchLiderForm } from "@/components/perfil/sugerir-match-lider-form";
import { ProfileFormacaoResultados } from "@/components/perfil/profile-formacao-resultados";
import { PROFILE_CARD_BASE } from "@/components/perfil/profile-ui-tokens";
import {
  MSG_CONFRONTO_REQUER_ESPORTE_NO_PERFIL_VIEWER,
} from "@/lib/match/viewer-esporte-confronto";
import { formatCooldownRemaining } from "@/lib/match/cooldown-remaining";
import { TeamPublicInviteBlock } from "@/components/times/team-public-invite-block";
import { FormacaoTransferirLiderancaForm } from "@/components/times/formacao-transferir-lideranca-form";
import { BarChart3, ChevronRight } from "lucide-react";
import { getPerfilDuplaPayload } from "./perfil-dupla-payload";

export type PerfilDuplaBodyBlockProps = {
  duplaId: number;
  viewerId: string;
};

export async function PerfilDuplaBodyBlock({ duplaId, viewerId }: PerfilDuplaBodyBlockProps) {
  const p = await getPerfilDuplaPayload(duplaId, viewerId);
  const {
    id,
    d,
    p1,
    p2,
    timeResolvido,
    timeResolvidoId,
    posicaoDupla,
    viewerPodeConfrontarNesteEsporteDupla,
    bundleResultadosDupla,
    eidLogsDupla,
    histDupla,
    isMembroDupla,
    isDonoDupla,
    isLiderTimeDupla,
    convitesPendentesDupla,
    idsExcluirConviteDupla,
    formacoesMembroNaoLiderDupla,
    canChallengeDupla,
    canSugerirMatchDupla,
    mostrarAvisoSemEidNoEsporteDupla,
    linkWpp,
    hasAceitoRankDupla,
    rankingBlockedUntilDupla,
    eid1,
    eid2,
    esp,
    conquistas,
    fromPublicDupla,
    editarDuplaHref,
  } = p;

  return (
    <div className="mt-6 grid gap-6">
      {!isDonoDupla ? (
        <section className="overflow-hidden rounded-xl border border-transparent bg-eid-card/55 p-3">
          <h2 className="sr-only">Ação principal</h2>
          <div className="mb-2 flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-2.5 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Ação principal</p>
            <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
              Match
            </span>
          </div>
          {!isMembroDupla ? (
            <div className="grid gap-3">
              {mostrarAvisoSemEidNoEsporteDupla ? (
                <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-eid-text-secondary">
                  {MSG_CONFRONTO_REQUER_ESPORTE_NO_PERFIL_VIEWER}{" "}
                  <Link
                    href="/conta/esportes-eid"
                    className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline"
                  >
                    Abrir Esportes e EID
                  </Link>
                  .
                </p>
              ) : null}
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
                  Chamar no WhatsApp
                </a>
              ) : null}
              {canChallengeDupla &&
              viewerPodeConfrontarNesteEsporteDupla &&
              !hasAceitoRankDupla &&
              timeResolvidoId &&
              !rankingBlockedUntilDupla ? (
                <ProfilePrimaryCta
                  href={`/desafio?id=${timeResolvidoId}&tipo=dupla&esporte=${d.esporte_id}`}
                  label={linkWpp ? "⚡ Desafio no ranking" : undefined}
                />
              ) : hasAceitoRankDupla && timeResolvidoId ? (
                <p className="text-xs text-eid-text-secondary">
                  Desafio aceito nesta dupla. Registre o resultado na agenda quando jogarem.
                </p>
              ) : !canChallengeDupla || isMembroDupla ? (
                <ProfilePrimaryCta href={`/match?tipo=dupla&esporte=${d.esporte_id}`} label="Duplas no radar" />
              ) : null}
              {canChallengeDupla &&
              viewerPodeConfrontarNesteEsporteDupla &&
              !hasAceitoRankDupla &&
              rankingBlockedUntilDupla ? (
                <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2 text-[11px] text-eid-text-secondary">
                  Carência ativa para novo desafio de ranking nesta dupla até{" "}
                  <span className="font-semibold text-eid-fg">
                    {new Date(rankingBlockedUntilDupla).toLocaleDateString("pt-BR")}
                  </span>
                  .{" "}
                  <span className="font-semibold text-eid-fg">{formatCooldownRemaining(rankingBlockedUntilDupla)}</span>
                </p>
              ) : null}
              {canSugerirMatchDupla && viewerPodeConfrontarNesteEsporteDupla && timeResolvidoId ? (
                <SugerirMatchLiderForm
                  alvoTimeId={timeResolvidoId}
                  alvoNome={timeResolvido?.nome ?? "Dupla no radar"}
                  modalidadeLabel="dupla"
                  formacoesMinhas={formacoesMembroNaoLiderDupla}
                />
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-eid-text-secondary">Você faz parte desta dupla registrada.</p>
          )}
        </section>
      ) : null}

      <ProfileSection
        title="EID e estatísticas"
        info="Nota e métricas da dupla neste esporte: ranking, jogos e desempenho conjunto."
      >
        {timeResolvido ? (
          <>
            <div className={`${PROFILE_CARD_BASE} mt-2 overflow-hidden p-3 sm:rounded-2xl sm:p-4`}>
              <p className="text-[11px] font-semibold leading-snug sm:text-[12px]">
                <span className="text-eid-text-secondary">Esporte: </span>
                <span className="font-bold text-eid-primary-300">{esp?.nome ?? "Esporte não definido"}</span>
              </p>
              <div className="mt-2">
                <div className="flex justify-center">
                  <EidBadge
                    score={Number(timeResolvido.eid_time ?? 0)}
                    history={eidLogsDupla ?? []}
                    label={`EID · ${(esp?.nome ?? "DUPLA").toUpperCase()}`}
                    className="px-3 py-1.5 text-[11px] shadow-[0_8px_20px_-14px_rgba(249,115,22,0.45)]"
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[color:var(--eid-border-subtle)] pt-3">
                  <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-2.5 text-center shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
                    <p className="text-base font-bold tabular-nums text-eid-action-500 sm:text-lg">
                      {Number(timeResolvido.eid_time ?? 0).toFixed(1)}
                    </p>
                    <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Nota EID</p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-2.5 text-center shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
                    <p className="text-base font-bold tabular-nums text-eid-fg sm:text-lg">
                      {timeResolvido.pontos_ranking ?? 0}
                    </p>
                    <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Pontos</p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-2.5 text-center shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
                    <p className="text-base font-bold tabular-nums text-eid-primary-300 sm:text-lg">
                      {posicaoDupla != null ? `#${posicaoDupla}` : "—"}
                    </p>
                    <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Posição</p>
                  </div>
                </div>
                {d.esporte_id ? (
                  <ProfileEditDrawerTrigger
                    href={`/perfil-dupla/${id}/eid/${d.esporte_id}?from=${encodeURIComponent(fromPublicDupla)}`}
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
                  eidValue={Number(timeResolvido.eid_time ?? 0)}
                  rankValue={Number(timeResolvido.pontos_ranking ?? 0)}
                  trendLabel="Evolução EID"
                  trendPoints={
                    (histDupla ?? []).length >= 3
                      ? ([
                          Number((histDupla ?? [])[2]?.nota_nova ?? timeResolvido.eid_time ?? 0),
                          Number((histDupla ?? [])[1]?.nota_nova ?? timeResolvido.eid_time ?? 0),
                          Number((histDupla ?? [])[0]?.nota_nova ?? timeResolvido.eid_time ?? 0),
                        ] as [number, number, number])
                      : [
                          Number(timeResolvido.eid_time ?? 0),
                          Number(timeResolvido.eid_time ?? 0),
                          Number(timeResolvido.eid_time ?? 0),
                        ]
                  }
                  showScoreTiles={false}
                />
              </div>
            </div>
            <ProfileCompactTimeline
              title="Histórico de notas EID"
              emptyText="Sem histórico recente de EID."
              items={[...(histDupla ?? [])]
                .reverse()
                .map((h, i) => ({
                  id: `${h.data_alteracao ?? "sem-data"}-${i}`,
                  label: `${Number(h.nota_nova).toFixed(1)} ${h.data_alteracao ? new Date(h.data_alteracao).toLocaleDateString("pt-BR") : ""}`.trim(),
                  tone: "neutral" as const,
                }))}
            />
          </>
        ) : (
          <div className={`${PROFILE_CARD_BASE} mt-2 overflow-hidden p-3`}>
            <div>
              <p className="text-xs text-eid-text-secondary">
                Ainda não há <strong className="text-eid-fg">time de dupla ativo</strong> no ranking com estes dois atletas. O EID de equipe aparece quando a formação existir no radar.
              </p>
              {d.esporte_id ? (
                <ProfileEditDrawerTrigger
                  href={`/perfil-dupla/${id}/eid/${d.esporte_id}?from=${encodeURIComponent(fromPublicDupla)}`}
                  title={`Estatísticas · ${esp?.nome ?? "Esporte"}`}
                  fullscreen
                  topMode="backOnly"
                  className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-eid-action-500/45 bg-eid-action-500/10 px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-eid-action-400 transition hover:border-eid-action-500/70 hover:bg-eid-action-500/15"
                >
                  <BarChart3 className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
                  <span className="min-w-0 flex-1 text-center leading-tight">
                    Abrir estatísticas · {(esp?.nome ?? "este esporte").toUpperCase()}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-85" strokeWidth={2.5} aria-hidden />
                </ProfileEditDrawerTrigger>
              ) : null}
            </div>
          </div>
        )}
      </ProfileSection>

      <ProfileSection
        title="Histórico de confrontos"
        info="Mesmo padrão do perfil de atleta: totais de vitórias/derrotas/empates e lista dos confrontos da formação."
      >
        {timeResolvidoId ? (
          <ProfileFormacaoResultados
            totais={bundleResultadosDupla.totais}
            items={bundleResultadosDupla.items}
            emptyText="Nenhuma partida em dupla concluída listada ainda."
          />
        ) : (
          <p className="mt-2 text-xs text-eid-text-secondary">
            Resultados de ranking e torneio aparecem quando houver time de dupla ativo no radar.
          </p>
        )}
        <p className="mt-3 text-[10px] text-eid-text-secondary">
          Para desafiar outra dupla no radar:{" "}
          <Link href="/match?tipo=dupla" className="font-semibold text-eid-primary-300 underline">
            Desafio → Duplas
          </Link>
          .
        </p>
      </ProfileSection>

      <ProfileSection
        title="Participantes"
        info="Atletas que compõem esta dupla, com acesso ao perfil individual de cada um."
      >
        {isDonoDupla && timeResolvidoId ? (
          <div className="mt-2 space-y-3">
            <p className="text-[11px] leading-relaxed text-eid-text-secondary">
              Convidar integrante por nome ou <span className="font-semibold text-eid-fg">@usuário</span>. Com três letras aparecem sugestões; convites pendentes podem ser cancelados a qualquer momento.
            </p>
            <TeamPublicInviteBlock
              timeId={timeResolvidoId}
              excludeUserIds={idsExcluirConviteDupla}
              pendingInvites={convitesPendentesDupla}
              collapsibleTrigger
            />
          </div>
        ) : null}
        <div className="mt-4 flex flex-col gap-2.5">
          {[p1, p2].map((player, i) =>
            player ? (
              <ProfileMemberCard
                key={player.id}
                href={`/perfil/${player.id}?from=/perfil-dupla/${id}`}
                name={player.nome ?? "Atleta"}
                subtitle={player.localizacao?.trim() ? player.localizacao : "Integrante da dupla"}
                avatarUrl={player.avatar_url}
                fallbackLabel={`${i + 1}o`}
                layout="list"
                avatarSize="sm"
                trailing={
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-semibold text-eid-primary-300 eid-light:text-sky-900">
                      EID individual {i === 0 ? Number(eid1?.nota_eid ?? 0).toFixed(1) : Number(eid2?.nota_eid ?? 0).toFixed(1)}
                    </p>
                    {isLiderTimeDupla && timeResolvidoId && player.id !== viewerId ? (
                      <FormacaoTransferirLiderancaForm
                        timeId={timeResolvidoId}
                        novoLiderUsuarioId={player.id}
                        novoLiderNome={player.nome ?? "Atleta"}
                        novoLiderAvatarUrl={player.avatar_url}
                        formacaoTipo="dupla"
                        className="flex h-9 min-h-9 w-full min-w-0 items-center justify-center rounded-lg border border-eid-primary-500/45 px-1.5 py-0 text-center text-[10px] font-semibold leading-snug text-eid-primary-300 transition hover:bg-eid-primary-500/10 disabled:opacity-60 eid-light:border-sky-700/40 eid-light:bg-sky-50 eid-light:text-sky-950 eid-light:hover:bg-sky-100 sm:px-2 sm:text-[11px]"
                      />
                    ) : null}
                  </div>
                }
              />
            ) : null
          )}
        </div>
      </ProfileSection>

      {isMembroDupla ? (
        <div className="eid-list-item overflow-hidden rounded-xl border border-transparent bg-eid-card/55">
          <div className="flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Gestão da dupla</p>
            <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-action-400">
              Conta
            </span>
          </div>
          <div className="p-3">
            {isDonoDupla ? (
              <div className="space-y-2">
                <ProfileEditDrawerTrigger
                  href={editarDuplaHref}
                  title="Editar dupla"
                  fullscreen
                  topMode="backOnly"
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/65 hover:bg-eid-primary-500/16"
                >
                  <span>Editar dupla registrada</span>
                </ProfileEditDrawerTrigger>
                <Link
                  href={editarDuplaHref}
                  className="flex min-h-[40px] w-full items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 text-[10px] font-semibold uppercase tracking-wide text-eid-text-secondary transition hover:border-eid-primary-500/35 hover:text-eid-fg"
                >
                  Abrir em página cheia (sem painel)
                </Link>
              </div>
            ) : null}
            <div className={`grid gap-2 ${isDonoDupla ? "mt-3" : ""}`}>
              <ProfileEditDrawerTrigger
                href={`/editar/perfil?from=${encodeURIComponent(fromPublicDupla)}`}
                title="Editar perfil"
                fullscreen
                topMode="backOnly"
                className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/65 hover:bg-eid-primary-500/16"
              >
                <span>Editar perfil pessoal</span>
              </ProfileEditDrawerTrigger>
              <ProfileEditDrawerTrigger
                href={`/editar/performance-eid?from=${encodeURIComponent(fromPublicDupla)}`}
                title="Esportes e EID"
                fullscreen
                topMode="backOnly"
                className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 text-[11px] font-black uppercase tracking-wide text-eid-fg transition hover:border-eid-primary-500/40"
              >
                <span>Esportes e ranking (EID)</span>
              </ProfileEditDrawerTrigger>
            </div>
          </div>
        </div>
      ) : null}

      <ProfileSection
        title="Conquistas"
        info="Selos e marcos da dupla na plataforma (quando houver)."
      >
        <ProfileAchievementsShelf achievements={conquistas} emptyText="Conquistas aparecerão conforme evolução da dupla." />
      </ProfileSection>
    </div>
  );
}
