import { requireProfessorUser } from "@/lib/professor/server";

export default async function ProfessorRecebimentosPage() {
  const { supabase, user } = await requireProfessorUser("/professor/recebimentos");

  const { data: pagamentos } = await supabase
    .from("professor_pagamentos")
    .select("id, status, valor_bruto_centavos, taxa_gateway_centavos, comissao_plataforma_centavos, valor_liquido_professor_centavos, asaas_payment_id, asaas_charge_url, criado_em, pago_em, professor_aulas(titulo)")
    .eq("professor_id", user.id)
    .order("criado_em", { ascending: false });

  return (
    <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
      <h2 className="text-lg font-bold text-eid-fg">Recebimentos e cobranças</h2>
      <p className="mt-2 text-sm text-eid-text-secondary">
        As cobranças são criadas via API Asaas e os status retornam pelo webhook da plataforma.
      </p>
      <div className="mt-4 space-y-3">
        {(pagamentos ?? []).length ? (
          (pagamentos ?? []).map((pagamento) => {
            const aula = Array.isArray(pagamento.professor_aulas) ? pagamento.professor_aulas[0] : pagamento.professor_aulas;
            return (
              <div key={pagamento.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-eid-fg">{aula?.titulo ?? `Cobrança #${pagamento.id}`}</p>
                    <p className="mt-1 text-xs text-eid-text-secondary">
                      Status: {pagamento.status} · Asaas: {pagamento.asaas_payment_id ?? "ainda não criado"}
                    </p>
                    <p className="mt-1 text-xs text-eid-text-secondary">
                      Criado em {pagamento.criado_em ? new Date(pagamento.criado_em).toLocaleString("pt-BR") : "-"}
                      {pagamento.pago_em ? ` · Pago em ${new Date(pagamento.pago_em).toLocaleString("pt-BR")}` : ""}
                    </p>
                    {pagamento.asaas_charge_url ? (
                      <a
                        href={pagamento.asaas_charge_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex text-xs font-semibold text-eid-action-400 underline"
                      >
                        Abrir cobrança no Asaas
                      </a>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-eid-text-secondary">
                    <p>Bruto: R$ {(Number(pagamento.valor_bruto_centavos ?? 0) / 100).toFixed(2).replace(".", ",")}</p>
                    <p>Gateway: R$ {(Number(pagamento.taxa_gateway_centavos ?? 0) / 100).toFixed(2).replace(".", ",")}</p>
                    <p>Plataforma: R$ {(Number(pagamento.comissao_plataforma_centavos ?? 0) / 100).toFixed(2).replace(".", ",")}</p>
                    <p className="mt-1 text-sm font-bold text-eid-fg">
                      Líquido: R$ {(Number(pagamento.valor_liquido_professor_centavos ?? 0) / 100).toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-eid-text-secondary">
            Nenhuma cobrança registrada ainda. Gere cobranças para alunos a partir das aulas cadastradas.
          </p>
        )}
      </div>
    </section>
  );
}
