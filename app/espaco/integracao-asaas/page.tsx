import Link from "next/link";
import { FormAsaasParceiro } from "@/components/espaco/espaco-integracao-asaas-form";
import { getEspacoSelecionado } from "@/lib/espacos/server";

const ASAAS_CAD = "https://www.asaas.com";
const ASAAS_PAINEL = "https://www.asaas.com/painel";
const ASAAS_INTEGRA = "https://www.asaas.com/painel/integracoes";

export default async function EspacoIntegracaoAsaasPage() {
  const { supabase, user, selectedSpace } = await getEspacoSelecionado({
    nextPath: "/espaco/integracao-asaas",
  });

  const { data: parceiro } = await supabase
    .from("parceiro_conta_asaas")
    .select("id, nome_razao_social, cpf_cnpj, email, onboarding_status, asaas_account_id, atualizado_em")
    .eq("usuario_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <p className="text-[11px] text-eid-text-secondary">
        <Link href="/espaco" className="text-eid-primary-300 hover:underline">
          ← Painel
        </Link>
      </p>
      <section className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h1 className="text-xl font-bold text-eid-fg">Conta e integração (Asaas)</h1>
        <p className="mt-2 text-sm text-eid-text-secondary">
          Para receber pagamentos no local, conecte sua conta Asaas. Se ainda não tiver conta, crie agora; se já tiver, entre e finalize a integração.
        </p>
        <div className="mt-3 space-y-2 rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/5 p-3">
          <p className="text-xs font-semibold text-eid-fg">Passo a passo rápido</p>
          <p className="text-xs text-eid-text-secondary">1) Crie conta ou entre no Asaas</p>
          <p className="text-xs text-eid-text-secondary">2) Confira integrações no painel Asaas</p>
          <p className="text-xs text-eid-text-secondary">3) Preencha os dados abaixo para concluir no EsporteID</p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <a
            href={ASAAS_CAD}
            target="_blank"
            rel="noreferrer"
            className="eid-btn-primary rounded-xl px-4 py-2.5 text-sm font-bold text-center"
          >
            Criar conta no Asaas
          </a>
          <a
            href={ASAAS_PAINEL}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/10 px-4 py-2.5 text-sm font-bold text-eid-primary-200 text-center"
          >
            Já tenho — abrir painel
          </a>
          <a
            href={ASAAS_INTEGRA}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-eid-text-secondary/30 px-4 py-2.5 text-sm font-bold text-eid-fg text-center"
          >
            API / integrações
          </a>
        </div>
      </section>
      <section className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h2 className="text-base font-bold text-eid-fg">Dados da conta no app</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Esses dados ajudam a vincular seu cadastro e acelerar o suporte quando necessário.
        </p>
        {parceiro ? (
          <p className="mt-2 text-xs text-eid-text-secondary">
            Status no app: {String(parceiro.onboarding_status ?? "—")}
            {parceiro.asaas_account_id ? ` · ID Asaas: ${parceiro.asaas_account_id}` : null}
          </p>
        ) : null}
        <div className="mt-3">
          <FormAsaasParceiro
            espacoId={selectedSpace.id}
            defaultNome={parceiro?.nome_razao_social ?? ""}
            defaultCpf={parceiro?.cpf_cnpj ?? ""}
            defaultEmail={parceiro?.email ?? ""}
          />
        </div>
      </section>
    </div>
  );
}
