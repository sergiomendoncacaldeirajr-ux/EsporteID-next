import Link from "next/link";
import { redirect } from "next/navigation";
import { getEspacoSelecionado } from "@/lib/espacos/server";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Landmark,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

function moedaCentavos(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((Number(value ?? 0) || 0) / 100);
}

function asaasResumo(status: string | null | undefined, accountId: string | null | undefined) {
  if (accountId) {
    return {
      label: "Asaas vinculado",
      detail: "Conta de recebimentos identificada no painel.",
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
      Icon: CheckCircle2,
    };
  }
  const value = String(status ?? "");
  if (value.includes("aguardando") || value.includes("conexao") || value.includes("criacao")) {
    return {
      label: "Asaas em ativação",
      detail: "Dados do wizard salvos. Continue a validação quando necessário.",
      cls: "border-amber-500/30 bg-amber-500/10 text-amber-200",
      Icon: Clock3,
    };
  }
  return {
    label: "Configurar Asaas",
    detail: "Ative recebimentos online para reservas e planos pagos.",
    cls: "border-eid-primary-500/25 bg-eid-primary-500/10 text-eid-primary-200",
    Icon: Landmark,
  };
}

export default async function EspacoHomePage() {
  const { supabase, user, selectedSpace } = await getEspacoSelecionado({
    nextPath: "/espaco",
  });

  if (selectedSpace.operacao_status === "rascunho") {
    redirect("/espaco/onboarding");
  }

  const { data: assinatura } = await supabase
    .from("espaco_assinaturas_plataforma")
    .select("id, isento_total, recorrencia_cartao_confirmada_em")
    .eq("espaco_generico_id", selectedSpace.id)
    .maybeSingle();
  const onboardingPagamentoConcluido =
    selectedSpace.modo_reserva === "paga" ||
    selectedSpace.modo_monetizacao === "apenas_reservas" ||
    Boolean(assinatura?.isento_total) ||
    Boolean(assinatura?.recorrencia_cartao_confirmada_em);
  if (!onboardingPagamentoConcluido) {
    redirect("/espaco/financeiro?onboarding=pagamento");
  }

  const [{ data: unidades }, { data: socios }, { data: waitlist }, { data: transacoes }, { data: parceiro }] =
    await Promise.all([
      supabase
        .from("espaco_unidades")
        .select("id")
        .eq("espaco_generico_id", selectedSpace.id)
        .eq("ativo", true),
      supabase
        .from("espaco_socios")
        .select("id, status")
        .eq("espaco_generico_id", selectedSpace.id),
      supabase
        .from("espaco_waitlist")
        .select("id, status")
        .eq("espaco_generico_id", selectedSpace.id),
      supabase
        .from("espaco_transacoes")
        .select("id, status, valor_liquido_espaco_centavos")
        .eq("espaco_generico_id", selectedSpace.id),
      supabase
        .from("parceiro_conta_asaas")
        .select("email, onboarding_status, asaas_account_id, wallet_id, atualizado_em")
        .eq("usuario_id", user.id)
        .maybeSingle(),
    ]);

  const sociosAtivos = (socios ?? []).filter((item) => item.status === "ativo").length;
  const sociosPendentes = (socios ?? []).filter((item) => item.status !== "ativo").length;
  const waitlistAtiva = (waitlist ?? []).filter((item) => item.status === "ativa").length;
  const liquidoRecebido = (transacoes ?? [])
    .filter((item) => item.status === "received")
    .reduce((sum, item) => sum + Number(item.valor_liquido_espaco_centavos ?? 0), 0);
  const asaas = asaasResumo(parceiro?.onboarding_status, parceiro?.asaas_account_id);
  const AsaasIcon = asaas.Icon;

  const cards = [
    {
      href: "/espaco/agenda",
      title: "Agenda e horários",
      desc: "Grade semanal, bloqueios e reservas.",
      Icon: CalendarDays,
      accent: "text-eid-primary-300",
    },
    {
      href: "/espaco/socios",
      title: "Sócios e membros",
      desc: "Aprovar, documentos e cobranças.",
      Icon: Users,
      accent: "text-eid-action-400",
    },
    {
      href: "/espaco/financeiro",
      title: "Financeiro",
      desc: "Transações, mensalidade e extrato.",
      Icon: Wallet,
      accent: "text-emerald-300",
    },
    {
      href: "/espaco/configuracao",
      title: "Ajustes do espaço",
      desc: "Perfil público, regras, unidades e planos.",
      Icon: Settings,
      accent: "text-eid-primary-200",
    },
    {
      href: "/espaco/integracao-asaas",
      title: "Conta Asaas",
      desc: "Integração de recebimentos.",
      Icon: Landmark,
      accent: "text-amber-200",
    },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-eid-fg">Visão geral</h2>
              <p className="mt-1 text-sm text-eid-text-secondary">
                Operação, membros, agenda e recebimentos do espaço em um só lugar.
              </p>
            </div>
            {selectedSpace.slug ? (
              <Link
                href={`/espaco/${selectedSpace.slug}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-eid-action-500/35 bg-eid-action-500/10 px-3 py-2 text-xs font-bold text-eid-action-400 transition hover:bg-eid-action-500/15"
              >
                Página pública
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Unidades ativas", (unidades ?? []).length, "quadras e estruturas"],
              ["Sócios ativos", sociosAtivos, "membros liberados"],
              ["Em análise", sociosPendentes, "cadastros pendentes"],
              ["Fila ativa", waitlistAtiva, "interessados aguardando"],
            ].map(([label, value, hint]) => (
              <div key={String(label)} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">{label}</p>
                <p className="mt-2 text-3xl font-black text-eid-fg">{value}</p>
                <p className="mt-1 text-xs text-eid-text-secondary">{hint}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Recebimentos</p>
          <p className="mt-2 text-3xl font-black text-eid-fg">{moedaCentavos(liquidoRecebido)}</p>
          <p className="mt-1 text-sm text-eid-text-secondary">Líquido recebido no histórico do espaço.</p>
          <Link
            href="/espaco/financeiro"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-eid-action-500/35 bg-eid-action-500/12 px-4 py-3 text-sm font-bold text-eid-action-400 transition hover:bg-eid-action-500/18"
          >
            Abrir financeiro
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/espaco/integracao-asaas" className={`mt-3 flex gap-3 rounded-xl border p-3 transition hover:bg-eid-surface/60 ${asaas.cls}`}>
            <AsaasIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <span className="min-w-0">
              <span className="block text-sm font-black">{asaas.label}</span>
              <span className="mt-0.5 block text-xs opacity-90">{asaas.detail}</span>
              {parceiro?.email ? <span className="mt-1 block truncate text-[11px] opacity-80">{parceiro.email}</span> : null}
            </span>
          </Link>
        </section>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ href, title, desc, Icon, accent }) => (
          <Link
            key={href}
            href={href}
            className="group flex gap-4 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 transition hover:border-eid-primary-500/35 hover:bg-eid-primary-500/5"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 ${accent}`}
            >
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-eid-fg group-hover:text-eid-primary-200">{title}</p>
              <p className="mt-1 text-sm text-eid-text-secondary">{desc}</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
