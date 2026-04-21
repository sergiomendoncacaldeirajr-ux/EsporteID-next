import { adminUpdateFinanceiro } from "@/app/admin/actions";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default async function AdminFinanceiroPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const { data, error } = await db.from("ei_financeiro_config").select("*").eq("id", 1).maybeSingle();
  if (error) return <p className="text-sm text-red-300">{error.message}</p>;
  if (!data) return <p className="text-sm text-eid-text-secondary">Sem linha em ei_financeiro_config.</p>;

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Financeiro (configuração)</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">Configure taxas reais por domínio, promoções temporárias e parâmetros globais de cobrança.</p>
      <form action={adminUpdateFinanceiro} className="mt-6 space-y-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4">
            <h3 className="text-sm font-bold text-eid-fg">Global / Asaas</h3>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Asaas taxa % (decimal)
              <input type="number" step="0.000001" name="asaas_taxa_percentual" defaultValue={Number(data.asaas_taxa_percentual)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Gateway padrão: plataforma sobre taxa
              <input
                type="number"
                step="0.000001"
                name="plataforma_sobre_taxa_gateway"
                defaultValue={Number(data.plataforma_sobre_taxa_gateway)}
                className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Gateway padrão promo
              <input
                type="number"
                step="0.000001"
                name="plataforma_sobre_taxa_gateway_promo"
                defaultValue={Number(data.plataforma_sobre_taxa_gateway_promo)}
                className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Mensalidade clube (R$)
              <input type="number" step="0.01" name="clube_mensalidade" defaultValue={Number(data.clube_mensalidade)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
            </label>
          </section>

          <section className="space-y-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4">
            <h3 className="text-sm font-bold text-eid-fg">Professor</h3>
            <p className="text-xs text-eid-text-secondary">
              Professor não paga mensalidade. Aqui você controla somente a taxa fixa eventual e o repasse sobre a taxa do gateway.
            </p>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Taxa fixa normal (R$)
              <input type="number" step="0.01" name="professor_taxa_fixa" defaultValue={Number(data.professor_taxa_fixa ?? 0)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Taxa fixa promocional (R$)
              <input type="number" step="0.01" name="professor_taxa_fixa_promo" defaultValue={Number(data.professor_taxa_fixa_promo ?? 0)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Plataforma sobre taxa gateway
              <input type="number" step="0.000001" name="professor_plataforma_sobre_taxa_gateway" defaultValue={Number(data.professor_plataforma_sobre_taxa_gateway ?? data.plataforma_sobre_taxa_gateway)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Plataforma sobre taxa gateway (promo)
              <input type="number" step="0.000001" name="professor_plataforma_sobre_taxa_gateway_promo" defaultValue={Number(data.professor_plataforma_sobre_taxa_gateway_promo ?? data.plataforma_sobre_taxa_gateway_promo)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-eid-text-secondary">
              <input type="checkbox" name="professor_promocao_ativa" defaultChecked={Boolean(data.professor_promocao_ativa)} />
              Promoção ativa para professor
            </label>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Promoção válida até
              <input type="datetime-local" name="professor_promocao_ate" defaultValue={toDateTimeLocal(data.professor_promocao_ate)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
            </label>
          </section>

          <section className="space-y-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4">
            <h3 className="text-sm font-bold text-eid-fg">Espaços</h3>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Taxa fixa normal (R$)
              <input type="number" step="0.01" name="espaco_taxa_fixa" defaultValue={Number(data.espaco_taxa_fixa ?? 0)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Taxa fixa promocional (R$)
              <input type="number" step="0.01" name="espaco_taxa_fixa_promo" defaultValue={Number(data.espaco_taxa_fixa_promo ?? 0)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Plataforma sobre taxa gateway
              <input type="number" step="0.000001" name="espaco_plataforma_sobre_taxa_gateway" defaultValue={Number(data.espaco_plataforma_sobre_taxa_gateway ?? data.plataforma_sobre_taxa_gateway)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Plataforma sobre taxa gateway (promo)
              <input type="number" step="0.000001" name="espaco_plataforma_sobre_taxa_gateway_promo" defaultValue={Number(data.espaco_plataforma_sobre_taxa_gateway_promo ?? data.plataforma_sobre_taxa_gateway_promo)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-eid-text-secondary">
              <input type="checkbox" name="espaco_promocao_ativa" defaultChecked={Boolean(data.espaco_promocao_ativa)} />
              Promoção ativa para espaços
            </label>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Promoção válida até
              <input type="datetime-local" name="espaco_promocao_ate" defaultValue={toDateTimeLocal(data.espaco_promocao_ate)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
            </label>
          </section>

          <section className="space-y-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4">
            <h3 className="text-sm font-bold text-eid-fg">Torneios</h3>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Taxa fixa torneio (R$)
              <input type="number" step="0.01" name="torneio_taxa_fixa" defaultValue={Number(data.torneio_taxa_fixa)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Taxa promocional torneio (R$)
              <input type="number" step="0.01" name="torneio_taxa_promo" defaultValue={Number(data.torneio_taxa_promo)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Dias de promoção
              <input type="number" name="promocao_dias" defaultValue={data.promocao_dias} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-eid-text-secondary">
              <input type="checkbox" name="torneio_promocao_ativa" defaultChecked={Boolean(data.torneio_promocao_ativa)} />
              Promoção ativa para torneios
            </label>
            <label className="block text-xs font-semibold text-eid-text-secondary">
              Promoção válida até
              <input type="datetime-local" name="torneio_promocao_ate" defaultValue={toDateTimeLocal(data.torneio_promocao_ate)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
            </label>
          </section>
        </div>

        <button type="submit" className="eid-btn-primary mt-2 w-full min-h-[44px] rounded-xl text-sm font-bold">
          Salvar
        </button>
      </form>
    </div>
  );
}
