"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Globe, Mail, MapPin, Phone, Trophy, Users } from "lucide-react";
import { EspacoGradePublica, type HorarioSemanal, type PlanoPublico, type ReservaPublica, type UnidadePublica } from "@/components/espaco/espaco-grade-publica";
import { EspacoPublicJoinForm } from "@/components/espaco/espaco-public-cta";

type ProfessorCard = {
  id: string;
  nome: string;
  avatarUrl: string | null;
};

type TorneioCard = {
  id: number;
  nome: string;
  status: string | null;
  dataFmt: string | null;
  href: string;
};

type UnidadeResumo = {
  id: number;
  nome: string;
  tipo: string | null;
  tags: string[];
};

type TabId = "reservas" | "torneios" | "professores" | "sobre";

type Props = {
  initialTab?: TabId;
  espacoId: number;
  slug: string;
  modoReserva: string;
  isMembroAtivo: boolean;
  isLogado: boolean;
  aceitaSocios: boolean;
  associacaoRegra: {
    modoEntrada: "somente_perfil" | "matricula" | "cpf";
    rotuloCampo: string;
    instrucoes: string;
  };
  horarios: HorarioSemanal[];
  unidades: UnidadePublica[];
  unidadesResumo: UnidadeResumo[];
  reservas: ReservaPublica[];
  planos: PlanoPublico[];
  valorPadraoCentavos: number;
  formasPagamentoAceitas: string[];
  professores: ProfessorCard[];
  torneios: TorneioCard[];
  descricao: string | null;
  localizacao: string | null;
  whatsappContato: string | null;
  emailContato: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "reservas", label: "Reservas" },
  { id: "torneios", label: "Torneios" },
  { id: "professores", label: "Professores / Aulas" },
  { id: "sobre", label: "Sobre" },
];

export function EspacoPublicProfileTabs({
  initialTab = "reservas",
  espacoId,
  slug,
  modoReserva,
  isMembroAtivo,
  isLogado,
  aceitaSocios,
  associacaoRegra,
  horarios,
  unidades,
  unidadesResumo,
  reservas,
  planos,
  valorPadraoCentavos,
  formasPagamentoAceitas,
  professores,
  torneios,
  descricao,
  localizacao,
  whatsappContato,
  emailContato,
  websiteUrl,
  instagramUrl,
}: Props) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const [unidadeId, setUnidadeId] = useState<number | null>(unidades[0]?.id ?? null);
  const isPago = modoReserva === "paga";

  const unidadesFiltradas = useMemo(() => {
    if (!unidadeId) return unidades;
    return unidades.filter((unidade) => unidade.id === unidadeId);
  }, [unidadeId, unidades]);

  const horariosFiltrados = useMemo(() => {
    if (!unidadeId) return horarios;
    return horarios.filter((horario) => horario.espaco_unidade_id === unidadeId);
  }, [horarios, unidadeId]);

  const reservasFiltradas = useMemo(() => {
    if (!unidadeId) return reservas;
    return reservas.filter((reserva) => reserva.espaco_unidade_id === unidadeId);
  }, [reservas, unidadeId]);

  return (
    <section id="espaco-profile-tabs" className="space-y-4">
      <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-2 sm:p-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((item) => {
            const count =
              item.id === "reservas"
                ? unidades.length
                : item.id === "torneios"
                  ? torneios.length
                  : item.id === "professores"
                    ? professores.length
                    : null;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition",
                  active
                    ? "border-eid-primary-500/45 bg-eid-primary-500/12 text-eid-fg"
                    : "border-[color:var(--eid-border-subtle)] bg-eid-surface/45 text-eid-text-secondary hover:text-eid-fg"
                )}
              >
                <span>{item.label}</span>
                {count != null ? (
                  <span className="rounded-full bg-black/15 px-2 py-0.5 text-[11px] font-black text-inherit">{count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "reservas" ? (
        <div className="space-y-4 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-eid-primary-400" aria-hidden />
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-eid-primary-300">Reservas</h2>
          </div>

          {!isPago && !isMembroAtivo && aceitaSocios ? (
            <div className="rounded-2xl border border-eid-action-500/20 bg-eid-action-500/8 p-4">
              <p className="text-sm font-bold text-eid-fg">Antes de reservar, você precisa liberar seu acesso.</p>
              <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">
                Solicite entrada como membro ou vire sócio. Depois da aprovação do admin, as reservas ficam liberadas para sua conta.
              </p>
              <div className="mt-4">
                <EspacoPublicJoinForm
                  espacoId={espacoId}
                  planos={planos}
                  modoReserva={modoReserva}
                  regraEntrada={associacaoRegra}
                />
              </div>
            </div>
          ) : null}

          {unidadesResumo.length > 1 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Escolha a quadra</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {unidadesResumo.map((unidade) => {
                  const active = unidadeId === unidade.id;
                  return (
                    <button
                      key={unidade.id}
                      type="button"
                      onClick={() => setUnidadeId(unidade.id)}
                      className={cn(
                        "shrink-0 rounded-2xl border px-4 py-2.5 text-left text-sm font-bold transition",
                        active
                          ? "border-eid-action-500/45 bg-eid-action-500/10 text-eid-fg"
                          : "border-[color:var(--eid-border-subtle)] bg-eid-surface/45 text-eid-text-secondary"
                      )}
                    >
                      {unidade.nome}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <EspacoGradePublica
            espacoId={espacoId}
            slug={slug}
            unidades={unidadesFiltradas}
            horarios={horariosFiltrados}
            reservas={reservasFiltradas}
            modoReserva={modoReserva}
            isMembroAtivo={isMembroAtivo}
            isLogado={isLogado}
            planos={planos}
            valorPadraoCentavos={valorPadraoCentavos}
            semanaOffset={0}
            formasPagamentoAceitas={formasPagamentoAceitas}
          />
        </div>
      ) : null}

      {tab === "torneios" ? (
        <div className="space-y-4 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-eid-action-300" aria-hidden />
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-eid-action-300">Torneios no local</h2>
          </div>
          {torneios.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {torneios.map((torneio) => (
                <Link
                  key={torneio.id}
                  href={torneio.href}
                  className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-4 transition hover:border-eid-action-500/35 hover:bg-eid-action-500/6"
                >
                  <p className="text-sm font-black text-eid-fg">{torneio.nome}</p>
                  <p className="mt-1 text-[11px] capitalize text-eid-text-secondary">
                    {torneio.status?.replace(/_/g, " ") ?? "Torneio"}{torneio.dataFmt ? ` · ${torneio.dataFmt}` : ""}
                  </p>
                  <p className="mt-3 text-[11px] font-bold text-eid-action-300">Ver torneio e inscrição →</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-4 py-8 text-center text-sm text-eid-text-secondary">
              Nenhum torneio publicado neste local agora.
            </div>
          )}
        </div>
      ) : null}

      {tab === "professores" ? (
        <div className="space-y-4 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-eid-primary-400" aria-hidden />
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-eid-primary-300">Professores e aulas</h2>
          </div>
          {professores.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {professores.map((professor) => (
                <Link
                  key={professor.id}
                  href={`/professor/${professor.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-4 transition hover:border-eid-primary-500/35 hover:bg-eid-primary-500/6"
                >
                  {professor.avatarUrl ? (
                    <Image src={professor.avatarUrl} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-eid-primary-500/15 text-sm font-black text-eid-primary-300">
                      {professor.nome.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-eid-fg">{professor.nome}</p>
                    <p className="mt-1 text-[11px] text-eid-text-secondary">Ver perfil e aulas →</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-4 py-8 text-center text-sm text-eid-text-secondary">
              Nenhum professor parceiro publicado neste local.
            </div>
          )}
        </div>
      ) : null}

      {tab === "sobre" ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-eid-primary-300">Sobre o espaço</h2>
            <p className="mt-3 text-sm leading-relaxed text-eid-text-secondary">
              {descricao ?? "Este espaço ainda não publicou uma descrição."}
            </p>
            {unidadesResumo.length ? (
              <div className="mt-5 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Quadras e ambientes</p>
                {unidadesResumo.map((unidade) => (
                  <div key={unidade.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3">
                    <p className="text-sm font-bold text-eid-fg">{unidade.nome}</p>
                    {unidade.tipo ? <p className="text-[11px] text-eid-text-secondary">{unidade.tipo}</p> : null}
                    {unidade.tags.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {unidade.tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card/70 px-2 py-0.5 text-[10px] font-semibold text-eid-text-secondary">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-eid-primary-300">Contato</h2>
            <div className="mt-3 space-y-3 text-sm text-eid-fg">
              {localizacao ? (
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-eid-primary-400" aria-hidden />
                  <span>{localizacao}</span>
                </div>
              ) : null}
              {whatsappContato ? (
                <a href={`https://wa.me/${String(whatsappContato).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 hover:text-[#25D366]">
                  <Phone className="h-4 w-4 shrink-0 text-eid-primary-400" aria-hidden />
                  {whatsappContato}
                </a>
              ) : null}
              {emailContato ? (
                <a href={`mailto:${emailContato}`} className="flex items-center gap-2.5 hover:text-eid-primary-300">
                  <Mail className="h-4 w-4 shrink-0 text-eid-primary-400" aria-hidden />
                  {emailContato}
                </a>
              ) : null}
              {websiteUrl ? (
                <a href={websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-eid-primary-300 hover:text-eid-primary-200">
                  <Globe className="h-4 w-4 shrink-0 text-eid-primary-400" aria-hidden />
                  Site oficial
                </a>
              ) : null}
              {instagramUrl ? (
                <a
                  href={instagramUrl.startsWith("http") ? instagramUrl : `https://instagram.com/${instagramUrl.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 hover:text-pink-400"
                >
                  <span className="flex h-4 w-4 items-center justify-center text-eid-primary-400">◎</span>
                  {instagramUrl.startsWith("http") ? `@${instagramUrl.split("/").filter(Boolean).pop()}` : instagramUrl}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
