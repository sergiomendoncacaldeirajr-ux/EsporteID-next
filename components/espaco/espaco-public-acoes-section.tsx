"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, ShieldCheck, Users } from "lucide-react";
import { EspacoGradePublica, type HorarioSemanal, type PlanoPublico, type ReservaPublica, type UnidadePublica } from "@/components/espaco/espaco-grade-publica";
import { EspacoPublicJoinForm } from "@/components/espaco/espaco-public-cta";
import { EidPanelHeader } from "@/components/ui/eid-panel-header";

type PlanoDetalhado = {
  id: number;
  nome: string;
  mensalidadeLabel: string;
  descricao: string | null;
  reservasGratis: string | null;
  descontoLabel: string | null;
};

type Props = {
  espacoId: number;
  slug: string;
  modoReserva: string;
  isMembroAtivo: boolean;
  isLogado: boolean;
  aceitaSocios: boolean;
  entradaMembroModo: string | null;
  entradaMembroDescricao: string | null;
  associacaoRegra: {
    modoEntrada: "somente_perfil" | "matricula" | "cpf";
    rotuloCampo: string;
    instrucoes: string;
  };
  horarios: HorarioSemanal[];
  unidades: UnidadePublica[];
  reservas: ReservaPublica[];
  planos: PlanoPublico[];
  planosDetalhados: PlanoDetalhado[];
  valorPadraoCentavos: number;
  formasPagamentoAceitas: string[];
};

type PainelAberto = "reservas" | "assinaturas" | null;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function getEntradaBadge(modo: string | null, aceitaSocios: boolean) {
  if (!aceitaSocios) return "Acesso do espaço";
  return modo === "automatica" ? "Entrada imediata" : "Aprovação manual";
}

function getResumoAssinatura(
  aceitaSocios: boolean,
  isMembroAtivo: boolean,
  planosDetalhados: PlanoDetalhado[],
  entradaMembroModo: string | null
) {
  if (isMembroAtivo) return "Você já faz parte deste espaço e pode aproveitar os benefícios disponíveis.";
  if (!aceitaSocios) return "Consulte como funciona o acesso para jogar e acompanhar este espaço.";
  if (planosDetalhados.length > 0) {
    return entradaMembroModo === "automatica"
      ? "Escolha um plano ou entre com seu perfil para começar agora."
      : "Confira os planos, benefícios e envie sua solicitação de entrada.";
  }
  return entradaMembroModo === "automatica"
    ? "Entre como membro para acompanhar o espaço e liberar seu acesso rapidamente."
    : "Solicite entrada para o dono do espaço analisar seu acesso.";
}

function ActionCard({
  id,
  title,
  description,
  badge,
  meta,
  icon,
  open,
  onClick,
}: {
  id: string;
  title: string;
  description: string;
  badge: string;
  meta: string;
  icon: ReactNode;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={id}
      className={cn(
        "group relative overflow-hidden rounded-[24px] border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eid-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-eid-bg",
        open
          ? "border-eid-primary-500/45 bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-primary-500)_14%,var(--eid-card)_86%),var(--eid-card))] shadow-[0_20px_48px_-24px_rgba(37,99,235,0.55)]"
          : "border-[color:var(--eid-border-subtle)] bg-eid-card/90 hover:border-eid-primary-500/28 hover:bg-eid-card"
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--eid-primary-500),var(--eid-action-500))] opacity-80" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-eid-primary-500/20 bg-eid-primary-500/12 text-eid-primary-300">
            {icon}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-eid-primary-500/20 bg-eid-primary-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-eid-primary-300">
                {badge}
              </span>
              <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-2.5 py-1 text-[10px] font-bold text-eid-text-secondary">
                {meta}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-black tracking-tight text-eid-fg sm:text-xl">{title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-eid-text-secondary">{description}</p>
          </div>
        </div>
        <span
          aria-hidden
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 text-eid-text-secondary transition",
            open && "rotate-180 border-eid-primary-500/30 bg-eid-primary-500/12 text-eid-primary-300"
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

export function EspacoPublicAcoesSection({
  espacoId,
  slug,
  modoReserva,
  isMembroAtivo,
  isLogado,
  aceitaSocios,
  entradaMembroModo,
  entradaMembroDescricao,
  associacaoRegra,
  horarios,
  unidades,
  reservas,
  planos,
  planosDetalhados,
  valorPadraoCentavos,
  formasPagamentoAceitas,
}: Props) {
  const [aberto, setAberto] = useState<PainelAberto>("reservas");
  const isPago = modoReserva === "paga";
  const entradaBadge = getEntradaBadge(entradaMembroModo, aceitaSocios);
  const menorPlano = planosDetalhados[0]?.mensalidadeLabel ?? null;

  return (
    <section className="rounded-[28px] border border-eid-primary-500/18 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_8%,var(--eid-card)_92%),var(--eid-card))] p-3 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.65)] sm:p-4">
      <div className="overflow-hidden rounded-[22px] border border-[color:var(--eid-border-subtle)] bg-eid-card/90">
        <EidPanelHeader
          title="Reservas e assinaturas"
          info="Escolha o que quer fazer primeiro. Você pode abrir a grade de horários para reservar ou conferir os planos e regras de acesso do espaço."
          badge={
            <span className="rounded-full border border-eid-action-500/28 bg-eid-action-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-eid-action-300">
              Tudo em um lugar
            </span>
          }
        />

        <div className="space-y-4 p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <ActionCard
              id="espaco-public-painel-reservas"
              title="Reservas"
              description={
                isPago
                  ? "Veja os horários livres, escolha a quadra ideal e reserve online com a forma de pagamento disponível."
                  : isMembroAtivo
                    ? "Abra a grade para confirmar suas reservas gratuitas e acompanhar a ocupação do espaço."
                    : "Confira os horários disponíveis e veja como liberar seu acesso para reservar neste espaço."
              }
              badge={isPago ? "Reserva paga" : "Grade pública"}
              meta={`${unidades.length} ${unidades.length === 1 ? "unidade" : "unidades"}`}
              icon={<CalendarDays className="h-5 w-5" />}
              open={aberto === "reservas"}
              onClick={() => setAberto((atual) => (atual === "reservas" ? null : "reservas"))}
            />

            <ActionCard
              id="espaco-public-painel-assinaturas"
              title="Assinaturas e acesso"
              description={getResumoAssinatura(aceitaSocios, isMembroAtivo, planosDetalhados, entradaMembroModo)}
              badge={aceitaSocios ? "Planos e benefícios" : "Acesso ao espaço"}
              meta={menorPlano ? `a partir de ${menorPlano}` : entradaBadge}
              icon={<Users className="h-5 w-5" />}
              open={aberto === "assinaturas"}
              onClick={() => setAberto((atual) => (atual === "assinaturas" ? null : "assinaturas"))}
            />
          </div>

          {aberto === "reservas" ? (
            <div
              id="espaco-public-painel-reservas"
              className="overflow-hidden rounded-[24px] border border-eid-primary-500/18 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_7%,var(--eid-card)_93%),var(--eid-card))]"
            >
              <EidPanelHeader
                title="Reservar neste espaço"
                badge={
                  <span className="rounded-full border border-eid-primary-500/22 bg-eid-primary-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-eid-primary-300">
                    {isPago ? "Pagamento online" : isMembroAtivo ? "Reserva liberada" : "Acesso por membro"}
                  </span>
                }
              />
              <div className="space-y-4 p-3 sm:p-4">
                <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-eid-fg">
                      {isPago
                        ? "Clique em um horário livre para reservar e escolher a forma de pagamento."
                        : isMembroAtivo
                          ? "Como membro, clique num horário livre para confirmar sua reserva gratuita."
                          : "Abra os horários disponíveis e veja como reservar neste espaço."}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">
                      Você também pode usar a rota rápida se preferir reservar sem navegar pela página completa do local.
                    </p>
                  </div>
                  <Link
                    href={`/reservar/${slug}`}
                    className="inline-flex items-center justify-center rounded-xl border border-eid-action-500/28 bg-eid-action-500/12 px-4 py-2.5 text-sm font-bold text-eid-action-300 transition hover:bg-eid-action-500/18"
                  >
                    Reserva rápida
                  </Link>
                </div>

                {horarios.length > 0 ? (
                  <EspacoGradePublica
                    espacoId={espacoId}
                    slug={slug}
                    unidades={unidades}
                    horarios={horarios}
                    reservas={reservas}
                    modoReserva={modoReserva}
                    isMembroAtivo={isMembroAtivo}
                    isLogado={isLogado}
                    planos={planos}
                    valorPadraoCentavos={valorPadraoCentavos}
                    semanaOffset={0}
                    formasPagamentoAceitas={formasPagamentoAceitas}
                  />
                ) : (
                  <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-4 py-8 text-center">
                    <CalendarDays className="mx-auto mb-2 h-8 w-8 text-eid-text-secondary/40" aria-hidden />
                    <p className="text-sm font-bold text-eid-text-secondary">Grade de horários ainda não publicada.</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {aberto === "assinaturas" ? (
            <div
              id="espaco-public-painel-assinaturas"
              className="overflow-hidden rounded-[24px] border border-eid-action-500/18 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-action-500)_8%,var(--eid-card)_92%),var(--eid-card))]"
            >
              <EidPanelHeader
                title="Planos, benefícios e acesso"
                badge={
                  <span className="rounded-full border border-eid-action-500/26 bg-eid-action-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-eid-action-300">
                    {entradaBadge}
                  </span>
                }
              />
              <div className="space-y-4 p-3 sm:p-4">
                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-eid-action-500/20 bg-eid-action-500/12 text-eid-action-300">
                          <ShieldCheck className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-eid-fg">Como funciona o acesso</p>
                          <p className="mt-1 text-sm leading-relaxed text-eid-text-secondary">
                            {entradaMembroDescricao?.trim() || associacaoRegra.instrucoes}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card/70 px-2.5 py-1 text-[10px] font-bold text-eid-text-secondary">
                              {entradaBadge}
                            </span>
                            {isMembroAtivo ? (
                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">
                                Você já é membro
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    {planosDetalhados.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        {planosDetalhados.map((plano) => (
                          <div
                            key={plano.id}
                            className="flex flex-col rounded-2xl border border-eid-action-500/20 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_96%,var(--eid-action-500)_4%),var(--eid-card))] p-4 shadow-[0_4px_20px_-10px_rgba(249,115,22,0.18)]"
                          >
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-action-300">Plano</p>
                            <p className="mt-1 text-base font-black text-eid-fg">{plano.nome}</p>
                            <p className="mt-2 text-2xl font-black text-eid-action-300 eid-light:text-eid-action-600">
                              {plano.mensalidadeLabel}
                              <span className="text-sm font-semibold text-eid-text-secondary">/mês</span>
                            </p>
                            {plano.descricao ? (
                              <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary">{plano.descricao}</p>
                            ) : null}
                            {plano.reservasGratis || plano.descontoLabel ? (
                              <ul className="mt-3 space-y-1 border-t border-[color:var(--eid-border-subtle)] pt-3">
                                {plano.reservasGratis ? (
                                  <li className="flex items-center gap-1.5 text-[11px] text-eid-fg">
                                    <span className="text-emerald-400">✓</span>
                                    {plano.reservasGratis}
                                  </li>
                                ) : null}
                                {plano.descontoLabel ? (
                                  <li className="flex items-center gap-1.5 text-[11px] text-eid-fg">
                                    <span className="text-emerald-400">✓</span>
                                    {plano.descontoLabel}
                                  </li>
                                ) : null}
                              </ul>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4 text-sm text-eid-text-secondary">
                        Este espaço ainda não publicou planos com mensalidade, mas você já pode conferir as regras de acesso e solicitar entrada.
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {isLogado ? (
                      isMembroAtivo ? (
                        <div className="rounded-2xl border border-emerald-500/26 bg-emerald-500/10 p-4">
                          <p className="text-sm font-bold text-emerald-300">Seu acesso já está ativo.</p>
                          <p className="mt-1 text-xs leading-relaxed text-emerald-100/85">
                            Use a grade de horários para reservar ou acompanhe o espaço pelo seu perfil dentro do EsporteID.
                          </p>
                        </div>
                      ) : aceitaSocios ? (
                        <EspacoPublicJoinForm
                          espacoId={espacoId}
                          planos={planos}
                          modoReserva={modoReserva}
                          regraEntrada={associacaoRegra}
                        />
                      ) : (
                        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-4">
                          <p className="text-sm font-bold text-eid-fg">Este espaço não está aceitando novas associações agora.</p>
                          <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">
                            Você ainda pode acompanhar as informações públicas do espaço e usar os contatos publicados para tirar dúvidas sobre acesso.
                          </p>
                        </div>
                      )
                    ) : (
                      <div className="rounded-2xl border border-eid-action-500/25 bg-eid-action-500/8 p-4">
                        <p className="text-sm font-bold text-eid-fg">Entre para liberar suas próximas ações.</p>
                        <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">
                          Faça login ou crie sua conta para solicitar acesso, assinar um plano e concluir reservas com mais rapidez.
                        </p>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <Link
                            href={`/login?next=${encodeURIComponent(`/espaco/${slug}`)}`}
                            className="inline-flex items-center justify-center rounded-xl border border-eid-action-500/35 bg-eid-action-500/15 px-4 py-2.5 text-sm font-bold text-eid-action-300 transition hover:bg-eid-action-500/20"
                          >
                            Entrar
                          </Link>
                          <Link
                            href={`/cadastro?next=${encodeURIComponent(`/espaco/${slug}`)}`}
                            className="inline-flex items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-4 py-2.5 text-sm font-bold text-eid-fg transition hover:bg-eid-surface/70"
                          >
                            Criar conta
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
