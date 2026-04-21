import Image from "next/image";
import Link from "next/link";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { requireOrganizerContext } from "@/lib/auth/active-context-server";
import { createClient } from "@/lib/supabase/server";
import { formatTorneioCategorias, parseTorneioCategorias } from "@/lib/torneios/categorias";

export const metadata = {
  title: "Painel do organizador",
};

export default async function OrganizadorPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const { user } = await requireOrganizerContext();
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim().toLowerCase();
  const supabase = await createClient();

  const [{ count: torneiosCount }, { count: locaisCount }, { data: meusTorneios }, { data: meusLocais }] = await Promise.all([
    supabase.from("torneios").select("id", { count: "exact", head: true }).eq("criador_id", user.id),
    supabase
      .from("espacos_genericos")
      .select("id", { count: "exact", head: true })
      .or(`criado_por_usuario_id.eq.${user.id},responsavel_usuario_id.eq.${user.id}`),
    supabase
      .from("torneios")
      .select("id, nome, status, data_inicio, espaco_generico_id, valor_inscricao, categoria, categorias_json, banner, logo_arquivo")
      .eq("criador_id", user.id)
      .order("id", { ascending: false })
      .limit(12),
    supabase
      .from("espacos_genericos")
      .select("id, nome_publico, localizacao, ownership_status, ativo_listagem")
      .or(`criado_por_usuario_id.eq.${user.id},responsavel_usuario_id.eq.${user.id}`)
      .order("id", { ascending: false })
      .limit(8),
  ]);

  const torneioIds = (meusTorneios ?? []).map((torneio) => Number(torneio.id)).filter(Number.isFinite);
  const { data: inscricoesFinanceiras } = torneioIds.length
    ? await supabase
        .from("torneio_inscricoes")
        .select("torneio_id, payment_status, status_inscricao, valor_total_cobranca, valor_para_organizador")
        .in("torneio_id", torneioIds)
    : { data: [] };

  const inscricoesPendentes = (inscricoesFinanceiras ?? []).filter((item) => item.status_inscricao === "pendente").length;
  const receitasBrutas = (inscricoesFinanceiras ?? []).reduce(
    (sum, item) => sum + Number(item.valor_total_cobranca ?? 0),
    0
  );
  const receitasOrganizador = (inscricoesFinanceiras ?? []).reduce(
    (sum, item) => sum + Number(item.valor_para_organizador ?? 0),
    0
  );
  const pagamentosAprovados = (inscricoesFinanceiras ?? []).filter((item) =>
    ["paid", "received", "confirmado"].includes(String(item.payment_status ?? "").toLowerCase())
  ).length;

  const lista = (meusTorneios ?? []).filter((torneio) => {
    if (!q) return true;
    return String(torneio.nome ?? "").toLowerCase().includes(q);
  });

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-3 sm:px-6 sm:py-4">
        <div className="rounded-3xl border border-eid-action-500/25 bg-gradient-to-br from-eid-card via-eid-card to-eid-action-500/10 p-5 shadow-[0_24px_56px_-22px_rgba(249,115,22,0.32)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-eid-action-400">Modo Organizador</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-eid-fg">Painel operacional</h1>
          <p className="mt-2 max-w-3xl text-sm text-eid-text-secondary">
            Gerencie seus eventos, acompanhe inscrições e opere seus locais sem sair do contexto de organizador.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/torneios/criar"
              className="rounded-xl bg-eid-action-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-[var(--eid-brand-ink)] transition hover:brightness-110"
            >
              Novo torneio
            </Link>
            <Link
              href="/torneios"
              className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/55"
            >
              Ver torneios
            </Link>
            <Link
              href="/locais"
              className="rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-black uppercase tracking-wide text-eid-fg transition hover:border-eid-primary-500/40"
            >
              Gerir locais
            </Link>
          </div>
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Meus torneios</p>
            <p className="mt-1 text-2xl font-black text-eid-fg">{torneiosCount ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Inscrições pendentes</p>
            <p className="mt-1 text-2xl font-black text-eid-fg">{inscricoesPendentes}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Locais vinculados</p>
            <p className="mt-1 text-2xl font-black text-eid-fg">{locaisCount ?? 0}</p>
          </div>
        </section>

        <section className="mt-5 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Financeiro bruto</p>
            <p className="mt-1 text-2xl font-black text-eid-fg">R$ {receitasBrutas.toFixed(2)}</p>
            <p className="mt-1 text-xs text-eid-text-secondary">Visual consolidado das cobranças vinculadas às inscrições.</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Repasse organizador</p>
            <p className="mt-1 text-2xl font-black text-eid-fg">R$ {receitasOrganizador.toFixed(2)}</p>
            <p className="mt-1 text-xs text-eid-text-secondary">Base pronta para conciliar com o Asaas no próximo passo operacional.</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Pagamentos aprovados</p>
            <p className="mt-1 text-2xl font-black text-eid-fg">{pagamentosAprovados}</p>
            <p className="mt-1 text-xs text-eid-text-secondary">Inscrições já liquidadas ou recebidas pelo gateway.</p>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-eid-fg">Torneios recentes</h2>
              <p className="mt-1 text-xs text-eid-text-secondary">Eventos que você criou neste contexto.</p>
            </div>
            <Link href="/conta/esportes-eid" className="text-xs font-semibold text-eid-primary-300 hover:underline">
              Configurar atleta/EID
            </Link>
          </div>
          {lista.length === 0 ? (
            <p className="mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 p-4 text-sm text-eid-text-secondary">
              Nenhum torneio encontrado no momento.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {lista.map((torneio) => (
                <div key={torneio.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 p-4">
                  <div className="flex items-start gap-3">
                    {torneio.logo_arquivo ? (
                      <Image src={torneio.logo_arquivo} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-xl object-cover" />
                    ) : torneio.banner ? (
                      <Image src={torneio.banner} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-eid-card text-[10px] font-black uppercase text-eid-primary-300">
                        EID
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-eid-fg">{torneio.nome ?? "Torneio"}</p>
                      <p className="mt-1 text-[11px] text-eid-text-secondary">
                        Status: <span className="font-semibold text-eid-fg">{torneio.status ?? "aberto"}</span>
                        {torneio.data_inicio ? ` · Início ${new Date(torneio.data_inicio).toLocaleDateString("pt-BR")}` : ""}
                      </p>
                      {torneio.categoria ? <p className="mt-1 text-[11px] text-eid-text-secondary">{torneio.categoria}</p> : null}
                      {parseTorneioCategorias(torneio.categorias_json).length > 0 ? (
                        <p className="mt-1 text-[11px] text-eid-text-secondary">
                          {formatTorneioCategorias(parseTorneioCategorias(torneio.categorias_json))}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    <Link href={`/torneios/${torneio.id}`} className="font-semibold text-eid-primary-300 hover:underline">
                      Página pública
                    </Link>
                    <Link href={`/conta/torneio/${torneio.id}`} className="font-semibold text-eid-action-400 hover:underline">
                      Editar
                    </Link>
                    <Link href={`/torneios/${torneio.id}/chave`} className="font-semibold text-eid-primary-300 hover:underline">
                      Chaveamento
                    </Link>
                    <Link href={`/torneios/${torneio.id}/operacao`} className="font-semibold text-eid-action-400 hover:underline">
                      Operação
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-eid-fg">Locais do organizador</h2>
              <p className="mt-1 text-xs text-eid-text-secondary">Sedes próprias, sugeridas ou já verificadas.</p>
            </div>
            <Link href="/locais/cadastrar" className="text-xs font-semibold text-eid-primary-300 hover:underline">
              Novo local
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(meusLocais ?? []).map((local) => (
              <div key={local.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 p-4">
                <p className="text-sm font-bold text-eid-fg">{local.nome_publico ?? "Local"}</p>
                <p className="mt-1 text-[11px] text-eid-text-secondary">{local.localizacao ?? "Localização não informada"}</p>
                <p className="mt-1 text-[11px] text-eid-text-secondary">
                  {local.ownership_status === "verificado"
                    ? "Verificado"
                    : local.ownership_status === "pendente_validacao"
                      ? "Em validação"
                      : "Genérico"}{" "}
                  · {local.ativo_listagem ? "Listagem ativa" : "Fora da vitrine"}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <Link href={`/local/${local.id}`} className="font-semibold text-eid-primary-300 hover:underline">
                    Abrir
                  </Link>
                  <Link href={`/conta/local/${local.id}`} className="font-semibold text-eid-action-400 hover:underline">
                    Editar
                  </Link>
                </div>
              </div>
            ))}
            {(meusLocais ?? []).length === 0 ? (
              <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 p-4 text-sm text-eid-text-secondary sm:col-span-2">
                Você ainda não possui locais vinculados para usar como sede.
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}
