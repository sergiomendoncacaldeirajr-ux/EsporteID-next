import { notFound, redirect } from "next/navigation";
import { EidStreamSection } from "@/components/eid-stream-section";
import { PerfilHistoricoCompletoListaSkeleton } from "@/components/loading/profile-app-skeletons";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { PROFILE_HISTORICO_FULLSCREEN_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";
import { loginNextWithOptionalFrom } from "@/lib/auth/login-next-path";
import { partidaEncerradaParaHistorico } from "@/lib/perfil/formacao-eid-stats";
import { createClient } from "@/lib/supabase/server";
import { PerfilHistoricoCompletoListaStream } from "./perfil-historico-completo-lista-stream";

export type PerfilHistoricoCompletoStreamProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string; embed?: string }>;
};

export async function PerfilHistoricoCompletoStream({ params, searchParams }: PerfilHistoricoCompletoStreamProps) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const isEmbed = String(sp.embed ?? "").trim() === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginNextWithOptionalFrom(`/perfil/${id}/historico`, sp));

  const partidasSelect =
    "id, esporte_id, modalidade, jogador1_id, jogador2_id, time1_id, time2_id, placar_1, placar_2, status, status_ranking, torneio_id, tipo_partida, data_resultado, data_registro, data_partida, local_str, local_cidade, local_espaco_id, mensagem";

  const [{ data: perfil }, { data: partidasRaw }] = await Promise.all([
    supabase.from("profiles").select("id, nome, mostrar_historico_publico").eq("id", id).maybeSingle(),
    supabase.from("partidas").select(partidasSelect).or(`jogador1_id.eq.${id},jogador2_id.eq.${id}`).order("data_registro", { ascending: false }).limit(300),
  ]);

  if (!perfil) notFound();
  const isSelf = user.id === id;
  if (!isSelf && perfil.mostrar_historico_publico === false) {
    redirect(`/perfil/${id}`);
  }

  const partidas = (partidasRaw ?? []).filter((p) => {
    if (!p.jogador1_id || !p.jogador2_id) return false;
    if (p.time1_id != null || p.time2_id != null) return false;
    return partidaEncerradaParaHistorico(p);
  });

  const totais = partidas.reduce(
    (acc, p) => {
      const isP1 = p.jogador1_id === id;
      const s1 = Number(p.placar_1 ?? 0);
      const s2 = Number(p.placar_2 ?? 0);
      if (s1 === s2) acc.empates += 1;
      else if ((isP1 && s1 > s2) || (!isP1 && s2 > s1)) acc.vitorias += 1;
      else acc.derrotas += 1;
      if (p.torneio_id) acc.torneio += 1;
      else acc.rank += 1;
      return acc;
    },
    { vitorias: 0, derrotas: 0, empates: 0, rank: 0, torneio: 0 }
  );

  return (
    <main className={PROFILE_HISTORICO_FULLSCREEN_MAIN_CLASS}>
      {!isEmbed ? <PerfilBackLink href={`/perfil/${id}`} className="mb-2 shrink-0 self-start" /> : null}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="relative overflow-hidden rounded-2xl border border-[rgba(37,99,235,0.14)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_97%,var(--eid-primary-500)_3%),color-mix(in_srgb,var(--eid-surface)_96%,transparent))] px-4 py-4 shadow-[0_8px_28px_-16px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-eid-primary-500/8 blur-3xl" aria-hidden />
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(37,99,235,0.22)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-primary-500)_18%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-500)_10%,var(--eid-surface)))] text-eid-primary-300 shadow-[0_0_14px_-4px_rgba(37,99,235,0.3)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-8" /><path d="M22 19v-4" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-eid-primary-400">Perfil</p>
              <h1 className="text-[15px] font-black leading-tight tracking-tight text-eid-fg">Histórico completo</h1>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-eid-text-secondary">
            <span className="font-semibold text-eid-fg">{perfil.nome ?? "Atleta"}</span> · confrontos individuais. Para resultados por esporte, acesse as estatísticas EID no perfil.
          </p>
        </div>

        <div className="mt-3 grid grid-cols-5 gap-1.5">
          <div className="overflow-hidden rounded-xl border border-[rgba(16,185,129,0.2)] bg-[linear-gradient(145deg,color-mix(in_srgb,#10b981_12%,var(--eid-card)),color-mix(in_srgb,#059669_6%,var(--eid-surface)))] px-1 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-[18px] font-black leading-none text-emerald-300">{totais.vitorias}</p>
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.06em] text-emerald-400/80">Vitórias</p>
          </div>
          <div className="overflow-hidden rounded-xl border border-[rgba(244,63,94,0.2)] bg-[linear-gradient(145deg,color-mix(in_srgb,#f43f5e_12%,var(--eid-card)),color-mix(in_srgb,#e11d48_6%,var(--eid-surface)))] px-1 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-[18px] font-black leading-none text-rose-300">{totais.derrotas}</p>
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.06em] text-rose-400/80">Derrotas</p>
          </div>
          <div className="overflow-hidden rounded-xl border border-[rgba(37,99,235,0.2)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-primary-500)_12%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-700)_6%,var(--eid-surface)))] px-1 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-[18px] font-black leading-none text-eid-primary-300">{totais.empates}</p>
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.06em] text-eid-primary-400/80">Empates</p>
          </div>
          <div className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-surface)_85%,var(--eid-primary-900)_15%),color-mix(in_srgb,var(--eid-bg)_90%,transparent))] px-1 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-[18px] font-black leading-none text-eid-fg">{totais.rank}</p>
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.06em] text-eid-text-secondary">Rank</p>
          </div>
          <div className="overflow-hidden rounded-xl border border-[rgba(249,115,22,0.18)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-action-500)_10%,var(--eid-card)),color-mix(in_srgb,var(--eid-action-500)_5%,var(--eid-surface)))] px-1 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-[18px] font-black leading-none text-eid-action-400">{totais.torneio}</p>
            <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.06em] text-eid-action-400/80">Torneios</p>
          </div>
        </div>
        <div className="mt-3 h-px w-full bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--eid-primary-500)_30%,var(--eid-border-subtle)),transparent)]" />

        {partidas.length > 0 ? (
          <EidStreamSection className="contents" fallback={<PerfilHistoricoCompletoListaSkeleton />}>
            <PerfilHistoricoCompletoListaStream profileId={id} perfilNome={perfil.nome ?? "Atleta"} partidas={partidas} />
          </EidStreamSection>
        ) : (
          <div className="eid-list-item mt-3 flex min-h-[110px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-eid-primary-500/35 bg-eid-primary-500/[0.06] p-4 text-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-eid-primary-500/35 bg-eid-surface/65 text-eid-primary-300">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                <path d="M10 2.25a.75.75 0 0 1 .75.75V10h4.25a.75.75 0 0 1 0 1.5H10A.75.75 0 0 1 9.25 10V3a.75.75 0 0 1 .75-.75Zm0 15a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5ZM1.25 10a8.75 8.75 0 1 1 17.5 0 8.75 8.75 0 0 1-17.5 0Z" />
              </svg>
            </span>
            <p className="text-[12px] font-bold text-eid-fg">Nenhum histórico encontrado</p>
            <p className="text-[10px] text-eid-text-secondary">
              Ainda não há partidas individuais concluídas de rank ou torneio para este perfil.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
