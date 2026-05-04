import Link from "next/link";
import { adminSupportChamadoMarcarStatus } from "@/app/admin/actions";
import { SUPPORT_CHAMADO_AREAS } from "@/lib/support/support-areas";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

type ChamadoRow = {
  id: number;
  usuario_id: string;
  area: string;
  mensagem: string;
  whatsapp_contato: string | null;
  status: string;
  criado_em: string;
  resolvido_em: string | null;
};

function whatsappHref(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "").replace(/\D+/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

function labelArea(area: string): string {
  return SUPPORT_CHAMADO_AREAS.find((a) => a.value === area)?.label ?? area;
}

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminSuportePage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const flash = typeof sp.adm_flash === "string" ? sp.adm_flash : "";
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("support_chamados")
    .select("id, usuario_id, area, mensagem, whatsapp_contato, status, criado_em, resolvido_em")
    .order("criado_em", { ascending: false })
    .limit(300);
  if (error) return <p className="text-sm text-red-300">{error.message}</p>;

  const rows = (data ?? []) as ChamadoRow[];
  const userIds = [...new Set(rows.map((r) => r.usuario_id))];
  const nomePorId = new Map<string, string>();
  if (userIds.length) {
    const { data: perfis } = await db.from("profiles").select("id, nome").in("id", userIds);
    for (const p of perfis ?? []) {
      if (p.id) nomePorId.set(String(p.id), String(p.nome ?? "—"));
    }
  }

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Suporte — chamados</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">
        Últimos 300 registros. O usuário envia o WhatsApp do perfil no momento do chamado.
      </p>
      {flash === "support_status_ok" ? (
        <p className="mt-3 rounded-lg border border-emerald-500/35 bg-emerald-500/12 px-3 py-2 text-xs font-semibold text-emerald-100">
          Status atualizado.
        </p>
      ) : null}
      {flash === "support_param" || flash === "support_erro" ? (
        <p className="mt-3 rounded-lg border border-amber-500/35 bg-amber-500/12 px-3 py-2 text-xs font-semibold text-amber-100">
          Não foi possível concluir a ação. Tente novamente.
        </p>
      ) : null}
      {flash === "support_db_erro" ? (
        <p className="mt-3 rounded-lg border border-rose-500/35 bg-rose-500/12 px-3 py-2 text-xs font-semibold text-rose-100">
          Erro ao gravar no banco.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-eid-text-secondary">Nenhum chamado ainda.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/50 text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-2 py-2">Data</th>
                <th className="px-2 py-2">Usuário</th>
                <th className="px-2 py-2">Área</th>
                <th className="px-2 py-2">WhatsApp</th>
                <th className="px-2 py-2">Mensagem</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--eid-border-subtle)]/80">
              {rows.map((r) => {
                const wa = whatsappHref(r.whatsapp_contato);
                const nome = nomePorId.get(r.usuario_id) ?? "—";
                return (
                  <tr key={r.id} className={r.status === "resolvido" ? "opacity-75" : ""}>
                    <td className="whitespace-nowrap px-2 py-2 text-eid-text-secondary">
                      {new Date(r.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="max-w-[8rem] px-2 py-2">
                      <Link href={`/admin/usuarios/${encodeURIComponent(r.usuario_id)}`} className="font-semibold text-eid-primary-300 hover:underline">
                        {nome}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-eid-fg">{labelArea(r.area)}</td>
                    <td className="px-2 py-2">
                      {wa ? (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="text-emerald-300 hover:underline">
                          Abrir WhatsApp
                        </a>
                      ) : (
                        <span className="text-eid-text-secondary">—</span>
                      )}
                    </td>
                    <td className="max-w-xs px-2 py-2 text-eid-text-secondary">
                      <span className="line-clamp-4 whitespace-pre-wrap break-words">{r.mensagem}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">
                      <span className={r.status === "resolvido" ? "text-emerald-300" : "text-amber-200"}>{r.status}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">
                      {r.status === "aberto" ? (
                        <form action={adminSupportChamadoMarcarStatus} className="inline">
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="resolvido" />
                          <button
                            type="submit"
                            className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-100"
                          >
                            Resolvido
                          </button>
                        </form>
                      ) : (
                        <form action={adminSupportChamadoMarcarStatus} className="inline">
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="aberto" />
                          <button
                            type="submit"
                            className="rounded border border-eid-text-secondary/40 bg-eid-surface/60 px-2 py-1 text-[10px] font-bold text-eid-text-secondary"
                          >
                            Reabrir
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
