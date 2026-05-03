import { redirect } from "next/navigation";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { listarPapeis, precisaEsportesPratica } from "@/lib/roles";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { ProfilePerformanceEditor } from "@/components/perfil/edit/profile-performance-editor";
import {
  extrairMesAnoInicio,
  parseTempoExperienciaParaEditor,
} from "@/lib/perfil/parse-tempo-experiencia-eid";

export type EditarPerformanceEidStreamProps = {
  viewerId: string;
  sp: { from?: string; embed?: string };
  ativarModoAtletaAction: () => Promise<void>;
};

export async function EditarPerformanceEidStream({
  viewerId,
  sp,
  ativarModoAtletaAction,
}: EditarPerformanceEidStreamProps) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(`perfil_completo, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`)
    .eq("id", viewerId)
    .maybeSingle();
  if (!profile || !legalAcceptanceIsCurrent(profile)) {
    redirect(`/conta/aceitar-termos?next=${encodeURIComponent("/editar/performance-eid")}`);
  }
  if (!profile.perfil_completo) redirect("/onboarding");

  const { data: papeisRows } = await supabase.from("usuario_papeis").select("papel").eq("usuario_id", viewerId);
  const papeis = listarPapeis(papeisRows);
  const needsSport = precisaEsportesPratica(papeis);
  const canAtivarAtleta = papeis.includes("organizador") && !papeis.includes("atleta");
  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/perfil/${viewerId}`;
  const isEmbed = sp.embed === "1";

  const { data: esportes } = await supabase
    .from("esportes")
    .select("id, nome, permite_individual, permite_dupla, permite_time")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  const { data: eidRows } = await supabase
    .from("usuario_eid")
    .select("esporte_id, tempo_experiencia")
    .eq("usuario_id", viewerId);

  const selectedEsportes = (eidRows ?? []).map((r) => r.esporte_id);
  const eidRowPorEsporte = new Map((eidRows ?? []).map((r) => [r.esporte_id, r]));
  const selectedExperiencias = Object.fromEntries(
    (eidRows ?? []).map((r) => [r.esporte_id, parseTempoExperienciaParaEditor(r.tempo_experiencia)])
  ) as Record<number, { tempo: "Menos de 1 ano" | "1 a 3 anos" | "Mais de 3 anos"; anos: number; meses: number }>;
  const refAno = new Date().getFullYear();

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title="Performance EID"
      subtitle="Configure por esporte se atua como atleta, professor ou ambos."
      showBack={false}
      hideHeader
    >
      <div className="space-y-3">
        {!isEmbed ? <PerfilBackLink href={from} label="Voltar" /> : null}
        <section className="overflow-hidden rounded-[22px] border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,white_4%),color-mix(in_srgb,var(--eid-surface)_94%,white_6%))] px-3.5 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_16px_-12px_rgba(37,99,235,0.42)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 18.5h16" />
                <path d="m6.5 15.5 3.5-4 3 2.6 4.5-5.1" />
                <path d="M7 7.5v8M17 7.5v8" />
              </svg>
            </span>
            <div className="min-w-0 pt-1">
              <h1 className="text-[16px] font-black leading-none tracking-tight text-eid-fg sm:text-[26px]">Performance EID</h1>
              <p className="mt-2 text-[11px] leading-snug text-eid-text-secondary sm:text-[14px]">
                Configure por esporte se atua como atleta, professor ou ambos.
              </p>
            </div>
          </div>
        </section>

        {!needsSport ? (
          <section className="eid-surface-panel overflow-hidden rounded-2xl p-0 text-sm text-eid-text-secondary">
            <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
              <p className="text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg">Esportes e EID</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#F5D8A6] bg-[#FFF2DF] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.04em] text-[#B8791D]">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M4 18.5h16" />
                  <path d="m6.5 15.5 3.5-4 3 2.6 4.5-5.1" />
                </svg>
                Performance
              </span>
            </div>
            <div className="p-4 sm:p-5">
              <p>
                Esta área é para quem atua como <strong className="text-eid-fg">atleta</strong> ou{" "}
                <strong className="text-eid-fg">professor</strong>.
              </p>
              {canAtivarAtleta ? (
                <form action={ativarModoAtletaAction} className="mt-4">
                  <button
                    type="submit"
                    className="rounded-xl bg-eid-action-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-[var(--eid-brand-ink)] transition hover:brightness-110"
                  >
                    Ativar perfil de atleta
                  </button>
                </form>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="eid-surface-panel overflow-hidden rounded-2xl p-0">
            <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
              <p className="text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg">Esportes e EID</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#F5D8A6] bg-[#FFF2DF] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.04em] text-[#B8791D]">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M4 18.5h16" />
                  <path d="m6.5 15.5 3.5-4 3 2.6 4.5-5.1" />
                </svg>
                Performance
              </span>
            </div>
            <div className="p-3">
              <ProfilePerformanceEditor
                sports={(esportes ?? []).map((e) => ({
                  id: e.id,
                  nome: e.nome,
                  permiteIndividual: Boolean(e.permite_individual),
                  permiteDupla: Boolean(e.permite_dupla),
                  permiteTime: Boolean(e.permite_time),
                }))}
                initialItems={selectedEsportes.map((esporteId) => {
                  const raw = eidRowPorEsporte.get(esporteId)?.tempo_experiencia;
                  const ma = extrairMesAnoInicio(raw);
                  const ed = selectedExperiencias[esporteId] ?? parseTempoExperienciaParaEditor(raw);
                  return {
                    esporteId,
                    tempoTipo: ma ? "inicio" : "faixa",
                    tempo: ed.tempo ?? "1 a 3 anos",
                    inicioMes: ma?.mes ?? 1,
                    inicioAno: ma?.ano ?? Math.max(1970, refAno - 2),
                  };
                })}
              />
            </div>
          </section>
        )}
      </div>
    </ProfileEditFullscreenShell>
  );
}

