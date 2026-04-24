import { adminMarcarAlertaLido } from "@/app/admin/actions";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

type Alerta = {
  id: number;
  tipo: string;
  titulo: string;
  corpo: string | null;
  payload_json: Record<string, unknown> | null;
  lido: boolean;
  criado_em: string;
};

export default async function AdminHomePage() {
  let counts: Record<string, number | null> = {
    profiles: null,
    torneios: null,
    times: null,
    espacos: null,
    partidas: null,
    matches: null,
    social_ops: null,
    denuncias: null,
    denuncias_abertas: null,
    eids: null,
  };

  let alertas: Alerta[] = [];

  if (hasServiceRoleConfig()) {
    try {
      const db = createServiceRoleClient();
      const [
        p,
        t,
        tm,
        e,
        pa,
        m,
        nNotif,
        d,
        dAbertas,
        eid,
        al,
      ] = await Promise.all([
        db.from("profiles").select("id", { count: "exact", head: true }),
        db.from("torneios").select("id", { count: "exact", head: true }),
        db.from("times").select("id", { count: "exact", head: true }),
        db.from("espacos_genericos").select("id", { count: "exact", head: true }),
        db.from("partidas").select("id", { count: "exact", head: true }),
        db.from("matches").select("id", { count: "exact", head: true }),
        db.from("notificacoes").select("id", { count: "exact", head: true }),
        db.from("denuncias").select("id", { count: "exact", head: true }),
        db
          .from("denuncias")
          .select("id", { count: "exact", head: true })
          .in("status", ["aberta", "em_analise"]),
        db.from("usuario_eid").select("id", { count: "exact", head: true }),
        db
          .from("admin_alertas")
          .select("id, tipo, titulo, corpo, payload_json, lido, criado_em")
          .eq("lido", false)
          .order("criado_em", { ascending: false })
          .limit(20),
      ]);
      counts = {
        profiles: p.count ?? 0,
        torneios: t.count ?? 0,
        times: tm.count ?? 0,
        espacos: e.count ?? 0,
        partidas: pa.count ?? 0,
        matches: m.count ?? 0,
        social_ops: nNotif.count ?? 0,
        denuncias: d.count ?? 0,
        denuncias_abertas: dAbertas.count ?? 0,
        eids: eid.count ?? 0,
      };
      alertas = (al.data ?? []) as Alerta[];
    } catch {
      /* service key inválida etc. */
    }
  }

  const pills = [
    { k: "profiles", label: "Perfis", href: "/admin/usuarios" },
    { k: "torneios", label: "Torneios", href: "/admin/torneios" },
    { k: "times", label: "Times", href: "/admin/equipes" },
    { k: "espacos", label: "Locais", href: "/admin/locais" },
    { k: "partidas", label: "Partidas", href: "/admin/partidas" },
    { k: "matches", label: "Pedidos", href: "/admin/matches" },
    { k: "social_ops", label: "Notif.", href: "/admin/operacoes-sociais" },
    { k: "denuncias", label: "Denúncias", href: "/admin/denuncias" },
    { k: "eids", label: "EID", href: "/admin/eid" },
  ] as const;

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Visão geral</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">
        Gerencie usuários, esportes, locais, torneios, partidas, pedidos de desafio, notificações e fluxos sociais, denúncias, parâmetros financeiros e o motor EID.
      </p>

      {counts.denuncias_abertas != null && counts.denuncias_abertas > 0 ? (
        <a
          href="/admin/denuncias"
          className="mt-4 flex items-center justify-between rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 transition hover:border-amber-400/50"
        >
          <span>
            <span className="font-bold">{counts.denuncias_abertas}</span> denúncia(s) aguardando análise
          </span>
          <span className="text-xs font-bold uppercase tracking-wide text-amber-200">Abrir →</span>
        </a>
      ) : null}

      {alertas.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-eid-fg">Alertas recentes (não lidos)</h3>
          <p className="mt-0.5 text-xs text-eid-text-secondary">Denúncias, verificações de idade e outros eventos.</p>
          <ul className="mt-3 space-y-2">
            {alertas.map((a) => {
              const payload = a.payload_json ?? {};
              const alvo = typeof payload.alvo_usuario_id === "string" ? payload.alvo_usuario_id : null;
              const usuarioVer = typeof payload.usuario_id === "string" ? payload.usuario_id : null;
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono uppercase tracking-wide text-eid-text-secondary">{a.tipo}</p>
                    <p className="text-sm font-semibold text-eid-fg">{a.titulo}</p>
                    {a.corpo ? <p className="mt-1 text-xs text-eid-text-secondary">{a.corpo}</p> : null}
                    <p className="mt-1 text-[10px] text-eid-text-secondary">
                      {new Date(a.criado_em).toLocaleString("pt-BR")}
                    </p>
                    {alvo ? (
                      <a href={`/perfil/${alvo}`} className="mt-1 inline-block text-xs font-semibold text-eid-primary-300">
                        Ver perfil alvo
                      </a>
                    ) : null}
                    {usuarioVer && !alvo ? (
                      <a href={`/perfil/${usuarioVer}`} className="mt-1 inline-block text-xs font-semibold text-eid-primary-300">
                        Ver perfil
                      </a>
                    ) : null}
                  </div>
                  <form action={adminMarcarAlertaLido}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2 py-1 text-[10px] font-bold text-eid-text-secondary hover:border-eid-primary-500/40"
                    >
                      Marcar lido
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {pills.map(({ k, label, href }) => (
          <a
            key={k}
            href={href}
            className="group rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 px-3 py-4 text-center shadow-sm transition hover:border-eid-primary-500/40 hover:bg-eid-card hover:shadow-[0_12px_40px_-16px_rgba(37,99,235,0.35)]"
          >
            <span className="block text-2xl font-black tabular-nums text-eid-action-500 transition group-hover:text-eid-action-400">
              {counts[k] ?? "—"}
            </span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary group-hover:text-eid-text-muted">
              {label}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
