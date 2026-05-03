import { redirect } from "next/navigation";
import { SearchFilterForm } from "@/components/search/search-filter-form";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { TeamManagementPanel } from "@/components/times/team-management-panel";
import { EidStreamSection } from "@/components/eid-stream-section";
import { TimesVagasListaSkeleton, TimesVagasPedidosSkeleton } from "@/components/loading/times-vagas-stream-skeletons";
import { timesEmbedReturnHref, type MinhasTimeShellRow } from "./times-vagas-shared";
import { TimesStreamListaVagas } from "./times-stream-lista";
import { TimesStreamPedidos } from "./times-stream-pedidos";

export const metadata = {
  title: "Times",
  description: "Times e recrutamento no EsporteID",
};

type Props = {
  searchParams?: Promise<{
    q?: string;
    create?: string;
    from?: string;
    convidar?: string;
  }>;
};

export default async function TimesPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim().toLowerCase();
  const convidar = String(sp.convidar ?? "").trim();
  const convidarOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(convidar);
  const { supabase, user } = await getServerAuth();
  if (!user) redirect("/login?next=/times");

  const { data: minhas } = await supabase
    .from("times")
    .select("id, nome, tipo, esportes(nome)")
    .eq("criador_id", user.id)
    .order("id", { ascending: false })
    .limit(20);

  const minhasCriadorTimes = (minhas ?? []) as MinhasTimeShellRow[];

  return (
    <div
      data-eid-vagas-page="true"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-3 pb-[calc(var(--eid-shell-footer-offset,0px)+2rem)] sm:px-6 sm:py-4 sm:pb-[calc(var(--eid-shell-footer-offset,0px)+2.25rem)]"
    >
      <div className="relative mb-4 overflow-hidden rounded-3xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(155deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-4 shadow-[0_16px_40px_-28px_rgba(37,99,235,0.26)] sm:p-6">
        <div className="relative grid grid-cols-[minmax(0,1fr)_110px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_190px] sm:gap-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2563EB] sm:text-[11px]">Recrutamento</p>
            <h1 className="eid-vagas-hero-title mt-1 text-[17px] font-black uppercase leading-none tracking-tight text-eid-fg sm:text-[28px]">
              Vagas em times e duplas
            </h1>
            <p className="mt-2 max-w-[56ch] text-[10px] leading-relaxed text-eid-text-secondary sm:mt-2.5 sm:text-[13px]">
              Encontre uma formação no seu esporte, candidate-se com um toque (estilo desafio) e acompanhe pelo sino. O líder aprova ou recusa — se
              aceitar, você entra no elenco e recebe notificação.
            </p>
          </div>
          <div className="justify-self-end" aria-hidden>
            <svg viewBox="0 0 180 160" className="h-[98px] w-[98px] drop-shadow-[0_10px_16px_rgba(37,99,235,0.28)] sm:h-[160px] sm:w-[160px]">
              <circle cx="122" cy="35" r="20" fill="#1D4ED8" />
              <circle cx="82" cy="44" r="16" fill="#3B82F6" />
              <circle cx="152" cy="51" r="14" fill="#2563EB" />
              <rect x="48" y="58" width="92" height="92" rx="16" transform="rotate(6 48 58)" fill="#2563EB" />
              <rect x="56" y="67" width="76" height="74" rx="11" transform="rotate(6 56 67)" fill="#F8FAFC" />
              <rect x="86" y="56" width="28" height="14" rx="4" transform="rotate(6 86 56)" fill="#64748B" />
              <path d="m82 101 20 10 26-14" fill="none" stroke="#F97316" strokeWidth="6" strokeLinecap="round" />
              <path d="m78 118 34 2" fill="none" stroke="#F97316" strokeWidth="5" strokeLinecap="round" />
              <path d="m72 96 10 8m0-8-10 8" fill="none" stroke="#F97316" strokeWidth="5" strokeLinecap="round" />
              <path d="m70 124 10-7 8 9-9 8z" fill="#1D4ED8" />
              <circle cx="74" cy="124" r="3.4" fill="#0F172A" />
            </svg>
          </div>
        </div>
        <div className="relative mt-3.5 sm:mt-4">
          <TeamManagementPanel
            fullscreenLaunchers={{
              fromHref: timesEmbedReturnHref(sp),
              hasEquipes: minhasCriadorTimes.length > 0,
              convidarUsuarioId: convidarOk ? convidar : undefined,
            }}
          />
        </div>
      </div>

      <div className="eid-progressive-enter space-y-0">
        <EidStreamSection fallback={<TimesVagasPedidosSkeleton />}>
          <TimesStreamPedidos supabase={supabase} userId={user.id} />
        </EidStreamSection>
      </div>

      <section className="mb-4 rounded-[20px] border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,white_12%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,white_3%),color-mix(in_srgb,var(--eid-surface)_94%,white_6%))] px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 shrink whitespace-nowrap text-[11px] leading-tight text-eid-text-secondary sm:text-[12px]">
            Formações com vagas abertas e aceitando pedidos.
          </p>
          {q ? (
            <span className="inline-flex shrink-0 rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.06em] text-eid-primary-300">
              filtro ativo
            </span>
          ) : null}
        </div>
        <SearchFilterForm
          defaultValue={sp.q ?? ""}
          placeholder="Buscar time ou dupla pelo nome..."
          scope="times"
          withSearchIcon
          formAction="/times"
          showButton={false}
          submitOnPick
          className="mt-2 w-full sm:mt-2.5"
          inputClassName="eid-input-dark h-[39px] w-full rounded-[12px] border border-[#D6DCEA] bg-[#F6F8FC] px-3 text-[10px] font-medium text-[#556987] placeholder:text-[10px] placeholder:font-medium placeholder:text-[#7587A5] sm:h-[41px] sm:text-[11px] sm:placeholder:text-[11px]"
        />
      </section>

      {q ? (
        <p className="mb-4 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2 text-xs text-eid-text-secondary">
          Busca ativa por: <span className="font-semibold text-eid-fg">{sp.q}</span>
        </p>
      ) : null}

      <div className="eid-progressive-enter space-y-0">
        <EidStreamSection fallback={<TimesVagasListaSkeleton />}>
          <TimesStreamListaVagas supabase={supabase} userId={user.id} q={q} minhasCriadorTimes={minhasCriadorTimes} />
        </EidStreamSection>
      </div>
    </div>
  );
}
