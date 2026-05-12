import Link from "next/link";
import { FormAsaasParceiro } from "@/components/espaco/espaco-integracao-asaas-form";
import { getEspacoSelecionado } from "@/lib/espacos/server";

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
        Para receber pagamentos no local, escolha se quer criar uma nova conta Asaas ou conectar uma conta
        existente. O EsporteID guia o fluxo e só pede o app/site do Asaas quando houver validação sensível.
        </p>
        <div className="mt-3 space-y-2 rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/5 p-3">
          <p className="text-xs font-semibold text-eid-fg">Fluxo assistido</p>
          <p className="text-xs text-eid-text-secondary">1. O dono escolhe criar conta nova ou usar uma existente.</p>
          <p className="text-xs text-eid-text-secondary">2. O EsporteID prepara a integração Asaas internamente.</p>
          <p className="text-xs text-eid-text-secondary">3. Login, API key, selfie ou documentos ficam para o Asaas quando forem exigidos.</p>
        </div>
      </section>
      <section className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h2 className="text-base font-bold text-eid-fg">Dados da conta no app</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
        Esses dados ajudam a vincular seu cadastro e acelerar a ativação dos recebimentos.
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
