import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SearchFilterForm } from "@/components/search/search-filter-form";
import { createClient } from "@/lib/supabase/server";
import { TeamManagementPanel } from "@/components/times/team-management-panel";
import { TimesVagaRecrutamentoCard, type TimesVagaCardData } from "@/components/times/times-vaga-recrutamento-card";
import { ResponderCandidaturaForm } from "@/components/vagas/vagas-actions";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { CANDIDATURA_ACOES_ROW_CLASS, DESAFIO_FLOW_SECONDARY_CLASS } from "@/lib/desafio/flow-ui";

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
  const voltarHref = resolveBackHref(sp.from, "/dashboard");
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

  const [
    { data: esportes },
    { data: minhas },
    { data: filtrados, count },
    { data: minhasCandidaturas },
    { data: meusMembros },
    { data: pedidosRaw },
  ] = await Promise.all([
    supabase.from("esportes").select("id, nome").eq("ativo", true).order("ordem", { ascending: true }),
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
  const rosterEntries = await Promise.all(
    lista.map(async (t) => {
      const cap = String(t.tipo ?? "").trim().toLowerCase() === "dupla" ? 2 : 18;
      const { data: headRaw, error: headErr } = await supabase.rpc("time_roster_headcount", { p_time_id: t.id });
      const rosterCount = !headErr && headRaw != null && Number.isFinite(Number(headRaw)) ? Math.max(1, Number(headRaw)) : 1;
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
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-3 pb-[calc(var(--eid-shell-footer-offset,0px)+2rem)] sm:px-6 sm:py-4 sm:pb-[calc(var(--eid-shell-footer-offset,0px)+2.25rem)]">
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_80%,var(--eid-primary-500)_20%)] bg-[linear-gradient(155deg,color-mix(in_srgb,var(--eid-card)_90%,var(--eid-primary-500)_10%),color-mix(in_srgb,var(--eid-surface)_85%,var(--eid-bg)_15%))] p-4 shadow-[0_18px_48px_-28px_rgba(37,99,235,0.45)] sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-eid-action-500/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-eid-primary-300">Recrutamento</p>
            <h1 className="mt-1 text-xl font-black uppercase tracking-tight text-eid-fg md:text-2xl">Vagas em times e duplas</h1>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-eid-text-secondary md:text-sm">
              Encontre uma formação no seu esporte, candidature-se com um toque (estilo desafio) e acompanhe pelo sino. O líder aprova ou recusa — se
              aceitar, você entra no elenco e recebe notificação.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {sp.from?.trim() ? (
              <Link href={voltarHref} className={DESAFIO_FLOW_SECONDARY_CLASS + " rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2"}>
                ← Voltar
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <TeamManagementPanel
        fullscreenLaunchers={{
          fromHref: timesEmbedReturnHref(sp),
          hasEquipes: (minhas ?? []).length > 0,
          convidarUsuarioId: convidarOk ? convidar : undefined,
        }}
      />

      {pedidos.length > 0 ? (
        <section id="pedidos-elenco" className="mb-6 scroll-mt-24">
          <h2 className="text-sm font-black uppercase tracking-wide text-eid-fg">Pedidos para o seu elenco</h2>
          <p className="mt-1 text-xs text-eid-text-secondary">
            Quem pediu para entrar nas suas formações. Aprovar adiciona a pessoa ao time ou dupla e envia notificação; recusar também avisa o candidato.
          </p>
          <ul className="mt-3 space-y-3">
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
                  className="rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_75%,var(--eid-primary-500)_25%)] bg-eid-card/90 p-3 sm:flex sm:items-stretch sm:gap-3 sm:p-4"
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
                      <p className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-2.5 py-2 text-[11px] italic text-eid-text-secondary">
                        “{p.mensagem.trim()}”
                      </p>
                    ) : null}
                    <div className={CANDIDATURA_ACOES_ROW_CLASS}>
                      <ResponderCandidaturaForm candidaturaId={p.id} aceitar={true} label="Aprovar" />
                      <ResponderCandidaturaForm candidaturaId={p.id} aceitar={false} label="Recusar" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mb-4 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/85 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-eid-text-secondary">Mostrando formações com vagas abertas e aceitando pedidos.</p>
        </div>

        <SearchFilterForm
          defaultValue={sp.q ?? ""}
          placeholder="Buscar time ou cidade..."
          scope="times"
          formAction="/times"
          showButton={false}
          submitOnPick
          className="mt-3 w-full"
          inputClassName="eid-input-dark h-11 w-full rounded-xl px-3 text-[15px] font-medium text-eid-fg placeholder:text-[13px] placeholder:text-eid-text-secondary/90"
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
