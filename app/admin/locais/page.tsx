import Link from "next/link";
import { SearchSuggestGetForm } from "@/components/search/search-suggest-get-form";
import {
  adminAplicarPlanoMensalAutomatico,
  adminDeleteEspacoGenerico,
  adminRemoveEspacoLogoBg,
  adminReviewEspacoClaim,
  adminSetEspacoAdminSuspenso,
  adminSetEspacoListagem,
  adminSetEspacoStatus,
  adminSetPaasAprovadoOperacaoSemGateway,
  adminUpdateEspacoInfo,
  adminUpdateEspacoMensalidadePlataforma,
  adminUpdateEspacoModoCobranca,
} from "@/app/admin/actions";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";
import { computeMensalidadePainelState } from "@/lib/espacos/mensalidade-acesso";
import { inferirNivelPlanoPaaS, perfilComercialPlanoPaaS } from "@/lib/espacos/plano-mensal-catalogo";
import {
  CLUBE_ASSINATURA_SOCIOS_LABEL,
  MODO_MONETIZACAO_LABEL,
  SOCIOS_MENSAL_ESPACO_LABEL,
} from "@/lib/espacos/monetizacao-labels";

const CATEGORIAS = [
  { value: "clube", label: "Clube" },
  { value: "condominio", label: "Condomínio" },
  { value: "centro_esportivo", label: "Centro esportivo" },
  { value: "quadra", label: "Quadra" },
  { value: "outro", label: "Outro" },
];

const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "pendente_validacao", label: "Pendente validação" },
  { value: "rascunho", label: "Rascunho" },
  { value: "suspenso", label: "Suspenso" },
  { value: "inativo", label: "Inativo" },
];

function sanitizeBusca(term: string) {
  return term.trim().slice(0, 96).replace(/[%_,]/g, "").trim();
}

function brlDeCentavos(c: number) {
  return (Number(c || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function OwnershipBadge({ status }: { status: string | null }) {
  if (status === "generico")
    return <span className="inline-flex items-center rounded-full border border-eid-border-subtle bg-eid-surface/50 px-2 py-0.5 text-[10px] font-semibold text-eid-text-secondary">Genérico</span>;
  if (status === "reivindicado")
    return <span className="inline-flex items-center rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[10px] font-semibold text-eid-primary-300">Reivindicado</span>;
  if (status === "dono_cadastrado")
    return <span className="inline-flex items-center rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">Dono cadastrado</span>;
  return <span className="inline-flex items-center rounded-full border border-eid-border-subtle bg-eid-surface/50 px-2 py-0.5 text-[10px] font-semibold text-eid-text-secondary">—</span>;
}

function StatusPill({ status, adminSuspenso, ativoListagem, ownershipStatus }: {
  status: string | null; adminSuspenso: boolean | null; ativoListagem: boolean | null; ownershipStatus: string | null;
}) {
  if (adminSuspenso)
    return <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">● Suspenso (admin)</span>;
  if (!ativoListagem) {
    const label = ownershipStatus === "generico" ? "Aguard. vitrine" : "Fora da listagem";
    return <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/12 px-2 py-0.5 text-[10px] font-bold text-amber-300">● {label}</span>;
  }
  const s = (status ?? "").toLowerCase();
  if (s === "pendente_validacao")
    return <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/12 px-2 py-0.5 text-[10px] font-bold text-amber-300">● Pend. validação</span>;
  if (s === "ativo")
    return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">● Ativo</span>;
  if (s === "rascunho")
    return <span className="inline-flex items-center gap-1 rounded-full border border-eid-border-subtle bg-eid-surface/50 px-2 py-0.5 text-[10px] font-bold text-eid-text-secondary">● Rascunho</span>;
  return <span className="inline-flex items-center gap-1 rounded-full border border-eid-border-subtle bg-eid-surface/50 px-2 py-0.5 text-[10px] font-bold text-eid-text-secondary">● {status ?? "—"}</span>;
}

type PageProps = { searchParams?: Promise<{ q?: string; adm_flash?: string; adm_detail?: string }> };

export default async function AdminLocaisPage({ searchParams }: PageProps) {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role para listar locais.</p>;
  }
  const sp = (await searchParams) ?? {};
  const admFlash = typeof sp.adm_flash === "string" ? sp.adm_flash : "";
  const admDetail = typeof sp.adm_detail === "string" ? sp.adm_detail : "";
  const rawQ = (sp.q ?? "").trim();
  const qSafe = sanitizeBusca(rawQ);
  const db = createServiceRoleClient();
  const hasRemoveBgKey = !!process.env.REMOVEBG_API_KEY;

  const { data: eiRow, error: eiErr } = await db.from("ei_financeiro_config").select("*").eq("id", 1).maybeSingle();
  if (eiErr) return <p className="text-sm text-red-300">{eiErr.message}</p>;
  const ei = (eiRow ?? {}) as Record<string, unknown>;

  const { data: planosCatRows, error: planosErr } = await db
    .from("espaco_plano_mensal_plataforma")
    .select("id, nome, categoria_espaco, min_unidades, max_unidades, valor_mensal_centavos, socios_mensal_modo, liberacao, ordem")
    .is("espaco_generico_id", null)
    .order("ordem", { ascending: true });
  if (planosErr) return <p className="text-sm text-red-300">{planosErr.message}</p>;
  const planosCatalogo = (planosCatRows ?? []) as Array<{
    id: number; nome: string; categoria_espaco: string; min_unidades: number;
    max_unidades: number | null; valor_mensal_centavos: number; socios_mensal_modo: string | null; liberacao: string; ordem: number;
  }>;

  let locaisQ = db
    .from("espacos_genericos")
    .select(
      "id, slug, nome_publico, localizacao, status, operacao_status, aceita_socios, ativo_listagem, admin_suspenso, ownership_status, criado_em, categoria_mensalidade, modo_reserva, modo_monetizacao, taxa_reserva_plataforma_centavos, socios_mensalidade_espaco, clube_assinaturas_socios, paas_aprovado_operacao_sem_gateway, paas_primeiro_pagamento_mensal_recebido_em, operacao_suspeita_somente_reservas_gratis, operacao_suspeita_observacao, logo_arquivo, responsavel_usuario_id, criado_por_usuario_id, venue_config_json, cidade, uf, lat, lng"
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
  if (locaisRes.error) return <p className="text-sm text-red-300">{locaisRes.error.message}</p>;
  const data = locaisRes.data ?? [];
  const locaisIds = data.map((l) => l.id);

  const ownerIds = [...new Set(data.flatMap((l) => {
    const lf = l as { responsavel_usuario_id?: string | null; criado_por_usuario_id?: string | null };
    return [lf.responsavel_usuario_id, lf.criado_por_usuario_id].filter(Boolean) as string[];
  }))];
  const { data: ownerProfileRows } = ownerIds.length
    ? await db.from("profiles").select("id, nome, avatar_url").in("id", ownerIds)
    : { data: [] };
  const ownerProfileMap = new Map((ownerProfileRows ?? []).map((p) => [p.id, p]));
  const { data: parceiroRows } = ownerIds.length
    ? await db
        .from("parceiro_conta_asaas")
        .select("usuario_id, nome_razao_social, email, onboarding_status")
        .in("usuario_id", ownerIds)
    : { data: [] };
  const parceiroMap = new Map((parceiroRows ?? []).map((p) => [p.usuario_id, p]));

  const { data: assinRows } = locaisIds.length
    ? await db
        .from("espaco_assinaturas_plataforma")
        .select("id, espaco_generico_id, status, valor_mensal_centavos, proxima_cobranca, trial_ate, situacao_override, plano_nome, observacoes_admin, plano_mensal_id, trial_dias_override, isento_total, recorrencia_cartao_confirmada_em, asaas_subscription_id")
        .in("espaco_generico_id", locaisIds)
    : { data: [] as unknown[] };
  const assinMap = new Map(
    (assinRows ?? []).map((a) => {
      const row = a as { espaco_generico_id: number; [k: string]: unknown };
      return [row.espaco_generico_id, row] as const;
    })
  );

  const claimsRes = await db
    .from("espaco_reivindicacoes")
    .select("id, espaco_generico_id, solicitante_id, documento_arquivo, mensagem, status, criado_em, revisado_em, observacoes_admin")
    .order("criado_em", { ascending: false })
    .limit(80);
  const claims = claimsRes.data ?? [];
  const espacoIds = [...new Set(claims.map((c) => Number(c.espaco_generico_id)).filter(Number.isFinite))];
  const solicitanteIds = [...new Set(claims.map((c) => String(c.solicitante_id ?? "")).filter(Boolean))];
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
  const pendingClaimsCount = claims.filter((c) => c.status === "pendente").length;

  const flashMsg =
    admFlash === "delete_ok" ? "Local excluído permanentemente do sistema." :
    admFlash === "delete_erro" ? "Não foi possível excluir o local." :
    admFlash === "delete_confirm" ? "Para excluir, digite exatamente EXCLUIR no campo de confirmação." :
    admFlash === "delete_param" ? "Parâmetros de exclusão inválidos." :
    admFlash === "info_ok" ? "Dados do local atualizados com sucesso." :
    admFlash === "info_param" ? "Parâmetros inválidos para atualização." :
    admFlash === "info_erro" ? "Erro ao atualizar os dados do local." :
    admFlash === "info_noop" ? "Nenhum dado foi alterado." :
    admFlash === "listagem_ok" ? "Local aprovado e publicado na plataforma." :
    admFlash === "listagem_oculta" ? "Local removido da listagem pública." :
    admFlash === "listagem_bloqueada" ? "Ainda não é possível publicar este local." :
    admFlash === "listagem_param" ? "Parâmetros inválidos para publicação." :
    admFlash === "listagem_erro" ? "Erro ao alterar a publicação do local." : null;
  const flashIsSuccess = admFlash === "delete_ok" || admFlash === "info_ok" || admFlash === "listagem_ok" || admFlash === "listagem_oculta";

  return (
    <div className="space-y-8" data-eid-admin-locais>
      {flashMsg ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${flashIsSuccess ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-100" : "border-amber-500/35 bg-amber-500/10 text-amber-100"}`} role="status">
          <p className="font-semibold">{flashMsg}</p>
          {admDetail ? <p className="mt-1 font-mono text-[11px] text-eid-text-secondary">{admDetail}</p> : null}
        </div>
      ) : null}

      {/* Info bar */}
      <div className="rounded-2xl border border-eid-primary-500/20 bg-eid-primary-500/[0.04] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-eid-fg">Operação de locais e planos</h2>
            <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">
              Reservas gratuitas ou mistas exigem mensalidade da plataforma. Reservas somente pagas não pagam mensalidade PaaS:
              o local usa recursos pagos e paga apenas taxas/comissões das reservas.
            </p>
          </div>
          <Link
            className="rounded-xl bg-eid-action-500 px-3 py-2 text-xs font-black text-white hover:bg-eid-action-600"
            href="/admin/locais/planos-mensalidade"
          >
            Gerenciar planos
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-eid-text-secondary">
          <Link className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-1.5 font-semibold text-eid-primary-300 hover:bg-eid-surface/70" href="/admin/financeiro">Financeiro</Link>
          <Link className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-1.5 font-semibold text-eid-primary-300 hover:bg-eid-surface/70" href="/admin/integracoes-pagamento">Pagamentos Asaas</Link>
          <Link className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-1.5 font-semibold text-eid-primary-300 hover:bg-eid-surface/70" href="/admin/locais/suspeitas-mista">Reservas suspeitas</Link>
        </div>
      </div>

      {/* ── Locais ───────────────────────────────────────────────────── */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-eid-fg">Locais cadastrados</h2>
            <p className="mt-0.5 text-xs text-eid-text-secondary">
              Busque por ID, nome, slug ou endereço. Até 200 resultados.
            </p>
          </div>
          {data.length > 0 && (
            <span className="rounded-full border border-eid-border-subtle bg-eid-surface/50 px-3 py-1 text-xs font-semibold text-eid-text-secondary">
              {data.length} encontrado{data.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <SearchSuggestGetForm
          action="/admin/locais"
          defaultValue={rawQ}
          placeholder="ID, nome, slug, local…"
          scope="locais"
          label="Busca"
          clearHref="/admin/locais"
          className="mt-3 flex max-w-2xl flex-wrap items-end gap-2"
          inputClassName="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm"
          submitClassName="eid-btn-primary min-h-[40px] shrink-0 rounded-xl px-4 text-sm font-bold"
          clearClassName="min-h-[40px] self-end rounded-xl border border-eid-text-secondary/30 px-3 py-2 text-sm font-bold text-eid-text-secondary"
        />

        <div className="mt-4 space-y-4">
          {data.length === 0 ? (
            <div className="rounded-xl border border-dashed border-eid-border-subtle py-10 text-center text-sm text-eid-text-secondary">
              Nenhum local encontrado para esta busca.
            </div>
          ) : null}

          {data.map((l) => {
            const cat = (l as { categoria_mensalidade?: string | null }).categoria_mensalidade ?? "outro";
            const localRow = l as {
              id: number;
              admin_suspenso?: boolean | null;
              modo_reserva?: string;
              modo_monetizacao?: string;
              operacao_status?: string | null;
              taxa_reserva_plataforma_centavos?: number | null;
              socios_mensalidade_espaco?: string;
              clube_assinaturas_socios?: string;
              paas_aprovado_operacao_sem_gateway?: boolean | null;
              paas_primeiro_pagamento_mensal_recebido_em?: string | null;
              operacao_suspeita_somente_reservas_gratis?: boolean | null;
              operacao_suspeita_observacao?: string | null;
              logo_arquivo?: string | null;
              responsavel_usuario_id?: string | null;
              criado_por_usuario_id?: string | null;
              venue_config_json?: unknown;
              cidade?: string | null;
              uf?: string | null;
              lat?: number | null;
              lng?: number | null;
            };
            const isGenerico = l.ownership_status === "generico";
            const cfg = (localRow.venue_config_json as Record<string, string> | null) ?? {};

            const ownerProfile = localRow.responsavel_usuario_id
              ? ownerProfileMap.get(localRow.responsavel_usuario_id)
              : null;
            const parceiroAsaas = localRow.responsavel_usuario_id
              ? parceiroMap.get(localRow.responsavel_usuario_id)
              : null;
            const registrantProfile = localRow.criado_por_usuario_id
              ? ownerProfileMap.get(localRow.criado_por_usuario_id)
              : null;
            const taxaReservaBrl = Number(localRow.taxa_reserva_plataforma_centavos ?? 0) / 100;
            const a = assinMap.get(l.id) as {
              id: number; status: string; valor_mensal_centavos: number; proxima_cobranca: string | null;
              trial_ate: string | null; situacao_override: string | null; plano_nome: string | null;
              observacoes_admin: string | null; plano_mensal_id: number | null;
              trial_dias_override: number | null; isento_total: boolean | null;
              recorrencia_cartao_confirmada_em?: string | null; asaas_subscription_id?: string | null;
            } | undefined;
            const cadastroConcluido = isGenerico || (localRow.operacao_status !== "rascunho" && l.status !== "rascunho");
            const exigeMensalidade =
              !isGenerico && localRow.modo_reserva !== "paga" && localRow.modo_monetizacao !== "apenas_reservas";
            const mensalidadeConfigurada =
              !exigeMensalidade || Boolean(a?.isento_total) || Boolean(a?.recorrencia_cartao_confirmada_em);
            const exigeRecebimentos = !isGenerico && (localRow.modo_reserva === "paga" || localRow.modo_reserva === "mista");
            const recebimentosConfigurados =
              !exigeRecebimentos || Boolean(parceiroAsaas?.nome_razao_social) || Boolean(parceiroAsaas?.email);
            const prontoParaAprovar = cadastroConcluido && mensalidadeConfigurada && recebimentosConfigurados;
            const situ = computeMensalidadePainelState(ei, a ?? null, cat, new Date(), {
              modoReserva: localRow.modo_reserva,
              modoMonetizacao: localRow.modo_monetizacao,
              paasAprovadoOperacaoSemGateway: localRow.paas_aprovado_operacao_sem_gateway,
              paasPrimeiroPagamentoMensalRecebidoEm: localRow.paas_primeiro_pagamento_mensal_recebido_em,
            });
            const mensalidadeCor =
              situ.nivel === "bloqueado" || a?.situacao_override === "forcar_bloqueio"
                ? "text-red-300 border-red-500/25 bg-red-500/8"
                : situ.nivel === "inativo_agenda" ? "text-amber-200/90 border-amber-500/20 bg-amber-500/6"
                : situ.nivel === "aviso" || situ.diasEmAtraso > 0 ? "text-amber-200 border-amber-500/20 bg-amber-500/6"
                : "text-emerald-300 border-emerald-500/20 bg-emerald-500/6";
            const valorBrl = (a?.valor_mensal_centavos ?? 0) / 100;

            // Build address summary line
            const addrParts = [
              cfg.endereco && cfg.numero ? `${cfg.endereco}, ${cfg.numero}` : cfg.endereco,
              cfg.bairro,
              localRow.cidade ?? cfg.cidade,
              localRow.uf ?? cfg.estado,
              cfg.cep,
            ].filter(Boolean);
            const addrLine = addrParts.join(" · ");

            return (
              <div key={l.id} className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 shadow-sm">
                {/* ── Card header ── */}
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {/* Logo thumbnail */}
                    <div className="shrink-0">
                      {localRow.logo_arquivo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={localRow.logo_arquivo} alt="" className="h-12 w-12 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/30">
                          <svg viewBox="0 0 24 24" className="h-5 w-5 text-eid-text-secondary/40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                            <rect x="3" y="3" width="18" height="18" rx="3"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <path d="m21 15-5-5L5 21"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] text-eid-text-muted">#{l.id}</span>
                        <StatusPill
                          status={l.status}
                          adminSuspenso={localRow.admin_suspenso ?? null}
                          ativoListagem={l.ativo_listagem ?? null}
                          ownershipStatus={l.ownership_status ?? null}
                        />
                        <OwnershipBadge status={l.ownership_status ?? null} />
                        {localRow.operacao_suspeita_somente_reservas_gratis ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/35 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300">⚠ Suspeita</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-base font-bold text-eid-fg">{l.nome_publico ?? "Sem nome"}</p>
                      <p className="text-[11px] text-eid-text-secondary">
                        {l.localizacao ?? "—"} {l.slug ? <span className="font-mono opacity-70">· /{l.slug}</span> : null} · {cat}
                      </p>
                      {addrLine && (
                        <p className="mt-0.5 text-[11px] text-eid-text-secondary/70">{addrLine}</p>
                      )}
                      {/* Owner info inline */}
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-eid-text-secondary">
                        {ownerProfile && (
                          <span><span className="font-semibold">Dono:</span> {ownerProfile.nome}</span>
                        )}
                        {registrantProfile && (
                          <span><span className="font-semibold">Cadastrou:</span> {registrantProfile.nome}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                      href={l.slug ? `/espaco/${l.slug}` : `/local/${l.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1.5 text-[11px] font-semibold text-eid-primary-300 hover:bg-eid-primary-500/18"
                    >
                      Ver público ↗
                    </Link>
                    {l.ativo_listagem ? (
                      <form action={adminSetEspacoListagem} className="inline">
                        <input type="hidden" name="id" value={l.id} />
                        <input type="hidden" name="ativo_listagem" value="false" />
                        <button type="submit" className="inline-flex items-center rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/18">
                          Ocultar
                        </button>
                      </form>
                    ) : (
                        <form action={adminSetEspacoListagem} className="inline">
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="ativo_listagem" value="true" />
                          <button
                            type="submit"
                            disabled={!prontoParaAprovar}
                            title={prontoParaAprovar ? "Aprovar e publicar" : "Resolva as pendências antes de publicar"}
                            className="inline-flex items-center rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/18 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            Publicar
                          </button>
                        </form>
                    )}
                    {localRow.admin_suspenso ? (
                      <form action={adminSetEspacoAdminSuspenso} className="inline">
                        <input type="hidden" name="id" value={l.id} />
                        <input type="hidden" name="admin_suspenso" value="false" />
                        <button type="submit" className="inline-flex items-center rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
                          Reativar
                        </button>
                      </form>
                    ) : (
                      <form action={adminSetEspacoAdminSuspenso} className="inline">
                        <input type="hidden" name="id" value={l.id} />
                        <input type="hidden" name="admin_suspenso" value="true" />
                        <button type="submit" className="inline-flex items-center rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300">
                          Suspender
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {!isGenerico ? (
                  <div className="grid gap-2 border-t border-[color:var(--eid-border-subtle)]/50 bg-eid-bg/15 px-4 py-3 sm:grid-cols-3">
                    {[
                      {
                        ok: cadastroConcluido,
                        title: "Cadastro",
                        text: cadastroConcluido ? "Wizard concluído" : "Aguardando conclusão do wizard",
                      },
                      {
                        ok: mensalidadeConfigurada,
                        title: "Mensalidade",
                        text: exigeMensalidade
                          ? mensalidadeConfigurada
                            ? "Cartão configurado"
                            : "Falta configurar cartão de crédito"
                          : "Não exige mensalidade PaaS",
                      },
                      {
                        ok: recebimentosConfigurados,
                        title: "Recebimentos",
                        text: exigeRecebimentos
                          ? recebimentosConfigurados
                            ? "Conta Asaas informada"
                            : "Falta conta Asaas"
                          : "Não exige recebimentos",
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className={`rounded-xl border px-3 py-2 ${
                          item.ok
                            ? "border-emerald-500/25 bg-emerald-500/8"
                            : "border-amber-500/25 bg-amber-500/8"
                        }`}
                      >
                        <p className={`text-[10px] font-black uppercase tracking-[0.1em] ${item.ok ? "text-emerald-300" : "text-amber-300"}`}>
                          {item.ok ? "OK" : "Pendente"} · {item.title}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-eid-fg">{item.text}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* ── Status + mensalidade row ── */}
                <div className="grid gap-3 border-t border-[color:var(--eid-border-subtle)]/50 px-4 py-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-eid-text-muted">Status do cadastro</p>
                    <form action={adminSetEspacoStatus} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={l.id} />
                      <select name="status" defaultValue={l.status ?? ""} className="eid-input-dark min-w-[160px] rounded-lg px-2 py-1.5 text-xs">
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <button type="submit" className="rounded-lg border border-eid-primary-500/40 bg-eid-primary-500/15 px-3 py-1.5 text-[11px] font-bold text-eid-fg">
                        Salvar
                      </button>
                    </form>
                  </div>

                  {isGenerico ? (
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-eid-text-muted">Tipo</p>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-eid-border-subtle bg-eid-surface/40 px-3 py-1.5 text-[11px] font-semibold text-eid-text-secondary">
                        Cadastro genérico — sem cobrança de plataforma
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-eid-text-muted">Mensalidade plataforma</p>
                      <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${mensalidadeCor}`}>
                        <span className="capitalize">{situ.nivel}</span>
                        <span className="font-normal opacity-80">·</span>
                        <span className="font-normal">{situ.mensagem}</span>
                      </div>
                      {a ? (
                        <p className="mt-1 text-[11px] text-eid-text-secondary">
                          {brlDeCentavos(a.valor_mensal_centavos)}/mês · venc. {a.proxima_cobranca ?? "—"} · override: {a.situacao_override ?? "nenhum"}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-eid-text-secondary">Sem assinatura registrada</p>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Reservas gratuitas — só para locais com dono ── */}
                {!isGenerico && (
                  <div className="border-t border-[color:var(--eid-border-subtle)]/40 px-4 py-3">
                    <form action={adminSetPaasAprovadoOperacaoSemGateway} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="espaco_generico_id" value={l.id} />
                      <label className="text-[11px] text-eid-text-secondary">
                        Reservas 100% gratuitas (e simil.):
                      </label>
                      <select
                        name="aprovado_sem_pagamento"
                        defaultValue={localRow.paas_aprovado_operacao_sem_gateway ? "true" : "false"}
                        className="eid-input-dark rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="false">Exigir 1º pagamento PaaS (padrão)</option>
                        <option value="true">Liberar sem pagamento (exceção admin)</option>
                      </select>
                      <button type="submit" className="rounded-lg border border-eid-primary-500/35 px-3 py-1 text-[11px] font-bold text-eid-primary-200">
                        Aplicar
                      </button>
                    </form>
                    {localRow.operacao_suspeita_somente_reservas_gratis ? (
                      <p className="mt-1.5 text-[11px] text-red-300">
                        ⚠ Suspeita: mista, só reservas gratuitas há 15+ dias. {localRow.operacao_suspeita_observacao ?? ""}{" "}
                        <Link className="font-bold underline" href="/admin/locais/suspeitas-mista">Ver relatório</Link>
                      </p>
                    ) : null}
                  </div>
                )}

                {/* ── Dados básicos, endereço e logo ── */}
                <details className="group border-t border-[color:var(--eid-border-subtle)]/50">
                  <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-eid-primary-300 hover:bg-white/[0.02] list-none flex items-center gap-1.5">
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M6 4l4 4-4 4"/></svg>
                    Dados básicos, endereço e logo
                  </summary>
                  <div className="border-t border-[color:var(--eid-border-subtle)]/30 bg-eid-bg/20 px-4 pb-5 pt-4">
                    <form action={adminUpdateEspacoInfo} className="space-y-4 max-w-2xl" encType="multipart/form-data">
                      <input type="hidden" name="id" value={l.id} />

                      {/* Identidade */}
                      <div>
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.1em] text-eid-text-muted">Identidade</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="text-[11px] text-eid-text-secondary sm:col-span-2">
                            Nome público
                            <input name="nome_publico" defaultValue={l.nome_publico ?? ""} className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" />
                          </label>
                          <label className="text-[11px] text-eid-text-secondary">
                            Slug (URL)
                            <input name="slug" defaultValue={l.slug ?? ""} className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm font-mono" />
                          </label>
                          <label className="text-[11px] text-eid-text-secondary">
                            Localização (resumida)
                            <input name="localizacao" defaultValue={l.localizacao ?? ""} placeholder="Ex: Ipatinga - MG" className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" />
                          </label>
                        </div>
                      </div>

                      {/* Endereço completo */}
                      <div>
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.1em] text-eid-text-muted">Endereço completo</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="text-[11px] text-eid-text-secondary sm:col-span-2">
                            Logradouro (rua/av.)
                            <input name="endereco" defaultValue={cfg.endereco ?? ""} placeholder="Ex: Rua das Flores" className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" />
                          </label>
                          <label className="text-[11px] text-eid-text-secondary">
                            Número
                            <input name="numero" defaultValue={cfg.numero ?? ""} placeholder="123" className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" />
                          </label>
                          <label className="text-[11px] text-eid-text-secondary">
                            Complemento
                            <input name="complemento" defaultValue={cfg.complemento ?? ""} placeholder="Sala, bloco, galpão..." className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" />
                          </label>
                          <label className="text-[11px] text-eid-text-secondary">
                            Bairro
                            <input name="bairro" defaultValue={cfg.bairro ?? ""} placeholder="Bairro" className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" />
                          </label>
                          <label className="text-[11px] text-eid-text-secondary">
                            CEP
                            <input name="cep" defaultValue={cfg.cep ?? ""} placeholder="00000-000" className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm font-mono" />
                          </label>
                          <label className="text-[11px] text-eid-text-secondary">
                            Cidade
                            <input name="cidade" defaultValue={localRow.cidade ?? cfg.cidade ?? ""} placeholder="Cidade" className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" />
                          </label>
                          <label className="text-[11px] text-eid-text-secondary">
                            UF
                            <input name="estado" defaultValue={localRow.uf ?? cfg.estado ?? ""} placeholder="MG" maxLength={2} className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm uppercase" />
                          </label>
                          <label className="text-[11px] text-eid-text-secondary">
                            Latitude
                            <input name="lat" type="number" step="any" defaultValue={localRow.lat ?? ""} placeholder="-19.0000" className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm font-mono" />
                          </label>
                          <label className="text-[11px] text-eid-text-secondary">
                            Longitude
                            <input name="lng" type="number" step="any" defaultValue={localRow.lng ?? ""} placeholder="-44.0000" className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm font-mono" />
                          </label>
                        </div>
                        {(localRow.lat && localRow.lng) ? (
                          <a
                            href={`https://www.google.com/maps?q=${localRow.lat},${localRow.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-eid-primary-400 hover:underline"
                          >
                            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M8 2a4 4 0 0 1 4 4c0 3-4 8-4 8S4 9 4 6a4 4 0 0 1 4-4z"/><circle cx="8" cy="6" r="1.5"/></svg>
                            Ver pin atual no Google Maps ↗
                          </a>
                        ) : null}
                      </div>

                      {/* Logo */}
                      <div>
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.1em] text-eid-text-muted">Logo</p>
                        <div className="flex flex-wrap items-start gap-4">
                          {localRow.logo_arquivo ? (
                            <div className="flex items-start gap-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={localRow.logo_arquivo}
                                alt="Logo atual"
                                className="h-24 w-24 rounded-xl border border-[color:var(--eid-border-subtle)] bg-[repeating-conic-gradient(#1e2a3a_0%_25%,#0f1724_0%_50%)_0_0/16px_16px] object-contain p-1"
                              />
                              <div className="space-y-2">
                                <p className="text-[11px] text-eid-text-secondary">Logo atual</p>
                                {hasRemoveBgKey && (
                                  <form action={adminRemoveEspacoLogoBg}>
                                    <input type="hidden" name="id" value={l.id} />
                                    <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-[11px] font-bold text-violet-300 transition hover:bg-violet-500/18">
                                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5" aria-hidden>
                                        <path d="M3 3l10 10M6.5 3h3L14 8l-2.5 5H4.5L2 8l1-2"/>
                                      </svg>
                                      Remover fundo da logo atual
                                    </button>
                                  </form>
                                )}
                                <a
                                  href={localRow.logo_arquivo}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-eid-text-secondary hover:text-eid-primary-300"
                                >
                                  Ver original ↗
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/30">
                              <svg viewBox="0 0 24 24" className="h-8 w-8 text-eid-text-secondary/40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                                <rect x="3" y="3" width="18" height="18" rx="3"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <path d="m21 15-5-5L5 21"/>
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 space-y-2">
                            <label className="block text-[11px] text-eid-text-secondary">
                              Nova logo (substituir)
                              <input
                                name="logo_arquivo"
                                type="file"
                                accept="image/*"
                                className="mt-1 block w-full text-xs text-eid-text-secondary file:mr-2 file:rounded-lg file:border file:border-eid-border-subtle file:bg-eid-surface file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-eid-fg"
                              />
                            </label>
                            {hasRemoveBgKey ? (
                              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-eid-text-secondary">
                                <input type="checkbox" name="remove_bg" value="1" className="rounded" />
                                <span>Remover fundo automaticamente ao enviar <span className="text-violet-400">(remove.bg)</span></span>
                              </label>
                            ) : (
                              <p className="text-[11px] text-eid-text-secondary/60">
                                Configure <span className="font-mono">REMOVEBG_API_KEY</span> para habilitar remoção de fundo automática.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-1">
                        <button type="submit" className="rounded-lg border border-eid-primary-500/40 bg-eid-primary-500/15 px-5 py-2 text-xs font-bold text-eid-fg hover:bg-eid-primary-500/22 transition">
                          Salvar alterações
                        </button>
                      </div>
                    </form>
                  </div>
                </details>

                {/* ── Modo de reserva — só para locais com dono ── */}
                {!isGenerico && (
                  <details className="group border-t border-[color:var(--eid-border-subtle)]/50">
                    <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-eid-primary-300 hover:bg-white/[0.02] list-none flex items-center gap-1.5">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M6 4l4 4-4 4"/></svg>
                      Operação do espaço e cobrança
                    </summary>
                    <div className="border-t border-[color:var(--eid-border-subtle)]/30 bg-eid-bg/20 px-4 pb-4 pt-3">
                      <form action={adminUpdateEspacoModoCobranca} className="grid max-w-3xl gap-4 sm:grid-cols-2">
                        <input type="hidden" name="id" value={l.id} />
                        <div className="sm:col-span-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-text-muted">Tipo operacional</p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <label className="cursor-pointer rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/40 p-3 has-[:checked]:border-eid-primary-500/50 has-[:checked]:bg-eid-primary-500/10">
                              <input type="radio" name="modo_reserva" value="gratuita" defaultChecked={(localRow.modo_reserva ?? "gratuita") === "gratuita"} className="sr-only" />
                              <span className="block text-sm font-bold text-eid-fg">Espaço por associação</span>
                              <span className="mt-1 block text-[11px] leading-relaxed text-eid-text-secondary">Exige mensalidade da plataforma e membro ou sócio aprovado para reservar.</span>
                            </label>
                            <label className="cursor-pointer rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/40 p-3 has-[:checked]:border-eid-action-500/50 has-[:checked]:bg-eid-action-500/10">
                              <input type="radio" name="modo_reserva" value="paga" defaultChecked={(localRow.modo_reserva ?? "gratuita") === "paga"} className="sr-only" />
                              <span className="block text-sm font-bold text-eid-fg">Espaço com reserva paga</span>
                              <span className="mt-1 block text-[11px] leading-relaxed text-eid-text-secondary">Não paga mensalidade da plataforma. Opera com reserva avulsa paga, day use e cobranças do espaço.</span>
                            </label>
                          </div>
                        </div>
                        <label className="text-[11px] text-eid-text-secondary sm:col-span-2">
                          Monetização derivada
                          <select name="modo_monetizacao" defaultValue={localRow.modo_monetizacao ?? "mensalidade_plataforma"} className="eid-input-dark mt-1 w-full max-w-md rounded-lg px-2 py-1.5 text-sm">
                            <option value="mensalidade_plataforma">{MODO_MONETIZACAO_LABEL.mensalidade_plataforma}</option>
                            <option value="apenas_reservas">{MODO_MONETIZACAO_LABEL.apenas_reservas}</option>
                          </select>
                          <span className="mt-1 block text-[10px] leading-relaxed text-eid-text-secondary">
                            Esse campo acompanha o tipo operacional: associação usa mensalidade da plataforma; reserva paga usa apenas cobranças por reserva.
                          </span>
                        </label>
                        <label className="text-[11px] text-eid-text-secondary">
                          Taxa plataforma por reserva (R$)
                          <input name="taxa_reserva_plataforma_brl" type="number" step="0.01" min={0} defaultValue={Number(taxaReservaBrl.toFixed(2))} className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" />
                        </label>
                        <label className="text-[11px] text-eid-text-secondary sm:col-span-2">
                          Mensalidade de sócios
                          <select name="socios_mensalidade_espaco" defaultValue={localRow.socios_mensalidade_espaco ?? "em_breve"} className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm">
                            <option value="off">{SOCIOS_MENSAL_ESPACO_LABEL.off}</option>
                            <option value="em_breve">{SOCIOS_MENSAL_ESPACO_LABEL.em_breve}</option>
                            <option value="on">{SOCIOS_MENSAL_ESPACO_LABEL.on}</option>
                          </select>
                        </label>
                        <label className="text-[11px] text-eid-text-secondary sm:col-span-2">
                          Clube de assinaturas entre sócios
                          <select name="clube_assinaturas_socios" defaultValue={localRow.clube_assinaturas_socios ?? "em_breve"} className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm">
                            <option value="off">{CLUBE_ASSINATURA_SOCIOS_LABEL.off}</option>
                            <option value="em_breve">{CLUBE_ASSINATURA_SOCIOS_LABEL.em_breve}</option>
                            <option value="on">{CLUBE_ASSINATURA_SOCIOS_LABEL.on}</option>
                          </select>
                        </label>
                        <div className="sm:col-span-2">
                          <button type="submit" className="rounded-lg border border-eid-primary-500/40 bg-eid-primary-500/15 px-4 py-2 text-xs font-bold text-eid-fg">
                            Salvar modo e taxa
                          </button>
                        </div>
                      </form>
                    </div>
                  </details>
                )}

                {/* ── Assinatura — só para locais com dono ── */}
                {!isGenerico && (
                  <details className="group border-t border-[color:var(--eid-border-subtle)]/50">
                    <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-eid-primary-300 hover:bg-white/[0.02] list-none flex items-center gap-1.5">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M6 4l4 4-4 4"/></svg>
                      Plano da plataforma e ajustes manuais
                    </summary>
                    <div className="border-t border-[color:var(--eid-border-subtle)]/30 bg-eid-bg/25 px-4 pb-4 pt-3">
                      <form action={adminUpdateEspacoMensalidadePlataforma} className="grid max-w-2xl gap-3 sm:grid-cols-2">
                        <input type="hidden" name="espaco_generico_id" value={l.id} />
                        <label className="text-[11px] text-eid-text-secondary sm:col-span-2">
                          Categoria
                          <select name="categoria_mensalidade" defaultValue={cat} className="eid-input-dark mt-1 w-full max-w-sm rounded-lg px-2 py-1.5 text-sm">
                            {CATEGORIAS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                          </select>
                        </label>
                        <div className="sm:col-span-2">
                          <button type="submit" formAction={adminAplicarPlanoMensalAutomatico} className="rounded-lg border border-eid-text-secondary/25 px-3 py-1.5 text-[11px] font-bold text-eid-primary-200 hover:bg-white/5">
                            Aplicar plano do catálogo automaticamente
                          </button>
                        </div>
                        <label className="text-[11px] text-eid-text-secondary sm:col-span-2">
                          Plano do catálogo
                          <select name="plano_mensal_id" defaultValue={a?.plano_mensal_id && a.plano_mensal_id > 0 ? String(a.plano_mensal_id) : "0"} className="eid-input-dark mt-1 w-full max-w-2xl rounded-lg px-2 py-1.5 text-sm">
                            <option value="0">(nenhum — preencher manualmente)</option>
                            {planosCatalogo.map((p) => {
                              const faixa = p.max_unidades == null ? `${p.min_unidades}+` : `${p.min_unidades}–${p.max_unidades}`;
                              const planosDaCategoria = planosCatalogo.filter((item) => item.categoria_espaco === p.categoria_espaco);
                              const perfil = perfilComercialPlanoPaaS(inferirNivelPlanoPaaS(p, planosDaCategoria));
                              const label = `${perfil.nome} · ${perfil.titulo} · ${p.categoria_espaco} · ${faixa} u. · ${brlDeCentavos(p.valor_mensal_centavos)}/mês${p.liberacao !== "publico" ? " [admin]" : ""}`;
                              return (<option key={p.id} value={p.id} disabled={p.liberacao === "inativo"}>{label}</option>);
                            })}
                          </select>
                          <span className="mt-1 block text-[10px] leading-relaxed text-eid-text-secondary">
                            Este bloco só faz sentido para espaços por associação. Espaços com reserva paga devem ficar sem plano mensal da plataforma e operar por taxas/comissões das reservas.
                          </span>
                        </label>
                        <label className="text-[11px] text-eid-text-secondary">
                          Valor mensal (R$)
                          <input name="valor_mensal_brl" type="number" step="0.01" min={0} defaultValue={Number(valorBrl.toFixed(2))} className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" />
                        </label>
                        <label className="text-[11px] text-eid-text-secondary">
                          Próxima cobrança
                          <input name="proxima_cobranca" type="date" defaultValue={a?.proxima_cobranca ?? ""} className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" />
                        </label>
                        <label className="text-[11px] text-eid-text-secondary">
                          Mês grátis (dias)
                          <input name="trial_dias_override" type="number" min={0} max={90} defaultValue={a?.trial_dias_override ?? 30} className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" />
                        </label>
                        <label className="text-[11px] text-eid-text-secondary">
                          Nome do plano
                          <input name="plano_nome" defaultValue={a?.plano_nome ?? "Plataforma"} className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" />
                        </label>
                        <label className="text-[11px] text-eid-text-secondary">
                          Status da assinatura
                          <select name="status" defaultValue={a?.status ?? "active"} className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm">
                            <option value="trial">trial</option>
                            <option value="active">active</option>
                            <option value="overdue">overdue</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                        </label>
                        <label className="text-[11px] text-eid-text-secondary">
                          Override
                          <select name="situacao_override" defaultValue={a?.situacao_override ?? ""} className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm">
                            <option value="">(automático)</option>
                            <option value="isento">Isento (não cobra)</option>
                            <option value="forcar_bloqueio">Forçar bloqueio</option>
                          </select>
                        </label>
                        <label className="flex items-center gap-2 text-[11px] text-eid-text-secondary sm:col-span-2">
                          <input type="checkbox" name="isento_total" defaultChecked={Boolean(a?.isento_total)} />
                          Espaço sem cobrança da plataforma (isento total)
                        </label>
                        <label className="text-[11px] text-eid-text-secondary sm:col-span-2">
                          Observações internas
                          <textarea name="observacoes_admin" rows={2} defaultValue={a?.observacoes_admin ?? ""} className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-sm" />
                        </label>
                        <div className="sm:col-span-2">
                          <button type="submit" className="rounded-lg border border-eid-primary-500/40 bg-eid-primary-500/15 px-4 py-2 text-xs font-bold text-eid-fg">
                            Salvar assinatura
                          </button>
                        </div>
                      </form>
                    </div>
                  </details>
                )}

                {/* ── Danger zone ── */}
                <details className="group border-t border-red-500/20">
                  <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-red-400/80 hover:bg-red-500/5 list-none flex items-center gap-1.5">
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M6 4l4 4-4 4"/></svg>
                    Zona de risco — excluir permanentemente
                  </summary>
                  <div className="border-t border-red-500/20 bg-red-500/5 px-4 pb-4 pt-3">
                    <p className="mb-2 text-[11px] text-eid-text-secondary">
                      Remove o espaço e todos os dados vinculados (cascade). <strong className="text-eid-fg">Irreversível.</strong>{" "}
                      Digite <span className="font-mono font-bold text-eid-fg">EXCLUIR</span> para confirmar.
                    </p>
                    <form action={adminDeleteEspacoGenerico} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={l.id} />
                      <input name="confirmar_exclusao" type="text" autoComplete="off" placeholder="EXCLUIR" className="eid-input-dark w-36 rounded-lg px-2 py-1.5 text-sm" />
                      <button type="submit" className="rounded-lg border border-red-500/50 bg-red-500/15 px-3 py-1.5 text-[11px] font-bold text-red-200">
                        Excluir do sistema
                      </button>
                    </form>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Reivindicações ───────────────────────────────────────────── */}
      <section id="reivindicacoes">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-base font-bold text-eid-fg">Reivindicações de posse</h2>
          {pendingClaimsCount > 0 ? (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/45 bg-amber-500/12 px-2.5 py-1 text-[11px] font-bold text-amber-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              {pendingClaimsCount} pendente{pendingClaimsCount !== 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-eid-text-secondary">Pedidos com documento comprobatório para validação de propriedade.</p>

        <div className="mt-4 space-y-3">
          {claims.length === 0 ? (
            <div className="rounded-xl border border-dashed border-eid-border-subtle py-10 text-center text-sm text-eid-text-secondary">
              Nenhuma reivindicação registrada.
            </div>
          ) : null}

          {claims.map((claim) => {
            const espaco = espacoMap.get(Number(claim.espaco_generico_id));
            const profile = perfilMap.get(String(claim.solicitante_id ?? ""));
            const docUrl = signedUrlMap.get(claim.id);
            const isPending = claim.status === "pendente";
            const isApproved = claim.status === "aprovado";

            return (
              <div
                key={claim.id}
                className={`overflow-hidden rounded-2xl border ${
                  isPending
                    ? "border-amber-500/35 bg-amber-500/[0.04]"
                    : isApproved
                      ? "border-emerald-500/25 bg-emerald-500/[0.03]"
                      : "border-[color:var(--eid-border-subtle)] bg-eid-card/40"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/45 bg-amber-500/12 px-2 py-0.5 text-[10px] font-bold text-amber-300">● Pendente</span>
                      ) : isApproved ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">✓ Aprovado</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-500/35 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300">✕ Rejeitado</span>
                      )}
                      <span className="text-[10px] text-eid-text-muted">#{claim.id}</span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-eid-fg">
                      {espaco?.nome_publico ?? `Espaço #${claim.espaco_generico_id}`}
                    </p>
                    <p className="text-[11px] text-eid-text-secondary">{espaco?.localizacao ?? "Localização não informada"}</p>
                  </div>
                  <div className="text-right text-[11px] text-eid-text-secondary">
                    <p className="font-semibold text-eid-fg">{profile?.nome ?? "Solicitante desconhecido"}</p>
                    <p>{claim.criado_em ? new Date(claim.criado_em).toLocaleDateString("pt-BR") : "—"}</p>
                    {claim.revisado_em ? <p className="text-[10px]">Revisto {new Date(claim.revisado_em).toLocaleDateString("pt-BR")}</p> : null}
                  </div>
                </div>

                <div className="grid gap-3 border-t border-[color:var(--eid-border-subtle)]/40 px-4 py-3 sm:grid-cols-2">
                  <div>
                    {claim.mensagem ? (
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-eid-text-muted">Mensagem do solicitante</p>
                        <p className="text-[11px] text-eid-fg">{claim.mensagem}</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-eid-text-secondary">Sem mensagem</p>
                    )}
                    {claim.observacoes_admin ? (
                      <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">Obs. admin</p>
                        <p className="mt-0.5 text-[11px] text-amber-200">{claim.observacoes_admin}</p>
                      </div>
                    ) : null}
                    {docUrl ? (
                      <a href={docUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1.5 text-[11px] font-semibold text-eid-primary-300 hover:bg-eid-primary-500/18">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
                          <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6L9 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                          <path d="M9 2v4h4M5 9h6M5 11.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                        Ver documento
                      </a>
                    ) : (
                      <p className="mt-2 text-[11px] text-eid-text-muted">Sem documento anexado</p>
                    )}
                  </div>

                  <form action={adminReviewEspacoClaim} className="space-y-2.5">
                    <input type="hidden" name="claim_id" value={claim.id} />
                    <label className="block text-[11px] text-eid-text-secondary">
                      Cobrar mensalidade da plataforma?
                      <select name="cobra_mensalidade_plataforma" defaultValue="sim" className="eid-input-dark mt-1 w-full rounded-lg px-2 py-1.5 text-xs">
                        <option value="sim">Sim, cobrar mensalidade</option>
                        <option value="nao">Não — espaço isento (não exibir mensalidade)</option>
                      </select>
                      <span className="mt-0.5 block text-[10px] text-eid-text-muted">Pode ser alterado depois em &quot;Assinatura&quot; do espaço.</span>
                    </label>
                    <textarea
                      name="observacoes_admin"
                      rows={2}
                      defaultValue={claim.observacoes_admin ?? ""}
                      placeholder="Observações da revisão"
                      className="eid-input-dark w-full rounded-lg px-2 py-1.5 text-xs"
                    />
                    <div className="flex gap-2">
                      <button type="submit" name="decision" value="aprovar" className="flex-1 rounded-lg border border-emerald-500/40 bg-emerald-500/12 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20">
                        ✓ Aprovar
                      </button>
                      <button type="submit" name="decision" value="rejeitar" className="flex-1 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/18">
                        ✕ Rejeitar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
