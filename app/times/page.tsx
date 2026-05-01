import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SearchFilterForm } from "@/components/search/search-filter-form";
import { createClient } from "@/lib/supabase/server";
import { TeamManagementPanel } from "@/components/times/team-management-panel";
import { TimesVagaRecrutamentoCard, type TimesVagaCardData } from "@/components/times/times-vaga-recrutamento-card";
import { CandidaturaResponseActions } from "@/components/vagas/candidatura-response-actions";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { EidCollapsiblePanel } from "@/components/ui/eid-collapsible-panel";

export const metadata = {
  title: "Times",
  description: "Times e recrutamento no EsporteID",
};

type Props = {
  searchParams?: Promise<{
    q?: string;
    page?: string;
    create?: string;
    from?: string;
    convidar?: string;
  }>;
};

function timesQueryHref(sp: { q?: string }, page: number) {
  const p = new URLSearchParams();
  const qv = (sp.q ?? "").trim();
  if (qv) p.set("q", qv);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `/times?${s}` : "/times";
}

/** Caminho com a mesma busca/página para `from` nos fluxos em tela cheia (`embed=1`). */
function timesEmbedReturnHref(sp: {
  q?: string;
  page?: string;
  create?: string;
  convidar?: string;
}) {
  const p = new URLSearchParams();
  const qv = (sp.q ?? "").trim();
  if (qv) p.set("q", qv);
  const pageNum = Math.max(1, Number(sp.page ?? 1) || 1);
  if (pageNum > 1) p.set("page", String(pageNum));
  if (sp.create === "1") p.set("create", "1");
  const conv = String(sp.convidar ?? "").trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conv)) p.set("convidar", conv);
  const s = p.toString();
  return s ? `/times?${s}` : "/times";
}

type TimeListRow = {
  id: number;
  nome: string | null;
  localizacao: string | null;
  vagas_abertas: boolean | null;
  aceita_pedidos: boolean | null;
  eid_time: number | null;
  nivel_procurado: string | null;
  escudo: string | null;
  tipo: string | null;
  criador_id: string;
  esportes: { nome: string | null } | { nome: string | null }[] | null;
};

type RosterHeadcountBatchRow = {
  time_id: number;
  headcount: number;
};

function esporteNomeFromRow(row: TimeListRow): string | null {
  const esp = row.esportes;
  if (Array.isArray(esp)) return esp[0]?.nome ?? null;
  if (esp && typeof esp === "object" && "nome" in esp) return esp.nome ?? null;
  return null;
}

function rowToCardData(row: TimeListRow): TimesVagaCardData {
  return {
    id: row.id,
    nome: row.nome,
    localizacao: row.localizacao,
    escudo: row.escudo,
    eid_time: row.eid_time,
    nivel_procurado: row.nivel_procurado,
    tipo: row.tipo,
    esporteNome: esporteNomeFromRow(row),
    vagas_abertas: Boolean(row.vagas_abertas),
    aceita_pedidos: Boolean(row.aceita_pedidos),
    vagas_disponiveis: null,
    criador_id: row.criador_id,
  };
}

export default async function TimesPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim().toLowerCase();
  const convidar = String(sp.convidar ?? "").trim();
  const convidarOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(convidar);
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 12;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/times");

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let timesListQuery = supabase
    .from("times")
    .select("id, nome, localizacao, vagas_abertas, aceita_pedidos, eid_time, nivel_procurado, escudo, tipo, criador_id, esportes(nome)", {
      count: "exact",
    })
    .eq("vagas_abertas", true)
    .eq("aceita_pedidos", true)
    .order("id", { ascending: false });
  if (q) {
    timesListQuery = timesListQuery.or(`nome.ilike.%${q}%,localizacao.ilike.%${q}%`);
  }

  const [{ data: minhas }, { data: filtrados, count }, { data: minhasCandidaturas }, { data: meusMembros }, { data: pedidosRaw }] =
    await Promise.all([
    supabase
      .from("times")
      .select("id, nome, tipo, esportes(nome)")
      .eq("criador_id", user.id)
      .order("id", { ascending: false })
      .limit(20),
    timesListQuery.range(from, to),
    supabase.from("time_candidaturas").select("id, time_id").eq("candidato_usuario_id", user.id).eq("status", "pendente"),
    supabase.from("membros_time").select("time_id").eq("usuario_id", user.id).in("status", ["ativo", "aceito", "aprovado"]),
      supabase
        .from("time_candidaturas")
        .select("id, time_id, mensagem, criado_em, candidato_usuario_id, times!inner(id, nome, criador_id)")
        .eq("status", "pendente")
        .eq("times.criador_id", user.id)
        .order("criado_em", { ascending: false })
        .limit(40),
    ]);

  const lista = (filtrados ?? []) as TimeListRow[];
  const timeIds = lista.map((t) => Number(t.id)).filter((id) => Number.isFinite(id) && id > 0);
  const { data: rosterBatchRows, error: rosterBatchErr } =
    timeIds.length > 0
      ? await supabase.rpc("time_roster_headcount_many", { p_time_ids: timeIds })
      : { data: [] as RosterHeadcountBatchRow[], error: null };
  const headcountByTime = new Map<number, number>();
  if (!rosterBatchErr && Array.isArray(rosterBatchRows)) {
    for (const row of rosterBatchRows as RosterHeadcountBatchRow[]) {
      const tid = Number(row.time_id);
      const head = Number(row.headcount);
      if (Number.isFinite(tid) && tid > 0) headcountByTime.set(tid, Number.isFinite(head) ? Math.max(1, head) : 1);
    }
  }
  const rosterEntries = await Promise.all(
    lista.map(async (t) => {
      const cap = String(t.tipo ?? "").trim().toLowerCase() === "dupla" ? 2 : 18;
      let rosterCount = headcountByTime.get(t.id) ?? null;
      if (rosterCount == null) {
        const { data: headRaw, error: headErr } = await supabase.rpc("time_roster_headcount", { p_time_id: t.id });
        rosterCount = !headErr && headRaw != null && Number.isFinite(Number(headRaw)) ? Math.max(1, Number(headRaw)) : 1;
      }
      return [t.id, Math.max(0, cap - rosterCount)] as const;
    })
  );
  const vagasDisponiveisMap = new Map<number, number>(rosterEntries);
  const listaComVagas = lista.filter((t) => (vagasDisponiveisMap.get(t.id) ?? 0) > 0);
  const pendentePorTime = new Map((minhasCandidaturas ?? []).map((c) => [c.time_id as number, c.id as number]));
  const timesSouMembro = new Set((meusMembros ?? []).map((m) => Number(m.time_id)));

  const pedidos = pedidosRaw ?? [];
  const candIds = [...new Set(pedidos.map((p) => p.candidato_usuario_id as string))];
  const { data: candProfiles } =
    candIds.length > 0
      ? await supabase.from("profiles").select("id, nome, username, avatar_url").in("id", candIds)
      : { data: [] as { id: string; nome: string | null; username: string | null; avatar_url: string | null }[] };
  const profileMap = new Map((candProfiles ?? []).map((r) => [r.id, r]));

  const hasPrev = page > 1;
  const hasNext = count != null ? page * pageSize < count : lista.length === pageSize;

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
              Encontre uma formação no seu esporte, candidate-se com um toque (estilo desafio) e acompanhe pelo sino. O líder aprova ou recusa  -  se
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
              hasEquipes: (minhas ?? []).length > 0,
              convidarUsuarioId: convidarOk ? convidar : undefined,
            }}
          />
        </div>
      </div>

      <section id="pedidos-elenco" className="mb-4 scroll-mt-24">
        <EidCollapsiblePanel
          title="Pedidos para o seu elenco"
          defaultOpen={false}
          summaryRight={
            pedidos.length > 0 ? (
              <span className="inline-flex shrink-0 rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.06em] text-eid-action-400">
                {pedidos.length} pendente{pedidos.length > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="inline-flex shrink-0 rounded-full border border-transparent bg-eid-surface/50 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.06em] text-eid-text-secondary">
                sem pendências
              </span>
            )
          }
        >
          {pedidos.length > 0 ? (
            <>
              <p className="px-1 text-xs text-eid-text-secondary">
                Quem pediu para entrar nas suas formações. Aprovar adiciona a pessoa ao elenco e recusar avisa o candidato.
              </p>
              <ul className="space-y-3">
                {pedidos.map((raw) => {
                  const p = raw as {
                    id: number;
                    time_id: number;
                    mensagem: string | null;
                    criado_em: string;
                    candidato_usuario_id: string;
                    times: { id: number; nome: string | null; criador_id: string } | { id: number; nome: string | null; criador_id: string }[];
                  };
                  const team = Array.isArray(p.times) ? p.times[0] : p.times;
                  const prof = profileMap.get(p.candidato_usuario_id);
                  const label = prof?.nome?.trim() || prof?.username?.trim() || "Atleta";
                  const sub = prof?.username?.trim() && prof?.username !== prof?.nome ? `@${prof.username}` : null;
                  return (
                    <li
                      key={p.id}
                      className="rounded-2xl border border-transparent bg-[color:color-mix(in_srgb,var(--eid-card)_92%,var(--eid-surface)_8%)] p-3 sm:flex sm:items-stretch sm:gap-3 sm:p-4"
                    >
                      <div className="flex shrink-0 items-center gap-3">
                        <ProfileEditDrawerTrigger
                          href={`/perfil/${p.candidato_usuario_id}?from=/times`}
                          title={label}
                          fullscreen
                          topMode="backOnly"
                          className="block rounded-xl border border-transparent transition hover:border-eid-primary-500/35"
                        >
                          <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-eid-primary-500/30 bg-eid-surface">
                            {prof?.avatar_url ? (
                              <Image src={prof.avatar_url} alt="" width={48} height={48} unoptimized className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-sm font-black text-eid-primary-300">
                                {label.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </ProfileEditDrawerTrigger>
                        <div className="min-w-0 sm:hidden">
                          <p className="text-sm font-bold text-eid-fg">{label}</p>
                          {sub ? <p className="text-[11px] text-eid-text-secondary">{sub}</p> : null}
                        </div>
                      </div>
                      <div className="mt-3 min-w-0 flex-1 sm:mt-0">
                        <div className="hidden items-center gap-2 sm:flex">
                          <Link href={`/perfil/${p.candidato_usuario_id}?from=/times`} className="text-sm font-bold text-eid-fg hover:text-eid-primary-300">
                            {label}
                          </Link>
                          {sub ? <span className="text-[11px] text-eid-text-secondary">{sub}</span> : null}
                        </div>
                        <p className="mt-1 text-[11px] text-eid-text-secondary">
                          Quer entrar em <span className="font-semibold text-eid-fg">{team?.nome ?? "sua formação"}</span>
                        </p>
                        {p.mensagem?.trim() ? (
                          <p className="mt-2 rounded-lg border border-transparent bg-eid-surface/40 px-2.5 py-2 text-[11px] italic text-eid-text-secondary">
                            “{p.mensagem.trim()}”
                          </p>
                        ) : null}
                        <CandidaturaResponseActions candidaturaId={p.id} className="mt-2 gap-1.5" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="px-1 py-1 text-xs text-eid-text-secondary">Nenhum pedido pendente no momento.</p>
          )}
        </EidCollapsiblePanel>
      </section>

      <section className="mb-4 rounded-[20px] border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,white_12%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,white_3%),color-mix(in_srgb,var(--eid-surface)_94%,white_6%))] px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] leading-tight text-eid-text-secondary sm:text-[13px]">
            Mostrando formações com vagas abertas e aceitando pedidos.
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

      <div id="vagas-recrutamento" className="scroll-mt-24">
        {listaComVagas.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listaComVagas.map((t) => (
              <TimesVagaRecrutamentoCard
                key={t.id}
                team={{ ...rowToCardData(t), vagas_disponiveis: vagasDisponiveisMap.get(t.id) ?? null }}
                viewerUserId={user.id}
                minhaCandidaturaPendenteId={pendentePorTime.get(t.id) ?? null}
                jaSouMembro={timesSouMembro.has(t.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-6 text-center">
            <p className="text-sm text-eid-text-secondary">
              Nenhuma formação com vaga aberta encontrada agora. Tente outra busca em alguns instantes.
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Link
          href={timesQueryHref(sp, page - 1)}
          aria-disabled={!hasPrev}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
            hasPrev
              ? "border-[color:var(--eid-border-subtle)] text-eid-fg hover:border-eid-primary-500/35"
              : "pointer-events-none border-[color:var(--eid-border-subtle)] text-eid-text-secondary opacity-50"
          }`}
        >
          ← Anterior
        </Link>
        <span className="text-xs text-eid-text-secondary">Página {page}</span>
        <Link
          href={timesQueryHref(sp, page + 1)}
          aria-disabled={!hasNext}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
            hasNext
              ? "border-[color:var(--eid-border-subtle)] text-eid-fg hover:border-eid-primary-500/35"
              : "pointer-events-none border-[color:var(--eid-border-subtle)] text-eid-text-secondary opacity-50"
          }`}
        >
          Próxima →
        </Link>
      </div>
    </div>
  );
}
