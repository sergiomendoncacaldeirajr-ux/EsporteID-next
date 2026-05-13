import Link from "next/link";
import { FormAsaasParceiro } from "@/components/espaco/espaco-integracao-asaas-form";
import { getEspacoSelecionado } from "@/lib/espacos/server";
import { ArrowRight, CheckCircle2, Clock3, Landmark, ShieldCheck, WalletCards } from "lucide-react";

function statusInfo(status: string | null | undefined, walletId: string | null | undefined) {
  if (String(walletId ?? "").trim()) {
    return {
      label: "Pronta para repasse",
      detail: "Wallet ID salvo. As próximas cobranças pagas já conseguem separar o valor do espaço e da plataforma.",
      cls: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
      Icon: CheckCircle2,
    };
  }
  const value = String(status ?? "pendente");
  if (value.includes("conect") || value.includes("ativo") || value.includes("aprov")) {
    return {
      label: "Conectada",
      detail: "A conta já possui dados salvos para recebimentos.",
      cls: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
      Icon: CheckCircle2,
    };
  }
  if (value.includes("criacao") || value.includes("conexao") || value.includes("aguardando")) {
    return {
      label: "Em ativação",
      detail: "Dados recebidos. Falta a etapa segura do Asaas quando ela for exigida.",
      cls: "border-amber-500/35 bg-amber-500/10 text-amber-200",
      Icon: Clock3,
    };
  }
  return {
    label: "Não configurada",
    detail: "Informe a conta que vai receber reservas e planos pagos.",
    cls: "border-[color:var(--eid-border-subtle)] bg-eid-surface/55 text-eid-text-secondary",
    Icon: Landmark,
  };
}

function maskCpfCnpj(raw: string | null | undefined) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
  if (digits.length === 14) return `${digits.slice(0, 2)}.***.***/****-${digits.slice(12)}`;
  return raw ? "Documento informado" : "Documento pendente";
}

export default async function EspacoIntegracaoAsaasPage() {
  const { supabase, user, selectedSpace } = await getEspacoSelecionado({
    nextPath: "/espaco/integracao-asaas",
  });

  const { data: parceiro } = await supabase
    .from("parceiro_conta_asaas")
    .select("id, nome_razao_social, cpf_cnpj, email, onboarding_status, asaas_account_id, wallet_id, atualizado_em, dados_bancarios_json")
    .eq("usuario_id", user.id)
    .maybeSingle();
  const info = statusInfo(parceiro?.onboarding_status, parceiro?.wallet_id);
  const StatusIcon = info.Icon;
  const dados = (() => {
    try {
      const parsed = JSON.parse(String(parceiro?.dados_bancarios_json ?? "{}"));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  })();
  const fluxo = dados.fluxo_integracao_asaas === "conta_existente" ? "conta_existente" : "criar_nova";

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <p className="text-[11px] font-semibold text-eid-text-secondary">
        <Link href="/espaco" className="text-eid-primary-300 hover:underline">
          ← Painel
        </Link>
      </p>

      <section className="eid-mobile-section overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-5 sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-eid-primary-500/25 bg-eid-primary-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-eid-primary-300">
              <WalletCards className="h-3.5 w-3.5" aria-hidden />
              Recebimentos
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-eid-fg">Conta Asaas do espaço</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-eid-text-secondary">
              Esta é a conta usada para receber reservas, planos de sócios e cobranças online do espaço. Os dados salvos
              no wizard aparecem aqui para revisão e continuidade da ativação.
            </p>
          </div>

          <div className="border-t border-[color:var(--eid-border-subtle)] bg-eid-surface/35 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div className={`rounded-2xl border p-4 ${info.cls}`}>
              <div className="flex items-start gap-3">
                <StatusIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <div>
                  <p className="text-sm font-black">{info.label}</p>
                  <p className="mt-1 text-xs leading-relaxed opacity-90">{info.detail}</p>
                </div>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/70 p-3">
                <dt className="font-bold uppercase tracking-wide text-eid-text-secondary">E-mail Asaas</dt>
                <dd className="mt-1 break-words text-sm font-semibold text-eid-fg">{parceiro?.email ?? "Pendente"}</dd>
              </div>
              <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/70 p-3">
                <dt className="font-bold uppercase tracking-wide text-eid-text-secondary">CPF/CNPJ</dt>
                <dd className="mt-1 text-sm font-semibold text-eid-fg">{maskCpfCnpj(parceiro?.cpf_cnpj)}</dd>
              </div>
              <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/70 p-3">
                <dt className="font-bold uppercase tracking-wide text-eid-text-secondary">ID Asaas</dt>
                <dd className="mt-1 break-all font-mono text-[11px] text-eid-fg">{parceiro?.asaas_account_id ?? "Ainda não gerado"}</dd>
              </div>
              <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/70 p-3">
                <dt className="font-bold uppercase tracking-wide text-eid-text-secondary">Wallet</dt>
                <dd className="mt-1 break-all font-mono text-[11px] text-eid-fg">{parceiro?.wallet_id ?? "Ainda não vinculada"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="flex items-center gap-2 text-base font-bold text-eid-fg">
            <ShieldCheck className="h-4 w-4 text-eid-primary-300" aria-hidden />
            Próximos passos
          </h2>
          <div className="mt-4 space-y-3">
            {[
              "Confirmar dados da conta de recebimento.",
              "Para conta Asaas existente, pegar o Wallet ID em Minha conta > Integrações no site do Asaas.",
              "Concluir validações sensíveis no ambiente seguro do Asaas quando solicitado.",
              "Usar o financeiro do espaço para acompanhar cobranças e recebimentos.",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3 text-sm text-eid-text-secondary">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-eid-action-400" aria-hidden />
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-3 sm:p-4">
          <FormAsaasParceiro
            espacoId={selectedSpace.id}
            defaultNome={parceiro?.nome_razao_social ?? ""}
            defaultCpf={parceiro?.cpf_cnpj ?? ""}
            defaultEmail={parceiro?.email ?? ""}
            defaultWalletId={parceiro?.wallet_id ?? ""}
            defaultModo={fluxo}
          />
        </section>
      </div>
    </div>
  );
}
