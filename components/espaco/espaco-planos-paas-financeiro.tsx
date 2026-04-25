import { escolherPlanoMensalidadePaaSAction } from "@/app/espaco/actions";
import { descricaoFaixaUnidadesPaaS, detalheValorESociosPlanoPaaS } from "@/lib/espacos/plano-mensal-catalogo";

type PlanoRow = {
  id: number;
  nome: string;
  min_unidades: number;
  max_unidades: number | null;
  valor_mensal_centavos: number;
  socios_mensal_modo: string | null;
};

export function EspacoPlanosPaaSFinanceiro({
  espacoId,
  categoriaLabel,
  planos,
  planoAtualId,
}: {
  espacoId: number;
  categoriaLabel: string;
  planos: PlanoRow[];
  planoAtualId: number | null;
}) {
  if (!planos.length) {
    return (
      <p className="mt-3 text-sm text-eid-text-secondary">
        Não há planos públicos cadastrados para a categoria <span className="font-semibold text-eid-fg">{categoriaLabel}</span>.
        Fale com o suporte EsporteID.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-eid-text-secondary">
        Cada plano define a <strong className="text-eid-fg">faixa de quadras/unidades</strong> que você pode cadastrar e o valor da mensalidade da plataforma. Escolha o plano antes de pagar; depois do pagamento aprovado, a criação de quadras e a grade são liberadas dentro do limite do plano.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {planos.map((plano) => {
          const faixa = descricaoFaixaUnidadesPaaS(plano.min_unidades, plano.max_unidades);
          const ativo = planoAtualId === plano.id;
          return (
            <div
              key={plano.id}
              className={`rounded-xl border p-4 text-sm ${
                ativo
                  ? "border-eid-primary-500/50 bg-eid-primary-500/10"
                  : "border-[color:var(--eid-border-subtle)] bg-eid-surface/50"
              }`}
            >
              <p className="font-bold text-eid-fg">{plano.nome}</p>
              <p className="mt-1 text-xs text-eid-text-secondary">{faixa}</p>
              <p className="mt-2 text-[11px] leading-relaxed text-eid-text-secondary">
                {detalheValorESociosPlanoPaaS(plano)}
              </p>
              <form action={escolherPlanoMensalidadePaaSAction} className="mt-3">
                <input type="hidden" name="espaco_id" value={espacoId} />
                <input type="hidden" name="plano_mensal_id" value={plano.id} />
                <button
                  type="submit"
                  disabled={ativo}
                  className="w-full rounded-lg border border-eid-primary-500/40 bg-eid-primary-500/15 px-3 py-2 text-xs font-bold text-eid-primary-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ativo ? "Plano selecionado" : "Usar este plano"}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
