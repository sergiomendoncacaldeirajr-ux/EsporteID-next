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
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-[11px] text-eid-text-secondary">
        <Link href="/espaco" className="text-eid-primary-300 hover:underline">
          ← Painel
        </Link>
      </p>
      <h1 className="text-xl font-bold text-eid-fg">Conta e integração (Asaas)</h1>
      <p className="text-sm text-eid-text-secondary">
        O recebimento via EsporteID usa a infraestrutura de pagamento (PIX, etc.) da plataforma. Para o seu CPF/CNPJ e
        repasses, use uma conta <strong className="text-eid-fg">Asaas</strong>. Crie a conta se ainda não tiver, ou
        abra o painel para acompanhar. Depois, guarde os dados abaixo no app para o suporte alinhar a subconta, se for o
        caso.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={ASAAS_CAD}
          target="_blank"
          rel="noreferrer"
          className="eid-btn-primary rounded-xl px-4 py-2.5 text-sm font-bold"
        >
          Criar conta no Asaas
        </a>
        <a
          href={ASAAS_PAINEL}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/10 px-4 py-2.5 text-sm font-bold text-eid-primary-200"
        >
          Já tenho — abrir painel
        </a>
        <a
          href={ASAAS_INTEGRA}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-eid-text-secondary/30 px-4 py-2.5 text-sm font-bold text-eid-fg"
        >
          API / integrações
        </a>
      </div>
      {parceiro ? (
        <p className="text-xs text-eid-text-secondary">
          Status no app: {String(parceiro.onboarding_status ?? "—")}
          {parceiro.asaas_account_id ? ` · ID Asaas: ${parceiro.asaas_account_id}` : null}
        </p>
      ) : null}
      <FormAsaasParceiro
        espacoId={selectedSpace.id}
        defaultNome={parceiro?.nome_razao_social ?? ""}
        defaultCpf={parceiro?.cpf_cnpj ?? ""}
        defaultEmail={parceiro?.email ?? ""}
      />
    </div>
  );
}
