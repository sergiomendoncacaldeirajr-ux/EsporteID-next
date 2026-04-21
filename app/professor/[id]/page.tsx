import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
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
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="rounded-3xl border border-eid-action-500/20 bg-eid-card/95 p-6">
        <div className="flex flex-wrap items-start gap-4">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              width={96}
              height={96}
              className="h-24 w-24 rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-eid-surface text-lg font-bold text-eid-primary-300">
              EID
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-eid-action-400">
              Professor na EsporteID
            </p>
            <h1 className="mt-2 text-3xl font-bold text-eid-fg">{profile.nome ?? "Professor"}</h1>
            {profile.username ? <p className="mt-1 text-sm text-eid-primary-300">@{profile.username}</p> : null}
            {professor.headline ? <p className="mt-3 text-base text-eid-fg">{professor.headline}</p> : null}
            {profile.localizacao ? <p className="mt-2 text-sm text-eid-text-secondary">{profile.localizacao}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-[#25D366] px-4 py-2 text-sm font-bold text-white"
                >
                  Falar no WhatsApp
                </a>
              ) : null}
              {isVisitor ? (
                <Link href={signupHref} className="rounded-xl bg-eid-action-500 px-4 py-2 text-sm font-bold text-[var(--eid-brand-ink)]">
                  Quero fazer aula
                </Link>
              ) : null}
              <Link href={`/perfil/${id}`} className="rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-sm font-semibold text-eid-fg">
                Ver perfil completo
              </Link>
            </div>
          </div>
        </div>
      </div>

      {isVisitor ? (
        <section className="mt-6 rounded-2xl border border-eid-action-500/25 bg-eid-action-500/10 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-eid-action-400">
            Aula pela plataforma
          </p>
          <h2 className="mt-2 text-xl font-bold text-eid-fg">
            Gostou do perfil e quer marcar uma aula?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-eid-text-secondary">
            Você pode navegar no perfil deste professor sem cadastro. Quando decidir avançar, crie sua conta para solicitar aula, acompanhar agenda, receber notificações e pagar pela plataforma.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={signupHref}
              className="rounded-xl bg-eid-action-500 px-4 py-2 text-sm font-bold text-[var(--eid-brand-ink)]"
            >
              Cadastrar para fazer aula
            </Link>
            <Link
              href={loginHref}
              className="rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-sm font-semibold text-eid-fg"
            >
              Já tenho conta
            </Link>
          </div>
        </section>
      ) : !isOwner ? (
        <ProfessorRequestLessonCard professorId={id} sports={sportOptions} />
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Proposta profissional</h2>
          <p className="mt-3 text-sm leading-relaxed text-eid-text-secondary">
            {professor.bio_profissional ?? profile.bio ?? "Professor disponível para aulas, treinamento e acompanhamento técnico."}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-eid-text-secondary">Certificações</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.isArray(professor.certificacoes_json) && professor.certificacoes_json.length ? (
                  professor.certificacoes_json.map((item, idx) => (
                    <span key={`${item}-${idx}`} className="rounded-full border border-[color:var(--eid-border-subtle)] px-3 py-1 text-xs text-eid-fg">
                      {String(item)}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-eid-text-secondary">Não informado.</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-eid-text-secondary">Público-alvo</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.isArray(professor.publico_alvo_json) && professor.publico_alvo_json.length ? (
                  professor.publico_alvo_json.map((item, idx) => (
                    <span key={`${item}-${idx}`} className="rounded-full border border-[color:var(--eid-border-subtle)] px-3 py-1 text-xs text-eid-fg">
                      {String(item)}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-eid-text-secondary">Não informado.</span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Esportes e nota docente</h2>
          <div className="mt-4 space-y-3">
            {(esportes ?? []).map((item, idx) => {
              const esporte = Array.isArray(item.esportes) ? item.esportes[0] : item.esportes;
              const metrica = (metricas ?? []).find((m) => {
                const esporteM = Array.isArray(m.esportes) ? m.esportes[0] : m.esportes;
                return esporteM?.nome === esporte?.nome;
              });
              return (
                <div key={`${esporte?.nome ?? "esp"}-${idx}`} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-eid-fg">{esporte?.nome ?? "Esporte"}</p>
                      <p className="mt-1 text-xs text-eid-text-secondary">
                        {(item.tipo_atuacao ?? []).join(", ") || "aulas"} · {item.objetivo_plataforma}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-eid-action-400">
                      A partir de R$ {(Number(item.valor_base_centavos ?? 0) / 100).toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                  {metrica ? (
                    <p className="mt-2 text-xs text-eid-text-secondary">
                      Nota docente {Number(metrica.nota_docente ?? 0).toFixed(2)} · {metrica.total_avaliacoes_validas ?? 0} avaliações válidas
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Formato das aulas</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.isArray(professor.formato_aula_json) && professor.formato_aula_json.length ? (
              professor.formato_aula_json.map((item, idx) => (
                <span key={`${item}-${idx}`} className="rounded-full border border-[color:var(--eid-border-subtle)] px-3 py-1 text-xs text-eid-fg">
                  {String(item)}
                </span>
              ))
            ) : (
              <span className="text-sm text-eid-text-secondary">Formato a definir com o professor.</span>
            )}
          </div>
          {typeof professor.politica_cancelamento_json === "object" &&
          descreverPoliticaCancelamentoProfessor(professor.politica_cancelamento_json) ? (
            <p className="mt-4 text-sm text-eid-text-secondary">
              Política de cancelamento: {descreverPoliticaCancelamentoProfessor(professor.politica_cancelamento_json)}
            </p>
          ) : null}
          {!whatsappHref && professor.whatsapp_visibilidade === "alunos_aceitos_ou_com_aula" ? (
            <p className="mt-4 text-sm text-eid-text-secondary">
              O WhatsApp deste professor aparece somente para alunos com solicitação aceita ou já vinculados em aula.
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
          <h2 className="text-lg font-bold text-eid-fg">Locais vinculados</h2>
          <div className="mt-3 space-y-2">
            {(locais ?? []).length ? (
              (locais ?? []).map((item, idx) => {
                const espaco = Array.isArray(item.espacos_genericos) ? item.espacos_genericos[0] : item.espacos_genericos;
                return (
                  <div key={`${espaco?.id ?? idx}-${idx}`} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                    <p className="text-sm font-semibold text-eid-fg">{espaco?.nome_publico ?? "Local"}</p>
                    <p className="mt-1 text-xs text-eid-text-secondary">
                      {espaco?.localizacao ?? "Localização não informada"} · {item.tipo_vinculo}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-eid-text-secondary">Sem locais vinculados informados.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
