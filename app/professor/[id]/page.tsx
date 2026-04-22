import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { ProfileSection } from "@/components/perfil/profile-layout-blocks";
import {
  PROFILE_CARD_BASE,
  PROFILE_HERO_PANEL_CLASS,
  PROFILE_META_TITLE,
  PROFILE_PUBLIC_AVATAR_RING_CLASS,
  PROFILE_PUBLIC_MAIN_CLASS,
} from "@/components/perfil/profile-ui-tokens";
import { ProfessorRequestLessonCard } from "@/components/professor/request-lesson-card";
import { descreverPoliticaCancelamentoProfessor } from "@/lib/professor/cancellation";
import { podeExibirWhatsappProfessor } from "@/lib/perfil/whatsapp-visibility";
import { createClient } from "@/lib/supabase/server";

function waHref(raw: string | null | undefined) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export default async function ProfessorPublicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: professor }, { data: esportes }, { data: metricas }, { data: locais }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, nome, username, avatar_url, whatsapp, localizacao, bio")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("professor_perfil")
        .select(
          "headline, bio_profissional, certificacoes_json, publico_alvo_json, formato_aula_json, politica_cancelamento_json, aceita_novos_alunos, perfil_publicado, whatsapp_visibilidade"
        )
        .eq("usuario_id", id)
        .eq("perfil_publicado", true)
        .maybeSingle(),
      supabase
        .from("professor_esportes")
        .select("esporte_id, valor_base_centavos, objetivo_plataforma, tipo_atuacao, esportes(nome)")
        .eq("professor_id", id)
        .eq("ativo", true),
      supabase
        .from("professor_metricas")
        .select("nota_docente, total_avaliacoes_validas, esportes(nome)")
        .eq("professor_id", id)
        .order("nota_docente", { ascending: false }),
      supabase
        .from("professor_locais")
        .select("tipo_vinculo, espacos_genericos(id, nome_publico, localizacao)")
        .eq("professor_id", id)
        .eq("status_vinculo", "ativo"),
    ]);

  if (!profile || !professor) notFound();

  const signupHref = `/cadastro?next=${encodeURIComponent(`/professor/${id}`)}`;
  const loginHref = `/login?next=${encodeURIComponent(`/professor/${id}`)}`;
  const isVisitor = !user;
  const isOwner = user?.id === id;
  const canSeeWhatsapp = await podeExibirWhatsappProfessor(supabase, user?.id ?? null, id, isOwner);
  const whatsappHref = canSeeWhatsapp ? waHref(profile.whatsapp) : null;
  const sportOptions = (esportes ?? [])
    .map((item) => {
      const esporte = Array.isArray(item.esportes) ? item.esportes[0] : item.esportes;
      return {
        esporteId: Number((item as { esporte_id?: number }).esporte_id ?? 0),
        nome: esporte?.nome ?? "Esporte",
      };
    })
    .filter((item) => Number.isFinite(item.esporteId) && item.esporteId > 0)
    .map((item) => ({ id: item.esporteId, nome: item.nome }));

  return (
    <>
      <DashboardTopbar />
      <main className={PROFILE_PUBLIC_MAIN_CLASS}>
        <div className={`${PROFILE_HERO_PANEL_CLASS} mt-2`}>
          <div className="relative h-20 w-full sm:h-24">
            <div
              className="h-full w-full"
              style={{ background: "linear-gradient(135deg,#172554 0%,#0b1d2e 55%,#0b0f14 100%)" }}
            />
            <div
              className="absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-35"
              style={{ background: "var(--eid-action-500)" }}
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-eid-card/60 to-transparent" />
          </div>
          <div className="px-3 pb-3 pt-0">
            <div className="relative z-[2] -mt-7 flex items-end gap-3 sm:-mt-8">
              <div className="relative z-10 h-[68px] w-[68px] shrink-0">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt=""
                    width={68}
                    height={68}
                    className={`h-[68px] w-[68px] ${PROFILE_PUBLIC_AVATAR_RING_CLASS}`}
                  />
                ) : (
                  <div
                    className={`flex h-[68px] w-[68px] items-center justify-center bg-gradient-to-br from-eid-primary-700 to-eid-primary-900 text-sm font-black tracking-widest text-eid-primary-200 ${PROFILE_PUBLIC_AVATAR_RING_CLASS}`}
                  >
                    EID
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-eid-action-400">
                  Professor
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <h1 className="text-[13px] font-black leading-tight tracking-tight text-eid-fg break-words sm:text-sm">
                    {profile.nome ?? "Professor"}
                  </h1>
                  <span className="inline-flex items-center rounded-full border border-white/35 bg-black/35 px-1.5 py-px text-[8px] font-black uppercase tracking-[0.1em] text-white shadow-[0_1px_5px_rgba(0,0,0,0.35)]">
                    Docente
                  </span>
                </div>
                {profile.username ? (
                  <p className="mt-1 text-[10px] font-semibold text-eid-primary-400">@{profile.username}</p>
                ) : null}
                {profile.localizacao ? (
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-1.5 py-px text-[10px] text-eid-text-secondary">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5 shrink-0 text-eid-action-500/90" aria-hidden>
                      <path
                        fillRule="evenodd"
                        d="M8 1.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM2 6a6 6 0 1 1 10.95 3.396l-3.535 5.142a1.5 1.5 0 0 1-2.83 0L2.95 9.396A5.972 5.972 0 0 1 2 6Zm6 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {profile.localizacao}
                  </p>
                ) : null}
              </div>
            </div>
            {professor.headline ? (
              <p className="mt-2 text-[11px] leading-relaxed text-eid-fg sm:text-xs">{professor.headline}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 text-[11px] font-black uppercase tracking-[0.08em] text-white shadow-[0_0_14px_rgba(37,211,102,0.4)] transition hover:bg-[#1da851]"
                >
                  Falar no WhatsApp
                </a>
              ) : null}
              {isVisitor ? (
                <Link
                  href={signupHref}
                  className="eid-btn-soft inline-flex min-h-[40px] items-center justify-center rounded-xl border-eid-action-500/35 bg-eid-action-500/10 px-3 text-[11px] font-bold uppercase tracking-wide text-eid-action-400"
                >
                  Quero fazer aula
                </Link>
              ) : null}
              <Link
                href={`/perfil/${id}?from=${encodeURIComponent(`/professor/${id}`)}`}
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 text-[11px] font-bold uppercase tracking-wide text-eid-fg transition hover:border-eid-primary-500/35"
              >
                Ver perfil de atleta
              </Link>
            </div>
          </div>
        </div>

        {isVisitor ? (
          <div className={`${PROFILE_CARD_BASE} mt-4 p-3 sm:p-4`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-eid-action-400">Aula pela plataforma</p>
            <p className="mt-2 text-sm font-bold text-eid-fg">Gostou do perfil e quer marcar uma aula?</p>
            <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">
              Você pode navegar sem cadastro. Para solicitar aula, acompanhar agenda e pagar pela plataforma, crie sua conta.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={signupHref}
                className="eid-btn-soft inline-flex min-h-[40px] items-center justify-center rounded-xl border-eid-action-500/35 bg-eid-action-500/10 px-3 text-[11px] font-bold uppercase tracking-wide text-eid-action-400"
              >
                Cadastrar
              </Link>
              <Link
                href={loginHref}
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 text-[11px] font-semibold text-eid-fg"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        ) : !isOwner ? (
          <div className="mt-4">
            <ProfessorRequestLessonCard professorId={id} sports={sportOptions} />
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ProfileSection title="Proposta profissional" className="min-w-0">
            <div className={`${PROFILE_CARD_BASE} p-3 sm:p-4`}>
              <p className="text-[11px] leading-relaxed text-eid-text-secondary sm:text-xs">
                {professor.bio_profissional ??
                  profile.bio ??
                  "Professor disponível para aulas, treinamento e acompanhamento técnico."}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className={PROFILE_META_TITLE}>Certificações</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Array.isArray(professor.certificacoes_json) && professor.certificacoes_json.length ? (
                      professor.certificacoes_json.map((item, idx) => (
                        <span
                          key={`${item}-${idx}`}
                          className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-2.5 py-0.5 text-[10px] text-eid-fg"
                        >
                          {String(item)}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-eid-text-secondary">Não informado.</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className={PROFILE_META_TITLE}>Público-alvo</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Array.isArray(professor.publico_alvo_json) && professor.publico_alvo_json.length ? (
                      professor.publico_alvo_json.map((item, idx) => (
                        <span
                          key={`${item}-${idx}`}
                          className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-2.5 py-0.5 text-[10px] text-eid-fg"
                        >
                          {String(item)}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-eid-text-secondary">Não informado.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ProfileSection>

          <ProfileSection title="Esportes e nota docente" className="min-w-0">
            <div className="mt-2 space-y-2">
              {(esportes ?? []).map((item, idx) => {
                const esporte = Array.isArray(item.esportes) ? item.esportes[0] : item.esportes;
                const metrica = (metricas ?? []).find((m) => {
                  const esporteM = Array.isArray(m.esportes) ? m.esportes[0] : m.esportes;
                  return esporteM?.nome === esporte?.nome;
                });
                return (
                  <div key={`${esporte?.nome ?? "esp"}-${idx}`} className="eid-list-item rounded-xl bg-eid-card/55 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-eid-fg">{esporte?.nome ?? "Esporte"}</p>
                        <p className="mt-0.5 text-[10px] text-eid-text-secondary">
                          {(item.tipo_atuacao ?? []).join(", ") || "aulas"} · {item.objetivo_plataforma}
                        </p>
                      </div>
                      <p className="shrink-0 text-[11px] font-bold text-eid-action-400">
                        A partir de R$ {(Number(item.valor_base_centavos ?? 0) / 100).toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                    {metrica ? (
                      <p className="mt-2 text-[10px] text-eid-text-secondary">
                        Nota docente {Number(metrica.nota_docente ?? 0).toFixed(2)} · {metrica.total_avaliacoes_validas ?? 0}{" "}
                        avaliações válidas
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </ProfileSection>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ProfileSection title="Formato das aulas" className="min-w-0">
            <div className={`${PROFILE_CARD_BASE} p-3 sm:p-4`}>
              <div className="flex flex-wrap gap-1.5">
                {Array.isArray(professor.formato_aula_json) && professor.formato_aula_json.length ? (
                  professor.formato_aula_json.map((item, idx) => (
                    <span
                      key={`${item}-${idx}`}
                      className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-2.5 py-0.5 text-[10px] text-eid-fg"
                    >
                      {String(item)}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-eid-text-secondary">Formato a definir com o professor.</span>
                )}
              </div>
              {typeof professor.politica_cancelamento_json === "object" &&
              descreverPoliticaCancelamentoProfessor(professor.politica_cancelamento_json) ? (
                <p className="mt-3 text-[11px] text-eid-text-secondary">
                  Política de cancelamento: {descreverPoliticaCancelamentoProfessor(professor.politica_cancelamento_json)}
                </p>
              ) : null}
              {!whatsappHref && professor.whatsapp_visibilidade === "alunos_aceitos_ou_com_aula" ? (
                <p className="mt-3 text-[11px] text-eid-text-secondary">
                  O WhatsApp aparece somente para alunos com solicitação aceita ou aula vinculada.
                </p>
              ) : null}
            </div>
          </ProfileSection>

          <ProfileSection title="Locais vinculados" className="min-w-0">
            <div className="mt-2 space-y-2">
              {(locais ?? []).length ? (
                (locais ?? []).map((item, idx) => {
                  const espaco = Array.isArray(item.espacos_genericos) ? item.espacos_genericos[0] : item.espacos_genericos;
                  return (
                    <div key={`${espaco?.id ?? idx}-${idx}`} className="eid-list-item rounded-xl bg-eid-card/55 p-3">
                      <p className="text-[12px] font-semibold text-eid-fg">{espaco?.nome_publico ?? "Local"}</p>
                      <p className="mt-0.5 text-[10px] text-eid-text-secondary">
                        {espaco?.localizacao ?? "Localização não informada"} · {item.tipo_vinculo}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-[11px] text-eid-text-secondary">Sem locais vinculados informados.</p>
              )}
            </div>
          </ProfileSection>
        </div>
      </main>
    </>
  );
}
