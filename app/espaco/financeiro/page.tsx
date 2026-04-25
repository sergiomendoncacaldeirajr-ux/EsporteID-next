import Link from "next/link";
import { EspacoMensalidadePaasCheckout } from "@/components/espaco/espaco-mensalidade-paas-checkout";
import { EspacoPlanosPaaSFinanceiro } from "@/components/espaco/espaco-planos-paas-financeiro";
import { getEspacoSelecionado } from "@/lib/espacos/server";

type PlanoPaaSFinanceiroRow = {
  id: number;
  nome: string;
  min_unidades: number;
  max_unidades: number | null;
  valor_mensal_centavos: number;
  socios_mensal_modo: string | null;
};

type Props = {
  searchParams?: Promise<{ espaco?: string; onboarding?: string }>;
};

function moeda(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((Number(value ?? 0) || 0) / 100);
}

export default async function EspacoFinanceiroPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const espacoId = Number(sp.espaco ?? 0) || null;
  const { supabase, selectedSpace } = await getEspacoSelecionado({
    nextPath: "/espaco/financeiro",
    espacoId,
  });

  const categoria = selectedSpace.categoria_mensalidade ?? "outro";
  const onboardingPagamento = String(sp.onboarding ?? "") === "pagamento";
  const categoriaLabel: Record<string, string> = {
    condominio: "Condomínio",
    clube: "Clube",
    centro_esportivo: "Centro esportivo",
    quadra: "Quadra / espaço aberto",
    outro: "Outro",
  };

  const [{ data: transacoes }, { data: assinatura }, { data: extrato }, { data: auditoria }, { data: planosPaaS }] =
    await Promise.all([
      supabase
        .from("espaco_transacoes")
        .select("id, tipo, status, valor_bruto_centavos, valor_liquido_espaco_centavos, asaas_charge_url, criado_em")
        .eq("espaco_generico_id", selectedSpace.id)
        .order("id", { ascending: false })
        .limit(30),
      supabase
        .from("espaco_assinaturas_plataforma")
        .select(
          "id, status, plano_nome, valor_mensal_centavos, desconto_progressivo_percentual, proxima_cobranca, plano_mensal_id, trial_inicio, trial_ate, recorrencia_cartao_confirmada_em, cancelamento_bloqueado_ate, isento_total"
        )
        .eq("espaco_generico_id", selectedSpace.id)
        .maybeSingle(),
      supabase
        .from("extrato_lancamentos")
        .select("id, tipo, referencia_tipo, valor_pago_cliente, taxa_gateway, comissao_plataforma, valor_liquido_parceiro, criado_em")
        .eq(
          "parceiro_usuario_id",
          selectedSpace.responsavel_usuario_id ?? selectedSpace.criado_por_usuario_id ?? ""
        )
        .order("id", { ascending: false })
        .limit(20),
      supabase
        .from("espaco_auditoria")
        .select("id, entidade_tipo, acao, motivo, criado_em")
        .eq("espaco_generico_id", selectedSpace.id)
        .order("id", { ascending: false })
        .limit(20),
      selectedSpace.modo_monetizacao === "mensalidade_plataforma"
        ? supabase
            .from("espaco_plano_mensal_plataforma")
            .select("id, nome, min_unidades, max_unidades, valor_mensal_centavos, socios_mensal_modo")
            .is("espaco_generico_id", null)
            .eq("categoria_espaco", categoria)
            .eq("ativo", true)
            .eq("liberacao", "publico")
            .order("ordem", { ascending: true })
        : Promise.resolve({ data: [] as never[] }),
    ]);
  const ocultarMensalidadePlataforma = Boolean(assinatura?.isento_total);

  const totalRecebido = (transacoes ?? [])
    .filter((item) => item.status === "received")
    .reduce(
      (sum, item) => sum + Number(item.valor_liquido_espaco_centavos ?? 0),
      0
    );

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      {onboardingPagamento ? (
        <section className="xl:col-span-2 rounded-2xl border border-eid-action-500/30 bg-eid-action-500/10 p-4">
          <h2 className="text-base font-bold text-eid-fg">Primeiro passo: ativar pagamento para ganhar o mês grátis</h2>
          <p className="mt-1 text-sm text-eid-text-secondary">
            Para concluir o onboarding do espaço, confirme agora o cartão e ative a recorrência.
            O primeiro mês fica gratuito e a primeira cobrança ocorre no mês seguinte.
          </p>
        </section>
      ) : null}
      <section className="eid-mobile-section xl:col-span-2 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h2 className="text-base font-bold text-eid-fg">Conta Asaas e integração</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Para receber pagamentos no fluxo do espaço, você pode criar sua conta no Asaas agora ou abrir sua conta já existente para integrar.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="https://www.asaas.com"
            target="_blank"
            rel="noreferrer"
            className="eid-btn-primary rounded-xl px-4 py-2.5 text-sm font-bold"
          >
            Criar conta no Asaas
          </a>
          <a
            href="https://www.asaas.com/painel"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/10 px-4 py-2.5 text-sm font-bold text-eid-primary-200"
          >
            Já tenho — entrar no Asaas
          </a>
          <Link
            href="/espaco/integracao-asaas"
            className="rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2.5 text-sm font-bold text-eid-fg"
          >
            Configurar integração no painel
          </Link>
        </div>
      </section>
      <section className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h2 className="text-lg font-bold text-eid-fg">Transações</h2>
        <p className="mt-2 text-sm text-eid-text-secondary">
          {selectedSpace.nome_publico} · total líquido recebido {moeda(totalRecebido)}
        </p>
        <div className="mt-4 space-y-2">
          {(transacoes ?? []).length ? (
            (transacoes ?? []).map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-eid-fg">{item.tipo}</p>
                    <p className="mt-1 text-xs text-eid-text-secondary">
                      Status {item.status} · bruto {moeda(item.valor_bruto_centavos)} · líquido{" "}
                      {moeda(item.valor_liquido_espaco_centavos)}
                    </p>
                    <p className="mt-1 text-[11px] text-eid-text-secondary">
                      {item.criado_em
                        ? new Date(item.criado_em).toLocaleString("pt-BR")
                        : "-"}
                    </p>
                  </div>
                  {item.asaas_charge_url ? (
                    <a
                      href={item.asaas_charge_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-eid-primary-500/35 px-3 py-2 text-xs font-semibold text-eid-primary-300"
                    >
                      Abrir cobrança
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-eid-text-secondary">
              Nenhuma transação gerada ainda.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        {!ocultarMensalidadePlataforma ? (
        <div className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Assinatura da plataforma</h2>
          {selectedSpace.modo_monetizacao === "mensalidade_plataforma" ? (
            <div className="mt-4 rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/5 p-4">
              <h3 className="text-sm font-bold text-eid-fg">Planos (faixa de quadras)</h3>
              <p className="mt-1 text-xs text-eid-text-secondary">
                Categoria do espaço: <span className="font-semibold text-eid-fg">{categoriaLabel[categoria] ?? categoria}</span>.
                Compare os direitos e selecione o plano antes de gerar o pagamento.
              </p>
              <EspacoPlanosPaaSFinanceiro
                espacoId={selectedSpace.id}
                categoriaLabel={categoriaLabel[categoria] ?? categoria}
                planos={(planosPaaS ?? []) as PlanoPaaSFinanceiroRow[]}
                planoAtualId={(assinatura as { plano_mensal_id?: number | null } | null)?.plano_mensal_id ?? null}
              />
            </div>
          ) : null}
          {assinatura ? (
            <div className="mt-3 space-y-2 text-sm text-eid-text-secondary">
              <p>
                Plano <span className="font-semibold text-eid-fg">{assinatura.plano_nome}</span>
              </p>
              <p>Status {assinatura.status}</p>
              <p>Mensalidade {moeda(assinatura.valor_mensal_centavos)}</p>
              <p>
                Mês grátis {assinatura.trial_inicio ?? "-"} até {assinatura.trial_ate ?? "-"}
              </p>
              <p>
                Recorrência no cartão{" "}
                {assinatura.recorrencia_cartao_confirmada_em
                  ? `confirmada em ${new Date(assinatura.recorrencia_cartao_confirmada_em).toLocaleString("pt-BR")}`
                  : "ainda não confirmada"}
              </p>
              <p>
                Cancelamento liberado a partir de{" "}
                {assinatura.cancelamento_bloqueado_ate ?? "-"}
              </p>
              <p>
                Desconto progressivo{" "}
                {Number(assinatura.desconto_progressivo_percentual ?? 0) * 100}%
              </p>
              <p>Próxima cobrança {assinatura.proxima_cobranca ?? "-"}</p>
              <EspacoMensalidadePaasCheckout espacoId={selectedSpace.id} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-eid-text-secondary">
              Assinatura da plataforma ainda não configurada.
            </p>
          )}
        </div>
        ) : null}

        <div className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Extrato legado</h2>
          <div className="mt-3 space-y-2">
            {(extrato ?? []).length ? (
              (extrato ?? []).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3 text-xs text-eid-text-secondary"
                >
                  <p className="font-semibold text-eid-fg">
                    {item.tipo} · {item.referencia_tipo}
                  </p>
                  <p className="mt-1">
                    Cliente R$ {Number(item.valor_pago_cliente ?? 0).toFixed(2).replace(".", ",")} ·
                    gateway R$ {Number(item.taxa_gateway ?? 0).toFixed(2).replace(".", ",")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-eid-text-secondary">
                Sem lançamentos espelhados ainda.
              </p>
            )}
          </div>
        </div>

        <div className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Auditoria</h2>
          <div className="mt-3 space-y-2">
            {(auditoria ?? []).length ? (
              (auditoria ?? []).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3 text-xs text-eid-text-secondary"
                >
                  <p className="font-semibold text-eid-fg">
                    {item.entidade_tipo} · {item.acao}
                  </p>
                  <p className="mt-1">{item.motivo ?? "Sem motivo registrado."}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-eid-text-secondary">
                Auditoria ainda sem eventos.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
