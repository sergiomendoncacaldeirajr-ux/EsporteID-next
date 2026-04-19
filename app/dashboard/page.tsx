import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { distanciaKm } from "@/lib/geo/distance-km";

export const metadata = {
  title: "Painel",
  description: "Área logada do EsporteID",
};

function primeiroNome(nome?: string | null) {
  const n = (nome ?? "").trim();
  return n ? n.split(/\s+/u)[0] : "Atleta";
}

function iniciais(nome?: string | null) {
  const n = (nome ?? "").trim();
  if (!n) return "E";
  return n
    .split(/\s+/u)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

type Props = {
  searchParams?: Promise<{ q?: string }>;
};

type ProfileMini = {
  id?: string;
  nome?: string | null;
  avatar_url?: string | null;
  localizacao?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
};

type AtletaRow = {
  nota_eid?: number | null;
  usuario_id?: string;
  profiles?: ProfileMini | ProfileMini[] | null;
};

function firstProfile(p: AtletaRow["profiles"]): ProfileMini | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08-.07-.12C7.59 10.71 7 8.33 7 8c0-.34.25-.66.5-.83C8.5 6.5 10 5 11 4c.33-.25.83-.25 1.17 0 .33.25.33.75 0 1l-1.5 4H16c.42 0 .67.46.42.79l-5 7c-.25.33-.79.25-1.04-.08L11 21z" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-3 0-4 3-4 3s1 3 4 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5c-3 0-4 3-4 3s1 3 4 3zm0 2c-2.33 0-7 1.17-7 3.5V22h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V22h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function IconTrophy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
    </svg>
  );
}

function IconStopwatch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm7.03-6.39l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-1.63-.44-3.16-1.2-4.49zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
    </svg>
  );
}

const scrollRow =
  "-mx-3 flex gap-3 overflow-x-auto px-3 pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden";

export default async function DashboardPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim().toLowerCase();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, avatar_url, localizacao, lat, lng, termos_aceitos_em, perfil_completo")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.termos_aceitos_em) {
    redirect("/conta/aceitar-termos");
  }
  if (!profile.perfil_completo) {
    redirect("/onboarding");
  }

  const myLat = Number(profile.lat ?? NaN);
  const myLng = Number(profile.lng ?? NaN);
  const hasMyCoords = Number.isFinite(myLat) && Number.isFinite(myLng);

  const { data: meusEsportes } = await supabase
    .from("usuario_eid")
    .select("esporte_id")
    .eq("usuario_id", user.id)
    .order("esporte_id", { ascending: true })
    .limit(3);
  const esportePrincipalId = meusEsportes?.[0]?.esporte_id ?? null;

  let atletasQuery = supabase
    .from("usuario_eid")
    .select("nota_eid, usuario_id, profiles!inner(id, nome, avatar_url, localizacao, lat, lng)")
    .neq("usuario_id", user.id)
    .order("nota_eid", { ascending: false })
    .limit(80);
  if (esportePrincipalId != null) {
    atletasQuery = atletasQuery.eq("esporte_id", esportePrincipalId);
  }
  const { data: atletasRaw } = await atletasQuery;

  const atletasRows = (atletasRaw ?? []) as AtletaRow[];
  let atletasComDist: Array<{ row: AtletaRow; p: ProfileMini | null; dist: number }> = atletasRows.map((row) => {
    const p = firstProfile(row.profiles);
    const lat = Number(p?.lat ?? NaN);
    const lng = Number(p?.lng ?? NaN);
    const dist = hasMyCoords ? distanciaKm(myLat, myLng, lat, lng) : 99999;
    return { row, p, dist };
  });
  atletasComDist.sort((a, b) => {
    if (hasMyCoords) return a.dist - b.dist;
    return Number(b.row.nota_eid ?? 0) - Number(a.row.nota_eid ?? 0);
  });
  const seenAtleta = new Set<string>();
  atletasComDist = atletasComDist.filter(({ p }) => {
    const id = String(p?.id ?? "");
    if (!id) return false;
    if (seenAtleta.has(id)) return false;
    seenAtleta.add(id);
    return true;
  });
  const atletasFiltrados = atletasComDist
    .filter(({ p }) => {
      if (!q) return true;
      const nome = String(p?.nome ?? "").toLowerCase();
      const loc = String(p?.localizacao ?? "").toLowerCase();
      return nome.includes(q) || loc.includes(q);
    })
    .slice(0, 12);

  let torneiosQuery = supabase
    .from("torneios")
    .select("id, nome, status, data_inicio, banner")
    .eq("status", "aberto")
    .order("criado_em", { ascending: false })
    .limit(24);
  if (esportePrincipalId != null) {
    torneiosQuery = torneiosQuery.eq("esporte_id", esportePrincipalId);
  }
  const { data: torneios } = await torneiosQuery;
  const torneiosFiltrados = (torneios ?? []).filter((t) => {
    if (!q) return true;
    return String(t.nome ?? "").toLowerCase().includes(q);
  });

  let timesQuery = supabase
    .from("times")
    .select("id, nome, localizacao, escudo, esporte_id, vagas_abertas, lat, lng, criador_id, pontos_ranking, eid_time")
    .neq("criador_id", user.id)
    .order("pontos_ranking", { ascending: false })
    .limit(40);
  if (esportePrincipalId != null) {
    timesQuery = timesQuery.eq("esporte_id", esportePrincipalId);
  }
  const { data: timesRaw } = await timesQuery;
  let timesComDist = (timesRaw ?? []).map((t) => {
    const lat = Number(t.lat ?? NaN);
    const lng = Number(t.lng ?? NaN);
    const dist = hasMyCoords && Number.isFinite(lat) && Number.isFinite(lng) ? distanciaKm(myLat, myLng, lat, lng) : 99999;
    return { t, dist };
  });
  timesComDist.sort((a, b) => a.dist - b.dist);
  const timesFiltrados = timesComDist
    .filter(({ t }) => {
      if (!q) return true;
      return (
        String(t.nome ?? "").toLowerCase().includes(q) || String(t.localizacao ?? "").toLowerCase().includes(q)
      );
    })
    .slice(0, 12);

  const { data: locaisScroll } = await supabase
    .from("espacos_genericos")
    .select("id, nome_publico, logo_arquivo, localizacao")
    .eq("ativo_listagem", true)
    .order("id", { ascending: false })
    .limit(12);

  const matchHref =
    esportePrincipalId != null
      ? `/match?esporte=${encodeURIComponent(String(esportePrincipalId))}&tipo=atleta`
      : "/match";

  const navItems = [
    { label: "Times", href: "/times", icon: IconUsers },
    { label: "Locais", href: "/locais", icon: IconMapPin },
    { label: "Torneios", href: "/torneios", icon: IconTrophy },
    { label: "Rank", href: "/ranking", icon: IconChart },
    { label: "Performance", href: "/performance", icon: IconStopwatch },
  ];

  return (
    <>
      <DashboardTopbar />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 sm:rounded-2xl sm:border-eid-primary-500/25 sm:bg-gradient-to-br sm:from-eid-card sm:via-eid-card sm:to-eid-primary-500/10 sm:p-5 sm:shadow-[0_12px_40px_-20px_rgba(37,99,235,0.35)]">
          <div className="flex flex-wrap items-center gap-3">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Seu avatar"
                className="h-14 w-14 rounded-2xl border-2 border-eid-primary-500/40 object-cover sm:h-16 sm:w-16"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-eid-primary-500/40 bg-eid-surface text-base font-bold text-eid-primary-300 sm:h-16 sm:w-16">
                {iniciais(profile.nome)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold tracking-tight text-eid-fg sm:text-2xl">
                Olá, {primeiroNome(profile.nome)}!
              </h1>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-eid-text-secondary sm:text-[11px]">
                Sua evolução está em dia
              </p>
              {profile.localizacao ? (
                <p className="mt-1 truncate text-xs text-eid-text-secondary">{profile.localizacao}</p>
              ) : null}
            </div>
          </div>

          <Link
            href={matchHref}
            className="eid-btn-primary mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-xs font-extrabold uppercase tracking-wide shadow-[0_8px_20px_rgba(37,99,235,0.18)] active:scale-[0.98] sm:mt-5 sm:text-sm"
          >
            <IconBolt className="h-5 w-5 shrink-0 text-[var(--eid-brand-ink)]" />
            Encontrar match
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-2 sm:mt-6 sm:gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 px-1 py-3 text-center transition hover:border-eid-primary-500/35 sm:py-3.5"
              >
                <Icon className="mb-1.5 h-[18px] w-[18px] text-eid-primary-400 sm:h-5 sm:w-5" />
                <span className="text-[9px] font-extrabold uppercase leading-tight text-eid-fg sm:text-[10px]">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {q ? (
          <p className="mt-4 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2 text-xs text-eid-text-secondary">
            Busca ativa por: <span className="font-semibold text-eid-fg">{sp.q}</span>
          </p>
        ) : null}

        <section className="mt-6 sm:mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-eid-primary-500">Atletas próximos</h2>
            <Link href={matchHref} className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2.5 py-1 text-[10px] font-bold text-eid-fg transition hover:border-eid-primary-500/35">
              Ver todos
            </Link>
          </div>
          {atletasFiltrados.length > 0 ? (
            <div className={scrollRow}>
              {atletasFiltrados.map(({ row, p, dist }, idx) => (
                <Link
                  key={`${p?.id ?? idx}-${idx}`}
                  href={`/perfil/${encodeURIComponent(String(p?.id ?? ""))}?from=/dashboard`}
                  className="min-w-[118px] max-w-[118px] shrink-0 snap-start rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-2 py-3 text-center transition hover:border-eid-primary-500/40"
                >
                  <div className="relative mx-auto h-14 w-14">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full rounded-full border-2 border-eid-primary-500/50 object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-eid-primary-500/40 bg-eid-surface text-xs font-bold text-eid-primary-300">
                        {iniciais(p?.nome)}
                      </div>
                    )}
                    <div className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 overflow-hidden rounded-md border border-eid-bg text-[8px] font-black leading-none">
                      <span className="bg-eid-bg px-1 py-0.5 text-eid-fg">EID</span>
                      <span className="bg-eid-primary-500 px-1 py-0.5 text-[var(--eid-brand-ink)]">
                        {Number(row.nota_eid ?? 1).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 truncate text-[11px] font-extrabold text-eid-fg">{primeiroNome(p?.nome)}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-eid-primary-400">
                    {hasMyCoords && dist < 9000 ? `${dist.toFixed(1).replace(".", ",")} km` : "—"}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm text-eid-text-secondary">
              {q ? "Nenhum atleta encontrado para essa busca." : "Ainda não há atletas sugeridos para seu esporte principal."}
            </p>
          )}
        </section>

        <section className="mt-6 sm:mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-eid-primary-500">Torneios em aberto</h2>
            <Link href="/torneios" className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2.5 py-1 text-[10px] font-bold text-eid-fg transition hover:border-eid-primary-500/35">
              Explorar
            </Link>
          </div>
          {torneiosFiltrados.length > 0 ? (
            <div className={scrollRow}>
              {torneiosFiltrados.map((t) => (
                <Link
                  key={t.id}
                  href={`/torneios/${t.id}?from=/dashboard`}
                  className="min-w-[210px] max-w-[210px] shrink-0 snap-start overflow-hidden rounded-[20px] border border-[color:var(--eid-border-subtle)] bg-eid-card transition hover:border-eid-primary-500/35"
                >
                  <div className="h-[95px] w-full bg-eid-surface">
                    {t.banner ? (
                      <img src={t.banner} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] font-bold text-eid-text-secondary">Torneio</div>
                    )}
                  </div>
                  <p className="px-2.5 py-2.5 text-[11px] font-extrabold leading-snug text-eid-fg">{t.nome}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm text-eid-text-secondary">
              {q ? "Nenhum torneio encontrado para essa busca." : "Sem torneios no momento."}
            </p>
          )}
        </section>

        <section className="mt-6 sm:mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-eid-primary-500">Times &amp; recrutamento</h2>
            <Link href="/times" className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2.5 py-1 text-[10px] font-bold text-eid-fg transition hover:border-eid-primary-500/35">
              Ver todos
            </Link>
          </div>
          {timesFiltrados.length > 0 ? (
            <div className={scrollRow}>
              {timesFiltrados.map(({ t, dist }) => (
                <Link
                  key={t.id}
                  href={`/perfil-time/${t.id}?from=/dashboard`}
                  className="min-w-[118px] max-w-[118px] shrink-0 snap-start rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-2 py-3 text-center transition hover:border-eid-primary-500/40"
                >
                  <div className="mx-auto h-14 w-14">
                    {t.escudo ? (
                      <img src={t.escudo} alt="" className="h-full w-full rounded-[14px] border-2 border-eid-primary-500/50 object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-[14px] border-2 border-eid-primary-500/40 bg-eid-surface text-xs font-bold text-eid-primary-300">
                        T
                      </div>
                    )}
                  </div>
                  <p className="mt-3 truncate text-[11px] font-extrabold text-eid-fg">{t.nome}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-eid-primary-400">
                    {hasMyCoords && dist < 9000 ? `${dist.toFixed(1).replace(".", ",")} km` : "—"}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm text-eid-text-secondary">
              {q ? "Nenhum time encontrado para essa busca." : "Nenhum time por perto."}
            </p>
          )}
        </section>

        <section className="mt-6 sm:mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-eid-primary-500">Locais na comunidade</h2>
            <Link href="/locais" className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2.5 py-1 text-[10px] font-bold text-eid-fg transition hover:border-eid-primary-500/35">
              Ver lista
            </Link>
          </div>
          {locaisScroll && locaisScroll.length > 0 ? (
            <div className={scrollRow}>
              {locaisScroll.map((loc) => (
                <Link
                  key={loc.id}
                  href={`/local/${loc.id}?from=/dashboard`}
                  className="min-w-[140px] max-w-[140px] shrink-0 snap-start rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 transition hover:border-eid-primary-500/35"
                >
                  <div className="flex h-12 items-center justify-center overflow-hidden rounded-xl bg-eid-surface">
                    {loc.logo_arquivo ? (
                      <img src={loc.logo_arquivo} alt="" className="max-h-10 max-w-full object-contain" />
                    ) : (
                      <IconMapPin className="h-6 w-6 text-eid-primary-500/50" />
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-[11px] font-extrabold leading-tight text-eid-fg">{loc.nome_publico}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-eid-text-secondary">{loc.localizacao}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm text-eid-text-secondary">
              Nenhum local em destaque ainda.
            </p>
          )}

          <Link
            href="/locais/cadastrar"
            className="eid-btn-primary mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-xs font-extrabold uppercase tracking-wide active:scale-[0.98] sm:text-sm"
          >
            <IconMapPin className="h-5 w-5 shrink-0 text-[var(--eid-brand-ink)]" />
            Cadastrar local genérico
          </Link>
          <p className="mt-2 text-[10px] leading-relaxed text-eid-text-secondary sm:text-[11px]">
            Qualquer pessoa pode sugerir um espaço. Para ser o responsável oficial, envie documentação pela página do local após criá-lo.
          </p>
        </section>
      </div>
    </>
  );
}
