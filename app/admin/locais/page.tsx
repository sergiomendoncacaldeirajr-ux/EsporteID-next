import Link from "next/link";
import {
  adminAplicarPlanoMensalAutomatico,
  adminReviewEspacoClaim,
  adminSetEspacoListagem,
  adminSetEspacoStatus,
  adminSetPaasAprovadoOperacaoSemGateway,
  adminUpdateEspacoMensalidadePlataforma,
  adminUpdateEspacoModoCobranca,
} from "@/app/admin/actions";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";
import { computeMensalidadePainelState } from "@/lib/espacos/mensalidade-acesso";
import {
  MODO_MONETIZACAO_LABEL,
  MODO_RESERVA_LABEL,
  SOCIOS_MENSAL_ESPACO_LABEL,
} from "@/lib/espacos/monetizacao-labels";

const CATEGORIAS = [
  { value: "clube", label: "Clube" },
  { value: "condominio", label: "Condomínio" },
  { value: "centro_esportivo", label: "Centro esportivo" },
  { value: "quadra", label: "Quadra" },
  { value: "outro", label: "Outro" },
];

function sanitizeBusca(term: string) {
  return term
    .trim()
    .slice(0, 96)
    .replace(/[%_,]/g, "")
    .trim();
}

function brlDeCentavos(c: number) {
  return (Number(c || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type PageProps = { searchParams?: Promise<{ q?: string }> };

export default async function AdminLocaisPage({ searchParams }: PageProps) {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role para listar locais.</p>;
  }
  const sp = (await searchParams) ?? {};
  const rawQ = (sp.q ?? "").trim();
  const qSafe = sanitizeBusca(rawQ);
  const db = createServiceRoleClient();

  const { data: eiRow, error: eiErr } = await db.from("ei_financeiro_config").select("*").eq("id", 1).maybeSingle();
  if (eiErr) {
    return <p className="text-sm text-red-300">{eiErr.message}</p>;
  }
  const ei = (eiRow ?? {}) as Record<string, unknown>;

  const { data: planosCatRows, error: planosErr } = await db
    .from("espaco_plano_mensal_plataforma")
    .select("id, nome, categoria_espaco, min_unidades, max_unidades, valor_mensal_centavos, liberacao, ordem")
    .is("espaco_generico_id", null)
    .order("ordem", { ascending: true });
  if (planosErr) {
    return <p className="text-sm text-red-300">{planosErr.message}</p>;
  }
  const planosCatalogo = (planosCatRows ?? []) as Array<{
    id: number;
    nome: string;
    categoria_espaco: string;
    min_unidades: number;
    max_unidades: number | null;
    valor_mensal_centavos: number;
    liberacao: string;
    ordem: number;
  }>;

  let locaisQ = db
    .from("espacos_genericos")
    .select(
      "id, slug, nome_publico, localizacao, status, operacao_status, aceita_socios, ativo_listagem, ownership_status, criado_em, categoria_mensalidade, modo_reserva, modo_monetizacao, taxa_reserva_plataforma_centavos, socios_mensalidade_espaco, paas_aprovado_operacao_sem_gateway, paas_primeiro_pagamento_mensal_recebido_em, operacao_suspeita_somente_reservas_gratis, operacao_suspeita_observacao"
    )
    .order("id", { ascending: false });

  if (qSafe) {
    if (/^\d+$/.test(qSafe)) {
      locaisQ = locaisQ.eq("id", Number(qSafe));
    } else {
      const pat = `%${qSafe}%`;
      locaisQ = locaisQ.or(`nome_publico.ilike.${pat},slug.ilike.${pat},localizacao.ilike.${pat}`);
    }
  }

  const locaisRes = await locaisQ.limit(200);
  if (locaisRes.error) {
    return <p className="text-sm text-red-300">{locaisRes.error.message}</p>;
  }
  const data = locaisRes.data ?? [];
  const locaisIds = data.map((l) => l.id);

  const { data: assinRows } = locaisIds.length
    ? await db
        .from("espaco_assinaturas_plataforma")
        .select("id, espaco_generico_id, status, valor_mensal_centavos, proxima_cobranca, trial_ate, situacao_override, plano_nome, observacoes_admin, plano_mensal_id")
        .in("espaco_generico_id", locaisIds)
    : { data: [] as unknown[] };
  const assinMap = new Map(
    (assinRows ?? []).map((a) => {
      const row = a as { espaco_generico_id: number; [k: string]: unknown };
      return [row.espaco_generico_id, row] as const;
    })
  );

  const [claimsRes] = await Promise.all([
    db
      .from("espaco_reivindicacoes")
      .select("id, espaco_generico_id, solicitante_id, documento_arquivo, mensagem, status, criado_em, revisado_em, observacoes_admin")
      .order("criado_em", { ascending: false })
      .limit(80),
  ]);
  const claims = claimsRes.data ?? [];
  const espacoIds = [...new Set(claims.map((claim) => Number(claim.espaco_generico_id)).filter(Number.isFinite))];
  const solicitanteIds = [...new Set(claims.map((claim) => String(claim.solicitante_id ?? "")).filter(Boolean))];
  const [{ data: espacosMapRows }, { data: perfisMapRows }] = await Promise.all([
    espacoIds.length
      ? db.from("espacos_genericos").select("id, nome_publico, localizacao").in("id", espacoIds)
      : Promise.resolve({ data: [] as Array<{ id: number; nome_publico: string | null; localizacao: string | null }> }),
    solicitanteIds.length
      ? db.from("profiles").select("id, nome").in("id", solicitanteIds)
      : Promise.resolve({ data: [] as Array<{ id: string; nome: string | null }> }),
  ]);
  const espacoMap = new Map((espacosMapRows ?? []).map((item) => [Number(item.id), item]));
  const perfilMap = new Map((perfisMapRows ?? []).map((item) => [String(item.id), item]));
  const signedUrls = await Promise.all(
    claims.map(async (claim) => {
      if (!claim.documento_arquivo) return [claim.id, null] as const;
      const { data: signed } = await db.storage.from("espaco-documentos").createSignedUrl(claim.documento_arquivo, 60 * 30);
      return [claim.id, signed?.signedUrl ?? null] as const;
    })
  );
  const signedUrlMap = new Map<number, string | null>(signedUrls);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-eid-primary-500/20 bg-eid-primary-500/[0.04] p-4">
        <h2 className="text-sm font-bold text-eid-fg">Mensalidade (referência e bloqueio)</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Valor por categoria, dias de aviso e dias após o vencimento para bloquear o painel do dono: configure em{" "}
          <Link className="font-semibold text-eid-primary-300 hover:underline" href="/admin/financeiro">
            Admin → Financeiro
          </Link>{" "}
          (seção de espaços / mensalidade plataforma). A integração Asaas está em{" "}
          <Link className="font-semibold text-eid-primary-300 hover:underline" href="/admin/integracoes-pagamento">
            Pagamentos
          </Link>
          . O catálogo e faixas de preço (condomínio, clube, recorrência automática no cadastro) estão em{" "}
          <Link className="font-semibold text-eid-primary-300 hover:underline" href="/admin/locais/planos-mensalidade">
            Planos de mensalidade
          </Link>
          .
        </p>
      </div>

      <section>
        <h2 className="text-base font-bold text-eid-fg">Locais (espaços genéricos)</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Busque por ID, UUID, nome, slug ou endereço. Cada local pode ter assinatura, categoria, valor e override (isento / forçar bloqueio).
        </p>
        <form method="get" className="mt-3 flex max-w-2xl flex-wrap items-end gap-2" action="/admin/locais">
          <label className="min-w-0 flex-1 text-xs font-semibold text-eid-text-secondary">
            Busca
            <input
              name="q"
              type="search"
              defaultValue={rawQ}
              placeholder="ID, nome, slug, local…"
              className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="eid-btn-primary min-h-[40px] shrink-0 rounded-xl px-4 text-sm font-bold"
          >
            Buscar
          </button>
          {rawQ ? (
            <Link
              href="/admin/locais"
              className="min-h-[40px] self-end rounded-xl border border-eid-text-secondary/30 px-3 py-2 text-sm font-bold text-eid-text-secondary"
            >
              Limpar
            </Link>
          ) : null}
        </form>
        <p className="mt-1 text-xs text-eid-text-muted">
          Até 200 resultados.{" "}
          <Link className="font-semibold text-eid-primary-300 hover:underline" href="/admin/locais/suspeitas-mista">
            Relatório: reservas mista só gratuitas (suspeita)
          </Link>
        </p>

        <div className="mt-4 space-y-4">
          {data.length === 0 ? (
            <p className="text-sm text-eid-text-secondary">Nenhum local na busca.</p>
          ) : null}
          {(data ?? []).map((l) => {
            const cat = (l as { categoria_mensalidade?: string | null }).categoria_mensalidade ?? "outro";
            const localRow = l as {
              id: number;
              modo_reserva?: string;
              modo_monetizacao?: string;
              taxa_reserva_plataforma_centavos?: number | null;
              socios_mensalidade_espaco?: string;
              paas_aprovado_operacao_sem_gateway?: boolean | null;
              paas_primeiro_pagamento_mensal_recebido_em?: string | null;
              operacao_suspeita_somente_reservas_gratis?: boolean | null;
              operacao_suspeita_observacao?: string | null;
            };
            const modoR = (localRow.modo_reserva ?? "mista") as keyof typeof MODO_RESERVA_LABEL;
            const modoM = (localRow.modo_monetizacao ?? "misto") as keyof typeof MODO_MONETIZACAO_LABEL;
            const taxaReservaBrl = Number(localRow.taxa_reserva_plataforma_centavos ?? 0) / 100;
            const sociosFl = (localRow.socios_mensalidade_espaco ?? "em_breve") as keyof typeof SOCIOS_MENSAL_ESPACO_LABEL;
            const a = assinMap.get(l.id) as
              | {
                  id: number;
                  status: string;
                  valor_mensal_centavos: number;
                  proxima_cobranca: string | null;
                  trial_ate: string | null;
                  situacao_override: string | null;
                  plano_nome: string | null;
                  observacoes_admin: string | null;
                  plano_mensal_id: number | null;
                }
              | undefined;
            const situ = computeMensalidadePainelState(
              ei,
              a ?? null,
              cat,
              new Date(),
              {
                modoReserva: localRow.modo_reserva,
                modoMonetizacao: localRow.modo_monetizacao,
                paasAprovadoOperacaoSemGateway: localRow.paas_aprovado_operacao_sem_gateway,
                paasPrimeiroPagamentoMensalRecebidoEm: localRow.paas_primeiro_pagamento_mensal_recebido_em,
              }
            );
            const cor =
              situ.nivel === "bloqueado" || (a?.situacao_override === "forcar_bloqueio" && situ.nivel !== "isento")
                ? "text-red-300"
                : situ.nivel === "inativo_agenda"
                  ? "text-amber-200/90"
                  : situ.nivel === "aviso" || situ.diasEmAtraso > 0
                    ? "text-amber-200"
                    : "text-emerald-200/90";
            const valorBrl = (a?.valor_mensal_centavos ?? 0) / 100;
            return (
              <div
                key={l.id}
                className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50"
              >
                <div className="grid gap-3 p-3 md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-mono text-[10px] text-eid-text-secondary">ID {l.id}</p>
                    <p className="text-sm font-bold text-eid-fg">
                      {l.nome_publico} {!l.ativo_listagem ? <span className="text-amber-200/90">(fora da listagem)</span> : null}
                    </p>
                    <p className="text-[11px] text-eid-text-secondary">
                      {l.localizacao} · {l.slug ? `/${l.slug}` : "sem slug"} · categoria: {cat}
                    </p>
                    <p className={`mt-1 text-xs font-semibold ${cor}`}>
                      Mensalidade plataforma: {situ.nivel} · {situ.mensagem}
                    </p>
                    <p className="mt-0.5 text-[11px] text-eid-text-secondary">
                      {a
                        ? `Paga ${brlDeCentavos(a.valor_mensal_centavos)} · próx. venc. ${a.proxima_cobranca ?? "—"} · override ${a.situacao_override ?? "—"}`
                        : "Sem assinatura na tabela ainda (use o formulário abaixo)."}
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-eid-text-secondary">
                      Reservas: {MODO_RESERVA_LABEL[modoR] ?? modoR} · {MODO_MONETIZACAO_LABEL[modoM] ?? modoM} · taxa plataforma
                      (reserva): {brlDeCentavos(Math.round(taxaReservaBrl * 100))} / reserva (líquido desejado, antes do split Asaas). Sócios:{" "}
                      {SOCIOS_MENSAL_ESPACO_LABEL[sociosFl] ?? sociosFl}.
                    </p>
                    {localRow.operacao_suspeita_somente_reservas_gratis ? (
                      <p className="mt-1 text-[11px] text-red-300">
                        Suspeita (mista, só reservas gratuitas há 15+ dias, nenhuma paga). {localRow.operacao_suspeita_observacao ?? ""}{" "}
                        <Link className="font-bold underline" href="/admin/locais/suspeitas-mista">
                          Ver relatório
                        </Link>
                      </p>
                    ) : null}
                    <form action={adminSetPaasAprovadoOperacaoSemGateway} className="mt-2 flex max-w-lg flex-wrap items-center gap-2 text-[10px] text-eid-text-secondary">
                      <input type="hidden" name="espaco_generico_id" value={l.id} />
                      <span className="shrink-0">Reservas 100% gratuitas (e simil.):</span>
                      <select
                        name="aprovado_sem_pagamento"
                        defaultValue={localRow.paas_aprovado_operacao_sem_gateway ? "true" : "false"}
                        className="eid-input-dark min-w-[200px] rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="false">Exigir 1º pagamento PaaS (padrão)</option>
                        <option value="true">Liberar grade sem pagamento (exceção admin)</option>
                      </select>
                      <button type="submit" className="rounded border border-eid-primary-500/40 px-2 py-1 text-[10px] font-bold text-eid-primary-200">
                        Aplicar
                      </button>
                    </form>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <form action={adminSetEspacoStatus} className="flex flex-wrap items-end gap-1">
                      <input type="hidden" name="id" value={l.id} />
                      <input type="text" name="status" defaultValue={l.status ?? ""} className="eid-input-dark w-28 rounded px-1 py-0.5 text-[11px]" />
                      <button type="submit" className="text-[10px] font-bold text-eid-primary-300">
                        status
                      </button>
                    </form>
                    {l.ativo_listagem ? (
                      <form action={adminSetEspacoListagem} className="inline">
                        <input type="hidden" name="id" value={l.id} />
                        <input type="hidden" name="ativo_listagem" value="false" />
                        <button type="submit" className="text-[11px] font-bold text-amber-200">
                          Ocultar listagem
                        </button>
                      </form>
                    ) : (
                      <form action={adminSetEspacoListagem} className="inline">
                        <input type="hidden" name="id" value={l.id} />
                        <input type="hidden" name="ativo_listagem" value="true" />
                        <button type="submit" className="text-[11px] font-bold text-eid-primary-300">
                          Publicar listagem
                        </button>
                      </form>
                    )}
                    <Link
                      href={l.slug ? `/espaco/${l.slug}` : `/local/${l.id}`}
                      className="text-[11px] font-bold text-eid-primary-300 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir público
                    </Link>
                  </div>
                </div>
                <details className="border-t border-[color:var(--eid-border-subtle)]/60 bg-eid-bg/20 p-3">
                  <summary className="cursor-pointer text-xs font-bold text-eid-primary-300">
                    Modo de reserva, monetização e taxa (plataforma)
                  </summary>
                  <p className="mt-2 max-w-2xl text-[10px] text-eid-text-secondary">
                    A <strong className="font-semibold text-eid-fg">taxa de reserva</strong> é o valor em reais que a plataforma deseja receber por
                    reserva, embutido na cobrança junto com o processamento (Asaas); o desconto da taxa do cliente e o repasse vêm do módulo de
                    pagamento.
                  </p>
                  <form action={adminUpdateEspacoModoCobranca} className="mt-3 grid max-w-2xl gap-2 sm:grid-cols-2">
                    <input type="hidden" name="id" value={l.id} />
                    <label className="text-[10px] text-eid-text-secondary sm:col-span-2">
                      Modo de reserva (público / unidades)
                      <select
                        name="modo_reserva"
                        defaultValue={localRow.modo_reserva ?? "mista"}
                        className="eid-input-dark mt-1 w-full max-w-md rounded-lg px-2 py-1.5 text-sm"
                      >
                        <option value="gratuita">{MODO_RESERVA_LABEL.gratuita}</option>
                        <option value="paga">{MODO_RESERVA_LABEL.paga}</option>
                        <option value="mista">{MODO_RESERVA_LABEL.mista}</option>
                      </select>
                    </label>
                    <label className="text-[10px] text-eid-text-secondary sm:col-span-2">
                      O que o local paga / como monetiza
                      <select
                        name="modo_monetizacao"
                        defaultValue={localRow.modo_monetizacao ?? "misto"}
                        className="eid-input-dark mt-1 w-full max-w-md rounded-lg px-2 py-1.5 text-sm"
                      >
                        <option value="mensalidade_plataforma">{MODO_MONETIZACAO_LABEL.mensalidade_plataforma}</option>
                        <option value="apenas_reservas">{MODO_MONETIZACAO_LABEL.apenas_reservas}</option>
                        <option value="misto">{MODO_MONETIZACAO_LABEL.misto}</option>
                      </select>
                    </label>
                    <label className="text-[10px] text-eid-text-secondary">
                      Taxa plataforma por reserva (R$)
                      <input
                        name="taxa_reserva_plataforma_brl"
                        type="number"
                        step="0.01"
                        min={0}
                        defaultValue={Number(taxaReservaBrl.toFixed(2))}
                        className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-[10px] text-eid-text-secondary sm:col-span-2 sm:max-w-2xl">
                      Mensalidade de sócios (módulo do espaço)
                      <select
                        name="socios_mensalidade_espaco"
                        defaultValue={localRow.socios_mensalidade_espaco ?? "em_breve"}
                        className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                      >
                        <option value="off">{SOCIOS_MENSAL_ESPACO_LABEL.off}</option>
                        <option value="em_breve">{SOCIOS_MENSAL_ESPACO_LABEL.em_breve}</option>
                        <option value="on">{SOCIOS_MENSAL_ESPACO_LABEL.on}</option>
                      </select>
                    </label>
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        className="rounded-lg border border-eid-primary-500/40 bg-eid-primary-500/15 px-3 py-2 text-xs font-bold text-eid-fg"
                      >
                        Salvar modo e taxa
                      </button>
                    </div>
                  </form>
                </details>
                <details className="border-t border-[color:var(--eid-border-subtle)]/60 bg-eid-bg/25 p-3">
                  <summary className="cursor-pointer text-xs font-bold text-eid-primary-300">Editar assinatura / categoria (plataforma)</summary>
                  <form action={adminUpdateEspacoMensalidadePlataforma} className="mt-3 grid max-w-2xl gap-2 sm:grid-cols-2">
                    <input type="hidden" name="espaco_generico_id" value={l.id} />
                    <label className="text-[10px] text-eid-text-secondary sm:col-span-2">
                      Categoria
                      <select
                        name="categoria_mensalidade"
                        defaultValue={cat}
                        className="eid-input-dark mt-1 w-full max-w-sm rounded-lg px-2 py-1.5 text-sm"
                      >
                        {CATEGORIAS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="sm:col-span-2">
                      <form action={adminAplicarPlanoMensalAutomatico} className="inline">
                        <input type="hidden" name="espaco_generico_id" value={l.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-eid-text-secondary/25 px-3 py-1.5 text-[11px] font-bold text-eid-primary-200 hover:bg-white/5"
                        >
                          Aplicar plano do catálogo (faixa por categoria e unidades ativas)
                        </button>
                      </form>
                    </div>
                    <label className="text-[10px] text-eid-text-secondary sm:col-span-2">
                      Plano (catálogo) — vincular assinatura
                      <select
                        name="plano_mensal_id"
                        defaultValue={a?.plano_mensal_id && a.plano_mensal_id > 0 ? String(a.plano_mensal_id) : "0"}
                        className="eid-input-dark mt-1 w-full max-w-2xl rounded-lg px-2 py-1.5 text-sm"
                      >
                        <option value="0">(nenhum — preencha valor e nome manualmente)</option>
                        {planosCatalogo.map((p) => {
                          const faixa = p.max_unidades == null ? `${p.min_unidades}+` : `${p.min_unidades}–${p.max_unidades}`;
                          const preco = brlDeCentavos(p.valor_mensal_centavos);
                          const label = `${p.categoria_espaco} · faixa ${faixa} u. · ${p.nome} · ${preco}/mês${
                            p.liberacao !== "publico" ? " [catálogo não público — uso admin]" : ""
                          }`;
                          return (
                            <option key={p.id} value={p.id} disabled={p.liberacao === "inativo"}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    <label className="text-[10px] text-eid-text-secondary">
                      Valor mensal (R$) — pago à plataforma
                      <input
                        name="valor_mensal_brl"
                        type="number"
                        step="0.01"
                        min={0}
                        defaultValue={Number(valorBrl.toFixed(2))}
                        className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-[10px] text-eid-text-secondary">
                      Próxima cobrança (data)
                      <input
                        name="proxima_cobranca"
                        type="date"
                        defaultValue={a?.proxima_cobranca ?? ""}
                        className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-[10px] text-eid-text-secondary">
                      Nome do plano
                      <input
                        name="plano_nome"
                        defaultValue={a?.plano_nome ?? "Plataforma"}
                        className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-[10px] text-eid-text-secondary">
                      Status
                      <select name="status" defaultValue={a?.status ?? "active"} className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm">
                        <option value="trial">trial</option>
                        <option value="active">active</option>
                        <option value="overdue">overdue</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </label>
                    <label className="text-[10px] text-eid-text-secondary sm:col-span-2">
                      Override
                      <select
                        name="situacao_override"
                        defaultValue={a?.situacao_override ?? ""}
                        className="eid-input-dark mt-1 w-full max-w-sm rounded-lg px-2 py-1.5 text-sm"
                      >
                        <option value="">(automático / sem override)</option>
                        <option value="isento">Isento (não cobra / não bloqueia)</option>
                        <option value="forcar_bloqueio">Forçar bloqueio (manual)</option>
                      </select>
                    </label>
                    <label className="text-[10px] text-eid-text-secondary sm:col-span-2">
                      Obs. internas
                      <textarea
                        name="observacoes_admin"
                        rows={2}
                        defaultValue={a?.observacoes_admin ?? ""}
                        className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                      />
                    </label>
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        className="rounded-lg border border-eid-primary-500/40 bg-eid-primary-500/15 px-3 py-2 text-xs font-bold text-eid-fg"
                      >
                        Salvar assinatura
                      </button>
                    </div>
                  </form>
                </details>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold text-eid-fg">Reivindicações de posse</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">Pedidos com documento comprobatório para validação oficial.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-3 py-2">Espaço</th>
                <th className="px-3 py-2">Solicitante</th>
                <th className="px-3 py-2">Documento</th>
                <th className="px-3 py-2">Mensagem</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Decisão</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => {
                const espaco = espacoMap.get(Number(claim.espaco_generico_id));
                const profile = perfilMap.get(String(claim.solicitante_id ?? ""));
                return (
                  <tr key={claim.id} className="border-b border-[color:var(--eid-border-subtle)]/50 align-top">
                    <td className="px-3 py-2">
                      <p className="font-medium text-eid-fg">{espaco?.nome_publico ?? `Espaço #${claim.espaco_generico_id}`}</p>
                      <p className="mt-0.5 text-[11px] text-eid-text-secondary">{espaco?.localizacao ?? "Localização não informada"}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-eid-fg">{profile?.nome ?? claim.solicitante_id}</p>
                      <p className="mt-0.5 text-[11px] text-eid-text-secondary">
                        {claim.criado_em ? new Date(claim.criado_em).toLocaleString("pt-BR") : "—"}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      {signedUrlMap.get(claim.id) ? (
                        <a
                          href={signedUrlMap.get(claim.id) ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-eid-primary-300 hover:underline"
                        >
                          Abrir arquivo
                        </a>
                      ) : (
                        <span className="text-eid-text-secondary">Sem arquivo</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-eid-text-secondary">
                      {claim.mensagem ?? "Sem mensagem"}
                      {claim.observacoes_admin ? <p className="mt-1 text-amber-200">Admin: {claim.observacoes_admin}</p> : null}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-eid-text-secondary">
                      <p>{claim.status ?? "pendente"}</p>
                      {claim.revisado_em ? <p className="mt-0.5">Revisto em {new Date(claim.revisado_em).toLocaleString("pt-BR")}</p> : null}
                    </td>
                    <td className="px-3 py-2">
                      <form action={adminReviewEspacoClaim} className="space-y-2">
                        <input type="hidden" name="claim_id" value={claim.id} />
                        <textarea
                          name="observacoes_admin"
                          rows={3}
                          defaultValue={claim.observacoes_admin ?? ""}
                          className="eid-input-dark w-64 rounded px-2 py-1 text-[11px]"
                          placeholder="Observações da revisão"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            name="decision"
                            value="aprovar"
                            className="rounded border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-200"
                          >
                            Aprovar
                          </button>
                          <button
                            type="submit"
                            name="decision"
                            value="rejeitar"
                            className="rounded border border-red-500/35 bg-red-500/10 px-2 py-1 text-[11px] font-bold text-red-200"
                          >
                            Rejeitar
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
