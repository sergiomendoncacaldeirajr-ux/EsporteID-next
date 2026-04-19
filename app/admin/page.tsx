import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export default async function AdminHomePage() {
  let counts: Record<string, number | null> = {
    profiles: null,
    torneios: null,
    times: null,
    espacos: null,
    partidas: null,
    matches: null,
    denuncias: null,
  };

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
        d,
      ] = await Promise.all([
        db.from("profiles").select("id", { count: "exact", head: true }),
        db.from("torneios").select("id", { count: "exact", head: true }),
        db.from("times").select("id", { count: "exact", head: true }),
        db.from("espacos_genericos").select("id", { count: "exact", head: true }),
        db.from("partidas").select("id", { count: "exact", head: true }),
        db.from("matches").select("id", { count: "exact", head: true }),
        db.from("denuncias").select("id", { count: "exact", head: true }),
      ]);
      counts = {
        profiles: p.count ?? 0,
        torneios: t.count ?? 0,
        times: tm.count ?? 0,
        espacos: e.count ?? 0,
        partidas: pa.count ?? 0,
        matches: m.count ?? 0,
        denuncias: d.count ?? 0,
      };
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
    { k: "denuncias", label: "Denúncias", href: "/admin/denuncias" },
  ] as const;

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Visão geral</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">
        Gerencie usuários, esportes, locais, torneios, partidas, pedidos de match, denúncias e parâmetros financeiros.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {pills.map(({ k, label, href }) => (
          <a
            key={k}
            href={href}
            className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-4 text-center transition hover:border-eid-primary-500/35"
          >
            <span className="block text-2xl font-black tabular-nums text-eid-action-500">
              {counts[k] ?? "—"}
            </span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
