import Link from "next/link";
import { adminDeletePlanoMensalPlataforma, adminUpsertPlanoMensalPlataforma } from "@/app/admin/actions";
import {
  descricaoFaixaUnidadesPaaS,
  inferirNivelPlanoPaaS,
  perfilComercialPlanoPaaS,
} from "@/lib/espacos/plano-mensal-catalogo";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

const CATEGORIAS = [
  { value: "clube", label: "Clube" },
  { value: "condominio", label: "Condomínio" },
  { value: "centro_esportivo", label: "Centro esportivo" },
  { value: "quadra", label: "Quadra" },
  { value: "outro", label: "Outro" },
];

const SOCIOS = [
  { value: "nenhum", label: "Sem gestão de mensalidade de sócios" },
  { value: "em_breve", label: "Com sócios: em breve" },
  { value: "disponivel", label: "Disponível (liberar no catálogo)" },
];

const LIB = [
  { value: "publico", label: "Público (pode se aplicar / aparecer no fluxo)" },
  { value: "em_breve", label: "Em breve (visível admin, não no fluxo automático)" },
  { value: "inativo", label: "Inativo" },
];

const GUIA_PLANOS = [
  perfilComercialPlanoPaaS("essencial"),
  perfilComercialPlanoPaaS("premium"),
];

function brlDeCentavos(c: number) {
  return (Number(c || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type PlanoRow = {
  id: number;
  nome: string;
  categoria_espaco: string;
  min_unidades: number;
  max_unidades: number | null;
  valor_mensal_centavos: number;
  socios_mensal_modo: string;
  liberacao: string;
  assinatura_recorrencia_auto: boolean;
  confirmar_pagamento_automatico: boolean;
  ativo: boolean;
  ordem: number;
};

export default async function AdminPlanoMensalPlataformaPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("espaco_plano_mensal_plataforma")
    .select("*")
    .is("espaco_generico_id", null)
    .order("ordem", { ascending: true });
  if (error) {
    return <p className="text-sm text-red-300">{error.message}</p>;
  }
  const planos = (data ?? []) as PlanoRow[];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-mono text-eid-text-secondary">
          <Link href="/admin/locais" className="text-eid-primary-300 hover:underline">
            ← Locais
          </Link>
        </p>
        <h1 className="text-lg font-bold text-eid-fg">Planos de mensalidade (catálogo PaaS)</h1>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Catálogo global da mensalidade da plataforma para espaços por associação. Espaços com reservas pagas não usam estes planos:
          pagam apenas taxas e comissões das reservas e cobranças operacionais.
        </p>
      </div>

      <section className="grid gap-3 lg:grid-cols-3">
        {GUIA_PLANOS.map((plano) => (
          <div
            key={plano.nome}
            className={`rounded-2xl border p-4 ${
              plano.nome === "Premium"
                ? "border-eid-action-500/35 bg-eid-action-500/10"
                : "border-[color:var(--eid-border-subtle)] bg-eid-card/45"
            }`}
          >
            <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${plano.nome === "Premium" ? "text-eid-action-400" : "text-eid-primary-300"}`}>
              {plano.nome}
            </p>
            <h2 className="mt-1 text-base font-black text-eid-fg">{plano.titulo}</h2>
            <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">{plano.resumo}</p>
            <ul className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-eid-text-secondary">
              {plano.beneficios.slice(0, 4).map((beneficio) => (
                <li key={beneficio}>• {beneficio}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-4">
        <h2 className="text-sm font-bold text-eid-fg">Novo plano (catálogo global)</h2>
        <form action={adminUpsertPlanoMensalPlataforma} className="mt-3 space-y-3">
          <input type="hidden" name="id" value="0" />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold text-eid-text-secondary md:col-span-2">
              Nome
              <input
                name="nome"
                required
                minLength={2}
                className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                placeholder="ex.: Condomínio · 1 quadra"
              />
            </label>
            <label className="text-xs font-semibold text-eid-text-secondary">
              Ordem
              <input
                name="ordem"
                type="number"
                defaultValue={0}
                className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-eid-text-secondary">
              Categoria
              <select name="categoria_espaco" className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" defaultValue="condominio">
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-eid-text-secondary">
              Mín. unidades (quadras ativas, faixa)
              <input
                name="min_unidades"
                type="number"
                min={0}
                defaultValue={1}
                className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-eid-text-secondary">
              Máx. unidades (vazio = sem teto)
              <input
                name="max_unidades"
                type="number"
                min={0}
                className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                placeholder="ex.: 3"
              />
            </label>
            <label className="text-xs font-semibold text-eid-text-secondary">
              Valor mensal (R$)
              <input
                name="valor_mensal_brl"
                type="number"
                step="0.01"
                min={0}
                required
                className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-eid-text-secondary">
              Sócios (módulo)
              <select name="socios_mensal_modo" className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" defaultValue="nenhum">
                {SOCIOS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-eid-text-secondary">
              Liberação
              <select name="liberacao" className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" defaultValue="publico">
                {LIB.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-eid-text-secondary">
              Assinatura recorrente (cadastro)
              <select
                name="assinatura_recorrencia_auto"
                className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                defaultValue="true"
              >
                <option value="true">Sim (meta para integração)</option>
                <option value="false">Não</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-eid-text-secondary">
              Confirmar pagamento automático (meta)
              <select
                name="confirmar_pagamento_automatico"
                className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                defaultValue="true"
              >
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-eid-text-secondary">
              Plano ativo
              <select name="ativo" className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" defaultValue="true">
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </label>
          </div>
          <button type="submit" className="eid-btn-primary rounded-xl px-4 py-2 text-sm font-bold">
            Criar plano
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-bold text-eid-fg">Planos cadastrados ({planos.length})</h2>
        <div className="mt-3 space-y-6">
          {planos.length === 0 ? <p className="text-sm text-eid-text-secondary">Nenhum registro (rode a migration e recarregue).</p> : null}
          {planos.map((p) => {
            const brl = (p.valor_mensal_centavos ?? 0) / 100;
            const planosDaCategoria = planos.filter((item) => item.categoria_espaco === p.categoria_espaco);
            const perfil = perfilComercialPlanoPaaS(inferirNivelPlanoPaaS(p, planosDaCategoria));
            const faixa = descricaoFaixaUnidadesPaaS(p.min_unidades, p.max_unidades);
            const isCompleto = perfil.nome === "Completo";
            return (
              <div
                key={p.id}
                className={`overflow-hidden rounded-2xl border ${
                  isCompleto
                    ? "border-eid-action-500/35 bg-eid-action-500/8"
                    : "border-[color:var(--eid-border-subtle)] bg-eid-bg/30"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--eid-border-subtle)]/45 p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] font-mono text-eid-text-secondary">id {p.id}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${
                        isCompleto
                          ? "border-eid-action-500/35 bg-eid-action-500/10 text-eid-action-400"
                          : "border-eid-primary-500/25 bg-eid-primary-500/8 text-eid-primary-300"
                      }`}>
                        {perfil.nome}
                      </span>
                      <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-2 py-0.5 text-[10px] font-semibold text-eid-text-secondary">
                        {p.categoria_espaco}
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-black text-eid-fg">{p.nome}</h3>
                    <p className="mt-0.5 text-xs text-eid-text-secondary">{perfil.resumo}</p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 px-3 py-2 text-right">
                    <p className="text-base font-black text-eid-fg">{brlDeCentavos(p.valor_mensal_centavos)}</p>
                    <p className="text-[10px] font-semibold text-eid-text-secondary">{faixa}</p>
                  </div>
                </div>
                <form action={adminUpsertPlanoMensalPlataforma} className="block p-4">
                <input type="hidden" name="id" value={p.id} />
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <label className="text-xs font-semibold text-eid-text-secondary md:col-span-2">
                    Nome
                    <input
                      name="nome"
                      required
                      minLength={2}
                      defaultValue={p.nome}
                      className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-eid-text-secondary">
                    Ordem
                    <input
                      name="ordem"
                      type="number"
                      defaultValue={p.ordem}
                      className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-eid-text-secondary">
                    Categoria
                    <select
                      name="categoria_espaco"
                      className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                      defaultValue={p.categoria_espaco}
                    >
                      {CATEGORIAS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-eid-text-secondary">
                    Mín. unidades
                    <input
                      name="min_unidades"
                      type="number"
                      min={0}
                      defaultValue={p.min_unidades}
                      className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-eid-text-secondary">
                    Máx. (vazio = ilimitado)
                    <input
                      name="max_unidades"
                      type="number"
                      min={0}
                      defaultValue={p.max_unidades ?? ""}
                      className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-eid-text-secondary">
                    Valor (R$) <span className="text-eid-text-muted">({brlDeCentavos(p.valor_mensal_centavos)})</span>
                    <input
                      name="valor_mensal_brl"
                      type="number"
                      step="0.01"
                      min={0}
                      required
                      defaultValue={Number(brl.toFixed(2))}
                      className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-eid-text-secondary">
                    Sócios
                    <select
                      name="socios_mensal_modo"
                      className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                      defaultValue={p.socios_mensal_modo}
                    >
                      {SOCIOS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-eid-text-secondary">
                    Liberação
                    <select
                      name="liberacao"
                      className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                      defaultValue={p.liberacao}
                    >
                      {LIB.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-eid-text-secondary">
                    Assinatura recorrente (meta)
                    <select
                      name="assinatura_recorrencia_auto"
                      className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                      defaultValue={p.assinatura_recorrencia_auto ? "true" : "false"}
                    >
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-eid-text-secondary">
                    Confirmar pag. automático (meta)
                    <select
                      name="confirmar_pagamento_automatico"
                      className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                      defaultValue={p.confirmar_pagamento_automatico ? "true" : "false"}
                    >
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-eid-text-secondary">
                    Plano ativo
                    <select
                      name="ativo"
                      className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                      defaultValue={p.ativo ? "true" : "false"}
                    >
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  </label>
                </div>
                <div className="mt-3">
                  <button type="submit" className="rounded-lg border border-eid-primary-500/40 bg-eid-primary-500/15 px-3 py-1.5 text-xs font-bold text-eid-fg">
                    Salvar
                  </button>
                </div>
                </form>
                <form action={adminDeletePlanoMensalPlataforma} className="border-t border-[color:var(--eid-border-subtle)]/35 px-4 py-3">
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-200"
                  >
                    Excluir plano
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
