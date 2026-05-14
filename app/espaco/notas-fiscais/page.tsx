import Link from "next/link";
import {
  salvarConfiguracaoFiscalEspacoAction,
  solicitarNotaFiscalEspacoClienteAction,
} from "@/app/espaco/actions";
import { fiscalCentavosToCurrency, fiscalStatusLabel } from "@/lib/fiscal/nfse";
import { getEspacoSelecionado } from "@/lib/espacos/server";
import { FileText, ReceiptText, Settings2 } from "lucide-react";

type Props = {
  searchParams?: Promise<{ espaco?: string }>;
};

export default async function EspacoNotasFiscaisPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const espacoId = Number(sp.espaco ?? 0) || null;
  const { supabase, selectedSpace } = await getEspacoSelecionado({
    nextPath: "/espaco/notas-fiscais",
    espacoId,
  });

  const [{ data: emitente }, { data: notas }, { data: transacoes }] = await Promise.all([
    supabase
      .from("fiscal_emitentes")
      .select("*")
      .eq("escopo", "espaco")
      .eq("espaco_generico_id", selectedSpace.id)
      .maybeSingle(),
    supabase
      .from("fiscal_notas")
      .select("id, transacao_id, tomador_nome, descricao, valor_servico_centavos, status, numero_nfse, pdf_url, criado_em")
      .eq("escopo", "espaco_cliente")
      .eq("espaco_generico_id", selectedSpace.id)
      .order("id", { ascending: false })
      .limit(40),
    supabase
      .from("espaco_transacoes")
      .select("id, tipo, status, valor_bruto_centavos, usuario_id, criado_em")
      .eq("espaco_generico_id", selectedSpace.id)
      .eq("status", "received")
      .order("id", { ascending: false })
      .limit(30),
  ]);

  const notasPorTransacao = new Set((notas ?? []).map((nota) => Number(nota.transacao_id ?? 0)).filter(Boolean));
  const emitentePronto = emitente?.status === "pronto";

  return (
    <div className="space-y-5">
      <section className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-eid-primary-300">Fiscal</p>
        <h2 className="mt-1 text-2xl font-black text-eid-fg">Notas fiscais do espaço</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-eid-text-secondary">
          Configure o emitente do espaço e solicite NFS-e para clientes após o pagamento ser recebido.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-eid-primary-300" aria-hidden />
            <h3 className="text-base font-black text-eid-fg">Emitente do espaço</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary">
            Esses dados identificam quem presta o serviço ao cliente. A emissão automática depende da integração fiscal
            escolhida e das credenciais/certificado do emitente.
          </p>
          <form action={salvarConfiguracaoFiscalEspacoAction} className="mt-4 grid gap-3">
            <input type="hidden" name="espaco_id" value={selectedSpace.id} />
            <input name="nome_razao_social" defaultValue={emitente?.nome_razao_social ?? selectedSpace.nome_publico} placeholder="Razão social" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
            <input name="documento" defaultValue={emitente?.documento ?? ""} placeholder="CPF/CNPJ do emitente" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="inscricao_municipal" defaultValue={emitente?.inscricao_municipal ?? ""} placeholder="Inscrição municipal" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
              <input name="regime_tributario" defaultValue={emitente?.regime_tributario ?? ""} placeholder="Regime tributário" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
              <input name="municipio" defaultValue={emitente?.municipio ?? selectedSpace.cidade ?? ""} placeholder="Município" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
              <input name="uf" defaultValue={emitente?.uf ?? selectedSpace.uf ?? ""} placeholder="UF" maxLength={2} className="eid-input-dark rounded-xl px-3 py-2.5 text-sm uppercase" />
              <input name="cnae" defaultValue={emitente?.cnae ?? ""} placeholder="CNAE" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
              <input name="codigo_servico" defaultValue={emitente?.codigo_servico ?? ""} placeholder="Código de serviço municipal" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
              <input name="item_lista_servico" defaultValue={emitente?.item_lista_servico ?? ""} placeholder="Item da lista de serviço" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
              <input name="aliquota_iss" defaultValue={emitente?.aliquota_iss ?? ""} placeholder="Alíquota ISS (%)" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="provedor" defaultValue={emitente?.provedor ?? "manual"} className="eid-input-dark rounded-xl px-3 py-2.5 text-sm">
                <option value="manual">Manual / fila operacional</option>
                <option value="nfse_nacional">NFS-e Nacional</option>
                <option value="provedor_api">Provedor fiscal/API</option>
              </select>
              <select name="ambiente" defaultValue={emitente?.ambiente ?? "producao"} className="eid-input-dark rounded-xl px-3 py-2.5 text-sm">
                <option value="producao">Produção</option>
                <option value="homologacao">Homologação</option>
              </select>
            </div>
            <textarea name="observacoes" rows={2} placeholder="Observações fiscais internas" className="eid-input-dark rounded-xl px-3 py-2.5 text-sm" />
            <button className="eid-btn-primary rounded-xl px-4 py-3 text-sm font-bold">Salvar dados fiscais</button>
          </form>
        </section>

        <section className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-eid-action-400" aria-hidden />
            <h3 className="text-base font-black text-eid-fg">Solicitar nota para cliente</h3>
          </div>
          {!emitentePronto ? (
            <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              Salve os dados fiscais do emitente antes de solicitar notas.
            </p>
          ) : null}
          <div className="mt-4 space-y-3">
            {(transacoes ?? []).length ? (
              (transacoes ?? []).map((tx) => {
                const jaTemNota = notasPorTransacao.has(Number(tx.id));
                return (
                  <form key={tx.id} action={solicitarNotaFiscalEspacoClienteAction} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                    <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                    <input type="hidden" name="transacao_id" value={tx.id} />
                    <p className="text-sm font-bold text-eid-fg">{tx.tipo} · {fiscalCentavosToCurrency(tx.valor_bruto_centavos)}</p>
                    <p className="mt-1 text-xs text-eid-text-secondary">Transação #{tx.id}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <input name="tomador_nome" placeholder="Nome/Razão social do cliente" disabled={!emitentePronto || jaTemNota} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                      <input name="tomador_documento" placeholder="CPF/CNPJ do cliente" disabled={!emitentePronto || jaTemNota} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                      <input name="tomador_email" placeholder="E-mail do cliente" disabled={!emitentePronto || jaTemNota} className="eid-input-dark rounded-xl px-3 py-2 text-sm sm:col-span-2" />
                      <input name="descricao" defaultValue={`Serviços prestados por ${selectedSpace.nome_publico}`} disabled={!emitentePronto || jaTemNota} className="eid-input-dark rounded-xl px-3 py-2 text-sm sm:col-span-2" />
                    </div>
                    <button disabled={!emitentePronto || jaTemNota} className="mt-3 rounded-xl border border-eid-action-500/35 bg-eid-action-500/10 px-4 py-2 text-xs font-bold text-eid-action-300 disabled:cursor-not-allowed disabled:opacity-50">
                      {jaTemNota ? "Nota já solicitada" : "Solicitar emissão"}
                    </button>
                  </form>
                );
              })
            ) : (
              <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4 text-sm text-eid-text-secondary">
                Nenhuma transação recebida para emissão.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-eid-primary-300" aria-hidden />
          <h3 className="text-base font-black text-eid-fg">Notas solicitadas</h3>
        </div>
        <div className="mt-4 space-y-2">
          {(notas ?? []).length ? (
            (notas ?? []).map((nota) => (
              <div key={nota.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-eid-fg">{nota.tomador_nome ?? "Tomador não informado"}</p>
                    <p className="mt-1 text-xs text-eid-text-secondary">{nota.descricao}</p>
                  </div>
                  <p className="text-right text-sm font-black text-eid-fg">{fiscalCentavosToCurrency(nota.valor_servico_centavos)}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-eid-text-secondary">
                  <span className="rounded-full border border-[color:var(--eid-border-subtle)] px-2 py-1">{fiscalStatusLabel(nota.status)}</span>
                  {nota.numero_nfse ? <span>NFSe {nota.numero_nfse}</span> : null}
                  {nota.pdf_url ? <Link href={nota.pdf_url} className="text-eid-primary-300 underline">PDF</Link> : null}
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
