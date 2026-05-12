import Link from "next/link";
import {
  alternarAtivoUnidadeEspacoAction,
  atualizarUnidadeEspacoAction,
  criarPlanoSocioEspacoAction,
  criarUnidadeEspacoAction,
} from "@/app/espaco/actions";
import { EspacoConfigForm } from "@/components/espaco/espaco-config-form";
import { EspacoUnidadeLogoControl } from "@/components/espaco/espaco-unidade-logo-control";
import { getPaaSUnidadeGateInfo } from "@/lib/espacos/paas-unidades-gate";
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

function planoHerdaRegra(plano: { beneficios_json?: unknown }, key: string) {
  const beneficios = plano.beneficios_json;
  if (!beneficios || typeof beneficios !== "object" || Array.isArray(beneficios)) return false;
  const herdar = (beneficios as Record<string, unknown>).herdar_regras_globais;
  return Boolean(
    herdar &&
      typeof herdar === "object" &&
      !Array.isArray(herdar) &&
      (herdar as Record<string, unknown>)[key] === true
  );
}

export default async function EspacoConfiguracaoPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const espacoId = Number(sp.espaco ?? 0) || null;
  const { supabase, selectedSpace } = await getEspacoSelecionado({
    nextPath: "/espaco/configuracao",
    espacoId,
  });

  const [{ data: unidades }, { data: planos }, unidadeGate] = await Promise.all([
    supabase
      .from("espaco_unidades")
      .select(
        "id, nome, tipo_unidade, status_operacao, superficie, ativo, logo_arquivo, modalidade, observacoes, coberta, indoor, iluminacao, capacidade, aceita_aulas, aceita_torneios"
      )
      .eq("espaco_generico_id", selectedSpace.id)
      .order("ordem", { ascending: true }),
    supabase
      .from("espaco_planos_socio")
      .select("id, nome, mensalidade_centavos, ativo, reservas_gratuitas_semana, limite_reservas_semana, cooldown_horas, antecedencia_max_dias, beneficios_json")
      .eq("espaco_generico_id", selectedSpace.id)
      .order("ordem", { ascending: true }),
    getPaaSUnidadeGateInfo(supabase, selectedSpace.id),
  ]);

  const modoReserva = selectedSpace.modo_reserva ?? "mista";
  const monetPaaS = selectedSpace.modo_monetizacao === "mensalidade_plataforma";
  const limiteTxt =
    unidadeGate.maxUnidadesPlano != null
      ? `${unidadeGate.unidadesTotal} / ${unidadeGate.maxUnidadesPlano} unidades no plano`
      : `${unidadeGate.unidadesTotal} unidade(s)`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-eid-fg">Configuração do espaço</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Dados públicos, regras de reserva, unidades e planos de mensalidade — tudo que define como o local aparece e
          cobra.
        </p>
      </div>

      <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h3 className="text-base font-bold text-eid-fg">Perfil e regras de reserva</h3>
        <p className="mt-2 text-sm text-eid-text-secondary">
          Landing, contatos, limites, cooldown e política de cancelamento. O modo de reserva (paga / mista / gratuita)
          vem do contrato com a plataforma; em modo só paga, benefícios gratuitos ficam bloqueados automaticamente.
        </p>
        <div className="mt-4">
          <EspacoConfigForm
            modoReserva={modoReserva}
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
              permite_professores_aprovados: selectedSpace.permite_professores_aprovados ?? true,
              configuracao_reservas_json: selectedSpace.configuracao_reservas_json,
              associacao_regra_json: selectedSpace.associacao_regra_json,
            }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h3 className="text-base font-bold text-eid-fg">Quadras e unidades</h3>
        <p className="mt-2 text-sm text-eid-text-secondary">
          Cadastre quadras ou salas com nome, foto, características e uso. Você pode pausar uma unidade sem apagar o
          histórico de reservas.
        </p>
        {monetPaaS ? (
          <p className="mt-2 text-xs text-eid-text-secondary">
            Plano PaaS: <span className="font-semibold text-eid-fg">{unidadeGate.planoNome ?? "não selecionado"}</span> ·{" "}
            {limiteTxt}
            {unidadeGate.maxUnidadesPlano != null ? (
              <span className="block pt-1 text-[11px]">
                Limite do plano atual: até {unidadeGate.maxUnidadesPlano} quadra(s) ou unidade(s) cadastradas.
              </span>
            ) : unidadeGate.planoMensalId ? (
              <span className="block pt-1 text-[11px]">Plano sem teto fixo de unidades (faixa superior aberta).</span>
            ) : null}
          </p>
        ) : null}
        {!unidadeGate.podeCriarUnidade && unidadeGate.motivoBloqueio ? (
          <div className="mt-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            <p>{unidadeGate.motivoBloqueio}</p>
            <Link href="/espaco/financeiro" className="mt-2 inline-block text-xs font-bold text-amber-200 underline">
              Abrir financeiro e planos
            </Link>
          </div>
        ) : null}

        <div className="mt-4 space-y-6">
          {(unidades ?? []).map((u) => {
            const sim = (v: boolean) => (v ? "sim" : "nao");
            return (
              <div
                key={u.id}
                className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  {u.logo_arquivo ? (
                    <img
                      src={u.logo_arquivo}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-xl border border-[color:var(--eid-border-subtle)] object-cover"
                    />
                  ) : (
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] text-[10px] text-eid-text-secondary">
                      Sem foto
                    </div>
                  )}
                  <form
                    action={atualizarUnidadeEspacoAction}
                    encType="multipart/form-data"
                    className="min-w-0 flex-1 space-y-2"
                  >
                    <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                    <input type="hidden" name="unidade_id" value={u.id} />
                    <p className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">Editar unidade</p>
                    <input
                      name="nome"
                      defaultValue={u.nome}
                      className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        name="tipo_unidade"
                        defaultValue={u.tipo_unidade}
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm"
                      />
                      <input
                        name="superficie"
                        defaultValue={u.superficie ?? ""}
                        placeholder="Superfície"
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                    <input
                      name="modalidade"
                      defaultValue={u.modalidade ?? ""}
                      placeholder="Modalidade (opcional)"
                      className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
                    />
                    <textarea
                      name="observacoes"
                      rows={2}
                      defaultValue={u.observacoes ?? ""}
                      placeholder="Observações internas"
                      className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="number"
                        name="capacidade"
                        defaultValue={u.capacidade}
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm"
                      />
                      <input
                        name="status_operacao"
                        defaultValue={u.status_operacao}
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="grid gap-2 text-xs sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-eid-text-secondary">
                        Coberta
                        <select name="coberta" defaultValue={sim(Boolean(u.coberta))} className="eid-input-dark rounded-xl px-2 py-2">
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-eid-text-secondary">
                        Indoor
                        <select name="indoor" defaultValue={sim(Boolean(u.indoor))} className="eid-input-dark rounded-xl px-2 py-2">
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-eid-text-secondary">
                        Iluminação
                        <select name="iluminacao" defaultValue={sim(Boolean(u.iluminacao))} className="eid-input-dark rounded-xl px-2 py-2">
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-eid-text-secondary">
                        Aceita aulas
                        <select name="aceita_aulas" defaultValue={sim(Boolean(u.aceita_aulas))} className="eid-input-dark rounded-xl px-2 py-2">
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-eid-text-secondary sm:col-span-2">
                        Aceita torneios
                        <select name="aceita_torneios" defaultValue={sim(Boolean(u.aceita_torneios))} className="eid-input-dark rounded-xl px-2 py-2">
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </label>
                    </div>
                    <EspacoUnidadeLogoControl currentUrl={u.logo_arquivo ?? null} />
                    <button
                      type="submit"
                      className="rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/15 px-4 py-2 text-xs font-bold text-eid-primary-200"
                    >
                      Salvar alterações
                    </button>
                  </form>
                  <form action={alternarAtivoUnidadeEspacoAction} className="shrink-0">
                    <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                    <input type="hidden" name="unidade_id" value={u.id} />
                    <button
                      type="submit"
                      className="w-full rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg sm:w-auto"
                    >
                      {u.ativo ? "Pausar" : "Reativar"}
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>

        <form
          action={criarUnidadeEspacoAction}
          encType="multipart/form-data"
          className="mt-6 grid gap-3 border-t border-[color:var(--eid-border-subtle)] pt-6"
        >
          <input type="hidden" name="espaco_id" value={selectedSpace.id} />
          <p className="text-sm font-semibold text-eid-fg">Nova unidade</p>
          {!unidadeGate.podeCriarUnidade ? (
            <p className="text-xs text-eid-text-secondary">
              Criação bloqueada pelas regras acima. Ajuste plano ou pagamento em Financeiro.
            </p>
          ) : null}
          <fieldset disabled={!unidadeGate.podeCriarUnidade} className="grid gap-3">
            <input name="nome" placeholder="Nome da unidade" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                name="tipo_unidade"
                defaultValue="quadra"
                placeholder="Quadra, campo..."
                className="eid-input-dark rounded-xl px-3 py-2 text-sm"
              />
              <input name="superficie" placeholder="Saibro, rápida..." className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            </div>
            <input name="modalidade" placeholder="Modalidade (opcional)" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <textarea
              name="observacoes"
              rows={2}
              placeholder="Observações"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
            />
            <EspacoUnidadeLogoControl currentUrl={null} />
            <div className="grid gap-2 sm:grid-cols-2">
              <input type="number" name="capacidade" defaultValue={4} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              <input name="status_operacao" defaultValue="ativa" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
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
            <button type="submit" className="eid-btn-primary rounded-xl px-4 py-3 text-sm font-bold">
              Criar unidade
            </button>
          </fieldset>
        </form>
      </div>

      <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h3 className="text-base font-bold text-eid-fg">Planos de sócio (mensalidade)</h3>
        <p className="mt-2 text-sm text-eid-text-secondary">
          Valores e benefícios dos planos. Edição avançada de planos existentes pode ser feita pelo time ou em telas
          futuras; aqui você cria novos planos rapidamente.
        </p>
        <p className="mt-2 text-xs text-eid-text-secondary">
          Clube de assinaturas entre sócios:{" "}
          <span className="font-semibold text-eid-fg">{selectedSpace.clube_assinaturas_socios ?? "em_breve"}</span>.
          Esse módulo está em preparação e será liberado gradualmente.
        </p>
        <form action={criarPlanoSocioEspacoAction} className="mt-4 grid gap-3">
          <input type="hidden" name="espaco_id" value={selectedSpace.id} />
          <input name="nome" placeholder="Ex.: Ouro" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
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
              placeholder="Mensalidade (centavos)"
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
              min={0}
              max={999}
              placeholder="Reservas grátis/semana (vazio = global; 0 = livre)"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.01"
              name="percentual_desconto_avulso"
              placeholder="Desconto avulso (%)"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              type="number"
              min={0}
              name="limite_reservas_semana"
              placeholder="Marcações/semana (vazio = global; 0 = livre)"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              max={720}
              name="cooldown_horas"
              placeholder="Intervalo entre marcações (vazio = global)"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              max={365}
              name="antecedencia_max_dias"
              placeholder="Libera agenda em dias (vazio = global)"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3 text-sm text-eid-fg">
            <input type="checkbox" name="uma_reserva_ativa_por_vez" className="mt-1 h-4 w-4 accent-eid-action-500" />
            <span>
              <span className="block font-semibold">1 marcação ativa por vez</span>
              <span className="block text-xs text-eid-text-secondary">
                O sócio só consegue marcar a próxima depois de cancelar ou finalizar a atual.
              </span>
            </span>
          </label>
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
                {moedaCentavos(plano.mensalidade_centavos)} · {plano.ativo ? "Ativo" : "Inativo"}
                {" · "}
                {planoHerdaRegra(plano, "reservas_gratuitas_semana")
                  ? "segue grátis global"
                  : Number(plano.reservas_gratuitas_semana ?? 0) === 0
                  ? "grátis ilimitadas"
                  : `${Number(plano.reservas_gratuitas_semana ?? 0)} grátis/semana`}
                {" · "}
                {planoHerdaRegra(plano, "limite_reservas_semana")
                  ? "segue limite global"
                  : Number(plano.limite_reservas_semana ?? 0) > 0
                  ? `${Number(plano.limite_reservas_semana)} marcações/semana`
                  : "sem limite semanal"}
                {" · "}
                {planoHerdaRegra(plano, "antecedencia_max_dias")
                  ? "segue agenda global"
                  : Number(plano.antecedencia_max_dias ?? 0) === 0
                  ? "agenda sem limite"
                  : `agenda ${Number(plano.antecedencia_max_dias)} dia(s)`}
                {typeof plano.beneficios_json === "object" &&
                plano.beneficios_json &&
                !Array.isArray(plano.beneficios_json) &&
                "uma_reserva_ativa_por_vez" in plano.beneficios_json &&
                plano.beneficios_json.uma_reserva_ativa_por_vez
                  ? " · 1 ativa por vez"
                  : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
