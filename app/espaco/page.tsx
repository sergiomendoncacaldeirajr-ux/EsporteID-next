import Link from "next/link";
import { redirect } from "next/navigation";
import { getEspacoSelecionado } from "@/lib/espacos/server";
import {
  CalendarDays,
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

export default async function EspacoHomePage() {
  const { supabase, selectedSpace } = await getEspacoSelecionado({
    nextPath: "/espaco",
  });
  const { data: assinatura } = await supabase
    .from("espaco_assinaturas_plataforma")
    .select("id, isento_total, recorrencia_cartao_confirmada_em")
    .eq("espaco_generico_id", selectedSpace.id)
    .maybeSingle();
  const onboardingPagamentoConcluido =
    Boolean(assinatura?.isento_total) ||
    Boolean(assinatura?.recorrencia_cartao_confirmada_em);
  if (!onboardingPagamentoConcluido) {
    redirect("/espaco/financeiro?onboarding=pagamento");
  }

  const [{ data: unidades }, { data: socios }, { data: waitlist }, { data: transacoes }] =
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
    ]);

  const sociosAtivos = (socios ?? []).filter((item) => item.status === "ativo").length;
  const sociosPendentes = (socios ?? []).filter((item) => item.status !== "ativo").length;
  const waitlistAtiva = (waitlist ?? []).filter((item) => item.status === "ativa").length;
  const liquidoRecebido = (transacoes ?? [])
    .filter((item) => item.status === "received")
    .reduce((sum, item) => sum + Number(item.valor_liquido_espaco_centavos ?? 0), 0);

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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-eid-fg">Visão geral</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Toque nos atalhos abaixo para ir direto a cada área. Use a barra inferior no celular para navegar a qualquer
          momento.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4 sm:col-span-2 lg:col-span-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4">
              <p className="text-xs text-eid-text-secondary">Unidades ativas</p>
              <p className="mt-1 text-2xl font-bold text-eid-fg">{(unidades ?? []).length}</p>
            </div>
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4">
              <p className="text-xs text-eid-text-secondary">Sócios ativos</p>
              <p className="mt-1 text-2xl font-bold text-eid-fg">{sociosAtivos}</p>
            </div>
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4">
              <p className="text-xs text-eid-text-secondary">Em análise</p>
              <p className="mt-1 text-2xl font-bold text-eid-fg">{sociosPendentes}</p>
            </div>
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4">
              <p className="text-xs text-eid-text-secondary">Fila ativa</p>
              <p className="mt-1 text-2xl font-bold text-eid-fg">{waitlistAtiva}</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-eid-action-500/20 bg-eid-action-500/10 p-4">
            <p className="text-xs text-eid-text-secondary">Líquido recebido (histórico)</p>
            <p className="mt-1 text-xl font-bold text-eid-fg sm:text-2xl">{moedaCentavos(liquidoRecebido)}</p>
            <Link
              href="/espaco/financeiro"
              className="mt-2 inline-flex text-xs font-semibold text-eid-action-400 underline"
            >
              Abrir financeiro
            </Link>
          </div>
        </div>

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

        {selectedSpace.slug ? (
          <Link
            href={`/espaco/${selectedSpace.slug}`}
            className="flex items-center justify-center rounded-2xl border border-dashed border-eid-action-500/40 bg-eid-action-500/5 p-4 text-center text-sm font-semibold text-eid-action-400 transition hover:bg-eid-action-500/10"
          >
            Ver página pública do espaço
          </Link>
        ) : null}
      </div>
    </div>
  );
}
