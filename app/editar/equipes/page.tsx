import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileEditFullscreenShell } from "@/components/perfil/profile-edit-fullscreen-shell";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams?: Promise<{ from?: string; embed?: string }>;
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

  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/perfil/${user.id}`;
  const isEmbed = sp.embed === "1";
  const equipesRouteWithOrigin = `/editar/equipes?from=${encodeURIComponent(from)}${isEmbed ? "&embed=1" : ""}`;

  return (
    <ProfileEditFullscreenShell
      backHref={from}
      title="Editar equipes"
      subtitle="Duplas e times aparecem aqui. Escolha uma formação para abrir a edição dedicada."
      showBack={!isEmbed}
      topAction={
        <Link
          href={`/editar/equipes/cadastrar?from=${encodeURIComponent(equipesRouteWithOrigin)}${isEmbed ? "&embed=1" : ""}`}
          className="inline-flex items-center gap-1 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-eid-fg transition-all duration-200 hover:-translate-y-[1px] hover:border-eid-primary-500/55 hover:bg-eid-primary-500/18"
        >
          <span aria-hidden>+</span>
          Nova equipe
        </Link>
      }
    >
      <div className="space-y-3">
        <section className="eid-surface-panel overflow-hidden rounded-2xl p-0">
          <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Equipes</p>
            <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-eid-primary-300">
              Gestão
            </span>
          </div>
          <div className="p-3">
          {(timesRows ?? []).length > 0 ? (
            <div className="mt-2 grid gap-2">
              {(timesRows ?? []).map((t) => {
                const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
                return (
                  <Link
                    key={`t-${t.id}`}
                    href={`/editar/time/${t.id}?from=${encodeURIComponent(from)}${isEmbed ? "&embed=1" : ""}`}
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
          </div>
        </section>
      </div>
    </ProfileEditFullscreenShell>
  );
}

