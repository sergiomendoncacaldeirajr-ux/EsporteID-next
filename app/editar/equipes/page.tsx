import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams?: Promise<{ from?: string }>;
};

export default async function EditarEquipesFullscreenPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/editar/equipes")}`);

  const { data: timesRows } = await supabase
    .from("times")
    .select("id, nome, tipo, escudo, esporte_id, esportes(nome)")
    .eq("criador_id", user.id)
    .order("id", { ascending: false });

  const { data: duplasRows } = await supabase
    .from("duplas")
    .select("id, esporte_id, esportes(nome), player1_id, player2_id, criador_id")
    .or(`player1_id.eq.${user.id},player2_id.eq.${user.id},criador_id.eq.${user.id}`)
    .order("id", { ascending: false });

  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/perfil/${user.id}`;

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title="Editar equipes e duplas"
      subtitle="Escolha uma formação para abrir a edição dedicada."
      topAction={
        <Link href="/times?create=1" className="text-[10px] font-semibold text-eid-primary-300 underline">
          Nova equipe
        </Link>
      }
    >
      <div className="space-y-4">
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Equipes</p>
          {(timesRows ?? []).length > 0 ? (
            <div className="mt-2 grid gap-2">
              {(timesRows ?? []).map((t) => {
                const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
                return (
                  <Link
                    key={`t-${t.id}`}
                    href={`/editar/time/${t.id}?from=${encodeURIComponent("/editar/equipes")}`}
                    className="eid-list-item flex items-center gap-2 rounded-xl bg-eid-card/55 p-2 transition-all duration-200 hover:border-eid-primary-500/30"
                  >
                    {t.escudo ? (
                      <img src={t.escudo} alt="" className="h-10 w-10 rounded-full border border-[color:var(--eid-border-subtle)] object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300">
                        EQ
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-eid-fg">{t.nome}</p>
                      <p className="truncate text-[9px] text-eid-text-secondary">{`${(t.tipo ?? "time").toUpperCase()} · ${esp?.nome ?? "Esporte"}`}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-eid-text-secondary">Você ainda não criou equipes.</p>
          )}
        </section>

        <section>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Duplas</p>
          {(duplasRows ?? []).length > 0 ? (
            <div className="mt-2 grid gap-2">
              {(duplasRows ?? []).map((d) => {
                const esp = Array.isArray(d.esportes) ? d.esportes[0] : d.esportes;
                return (
                  <Link
                    key={`d-${d.id}`}
                    href={`/editar/dupla/${d.id}?from=${encodeURIComponent("/editar/equipes")}`}
                    className="eid-list-item flex items-center gap-2 rounded-xl bg-eid-card/55 p-2 transition-all duration-200 hover:border-eid-primary-500/30"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300">
                      D{d.id}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-eid-fg">{`Dupla #${d.id}`}</p>
                      <p className="truncate text-[9px] text-eid-text-secondary">{esp?.nome ?? "Esporte"}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-eid-text-secondary">Você ainda não participa de duplas registradas.</p>
          )}
        </section>
      </div>
    </ProfileEditFullscreenShell>
  );
}

