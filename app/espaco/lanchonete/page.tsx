import Link from "next/link";
import {
  atualizarPermissoesEspacoStaffAction,
  atualizarProdutoLanchoneteEspacoAction,
  atualizarStatusPedidoLanchoneteEspacoAction,
  criarPedidoBalcaoLanchoneteEspacoAction,
  criarProdutoLanchoneteEspacoAction,
  registrarMovimentoEstoqueLanchoneteEspacoAction,
} from "@/app/espaco/actions";
import { getEspacoSelecionado } from "@/lib/espacos/server";

function moedaCentavos(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((Number(value ?? 0) || 0) / 100);
}

export default async function EspacoLanchonetePage() {
  const { supabase, selectedSpace, staffAccess } = await getEspacoSelecionado({
    nextPath: "/espaco/lanchonete",
  });

  if (staffAccess && !staffAccess.canViewLanchonete) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 text-sm text-amber-100">
        Seu acesso não inclui a área de lanchonete deste espaço.
      </div>
    );
  }

  const [{ data: produtos }, { data: pedidos }, { data: staffRows }] = await Promise.all([
    supabase
      .from("espaco_produtos")
      .select("id, nome, descricao, categoria, preco_centavos, foto_url, ativo, controla_estoque, estoque_atual, estoque_minimo, ordem")
      .eq("espaco_generico_id", selectedSpace.id)
      .order("ordem", { ascending: true }),
    supabase
      .from("espaco_pedidos")
      .select("id, status, payment_status, valor_total_centavos, origem, criado_em")
      .eq("espaco_generico_id", selectedSpace.id)
      .order("id", { ascending: false })
      .limit(20),
    supabase
      .from("espaco_staff")
      .select("id, status, permissoes_json, profiles(nome, username)")
      .eq("espaco_generico_id", selectedSpace.id)
      .eq("papel", "operacao_reservas")
      .order("id", { ascending: false }),
  ]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-xl font-black text-eid-fg">Bar / Lanchonete</h2>
          <p className="mt-1 text-sm text-eid-text-secondary">
            Cardápio, pedidos, vendas e estoque do espaço em um só lugar.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Produtos</p>
              <p className="mt-2 text-3xl font-black text-eid-fg">{(produtos ?? []).length}</p>
            </div>
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Pedidos abertos</p>
              <p className="mt-2 text-3xl font-black text-eid-fg">{(pedidos ?? []).filter((item) => item.status !== "entregue" && item.status !== "cancelado").length}</p>
            </div>
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Acesso</p>
              <p className="mt-2 text-sm font-black text-eid-fg">{staffAccess?.isOwner ? "Dono" : "Colaborador"}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Aba pública</p>
          <div className="mt-3 space-y-2 text-sm text-eid-text-secondary">
            <p>• Produtos aparecem em cards compactos</p>
            <p>• O perfil do espaço pode vender itens do bar</p>
            <p>• Colaboradores podem ganhar acesso só à lanchonete</p>
          </div>
          <Link
            href={`/espaco/${selectedSpace.slug}?tab=bar-lanchonete`}
            className="mt-4 inline-flex rounded-xl border border-eid-action-500/35 bg-eid-action-500/10 px-4 py-3 text-sm font-bold text-eid-action-400"
          >
            Ver aba pública da lanchonete
          </Link>
        </section>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
            <h3 className="text-lg font-black text-eid-fg">Venda rápida de balcão</h3>
            <form action={criarPedidoBalcaoLanchoneteEspacoAction} className="mt-4 grid gap-3">
              <input type="hidden" name="espaco_id" value={selectedSpace.id} />
              <select name="produto_id" className="eid-input-dark rounded-xl px-3 py-2 text-sm" defaultValue="">
                <option value="">Escolha o produto</option>
                {(produtos ?? []).map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome} · {moedaCentavos(produto.preco_centavos)}
                  </option>
                ))}
              </select>
              <input name="quantidade" type="number" min={1} defaultValue={1} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              <textarea name="observacoes" rows={2} placeholder="Observações da venda" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              <button className="eid-btn-primary rounded-xl px-4 py-3 text-sm font-bold">Registrar venda de balcão</button>
            </form>
          </div>
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
            <h3 className="text-lg font-black text-eid-fg">Novo produto</h3>
            <form action={criarProdutoLanchoneteEspacoAction} className="mt-4 grid gap-3">
              <input type="hidden" name="espaco_id" value={selectedSpace.id} />
              <input name="nome" placeholder="Nome do produto" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              <input name="categoria" placeholder="Categoria (Bebidas, Lanches...)" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              <input name="preco_reais" type="number" min={0} step="0.01" placeholder="Preço (R$)" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              <input name="foto_url" placeholder="URL da foto (opcional)" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="estoque_atual" type="number" min={0} placeholder="Estoque atual" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                <input name="estoque_minimo" type="number" min={0} placeholder="Estoque mínimo" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              </div>
              <textarea name="descricao" rows={2} placeholder="Descrição curta" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              <label className="flex items-center gap-2 text-sm text-eid-fg"><input type="checkbox" name="ativo" defaultChecked />Produto ativo</label>
              <label className="flex items-center gap-2 text-sm text-eid-fg"><input type="checkbox" name="controla_estoque" defaultChecked />Controlar estoque</label>
              <button className="eid-btn-primary rounded-xl px-4 py-3 text-sm font-bold">Cadastrar produto</button>
            </form>
          </div>

          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
            <h3 className="text-lg font-black text-eid-fg">Produtos</h3>
            <div className="mt-4 space-y-3">
              {(produtos ?? []).length ? (
                (produtos ?? []).map((produto) => (
                  <details key={produto.id} className="group overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-eid-fg">{produto.nome}</p>
                        <p className="mt-1 text-[11px] text-eid-text-secondary">
                          {produto.categoria} · {moedaCentavos(produto.preco_centavos)} · estoque {produto.estoque_atual}
                        </p>
                      </div>
                      <span className="rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2 text-[11px] font-bold text-eid-primary-300">Editar</span>
                    </summary>
                    <div className="border-t border-[color:var(--eid-border-subtle)] p-4">
                      <form action={atualizarProdutoLanchoneteEspacoAction} className="grid gap-3">
                        <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                        <input type="hidden" name="produto_id" value={produto.id} />
                        <input name="nome" defaultValue={produto.nome} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                        <input name="categoria" defaultValue={produto.categoria ?? ""} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                        <input name="preco_reais" type="number" min={0} step="0.01" defaultValue={(Number(produto.preco_centavos ?? 0) / 100).toFixed(2)} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                        <input name="foto_url" defaultValue={produto.foto_url ?? ""} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input name="estoque_minimo" type="number" min={0} defaultValue={produto.estoque_minimo ?? 0} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                          <input name="ordem" type="number" min={0} defaultValue={produto.ordem ?? 0} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                        </div>
                        <textarea name="descricao" rows={2} defaultValue={produto.descricao ?? ""} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                        <label className="flex items-center gap-2 text-sm text-eid-fg"><input type="checkbox" name="ativo" defaultChecked={Boolean(produto.ativo)} />Produto ativo</label>
                        <label className="flex items-center gap-2 text-sm text-eid-fg"><input type="checkbox" name="controla_estoque" defaultChecked={Boolean(produto.controla_estoque)} />Controlar estoque</label>
                        <button className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 py-3 text-sm font-bold text-eid-primary-300">Salvar produto</button>
                      </form>

                      <form action={registrarMovimentoEstoqueLanchoneteEspacoAction} className="mt-4 grid gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4">
                        <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                        <input type="hidden" name="produto_id" value={produto.id} />
                        <p className="text-sm font-bold text-eid-fg">Movimentar estoque</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <select name="tipo" className="eid-input-dark rounded-xl px-3 py-2 text-sm" defaultValue="entrada">
                            <option value="entrada">Entrada</option>
                            <option value="baixa_manual">Baixa manual</option>
                            <option value="ajuste">Ajuste</option>
                          </select>
                          <input name="quantidade" type="number" min={1} placeholder="Quantidade" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                        </div>
                        <textarea name="observacoes" rows={2} placeholder="Motivo da movimentação" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                        <button className="rounded-xl border border-eid-action-500/35 bg-eid-action-500/10 px-4 py-3 text-sm font-bold text-eid-action-300">Registrar movimento</button>
                      </form>
                    </div>
                  </details>
                ))
              ) : (
                <p className="text-sm text-eid-text-secondary">Nenhum produto cadastrado ainda.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
            <h3 className="text-lg font-black text-eid-fg">Pedidos recentes</h3>
            <div className="mt-4 space-y-2">
              {(pedidos ?? []).length ? (
                (pedidos ?? []).map((pedido) => (
                  <form key={pedido.id} action={atualizarStatusPedidoLanchoneteEspacoAction} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3">
                    <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                    <input type="hidden" name="pedido_id" value={pedido.id} />
                    <p className="text-sm font-bold text-eid-fg">Pedido #{pedido.id}</p>
                    <p className="mt-1 text-[11px] text-eid-text-secondary">{moedaCentavos(pedido.valor_total_centavos)} · origem {pedido.origem}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <select name="status" defaultValue={pedido.status} className="eid-input-dark rounded-xl px-3 py-2 text-sm">
                        <option value="pendente">Pendente</option>
                        <option value="preparando">Preparando</option>
                        <option value="pronto">Pronto</option>
                        <option value="entregue">Entregue</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                      <select name="payment_status" defaultValue={pedido.payment_status} className="eid-input-dark rounded-xl px-3 py-2 text-sm">
                        <option value="pending">Pagamento pendente</option>
                        <option value="processing">Processando</option>
                        <option value="received">Pago</option>
                        <option value="cancelled">Cancelado</option>
                        <option value="refunded">Estornado</option>
                      </select>
                    </div>
                    <button className="mt-3 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 py-2.5 text-sm font-bold text-eid-primary-300">
                      Atualizar pedido
                    </button>
                  </form>
                ))
              ) : (
                <p className="text-sm text-eid-text-secondary">Nenhum pedido registrado ainda.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
            <h3 className="text-lg font-black text-eid-fg">Permissões da equipe</h3>
            <p className="mt-1 text-sm text-eid-text-secondary">
              Escolha exatamente o que cada colaborador pode fazer na lanchonete e no espaço.
            </p>
            <div className="mt-4 space-y-3">
              {(staffRows ?? []).length ? (
                (staffRows ?? []).map((staff) => {
                  const profile = Array.isArray(staff.profiles) ? staff.profiles[0] : staff.profiles;
                  const perms = staff.permissoes_json && typeof staff.permissoes_json === "object" && !Array.isArray(staff.permissoes_json)
                    ? (staff.permissoes_json as Record<string, Record<string, boolean>>)
                    : {};
                  const agenda = perms.agenda?.ver ?? true;
                  const reservas = perms.reservas?.conferir ?? true;
                  const pagamentos = perms.pagamentos?.ver ?? true;
                  const lanchoneteVer = perms.lanchonete?.ver ?? false;
                  const lanchoneteVender = perms.lanchonete?.vender ?? false;
                  const lanchoneteEstoque = perms.lanchonete?.estoque ?? false;
                  const configuracaoEditar = perms.configuracao?.editar ?? false;
                  return (
                    <form key={staff.id} action={atualizarPermissoesEspacoStaffAction} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-4">
                      <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                      <input type="hidden" name="staff_id" value={staff.id} />
                      <p className="text-sm font-bold text-eid-fg">{profile?.nome ?? profile?.username ?? "Colaborador"}</p>
                      <p className="mt-1 text-[11px] text-eid-text-secondary">{staff.status} · equipe operacional</p>
                      <div className="mt-4 grid gap-2 text-sm text-eid-fg">
                        <label className="flex items-center gap-2"><input type="checkbox" name="agenda_ver" defaultChecked={agenda} />Ver agenda</label>
                        <label className="flex items-center gap-2"><input type="checkbox" name="reservas_conferir" defaultChecked={reservas} />Conferir reservas</label>
                        <label className="flex items-center gap-2"><input type="checkbox" name="pagamentos_ver" defaultChecked={pagamentos} />Ver pagamentos</label>
                        <label className="flex items-center gap-2"><input type="checkbox" name="lanchonete_ver" defaultChecked={lanchoneteVer} />Ver lanchonete</label>
                        <label className="flex items-center gap-2"><input type="checkbox" name="lanchonete_vender" defaultChecked={lanchoneteVender} />Vender na lanchonete</label>
                        <label className="flex items-center gap-2"><input type="checkbox" name="lanchonete_estoque" defaultChecked={lanchoneteEstoque} />Controlar estoque</label>
                        <label className="flex items-center gap-2"><input type="checkbox" name="configuracao_editar" defaultChecked={configuracaoEditar} />Editar configuração</label>
                      </div>
                      <button className="mt-4 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 py-3 text-sm font-bold text-eid-primary-300">
                        Salvar permissões
                      </button>
                    </form>
                  );
                })
              ) : (
                <p className="text-sm text-eid-text-secondary">Nenhum colaborador operacional cadastrado ainda.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
