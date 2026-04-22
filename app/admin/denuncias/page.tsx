import { adminSetDenunciaStatus } from "@/app/admin/actions";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

const ST = ["aberta", "em_analise", "resolvida", "arquivada"];

type DenunciaRow = {
  id: number;
  motivo: string;
  texto: string | null;
  status: string | null;
  codigo_motivo: string | null;
  alvo_usuario_id: string | null;
  alvo_tipo: string;
  alvo_id: number | null;
  denunciante_id: string;
  criado_em: string;
};

export default async function AdminDenunciasPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("denuncias")
    .select("id, motivo, texto, status, codigo_motivo, alvo_usuario_id, alvo_tipo, alvo_id, denunciante_id, criado_em")
    .order("id", { ascending: false })
    .limit(200);
  if (error) return <p className="text-sm text-red-300">{error.message}</p>;

  const rows = (data ?? []) as DenunciaRow[];
  const alvoIds = [...new Set(rows.map((r) => r.alvo_usuario_id).filter(Boolean))] as string[];
  const denIds = [...new Set(rows.map((r) => r.denunciante_id).filter(Boolean))];

  const nomePorId = new Map<string, string>();
  if (alvoIds.length) {
    const { data: perfisAlvo } = await db.from("profiles").select("id, nome").in("id", alvoIds);
    for (const p of perfisAlvo ?? []) {
      if (p.id) nomePorId.set(String(p.id), String(p.nome ?? ""));
    }
  }
  const faltamDen = denIds.filter((id) => !nomePorId.has(id));
  if (faltamDen.length) {
    const { data: perfisDen } = await db.from("profiles").select("id, nome").in("id", faltamDen);
    for (const p of perfisDen ?? []) {
      if (p.id) nomePorId.set(String(p.id), String(p.nome ?? ""));
    }
  }

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Denúncias</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">Últimas 200. Novas denúncias também geram alertas na visão geral do admin.</p>
      <div className="mt-4 space-y-3">
        {rows.map((d) => {
          const alvoNome = d.alvo_usuario_id ? nomePorId.get(d.alvo_usuario_id) : null;
          const denNome = nomePorId.get(d.denunciante_id);
          return (
            <div key={d.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-xs font-mono text-eid-text-secondary">#{d.id}</p>
                <form action={adminSetDenunciaStatus} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={d.id} />
                  <select name="status" defaultValue={d.status ?? "aberta"} className="eid-input-dark rounded-lg px-2 py-1 text-[11px]">
                    {ST.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="rounded border border-eid-primary-500/40 px-2 py-1 text-[10px] font-bold text-eid-primary-300">
                    Salvar
                  </button>
                </form>
              </div>
              {d.codigo_motivo ? (
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Código: {d.codigo_motivo}</p>
              ) : null}
              <p className="mt-1 text-sm font-semibold text-eid-fg">{d.motivo}</p>
              {d.texto ? <p className="mt-1 text-sm text-eid-text-secondary">{d.texto}</p> : null}
              <p className="mt-2 text-[11px] text-eid-text-secondary">
                Criada em {new Date(d.criado_em).toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-[11px] text-eid-text-secondary">
                Alvo ({d.alvo_tipo}
                {d.alvo_id != null ? ` #${d.alvo_id}` : ""}):{" "}
                {d.alvo_usuario_id ? (
                  <>
                    <a href={`/perfil/${d.alvo_usuario_id}`} className="font-semibold text-eid-primary-300">
                      {alvoNome ?? d.alvo_usuario_id}
                    </a>
                    <span className="font-mono text-eid-text-secondary"> · {d.alvo_usuario_id}</span>
                  </>
                ) : (
                  "—"
                )}
              </p>
              <p className="mt-1 text-[11px] text-eid-text-secondary">
                Denunciante:{" "}
                <span className="font-semibold text-eid-fg">{denNome ?? "—"}</span>
                <span className="font-mono"> · {d.denunciante_id}</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
