import Link from "next/link";
import { EspacoMensalidadePaasCheckout } from "@/components/espaco/espaco-mensalidade-paas-checkout";
import { EspacoPlanosPaaSFinanceiro } from "@/components/espaco/espaco-planos-paas-financeiro";
import { EspacoSimularPagamentoDev } from "@/components/espaco/espaco-simular-pagamento-dev";
import { isAsaasSimulationEnabledFor } from "@/lib/asaas/simulate-payments";
import { getEspacoSelecionado } from "@/lib/espacos/server";
import { ArrowRight, CheckCircle2, Clock3, Landmark, ReceiptText, WalletCards } from "lucide-react";

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

function asaasStatus(status: string | null | undefined, accountId: string | null | undefined) {
  if (accountId) return { label: "Conta vinculada", tone: "ok", Icon: CheckCircle2 };
  const value = String(status ?? "");
  if (value.includes("aguardando") || value.includes("conexao") || value.includes("criacao")) {
    return { label: "Em ativação", tone: "wait", Icon: Clock3 };
  }
  return { label: "Pendente", tone: "todo", Icon: Landmark };
}

function formatDatePtBr(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function assinaturaInfo(assinatura: {
  status?: string | null;
  recorrencia_cartao_confirmada_em?: string | null;
  isento_total?: boolean | null;
} | null) {
  if (!assinatura) {
    return {
      label: "Pendente",
      description: "Escolha um plano e ative a recorrência para liberar a mensalidade da plataforma.",
      cls: "border-amber-500/35 bg-amber-500/10 text-amber-200",
    };
  }
  if (assinatura.isento_total) {
    return {
      label: "Isento",
      description: "Este espaço está liberado de mensalidade pela plataforma.",
      cls: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
    };
  }
  if (assinatura.recorrencia_cartao_confirmada_em) {
    return {
      label: "Ativa",
      description: `Recorrência confirmada em ${formatDatePtBr(assinatura.recorrencia_cartao_confirmada_em)}.`,
      cls: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
    };
  }
  const status = String(assinatura.status ?? "").toLowerCase();
  if (status === "cancelled" || status === "canceled" || status === "cancelada" || status === "cancelado") {
    return {
      label: "Recorrência pendente",
      description: "O plano foi escolhido, mas o cartão ainda precisa ser validado para ativar a assinatura.",
      cls: "border-amber-500/35 bg-amber-500/10 text-amber-200",
    };
  }
  return {
    label: "Aguardando cartão",
    description: "Valide o cartão para ativar a recorrência da mensalidade.",
    cls: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  };
}

export default async function EspacoFinanceiroPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const espacoId = Number(sp.espaco ?? 0) || null;
  const { supabase, user, selectedSpace } = await getEspacoSelecionado({
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

  const [
    { data: transacoes },
    { data: assinatura },
    { data: extrato },
    { data: planosPaaS },
    { data: parceiroAsaas },
  ] =
    await Promise.all([
      supabase
        .from("espaco_transacoes")
        .select(
          "id, tipo, status, valor_bruto_centavos, valor_liquido_espaco_centavos, asaas_charge_url, asaas_payment_id, criado_em"
        )
        .eq("espaco_generico_id", selectedSpace.id)
        .order("id", { ascending: false })
        .limit(30),
      supabase
        .from("espaco_assinaturas_plataforma")
        .select(
          "id, status, plano_nome, valor_mensal_centavos, desconto_progressivo_percentual, proxima_cobranca, plano_mensal_id, trial_inicio, trial_ate, recorrencia_cartao_confirmada_em, cancelamento_bloqueado_ate, isento_total, asaas_subscription_id"
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
      supabase
        .from("parceiro_conta_asaas")
        .select("nome_razao_social, cpf_cnpj, email, onboarding_status, asaas_account_id, wallet_id, atualizado_em")
        .eq("usuario_id", user.id)
        .maybeSingle(),
    ]);
  const ocultarMensalidadePlataforma = Boolean(assinatura?.isento_total);
  const simularPagamentoDev = await isAsaasSimulationEnabledFor("locais");
  const transacoesPendentesSimulacao = (transacoes ?? []).filter(
    (t) => t.status === "pending" && Boolean(t.asaas_payment_id)
  );

  const totalRecebido = (transacoes ?? [])
    .filter((item) => item.status === "received")
    .reduce(
      (sum, item) => sum + Number(item.valor_liquido_espaco_centavos ?? 0),
      0
    );
  const pendentes = (transacoes ?? []).filter((item) => item.status === "pending").length;
  const asaas = asaasStatus(parceiroAsaas?.onboarding_status, parceiroAsaas?.asaas_account_id);
  const AsaasIcon = asaas.Icon;
  const asaasTone =
    asaas.tone === "ok"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
      : asaas.tone === "wait"
        ? "border-amber-500/35 bg-amber-500/10 text-amber-200"
        : "border-eid-primary-500/30 bg-eid-primary-500/10 text-eid-primary-200";
  const assinaturaResumo = assinaturaInfo(assinatura);

  return (
    <div className="space-y-5">
      {onboardingPagamento ? (
        <section className="rounded-2xl border border-eid-action-500/30 bg-eid-action-500/10 p-4">
          <h2 className="text-base font-bold text-eid-fg">Primeiro passo: ativar pagamento para ganhar o mês grátis</h2>
          <p className="mt-1 text-sm text-eid-text-secondary">
            Para concluir o onboarding do espaço, confirme agora o cartão e ative a recorrência.
            O primeiro mês fica gratuito e a primeira cobrança ocorre no mês seguinte.
          </p>
        </section>
      ) : null}

      <section className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-eid-primary-300">Financeiro</p>
            <h2 className="mt-1 text-2xl font-black text-eid-fg">Recebimentos do espaço</h2>
            <p className="mt-1 text-sm text-eid-text-secondary">{selectedSpace.nome_publico}</p>
          </div>
          <Link
            href="/espaco/integracao-asaas"
            className="inline-flex items-center gap-2 rounded-xl border border-eid-action-500/35 bg-eid-action-500/12 px-4 py-2.5 text-sm font-bold text-eid-action-400 transition hover:bg-eid-action-500/18"
          >
            Conta Asaas
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4">
            <WalletCards className="h-5 w-5 text-eid-action-400" aria-hidden />
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Líquido recebido</p>
            <p className="mt-1 text-3xl font-black text-eid-fg">{moeda(totalRecebido)}</p>
          </div>
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4">
            <ReceiptText className="h-5 w-5 text-eid-primary-300" aria-hidden />
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Transações</p>
            <p className="mt-1 text-3xl font-black text-eid-fg">{(transacoes ?? []).length}</p>
            <p className="mt-1 text-xs text-eid-text-secondary">{pendentes} pendente(s)</p>
          </div>
          <Link href="/espaco/integracao-asaas" className={`rounded-xl border p-4 transition hover:bg-eid-surface/55 ${asaasTone}`}>
            <AsaasIcon className="h-5 w-5" aria-hidden />
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wide opacity-80">Asaas</p>
            <p className="mt-1 text-xl font-black">{asaas.label}</p>
            <p className="mt-1 truncate text-xs opacity-85">{parceiroAsaas?.email ?? "Conta ainda não informada"}</p>
          </Link>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
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
        {simularPagamentoDev ? (
          <EspacoSimularPagamentoDev
            espacoId={selectedSpace.id}
            transacoesPendentes={transacoesPendentesSimulacao.map((t) => ({
              id: t.id,
              tipo: String(t.tipo),
              asaas_payment_id: t.asaas_payment_id ?? null,
            }))}
            asaasSubscriptionId={(assinatura as { asaas_subscription_id?: string | null } | null)?.asaas_subscription_id ?? null}
          />
        ) : null}
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
            <div className="mt-4 space-y-4">
              <div className={`rounded-2xl border p-4 ${assinaturaResumo.cls}`}>
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-black">{assinaturaResumo.label}</p>
                    <p className="mt-1 text-xs leading-relaxed opacity-90">{assinaturaResumo.description}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Plano</p>
                  <p className="mt-1 text-sm font-black text-eid-fg">{assinatura.plano_nome ?? "Plataforma"}</p>
                </div>
                <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Mensalidade</p>
                  <p className="mt-1 text-sm font-black text-eid-fg">{moeda(assinatura.valor_mensal_centavos)}</p>
                </div>
                {assinatura.trial_ate ? (
                  <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Mês grátis</p>
                    <p className="mt-1 text-sm font-black text-eid-fg">Até {formatDatePtBr(assinatura.trial_ate)}</p>
                  </div>
                ) : null}
                {assinatura.proxima_cobranca ? (
                  <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Próxima cobrança</p>
                    <p className="mt-1 text-sm font-black text-eid-fg">{formatDatePtBr(assinatura.proxima_cobranca)}</p>
                  </div>
                ) : null}
                {Number(assinatura.desconto_progressivo_percentual ?? 0) > 0 ? (
                  <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Desconto progressivo</p>
                    <p className="mt-1 text-sm font-black text-eid-fg">
                      {Math.round(Number(assinatura.desconto_progressivo_percentual ?? 0) * 100)}%
                    </p>
                  </div>
                ) : null}
              </div>
              <EspacoMensalidadePaasCheckout espacoId={selectedSpace.id} />
            </div>
          ) : (
            <div className={`mt-4 rounded-2xl border p-4 ${assinaturaResumo.cls}`}>
              <p className="text-sm font-black">{assinaturaResumo.label}</p>
              <p className="mt-1 text-xs leading-relaxed opacity-90">{assinaturaResumo.description}</p>
            </div>
          )}
        </div>
        ) : null}

        {(extrato ?? []).length ? (
          <div className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
            <h2 className="text-lg font-bold text-eid-fg">Repasse financeiro</h2>
            <div className="mt-3 space-y-2">
              {(extrato ?? []).map((item) => (
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
              ))}
            </div>
          </div>
        ) : null}
      </section>
      </div>
    </div>
  );
}
