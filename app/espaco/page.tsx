import Link from "next/link";
import { EspacoConfigForm } from "@/components/espaco/espaco-config-form";
import { abrirPainelEspacoAction, criarPlanoSocioEspacoAction, criarUnidadeEspacoAction } from "@/app/espaco/actions";
import { getEspacoSelecionado } from "@/lib/espacos/server";

type Props = {
  searchParams?: Promise<{ espaco?: string }>;
};

function moedaCentavos(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((Number(value ?? 0) || 0) / 100);
}

export default async function EspacoHomePage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const espacoId = Number(sp.espaco ?? 0) || null;
  const { supabase, managedSpaces, selectedSpace } = await getEspacoSelecionado({
    nextPath: "/espaco",
    espacoId,
  });

  const [{ data: unidades }, { data: socios }, { data: planos }, { data: waitlist }, { data: transacoes }] =
    await Promise.all([
      supabase
        .from("espaco_unidades")
        .select("id, nome, tipo_unidade, status_operacao, superficie")
        .eq("espaco_generico_id", selectedSpace.id)
        .order("ordem", { ascending: true }),
      supabase
        .from("espaco_socios")
        .select("id, status, financeiro_status")
        .eq("espaco_generico_id", selectedSpace.id),
      supabase
        .from("espaco_planos_socio")
        .select("id, nome, mensalidade_centavos, ativo")
        .eq("espaco_generico_id", selectedSpace.id)
        .order("ordem", { ascending: true }),
      supabase
        .from("espaco_waitlist")
        .select("id, status")
        .eq("espaco_generico_id", selectedSpace.id),
      supabase
        .from("espaco_transacoes")
        .select("id, status, valor_liquido_espaco_centavos")
        .eq("espaco_generico_id", selectedSpace.id),
    ]);

  const sociosAtivos = (socios ?? []).filter((item) => item.status === "ativo").length;
  const sociosPendentes = (socios ?? []).filter((item) => item.status !== "ativo").length;
  const waitlistAtiva = (waitlist ?? []).filter((item) => item.status === "ativa").length;
  const liquidoRecebido = (transacoes ?? [])
    .filter((item) => item.status === "received")
    .reduce((sum, item) => sum + Number(item.valor_liquido_espaco_centavos ?? 0), 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <section className="space-y-4">
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-eid-fg">Resumo operacional</h2>
              <p className="mt-2 text-sm text-eid-text-secondary">
                Central de operação do espaço com visão rápida de sócios, quadras,
                fila de espera e financeiro.
              </p>
            </div>
            {managedSpaces.length > 1 ? (
              <form action={abrirPainelEspacoAction} className="flex items-center gap-2">
                <select
                  name="espaco_id"
                  defaultValue={selectedSpace.id}
                  className="eid-input-dark rounded-xl px-3 py-2 text-xs"
                >
                  {managedSpaces.map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.nome_publico}
                    </option>
                  ))}
                </select>
                <button className="rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg">
                  Trocar
                </button>
              </form>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 p-4">
              <p className="text-xs text-eid-text-secondary">Quadras/unidades</p>
              <p className="mt-1 text-2xl font-bold text-eid-fg">{(unidades ?? []).length}</p>
            </div>
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 p-4">
              <p className="text-xs text-eid-text-secondary">Sócios ativos</p>
              <p className="mt-1 text-2xl font-bold text-eid-fg">{sociosAtivos}</p>
            </div>
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 p-4">
              <p className="text-xs text-eid-text-secondary">Em análise</p>
              <p className="mt-1 text-2xl font-bold text-eid-fg">{sociosPendentes}</p>
            </div>
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 p-4">
              <p className="text-xs text-eid-text-secondary">Fila ativa</p>
              <p className="mt-1 text-2xl font-bold text-eid-fg">{waitlistAtiva}</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-eid-action-500/20 bg-eid-action-500/10 p-4">
            <p className="text-xs text-eid-text-secondary">Líquido recebido</p>
            <p className="mt-1 text-2xl font-bold text-eid-fg">
              {moedaCentavos(liquidoRecebido)}
            </p>
            <Link
              href="/espaco/financeiro"
              className="mt-3 inline-flex text-xs font-semibold text-eid-action-400 underline"
            >
              Abrir financeiro
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Configurações públicas</h2>
          <p className="mt-2 text-sm text-eid-text-secondary">
            Dados da landing pública, regras operacionais e parâmetros de reserva.
          </p>
          <div className="mt-4">
            <EspacoConfigForm
              espaco={{
                id: selectedSpace.id,
                nome_publico: selectedSpace.nome_publico,
                slug: selectedSpace.slug,
                cidade: selectedSpace.cidade ?? null,
                uf: selectedSpace.uf ?? null,
                localizacao: selectedSpace.localizacao ?? null,
                cover_arquivo: selectedSpace.cover_arquivo ?? null,
                whatsapp_contato: selectedSpace.whatsapp_contato ?? null,
                email_contato: selectedSpace.email_contato ?? null,
                website_url: selectedSpace.website_url ?? null,
                instagram_url: selectedSpace.instagram_url ?? null,
                descricao_curta: selectedSpace.descricao_curta ?? null,
                descricao_longa: selectedSpace.descricao_longa ?? null,
                aceita_socios: selectedSpace.aceita_socios ?? false,
                permite_professores_aprovados:
                  selectedSpace.permite_professores_aprovados ?? true,
                configuracao_reservas_json: selectedSpace.configuracao_reservas_json,
              }}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Adicionar quadra/unidade</h2>
          <form action={criarUnidadeEspacoAction} className="mt-4 grid gap-3">
            <input type="hidden" name="espaco_id" value={selectedSpace.id} />
            <input
              name="nome"
              placeholder="Nome da unidade"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                name="tipo_unidade"
                defaultValue="quadra"
                placeholder="Quadra, campo..."
                className="eid-input-dark rounded-xl px-3 py-2 text-sm"
              />
              <input
                name="superficie"
                placeholder="Saibro, rápida..."
                className="eid-input-dark rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="number"
                name="capacidade"
                defaultValue={4}
                className="eid-input-dark rounded-xl px-3 py-2 text-sm"
              />
              <input
                name="status_operacao"
                defaultValue="ativa"
                className="eid-input-dark rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-eid-fg">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="coberta" />
                Coberta
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="indoor" />
                Indoor
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="iluminacao" />
                Iluminação
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="aceita_aulas" defaultChecked />
                Aceita aulas
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="aceita_torneios" defaultChecked />
                Aceita torneios
              </label>
            </div>
            <button className="eid-btn-primary rounded-xl px-4 py-3 text-sm font-bold">
              Criar unidade
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Planos rápidos</h2>
          <form action={criarPlanoSocioEspacoAction} className="mt-4 grid gap-3">
            <input type="hidden" name="espaco_id" value={selectedSpace.id} />
            <input
              name="nome"
              placeholder="Ex.: Ouro"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
            />
            <textarea
              name="descricao"
              rows={2}
              placeholder="Resumo dos benefícios"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="number"
                name="mensalidade_centavos"
                step={100}
                placeholder="Mensalidade em centavos"
                className="eid-input-dark rounded-xl px-3 py-2 text-sm"
              />
              <input
                type="number"
                name="taxa_adesao_centavos"
                step={100}
                placeholder="Taxa de adesão"
                className="eid-input-dark rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="number"
                name="reservas_gratuitas_semana"
                placeholder="Reservas grátis/semana"
                className="eid-input-dark rounded-xl px-3 py-2 text-sm"
              />
              <input
                type="number"
                step="0.01"
                name="percentual_desconto_avulso"
                placeholder="Desconto avulso"
                className="eid-input-dark rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <button className="rounded-xl border border-eid-action-500/35 bg-eid-action-500/10 px-4 py-3 text-sm font-bold text-eid-action-400">
              Criar plano
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {(planos ?? []).map((plano) => (
              <div
                key={plano.id}
                className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3"
              >
                <p className="text-sm font-semibold text-eid-fg">{plano.nome}</p>
                <p className="mt-1 text-xs text-eid-text-secondary">
                  {moedaCentavos(plano.mensalidade_centavos)} ·{" "}
                  {plano.ativo ? "Ativo" : "Inativo"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
