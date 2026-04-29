import Link from "next/link";
import { redirect } from "next/navigation";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
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
      showBack={false}
      hideHeader
    >
      <div className="space-y-3">
        {!isEmbed ? <PerfilBackLink href={from} label="Voltar" /> : null}
        <section className="overflow-hidden rounded-[22px] border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,white_4%),color-mix(in_srgb,var(--eid-surface)_94%,white_6%))] px-3.5 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_8px_16px_-12px_rgba(37,99,235,0.42)]">
                <svg viewBox="0 0 24 24" className="h-6.5 w-6.5 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="8" cy="9" r="2.6" />
                  <circle cx="15.8" cy="9.6" r="2.2" />
                  <path d="M3.6 18a4.8 4.8 0 0 1 8.8 0" />
                  <path d="M12.8 18a4 4 0 0 1 7.2 0" />
                  <path d="m16.8 16.6 3.6 3.6" />
                  <circle cx="18.6" cy="18.5" r="2.6" />
                </svg>
              </span>
              <div className="min-w-0 pt-1">
                <h1 className="text-[16px] font-black leading-none tracking-tight text-eid-fg sm:text-[26px]">Editar equipes</h1>
                <p className="mt-2 text-[11px] leading-snug text-eid-text-secondary sm:text-[14px]">
                  Duplas e times aparecem aqui. Escolha uma formação para abrir a edição dedicada.
                </p>
              </div>
            </div>
            <Link
              href={`/editar/equipes/cadastrar?from=${encodeURIComponent(equipesRouteWithOrigin)}${isEmbed ? "&embed=1" : ""}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#C9D8F6] bg-white px-2 py-[3px] text-[8px] font-black uppercase tracking-[0.02em] text-[#2563EB] transition hover:bg-[#EEF4FF]"
            >
              <span aria-hidden>+</span>
              Nova equipe
            </Link>
          </div>
        </section>
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
                    <span className="ml-auto inline-flex h-5 w-5 items-center justify-center text-eid-text-secondary" aria-hidden>
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-eid-text-secondary">Você ainda não criou equipes.</p>
          )}
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_95%,white_5%),color-mix(in_srgb,var(--eid-surface)_93%,white_7%))] px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-start gap-2 text-[11px] leading-snug text-eid-text-secondary">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[11px] font-black text-white">
                i
              </span>
              <span>
                <span className="block text-[12px] font-black text-eid-fg">Dica</span>
                Crie novas equipes para organizar melhor suas formações e facilitar os convites para atletas.
              </span>
            </p>
            <span className="inline-flex shrink-0 items-center" aria-hidden>
              <svg viewBox="0 0 64 40" className="h-9 w-14 text-[#3B82F6]" fill="none">
                <circle cx="18" cy="18" r="11" fill="currentColor" fillOpacity=".22" />
                <circle cx="34" cy="15" r="9.5" fill="currentColor" fillOpacity=".34" />
                <circle cx="48" cy="18" r="8" fill="currentColor" fillOpacity=".22" />
                <circle cx="34" cy="27" r="11" fill="currentColor" fillOpacity=".5" />
              </svg>
            </span>
          </div>
        </section>
      </div>
    </ProfileEditFullscreenShell>
  );
}

