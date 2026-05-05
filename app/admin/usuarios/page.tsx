import Link from "next/link";
import { SearchSuggestGetForm } from "@/components/search/search-suggest-get-form";
import {
  listAdminProfilesSemGenero,
  searchProfilesForAdmin,
  sanitizeAdminUserSearch,
} from "@/lib/admin/search-profiles";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

type Props = { searchParams?: Promise<{ q?: string; adm_flash?: string; sem_genero?: string }> };

function labelGeneroAdmin(raw: string | null | undefined): string {
  const g = String(raw ?? "").trim();
  if (!g) return "—";
  if (g === "Masculino" || g === "Feminino" || g === "Outro") return g;
  return `Legado: ${g}`;
}

export default async function AdminUsuariosPage({ searchParams }: Props) {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role para listar usuários.</p>;
  }
  const sp = (await searchParams) ?? {};
  const rawQ = (sp.q ?? "").trim();
  const listFlash = typeof sp.adm_flash === "string" ? sp.adm_flash.trim() : "";
  const semGenero = sp.sem_genero === "1" || sp.sem_genero === "true";
  const qSafe = sanitizeAdminUserSearch(rawQ);

  const db = createServiceRoleClient();

  const { data, error } =
    semGenero && !qSafe
      ? await listAdminProfilesSemGenero(db)
      : await searchProfilesForAdmin(db, rawQ, {
          whenEmpty: "recent",
          defaultListLimit: 200,
          searchLimit: 200,
        });

  if (error) {
    return <p className="text-sm text-red-300">{error.message}</p>;
  }

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Usuários</h2>
      {listFlash === "usuario_delete_ok" ? (
        <p
          className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100"
          role="status"
        >
          Usuário excluído com sucesso.
        </p>
      ) : null}
      <p className="mt-1 text-sm text-eid-text-secondary">
        {semGenero && !qSafe
          ? "Perfis sem gênero informado (null ou vazio), até 200 — mais recentes primeiro. Use Gerir para definir Masculino, Feminino ou Outro."
          : sanitizeAdminUserSearch(rawQ)
            ? "Resultados da busca (até 200)."
            : "Últimos 200 perfis (ordem de cadastro). Use a busca por nome, @username, e-mail ou UUID."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {semGenero && !qSafe ? (
          <Link
            href="/admin/usuarios"
            className="rounded-lg border border-eid-primary-500/40 bg-eid-primary-500/10 px-3 py-1.5 font-semibold text-eid-primary-200 hover:border-eid-primary-500/60"
          >
            Ver lista geral (últimos cadastros)
          </Link>
        ) : (
          <Link
            href="/admin/usuarios?sem_genero=1"
            className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 font-semibold text-amber-100 hover:border-amber-500/50"
          >
            Cadastros sem gênero (corrigir)
          </Link>
        )}
      </div>
      <SearchSuggestGetForm
        action="/admin/usuarios"
        defaultValue={rawQ}
        placeholder="Nome, @arrobado, e-mail ou ID"
        scope="global"
        clearHref="/admin/usuarios"
        className="mt-4 flex max-w-lg flex-wrap items-end gap-2"
        inputClassName="eid-input-dark h-10 w-full rounded-lg px-3 text-sm text-eid-fg"
        submitClassName="h-10 rounded-lg border border-eid-primary-500/45 bg-eid-primary-500/15 px-4 text-xs font-bold text-eid-fg"
        clearClassName="h-10 self-end rounded-lg border border-eid-text-secondary/30 px-3 py-2 text-xs font-bold text-eid-text-secondary"
      />

      <div className="mt-4 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">@ / tipo</th>
              <th className="px-3 py-2">Gênero</th>
              <th className="px-3 py-2">Perfil</th>
              <th className="px-3 py-2">Maioridade (Desafio)</th>
              <th className="px-3 py-2">Cadastro</th>
              <th className="px-3 py-2">Ação</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((p) => (
              <tr key={p.id} className="border-b border-[color:var(--eid-border-subtle)]/60">
                <td className="px-3 py-2 font-medium text-eid-fg">{p.nome ?? "—"}</td>
                <td className="px-3 py-2 text-eid-text-secondary">
                  {p.username ? `@${p.username}` : "—"} · {p.tipo_usuario}
                </td>
                <td className="max-w-[140px] px-3 py-2 text-eid-text-secondary">{labelGeneroAdmin(p.genero)}</td>
                <td className="px-3 py-2">{p.perfil_completo ? "Completo" : "Pendente"}</td>
                <td className="px-3 py-2 text-eid-text-secondary">
                  {p.match_maioridade_confirmada
                    ? `Sim · ${
                        p.match_maioridade_confirmada_em
                          ? new Date(p.match_maioridade_confirmada_em).toLocaleString("pt-BR")
                          : ""
                      }`
                    : "Não"}
                </td>
                <td className="px-3 py-2 text-eid-text-secondary">
                  {p.criado_em ? new Date(p.criado_em).toLocaleString("pt-BR") : "—"}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/usuarios/${p.id}`} className="mr-2 font-semibold text-eid-action-400 hover:underline">
                    Gerir
                  </Link>
                  <Link href={`/perfil/${p.id}`} className="font-semibold text-eid-primary-300 hover:underline" target="_blank" rel="noreferrer">
                    Perfil
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
