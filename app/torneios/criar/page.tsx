import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { getAuthContextState } from "@/lib/auth/active-context-server";
import { createClient } from "@/lib/supabase/server";
import { criarTorneo } from "@/app/torneios/actions";
import {
  CRITERIOS_DESEMPATE,
  FORMATOS_COMPETICAO,
  MELHOR_DE_PARTIDA,
  MODALIDADES_PARTICIPACAO,
  STATUS_TORNEIO,
} from "@/lib/torneios/catalog";
import { TORNEIO_CATEGORIAS_PUBLICO } from "@/lib/torneios/categorias";
import { usuarioPodeCriarTorneio } from "@/lib/torneios/organizador";

export const metadata = {
  title: "Criar torneio",
  description: "Cadastre um torneio no EsporteID",
};

export default async function CriarTorneioPage({
  searchParams,
}: {
  searchParams?: Promise<{ erro?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const contextState = await getAuthContextState();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/torneios/criar");
  if (contextState.papeis.includes("organizador") && contextState.activeContext !== "organizador") {
    redirect("/dashboard?erro=modo_organizador");
  }

  const pode = await usuarioPodeCriarTorneio(supabase, user.id);
  if (!pode) {
    return (
      <>
        <DashboardTopbar />
        <main className="mx-auto w-full max-w-lg px-3 py-6 sm:max-w-2xl sm:px-6">
          <Link href="/torneios" className="text-xs font-semibold text-eid-primary-300 hover:underline">
            ← Voltar aos torneios
          </Link>
          <h1 className="mt-4 text-xl font-bold text-eid-fg">Criar torneio</h1>
          <p className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Apenas perfis com papel de <strong>organizador</strong> podem criar torneios. Conclua o onboarding e marque
            organizador, ou ajuste seu tipo de perfil.
          </p>
          <Link href="/dashboard" className="mt-6 inline-block text-sm font-bold text-eid-primary-300 hover:underline">
            Ir ao painel
          </Link>
        </main>
      </>
    );
  }

  const erroMsg =
    sp.erro === "nome"
      ? "Informe um nome com pelo menos 3 caracteres."
      : sp.erro === "esporte"
        ? "Selecione um esporte."
        : sp.erro === "gravacao"
          ? "Não foi possível salvar. Tente novamente."
          : sp.erro === "permissao"
            ? "Sem permissão para criar torneio."
            : null;

  const { data: esportes } = await supabase.from("esportes").select("id, nome").order("nome", { ascending: true });

  const { data: locais } = await supabase
    .from("espacos_genericos")
    .select("id, nome_publico, localizacao")
    .eq("ativo_listagem", true)
    .order("nome_publico", { ascending: true })
    .limit(200);

  return (
    <>
      <DashboardTopbar />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
        <div className="relative mb-6 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 md:overflow-hidden md:rounded-3xl md:border-eid-action-500/25 md:bg-gradient-to-br md:from-eid-card md:via-eid-card md:to-eid-action-500/10 md:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 hidden h-40 w-40 rounded-full bg-eid-action-500/20 blur-3xl md:block" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link href="/torneios" className="text-xs font-semibold text-eid-primary-300 hover:underline">
                ← Voltar aos torneios
              </Link>
              <h1 className="mt-3 text-xl font-black tracking-tight text-eid-fg md:text-3xl">Criar torneio</h1>
              <p className="mt-2 max-w-2xl text-sm text-eid-text-secondary">
                Defina esporte, formato de disputa, critérios e regulamento. As inscrições ficam pendentes até o fluxo de
                pagamento estar conectado.
              </p>
            </div>
          </div>
        </div>

        {erroMsg ? (
          <p className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">
            {erroMsg}
          </p>
        ) : null}

        <form
          action={criarTorneo}
          className="space-y-6 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 sm:p-6 md:rounded-3xl"
        >
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Dados gerais</h2>
            <div>
              <label htmlFor="nome" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                Nome do torneio *
              </label>
              <input
                id="nome"
                name="nome"
                required
                minLength={3}
                placeholder="Ex.: Open de Beach Tênis 2026"
                className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="esporte_id" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                  Esporte *
                </label>
                <select
                  id="esporte_id"
                  name="esporte_id"
                  required
                  className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {(esportes ?? []).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="status" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
                  defaultValue="aberto"
                >
                  {STATUS_TORNEIO.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="data_inicio" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                  Data de início
                </label>
                <input
                  id="data_inicio"
                  name="data_inicio"
                  type="date"
                  className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
                />
              </div>
              <div>
                <label htmlFor="data_fim" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                  Data de término
                </label>
                <input id="data_fim" name="data_fim" type="date" className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="valor_inscricao" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                  Valor da inscrição (R$)
                </label>
                <input
                  id="valor_inscricao"
                  name="valor_inscricao"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  defaultValue="0"
                  className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
                />
              </div>
              <div>
                <label htmlFor="categoria" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                  Divisão / classe principal
                </label>
                <input
                  id="categoria"
                  name="categoria"
                  placeholder="Ex.: Pro B, Iniciante, Misto"
                  className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">Categorias públicas</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TORNEIO_CATEGORIAS_PUBLICO.map((categoria) => (
                  <label
                    key={categoria.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 px-3 py-2 text-xs text-eid-fg"
                  >
                    <input type="checkbox" name="categoria_publico" value={categoria.id} />
                    {categoria.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="banner" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                URL da capa (opcional)
              </label>
              <input
                id="banner"
                name="banner"
                type="url"
                placeholder="https://…"
                className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
              />
            </div>
            <div>
              <label htmlFor="logo_arquivo" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                URL do logo (opcional)
              </label>
              <input
                id="logo_arquivo"
                name="logo_arquivo"
                type="url"
                placeholder="https://…"
                className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
              />
            </div>
            <div>
              <label htmlFor="espaco_generico_id" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                Local / sede (opcional)
              </label>
              <select
                id="espaco_generico_id"
                name="espaco_generico_id"
                className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
                defaultValue=""
              >
                <option value="">Nenhum / a definir</option>
                {(locais ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome_publico} — {l.localizacao}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="space-y-4 border-t border-[color:var(--eid-border-subtle)] pt-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Formato e regras</h2>
            <div>
              <label htmlFor="formato_competicao" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                Forma de disputa
              </label>
              <select
                id="formato_competicao"
                name="formato_competicao"
                className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
                defaultValue="grupos_mata_mata"
              >
                {FORMATOS_COMPETICAO.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-eid-text-secondary">
                Cada opção é um modelo comum; use o regulamento para detalhar fases, pontuação e exceções do seu esporte.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="criterio_desempate" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                  Critério de desempate
                </label>
                <select
                  id="criterio_desempate"
                  name="criterio_desempate"
                  className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
                  defaultValue="sets"
                >
                  {CRITERIOS_DESEMPATE.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="modalidade_participacao" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                  Modalidade de participação
                </label>
                <select
                  id="modalidade_participacao"
                  name="modalidade_participacao"
                  className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
                  defaultValue="individual"
                >
                  {MODALIDADES_PARTICIPACAO.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="melhor_de" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                  Partidas (finais / série)
                </label>
                <select id="melhor_de" name="melhor_de" className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg" defaultValue="1">
                  {MELHOR_DE_PARTIDA.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="vagas_max" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                  Vagas máximas (opcional)
                </label>
                <input
                  id="vagas_max"
                  name="vagas_max"
                  type="number"
                  min={1}
                  placeholder="Ilimitado se vazio"
                  className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
                />
              </div>
            </div>
            <div>
              <label htmlFor="observacoes_regras" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                Observações sobre placar / regras específicas
              </label>
              <textarea
                id="observacoes_regras"
                name="observacoes_regras"
                rows={2}
                placeholder="Ex.: tie-break ao 6-6; desempate por sorteio após saldo de sets…"
                className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-[color:var(--eid-border-subtle)] pt-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Textos</h2>
            <div>
              <label htmlFor="descricao" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                Descrição (opcional)
              </label>
              <textarea
                id="descricao"
                name="descricao"
                rows={3}
                className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
              />
            </div>
            <div>
              <label htmlFor="regulamento" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                Regulamento
              </label>
              <textarea
                id="regulamento"
                name="regulamento"
                rows={5}
                placeholder="Regras completas do torneio…"
                className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
              />
            </div>
            <div>
              <label htmlFor="premios" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                Prêmios
              </label>
              <textarea id="premios" name="premios" rows={3} className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg" />
            </div>
          </section>

          <button type="submit" className="eid-btn-primary w-full min-h-[48px] rounded-2xl text-sm font-black uppercase tracking-wide">
            Publicar torneio
          </button>
        </form>
      </div>
    </>
  );
}
