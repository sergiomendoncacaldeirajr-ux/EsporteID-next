import {
  adminSalvarConfiguracaoFiscalPlataformaAction,
  adminSolicitarNotaFiscalPlataformaAction,
} from "@/app/admin/actions";
import {
  fiscalCentavosToCurrency,
  fiscalConfigBool,
  fiscalConfigText,
  fiscalParseConfigJson,
  fiscalStatusLabel,
} from "@/lib/fiscal/nfse";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";
import { FileText, ReceiptText, Settings2 } from "lucide-react";

export default async function AdminNotasFiscaisPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const [{ data: emitente }, { data: notas }, { data: transacoes }] = await Promise.all([
    db.from("fiscal_emitentes").select("*").eq("escopo", "plataforma").maybeSingle(),
    db
      .from("fiscal_notas")
      .select("id, espaco_generico_id, transacao_id, tomador_nome, descricao, valor_servico_centavos, status, numero_nfse, pdf_url, erro_mensagem, criado_em")
      .eq("escopo", "plataforma_espaco")
      .order("id", { ascending: false })
      .limit(60),
    db
      .from("espaco_transacoes")
      .select("id, espaco_generico_id, tipo, status, valor_bruto_centavos, comissao_plataforma_centavos, criado_em, espacos_genericos(nome_publico)")
      .eq("status", "received")
      .gt("comissao_plataforma_centavos", 0)
      .order("id", { ascending: false })
      .limit(40),
  ]);
  const notasPorTransacao = new Set((notas ?? []).map((nota) => Number(nota.transacao_id ?? 0)).filter(Boolean));
  const emitentePronto = emitente?.status === "pronto";
  const emitenteConfig = fiscalParseConfigJson(emitente?.config_json);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-eid-primary-300">Fiscal</p>
        <h2 className="mt-1 text-2xl font-black text-eid-fg">Notas fiscais da plataforma</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-eid-text-secondary">
          Configure o emitente do EsporteID e solicite NFS-e de prestação de serviço para os espaços.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-eid-primary-300" aria-hidden />
            <h3 className="text-base font-black text-eid-fg">Emitente EsporteID</h3>
          </div>
          <form action={adminSalvarConfiguracaoFiscalPlataformaAction} className="mt-4 grid gap-3">
            <input name="nome_razao_social" defaultValue={emitente?.nome_razao_social ?? ""} placeholder="Razão social" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
            <input name="documento" defaultValue={emitente?.documento ?? ""} placeholder="CNPJ do EsporteID" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="inscricao_municipal" defaultValue={emitente?.inscricao_municipal ?? ""} placeholder="Inscrição municipal" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
              <input name="regime_tributario" defaultValue={emitente?.regime_tributario ?? ""} placeholder="Regime tributário" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
              <input name="municipio" defaultValue={emitente?.municipio ?? ""} placeholder="Município" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
              <input name="uf" defaultValue={emitente?.uf ?? ""} placeholder="UF" maxLength={2} className="eid-input-dark rounded-xl px-3 py-2.5 text-sm uppercase" />
              <input name="cnae" defaultValue={emitente?.cnae ?? ""} placeholder="CNAE" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
              <input name="codigo_servico" defaultValue={emitente?.codigo_servico ?? ""} placeholder="Código de serviço" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
              <input name="item_lista_servico" defaultValue={emitente?.item_lista_servico ?? ""} placeholder="Item da lista" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
              <input name="aliquota_iss" defaultValue={emitente?.aliquota_iss ?? ""} placeholder="Alíquota ISS (%)" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="provedor" defaultValue={emitente?.provedor ?? "nfeio"} className="eid-input-dark rounded-xl px-3 py-2.5 text-sm">
                <option value="manual">Manual / fila operacional</option>
                <option value="nfeio">NFE.io automática</option>
                <option value="nfse_nacional">NFS-e Nacional</option>
                <option value="provedor_api">Provedor fiscal/API</option>
              </select>
              <select name="ambiente" defaultValue={emitente?.ambiente ?? "producao"} className="eid-input-dark rounded-xl px-3 py-2.5 text-sm">
                <option value="producao">Produção</option>
                <option value="homologacao">Homologação</option>
              </select>
            </div>
            <div className="rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 p-3">
              <p className="text-xs font-bold text-eid-primary-200">NFE.io</p>
              <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">
                Cadastre o EsporteID como empresa emissora na NFE.io e cole aqui o Company ID.
              </p>
              <input name="nfeio_company_id" defaultValue={fiscalConfigText(emitenteConfig, "nfeio_company_id")} placeholder="Company ID do EsporteID na NFE.io" className="eid-input-dark mt-3 w-full rounded-xl px-3 py-2.5 text-sm" />
              <label className="mt-3 flex items-start gap-2 text-xs font-semibold text-eid-fg">
                <input type="checkbox" name="auto_emitir_nfse" defaultChecked={fiscalConfigBool(emitenteConfig, "auto_emitir_nfse")} className="mt-0.5" />
                Emitir automaticamente quando a nota for solicitada
              </label>
            </div>
            <textarea name="observacoes" rows={2} placeholder="Observações internas" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
            <button className="eid-btn-primary rounded-xl px-4 py-3 text-sm font-bold">Salvar emitente</button>
          </form>
        </section>

        <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-eid-action-400" aria-hidden />
            <h3 className="text-base font-black text-eid-fg">Notas para espaços</h3>
          </div>
          {!emitentePronto ? (
            <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              Salve o emitente do EsporteID antes de solicitar emissão.
            </p>
          ) : null}
          <div className="mt-4 space-y-3">
            {(transacoes ?? []).length ? (
              (transacoes ?? []).map((tx) => {
                const jaTemNota = notasPorTransacao.has(Number(tx.id));
                const rel = tx.espacos_genericos as { nome_publico?: string | null } | { nome_publico?: string | null }[] | null;
                const espacoNome = Array.isArray(rel) ? rel[0]?.nome_publico : rel?.nome_publico;
                return (
                  <form key={tx.id} action={adminSolicitarNotaFiscalPlataformaAction} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                    <input type="hidden" name="espaco_id" value={tx.espaco_generico_id} />
                    <input type="hidden" name="transacao_id" value={tx.id} />
                    <p className="text-sm font-bold text-eid-fg">{espacoNome ?? `Espaço #${tx.espaco_generico_id}`}</p>
                    <p className="mt-1 text-xs text-eid-text-secondary">
                      Comissão {fiscalCentavosToCurrency(tx.comissao_plataforma_centavos)} · transação #{tx.id}
                    </p>
                    <input name="descricao" defaultValue={`Prestação de serviço EsporteID · ${tx.tipo}`} disabled={!emitentePronto || jaTemNota} className="eid-input-dark mt-3 w-full rounded-xl px-3 py-2 text-sm" />
                    <button disabled={!emitentePronto || jaTemNota} className="mt-3 rounded-xl border border-eid-action-500/35 bg-eid-action-500/10 px-4 py-2 text-xs font-bold text-eid-action-300 disabled:cursor-not-allowed disabled:opacity-50">
                      {jaTemNota ? "Nota já solicitada" : "Solicitar NFS-e"}
                    </button>
                  </form>
                );
              })
            ) : (
              <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4 text-sm text-eid-text-secondary">
                Nenhuma comissão recebida disponível para nota.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-eid-primary-300" aria-hidden />
          <h3 className="text-base font-black text-eid-fg">Fila fiscal</h3>
        </div>
        <div className="mt-4 space-y-2">
          {(notas ?? []).length ? (
            (notas ?? []).map((nota) => (
              <div key={nota.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-eid-fg">{nota.tomador_nome ?? `Espaço #${nota.espaco_generico_id}`}</p>
                    <p className="mt-1 text-xs text-eid-text-secondary">{nota.descricao}</p>
                  </div>
                  <p className="text-right text-sm font-black text-eid-fg">{fiscalCentavosToCurrency(nota.valor_servico_centavos)}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-eid-text-secondary">
                  <span className="rounded-full border border-[color:var(--eid-border-subtle)] px-2 py-1">{fiscalStatusLabel(nota.status)}</span>
                  {nota.numero_nfse ? <span>NFSe {nota.numero_nfse}</span> : null}
                  {nota.pdf_url ? <a href={nota.pdf_url} className="text-eid-primary-300 underline">PDF</a> : null}
                  {nota.erro_mensagem ? <span className="text-red-300">{nota.erro_mensagem}</span> : null}
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4 text-sm text-eid-text-secondary">
              Nenhuma nota solicitada ainda.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
