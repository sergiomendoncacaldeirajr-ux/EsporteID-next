import { adminCreateEsporte, adminSetEsporteAtivo, adminUpdateEsporteCatalogo } from "@/app/admin/actions";
import { getSportCapabilityByName } from "@/lib/sport-capabilities";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export default async function AdminEsportesPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role para listar esportes.</p>;
  }
  const db = createServiceRoleClient();
  const { data, error } = await db.from("esportes").select("*").order("ordem", { ascending: true });
  if (error) {
    return <p className="text-sm text-red-300">{error.message}</p>;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-4">
        <h2 className="text-base font-bold text-eid-fg">Novo esporte</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">Cria registro no catálogo. Slug em minúsculas, único (preencha ou deixe em branco para derivar do nome).</p>
        <form action={adminCreateEsporte} className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2">
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Nome *</span>
            <input name="nome" required className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg" placeholder="ex.: Tênis" />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Slug (opcional)</span>
            <input name="slug" className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg" placeholder="tenis" />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Ordem</span>
            <input name="ordem" type="number" defaultValue={0} className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg" />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Tipo</span>
            <input name="tipo" defaultValue="individual" className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg" />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Lançamento</span>
            <input name="tipo_lancamento" defaultValue="sets" className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg" />
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Categoria processamento</span>
            <select
              name="categoria_processamento"
              defaultValue="confronto"
              className="eid-input-dark h-9 max-w-md rounded-lg px-2 text-sm text-eid-fg"
            >
              <option value="confronto">confronto</option>
              <option value="performance">performance</option>
              <option value="perfil">perfil</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-eid-fg sm:col-span-2">
            <input name="permite_individual" type="checkbox" defaultChecked />
            Permite individual
          </label>
          <label className="flex items-center gap-2 text-xs text-eid-fg sm:col-span-2">
            <input name="permite_dupla" type="checkbox" defaultChecked />
            Permite dupla
          </label>
          <label className="flex items-center gap-2 text-xs text-eid-fg sm:col-span-2">
            <input name="permite_time" type="checkbox" />
            Permite time
          </label>
          <label className="flex items-center gap-2 text-xs text-eid-fg sm:col-span-2">
            <input name="ativo" type="checkbox" defaultChecked />
            Ativo no catálogo
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg border border-eid-primary-500/45 bg-eid-primary-500/15 px-4 py-2 text-xs font-bold text-eid-fg"
            >
              Criar esporte
            </button>
          </div>
        </form>
      </section>

      <div>
        <h2 className="text-base font-bold text-eid-fg">Catálogo</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">Ativar/desativar rápido ou abrir o bloco para editar nome, slug, regras e ordem.</p>
        <div className="mt-4 space-y-3">
          {(data ?? []).map((e) => {
            const caps = getSportCapabilityByName(e.nome);
            return (
              <div
                key={e.id}
                className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-eid-fg">
                      {e.nome} {!e.ativo ? <span className="text-red-300/90">(inativo)</span> : null}
                    </p>
                    <p className="text-[11px] text-eid-text-secondary">
                      id {e.id} · slug {e.slug ?? "—"} · confronto {e.categoria_processamento ?? "—"} · ordem {e.ordem}
                    </p>
                    <p className="mt-1 text-[11px] text-eid-text-secondary">
                      rank/desafio: {caps.match && caps.ranking ? "ativo" : "bloqueado"} · torneio: {caps.torneio ? "ativo" : "bloqueado"} · professor:{" "}
                      {caps.professor ? "ativo" : "bloqueado"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {e.ativo ? (
                      <form action={adminSetEsporteAtivo}>
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="ativo" value="false" />
                        <button type="submit" className="rounded-lg border border-red-400/40 px-2 py-1 text-[11px] font-bold text-red-200">
                          Desativar
                        </button>
                      </form>
                    ) : (
                      <form action={adminSetEsporteAtivo}>
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="ativo" value="true" />
                        <button type="submit" className="rounded-lg border border-eid-primary-500/40 px-2 py-1 text-[11px] font-bold text-eid-primary-300">
                          Ativar
                        </button>
                      </form>
                    )}
                  </div>
                </div>
                <details className="mt-3 border-t border-[color:var(--eid-border-subtle)]/60 pt-2">
                  <summary className="cursor-pointer text-xs font-bold text-eid-primary-300">Editar campos do esporte</summary>
                  <form action={adminUpdateEsporteCatalogo} className="mt-3 grid max-w-2xl gap-2 sm:grid-cols-2">
                    <input type="hidden" name="id" value={e.id} />
                    <label className="grid gap-1 sm:col-span-2">
                      <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Nome *</span>
                      <input
                        name="nome"
                        required
                        defaultValue={e.nome}
                        className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Slug</span>
                      <input
                        name="slug"
                        defaultValue={e.slug ?? ""}
                        className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Ordem</span>
                      <input
                        name="ordem"
                        type="number"
                        defaultValue={e.ordem}
                        className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Tipo</span>
                      <input name="tipo" defaultValue={e.tipo ?? "individual"} className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Lançamento</span>
                      <input
                        name="tipo_lancamento"
                        defaultValue={e.tipo_lancamento ?? "sets"}
                        className="eid-input-dark h-9 rounded-lg px-2 text-sm text-eid-fg"
                      />
                    </label>
                    <label className="grid gap-1 sm:col-span-2">
                      <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Categoria processamento</span>
                      <select
                        name="categoria_processamento"
                        defaultValue={e.categoria_processamento ?? "confronto"}
                        className="eid-input-dark h-9 max-w-md rounded-lg px-2 text-sm text-eid-fg"
                      >
                        <option value="confronto">confronto</option>
                        <option value="performance">performance</option>
                        <option value="perfil">perfil</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-eid-fg sm:col-span-2">
                      <input name="permite_individual" type="checkbox" defaultChecked={e.permite_individual} />
                      Permite individual
                    </label>
                    <label className="flex items-center gap-2 text-xs text-eid-fg sm:col-span-2">
                      <input name="permite_dupla" type="checkbox" defaultChecked={e.permite_dupla} />
                      Permite dupla
                    </label>
                    <label className="flex items-center gap-2 text-xs text-eid-fg sm:col-span-2">
                      <input name="permite_time" type="checkbox" defaultChecked={e.permite_time} />
                      Permite time
                    </label>
                    <label className="flex items-center gap-2 text-xs text-eid-fg sm:col-span-2">
                      <input name="ativo" type="checkbox" defaultChecked={e.ativo} />
                      Ativo
                    </label>
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        className="rounded-lg border border-eid-primary-500/45 bg-eid-primary-500/15 px-3 py-1.5 text-xs font-bold text-eid-fg"
                      >
                        Salvar alterações
                      </button>
                    </div>
                  </form>
                </details>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
