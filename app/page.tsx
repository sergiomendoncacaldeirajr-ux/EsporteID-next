import Link from "next/link";
import { LogoFull } from "@/components/brand/logo-full";
import { EidThemeToggle } from "@/components/eid-theme-toggle";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";

function IconSpark() {
  return (
    <svg className="h-5 w-5 shrink-0 text-eid-action-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="h-5 w-5 shrink-0 text-eid-primary-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg className="h-5 w-5 shrink-0 text-eid-action-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg className="h-5 w-5 shrink-0 text-eid-primary-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
    </svg>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile =
    user != null
      ? (
          await supabase
            .from("profiles")
            .select(`perfil_completo, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`)
            .eq("id", user.id)
            .maybeSingle()
        ).data
      : null;

  const pillClass =
    "rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-1.5 text-sm font-medium text-eid-fg shadow-sm";

  const sectionCard =
    "rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-5 shadow-sm backdrop-blur-sm sm:p-6";

  const linkCard =
    "rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-4 py-2.5 text-sm font-medium text-eid-fg transition hover:border-eid-primary-500/40 hover:text-eid-primary-500";

  const secondaryCtaClass =
    "inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-6 text-base font-semibold text-eid-fg shadow-sm transition hover:border-eid-primary-500/35 hover:bg-eid-surface active:scale-[0.98]";

  const heroCtaPrimaryClass =
    "eid-btn-primary inline-flex min-h-[56px] w-full flex-1 items-center justify-center rounded-2xl px-8 text-lg font-bold shadow-lg shadow-eid-primary-500/20 transition active:scale-[0.98] sm:min-h-[60px] sm:max-w-md sm:text-xl";

  const heroCtaSecondaryClass =
    "inline-flex min-h-[56px] w-full flex-1 items-center justify-center rounded-2xl border-2 border-eid-primary-500/40 bg-eid-card px-8 text-lg font-bold text-eid-fg shadow-sm transition hover:border-eid-primary-500/60 hover:bg-eid-surface active:scale-[0.98] sm:min-h-[60px] sm:max-w-md sm:text-xl";

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,color-mix(in_srgb,var(--eid-primary-500)_18%,transparent),transparent)] md:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_60%_40%_at_100%_50%,color-mix(in_srgb,var(--eid-action-500)_10%,transparent),transparent)] md:block"
        aria-hidden
      />

      <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-16 pt-6 sm:px-8 sm:pb-20 sm:pt-12">
        {user ? (
          <div className="mb-4 flex items-center justify-end gap-2 sm:mb-6">
            <Link
              href="/dashboard"
              className="rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/10 px-3 py-1.5 text-xs font-bold text-eid-primary-300 transition hover:bg-eid-primary-500/20"
            >
              Painel
            </Link>
            <EidThemeToggle variant="toolbar" />
          </div>
        ) : null}
        <LogoFull className="mb-6 flex justify-center sm:mb-8" />

        <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-eid-primary-500 sm:text-left">
          Plataforma esportiva
        </p>

        <h1 className="mt-3 text-center text-2xl font-bold leading-tight tracking-tight text-eid-fg sm:text-left sm:text-3xl">
          EsporteID —{" "}
          <span className="text-eid-action-500">A plataforma de desafios dos esportes</span>
        </h1>

        <p className="mt-4 max-w-2xl text-center text-base leading-relaxed text-eid-text-secondary sm:text-left sm:text-lg">
          Descubra quem joga perto de você, combine partidas em poucos toques e suba no ranking EID.
          Atletas, espaços e organizadores no mesmo lugar: menos burocracia, mais jogo — com privacidade
          e LGPD de verdade.
        </p>

        <ul className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-start">
          {["Ranking & EID", "Torneios", "Partidas", "Espaços e locais"].map((label) => (
            <li key={label} className={pillClass}>
              {label}
            </li>
          ))}
        </ul>

        <section
          className="mt-10 hidden md:mt-12 md:block"
          aria-labelledby="areas-plataforma-desktop"
        >
          <h2 id="areas-plataforma-desktop" className="text-lg font-bold text-eid-fg">
            Tudo o que o EsporteID oferece
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-eid-text-secondary">
            No computador você usa o mesmo login do celular: painel com busca, radar de desafios, agenda de
            partidas, comunidade, torneios, times, locais, ranking EID, performance e área de conta — além de
            modos <span className="text-eid-fg">Professor</span>, <span className="text-eid-fg">Organizador</span> e{" "}
            <span className="text-eid-fg">Espaço</span> após o onboarding.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                { href: "/dashboard", title: "Painel", body: "Resumo, atalhos e busca integrada." },
                { href: "/agenda", title: "Agenda", body: "Partidas aceitas, horários e confirmações." },
                { href: "/match", title: "Desafio (radar)", body: "Pedidos ranking ou amistoso por esporte e raio." },
                { href: "/comunidade", title: "Social", body: "Notificações, convites e pedidos em um lugar." },
                { href: "/torneios", title: "Torneios", body: "Eventos, inscrições e chaves." },
                { href: "/times", title: "Times e duplas", body: "Formação, convites e EID coletivo." },
                { href: "/locais", title: "Locais", body: "Quadras, academias e espaços parceiros." },
                { href: "/ranking", title: "Ranking EID", body: "Posições e regras por esporte." },
                { href: "/performance", title: "Performance", body: "Indicadores e histórico de jogo." },
                { href: "/buscar", title: "Buscar", body: "Atletas, locais, times e torneios." },
                { href: "/conta/perfil", title: "Conta e perfil", body: "Dados, esportes, EID e privacidade." },
                { href: "/conta/dados-lgpd", title: "Seus dados (LGPD)", body: "Exportação, correção e consentimentos." },
              ] as const
            ).map((item) => {
              const href = user ? item.href : `/login?next=${encodeURIComponent(item.href)}`;
              return (
                <li key={item.href}>
                  <Link href={href} className={`${linkCard} flex h-full min-h-[5.5rem] flex-col justify-center`}>
                    <span className="font-semibold text-eid-fg">{item.title}</span>
                    <span className="mt-1 text-xs leading-snug text-eid-text-secondary">{item.body}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-eid-text-muted">
            Papéis de professor, organizador e gestão de espaço aparecem no app após você marcar no cadastro
            (onboarding) — os atalhos do painel mudam conforme o contexto ativo.
          </p>
        </section>

        {!user ? (
          <section
            className="mt-10 rounded-2xl border border-eid-primary-500/35 bg-gradient-to-b from-eid-primary-500/15 to-eid-primary-500/5 p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.35)] sm:p-8 md:mt-12"
            aria-label="Entrar ou criar conta"
          >
            <p className="text-center text-base font-bold leading-snug text-eid-fg sm:text-lg">
              Entre na sua conta ou cadastre-se — leva poucos minutos.
            </p>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-eid-text-secondary sm:text-base">
              Acesso com e-mail; depois você completa o perfil e já usa desafios, agenda e ranking no mesmo lugar.
            </p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <Link href="/login" className={heroCtaPrimaryClass}>
                Entrar
              </Link>
              <Link href="/cadastro" className={heroCtaSecondaryClass}>
                Criar conta
              </Link>
            </div>
          </section>
        ) : null}

        <section className="mt-12 space-y-4" aria-labelledby="como-funciona">
          <h2 id="como-funciona" className="text-lg font-bold text-eid-fg">
            Como funciona
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Conta e onboarding",
                body: "Cadastro com e-mail e senha; depois você aceita os termos e passa pelo onboarding: papéis (atleta, professor, organizador, espaço), esportes que pratica e como entra nos desafios — individual, dupla ou time.",
              },
              {
                step: "2",
                title: "Desafios, agenda e comunidade",
                body: "Nos desafios você manda e recebe pedidos; na agenda e na comunidade acompanha o que rola perto de você. Times, duplas, locais e torneios ficam conectados ao seu perfil.",
              },
              {
                step: "3",
                title: "Torneios e ranking EID",
                body: "Inscreva-se em torneios, registre placar quando a competição pedir e acompanhe seu EID no ranking — com foco em jogo real, regras claras e privacidade.",
              },
            ].map((item) => (
              <li key={item.step} className={sectionCard}>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-eid-primary-500/15 text-sm font-bold text-eid-primary-300">
                  {item.step}
                </span>
                <h3 className="mt-3 text-base font-semibold text-eid-fg">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-eid-text-secondary">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10" aria-labelledby="por-que-esporteid">
          <h2 id="por-que-esporteid" className="text-lg font-bold text-eid-fg">
            Por que usar o EsporteID
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            <li className={`flex gap-3 ${sectionCard}`}>
              <IconSpark />
              <div>
                <p className="font-semibold text-eid-fg">Desafios esportivos</p>
                <p className="mt-1 text-sm leading-relaxed text-eid-text-secondary">
                  Conecte interesses, nível e local — menos grupo de WhatsApp perdido, mais quadra e campo.
                </p>
              </div>
            </li>
            <li className={`flex gap-3 ${sectionCard}`}>
              <IconTrophy />
              <div>
                <p className="font-semibold text-eid-fg">Ranking e torneios</p>
                <p className="mt-1 text-sm leading-relaxed text-eid-text-secondary">
                  Acompanhe seu EID, participe de torneios e veja a comunidade crescer com regras claras.
                </p>
              </div>
            </li>
            <li className={`flex gap-3 ${sectionCard}`}>
              <IconUsers />
              <div>
                <p className="font-semibold text-eid-fg">Todos no mesmo time</p>
                <p className="mt-1 text-sm leading-relaxed text-eid-text-secondary">
                  Atletas, espaços (academias, quadras) e organizadores de eventos em um só fluxo.
                </p>
              </div>
            </li>
            <li className={`flex gap-3 ${sectionCard}`}>
              <IconShield />
              <div>
                <p className="font-semibold text-eid-fg">Privacidade e LGPD</p>
                <p className="mt-1 text-sm leading-relaxed text-eid-text-secondary">
                  Termos transparentes, dados tratados com responsabilidade e canal direto para seus direitos.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section className="mt-10 rounded-2xl border border-eid-primary-500/25 bg-eid-primary-500/10 p-5 sm:p-6">
          <h2 className="text-base font-bold text-eid-fg">Pronto para o próximo jogo?</h2>
          <p className="mt-2 text-sm leading-relaxed text-eid-text-secondary">
            {user
              ? "Continue de onde parou ou abra o painel para ver agenda, desafios e torneios."
              : "Use os botões acima ou estes abaixo para entrar ou criar conta em poucos passos. Comunicações importantes podem usar e-mail e WhatsApp conforme os termos."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {user ? (
              <>
                <p className="text-sm text-eid-text-secondary">
                  Logado como{" "}
                  <span className="font-semibold text-eid-fg">{user.email}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {!profile || !legalAcceptanceIsCurrent(profile) ? (
                    <Link
                      href="/conta/aceitar-termos"
                      className="eid-btn-primary inline-flex min-h-[44px] items-center px-5 text-sm active:scale-[0.98]"
                    >
                      Aceitar termos
                    </Link>
                  ) : !profile.perfil_completo ? (
                    <Link
                      href="/onboarding"
                      className="eid-btn-primary inline-flex min-h-[44px] items-center px-5 text-sm active:scale-[0.98]"
                    >
                      Continuar cadastro
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard"
                      className="eid-btn-primary inline-flex min-h-[44px] items-center px-5 text-sm active:scale-[0.98]"
                    >
                      Ir ao painel
                    </Link>
                  )}
                  <SignOutButton />
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="eid-btn-primary inline-flex min-h-[48px] px-6 text-base active:scale-[0.98]">
                  Entrar
                </Link>
                <Link href="/cadastro" className={secondaryCtaClass}>
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </section>

        <nav
          className="mt-12 flex flex-wrap gap-2 border-t border-[color:var(--eid-border-subtle)] pt-10 sm:gap-3"
          aria-label="Documentos e dados"
        >
          <Link href="/termos" className={linkCard}>
            Termos de uso
          </Link>
          <Link href="/privacidade" className={linkCard}>
            Privacidade
          </Link>
          <Link href="/conta/dados-lgpd" className={linkCard}>
            Seus dados (LGPD)
          </Link>
        </nav>
      </main>
    </div>
  );
}
