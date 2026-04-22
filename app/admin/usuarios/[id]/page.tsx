import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

type ConfRow = {
  id: number;
  data_nascimento_declarada: string;
  confirmado_em: string;
  ip_publico: string | null;
  user_agent: string | null;
  accept_language: string | null;
  referer: string | null;
  host: string | null;
  localizacao_perfil_snapshot: string | null;
  lat_snapshot: number | null;
  lng_snapshot: number | null;
  pais_inferido: string | null;
  versao_declaracao: string;
  detalhes_json: Record<string, unknown> | null;
};

export default async function AdminUsuarioDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const { data: p, error } = await db
    .from("profiles")
    .select(
      "id, nome, username, tipo_usuario, data_nascimento, match_maioridade_confirmada, match_maioridade_confirmada_em, localizacao, criado_em"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) return <p className="text-sm text-red-300">{error.message}</p>;
  if (!p) notFound();

  const { data: confs } = await db
    .from("match_maioridade_confirmacoes")
    .select("*")
    .eq("usuario_id", id)
    .order("confirmado_em", { ascending: false })
    .limit(50);

  const rows = (confs ?? []) as ConfRow[];

  return (
    <div>
      <Link href="/admin/usuarios" className="text-xs font-semibold text-eid-primary-300 hover:underline">
        ← Voltar à lista
      </Link>
      <h2 className="mt-3 text-base font-bold text-eid-fg">{p.nome ?? "Perfil"}</h2>
      <p className="mt-1 font-mono text-xs text-eid-text-secondary">{p.id}</p>

      <div className="mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
        <h3 className="text-sm font-bold text-eid-fg">Maioridade — uso do Match</h3>
        <dl className="mt-2 grid gap-2 text-xs text-eid-text-secondary sm:grid-cols-2">
          <div>
            <dt className="font-bold uppercase tracking-wide text-[10px] text-eid-text-secondary">Confirmado para Match</dt>
            <dd className="text-eid-fg">{p.match_maioridade_confirmada ? "Sim" : "Não"}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-[10px] text-eid-text-secondary">Confirmado em (UTC servidor)</dt>
            <dd className="text-eid-fg">
              {p.match_maioridade_confirmada_em
                ? new Date(p.match_maioridade_confirmada_em).toLocaleString("pt-BR", { timeZone: "UTC" }) + " UTC"
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-[10px] text-eid-text-secondary">Data nasc. no perfil</dt>
            <dd className="text-eid-fg">{p.data_nascimento ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-bold uppercase tracking-wide text-[10px] text-eid-text-secondary">Localização (perfil)</dt>
            <dd className="text-eid-fg">{p.localizacao ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-bold text-eid-fg">Registros de confirmação (auditoria)</h3>
        <p className="mt-1 text-xs text-eid-text-secondary">
          Cada envio gera linha imutável com IP, agente, idioma, snapshot de localização do perfil e JSON complementar.
        </p>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-eid-text-secondary">Nenhum registro.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {rows.map((c) => (
              <li key={c.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-3 text-xs">
                <p className="font-mono text-[10px] text-eid-text-secondary">#{c.id}</p>
                <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">Declarou nascimento</dt>
                    <dd className="text-eid-fg">{c.data_nascimento_declarada}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">Registrado em</dt>
                    <dd className="text-eid-fg">{new Date(c.confirmado_em).toLocaleString("pt-BR")}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">IP (derivado)</dt>
                    <dd className="break-all font-mono text-eid-fg">{c.ip_publico ?? "—"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">User-Agent</dt>
                    <dd className="break-all text-eid-fg">{c.user_agent ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">Accept-Language</dt>
                    <dd className="break-all text-eid-fg">{c.accept_language ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">País inferido</dt>
                    <dd className="text-eid-fg">{c.pais_inferido ?? "—"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">Referer / Host</dt>
                    <dd className="break-all text-eid-fg">
                      {(c.referer ?? "—") + " · " + (c.host ?? "—")}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">Localização snapshot / lat,lng</dt>
                    <dd className="text-eid-fg">
                      {c.localizacao_perfil_snapshot ?? "—"} ·{" "}
                      {c.lat_snapshot != null && c.lng_snapshot != null
                        ? `${c.lat_snapshot}, ${c.lng_snapshot}`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">Versão declaração</dt>
                    <dd className="text-eid-fg">{c.versao_declaracao}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[10px] font-bold uppercase text-eid-text-secondary">detalhes_json</dt>
                    <dd>
                      <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-black/30 p-2 text-[10px] text-eid-text-secondary">
                        {JSON.stringify(c.detalhes_json ?? {}, null, 2)}
                      </pre>
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6">
        <Link href={`/perfil/${p.id}`} className="text-sm font-semibold text-eid-primary-300 hover:underline" target="_blank" rel="noreferrer">
          Abrir perfil público
        </Link>
      </p>
    </div>
  );
}
