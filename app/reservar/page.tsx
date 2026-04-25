import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Reservar",
  description: "Escolha o local para reserva rápida",
};

type EspacoReservaItem = {
  id: number;
  slug: string | null;
  nome_publico: string | null;
  localizacao: string | null;
};

export default async function ReservarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/reservar");

  const [{ data: sociosAtivosRows }, { data: atalhosRows }] = await Promise.all([
    supabase
      .from("espaco_socios")
      .select("espaco_generico_id, espacos_genericos!inner(id, slug, nome_publico, localizacao, ativo_listagem)")
      .eq("usuario_id", user.id)
      .eq("status", "ativo"),
    supabase
      .from("espaco_reserva_atalhos")
      .select("espaco_generico_id, espacos_genericos!inner(id, slug, nome_publico, localizacao, ativo_listagem)")
      .eq("usuario_id", user.id),
  ]);

  const map = new Map<number, EspacoReservaItem>();
  for (const row of [...(sociosAtivosRows ?? []), ...(atalhosRows ?? [])]) {
    const espacoRaw = Array.isArray(row.espacos_genericos) ? row.espacos_genericos[0] : row.espacos_genericos;
    const id = Number(espacoRaw?.id ?? row.espaco_generico_id ?? 0);
    if (!Number.isFinite(id) || id < 1 || !espacoRaw?.ativo_listagem) continue;
    if (map.has(id)) continue;
    map.set(id, {
      id,
      slug: String(espacoRaw?.slug ?? "") || null,
      nome_publico: espacoRaw?.nome_publico ?? "Espaço",
      localizacao: espacoRaw?.localizacao ?? null,
    });
  }
  const espacos = Array.from(map.values());
  if (espacos.length === 1 && espacos[0]?.slug) {
    redirect(`/reservar/${encodeURIComponent(String(espacos[0].slug))}`);
  }

  return (
    <main data-eid-touch-ui className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
      <section className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h1 className="text-xl font-bold text-eid-fg">Reservar horário</h1>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Escolha o local onde você quer reservar agora.
        </p>
        <div className="mt-4 space-y-2">
          {espacos.length ? (
            espacos.map((espaco) =>
              espaco.slug ? (
                <Link
                  key={espaco.id}
                  href={`/reservar/${encodeURIComponent(String(espaco.slug))}`}
                  className="block rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3 transition hover:border-eid-primary-500/35"
                >
                  <p className="text-sm font-bold text-eid-fg">{espaco.nome_publico}</p>
                  <p className="mt-1 text-xs text-eid-text-secondary">{espaco.localizacao ?? "Localização não informada"}</p>
                </Link>
              ) : null
            )
          ) : (
            <div className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4 text-sm text-eid-text-secondary">
              Você ainda não tem locais no atalho de reserva.
              <br />
              Entre em um espaço em modo pago e toque em “Adicionar este espaço ao meu Reservar”.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
