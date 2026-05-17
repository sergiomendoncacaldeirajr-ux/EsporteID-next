"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Globe, Mail, MapPin, Phone, ShoppingBag, Trophy, Users } from "lucide-react";
import { EspacoGradePublica, type HorarioSemanal, type PlanoPublico, type ReservaPublica, type UnidadePublica } from "@/components/espaco/espaco-grade-publica";
import { criarPedidoPublicoLanchoneteEspacoAction } from "@/app/espaco/actions";
import { EspacoPublicJoinForm } from "@/components/espaco/espaco-public-cta";
import {
  SPACE_ACTION_CARD_CLASS,
  SPACE_SECTION_CARD_CLASS,
  SPACE_SECTION_HEAD_CLASS,
  SPACE_SECTION_TITLE_CLASS,
} from "@/components/espaco/espaco-visual-tokens";

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
  imageUrl?: string | null;
};

type ProdutoCard = {
  id: number;
  nome: string;
  categoria: string;
  precoFmt: string;
  fotoUrl: string | null;
  disponivel: boolean;
};

function ProdutoPedidoCard({
  espacoId,
  produto,
  isLogado,
}: {
  espacoId: number;
  produto: ProdutoCard;
  isLogado: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(criarPedidoPublicoLanchoneteEspacoAction, undefined);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45">
        <div className="relative h-28 bg-[linear-gradient(140deg,var(--eid-brand-ink),color-mix(in_srgb,var(--eid-action-500)_18%,var(--eid-brand-ink)),#0b0f14)]">
          {produto.fotoUrl ? <Image src={produto.fotoUrl} alt="" fill unoptimized className="object-cover opacity-80" /> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-eid-brand-ink/90 via-eid-brand-ink/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="text-sm font-black text-white">{produto.nome}</p>
            <p className="text-[11px] text-white/70">{produto.categoria}</p>
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-eid-fg">{produto.precoFmt}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${produto.disponivel ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border border-[color:var(--eid-border-subtle)] bg-eid-card/70 text-eid-text-secondary"}`}>
              {produto.disponivel ? "Disponível" : "Sem estoque"}
            </span>
          </div>
          <button className="mt-3 w-full rounded-xl border border-eid-action-500/35 bg-eid-action-500/10 px-4 py-2.5 text-sm font-bold text-eid-action-300 transition hover:bg-eid-action-500/15" disabled={!produto.disponivel} onClick={() => setOpen(true)}>
            {produto.disponivel ? "Pedir item" : "Indisponível"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-eid-brand-ink/65 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl text-eid-text-secondary transition hover:bg-eid-surface/60 hover:text-eid-fg" aria-label="Fechar">×</button>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-action-300">Bar / Lanchonete</p>
            <h3 className="mt-1 text-lg font-black text-eid-fg">{produto.nome}</h3>
            <p className="mt-1 text-sm text-eid-text-secondary">{produto.precoFmt}</p>
            {!isLogado ? (
              <div className="mt-4 rounded-xl border border-eid-action-500/20 bg-eid-action-500/8 p-4 text-sm text-eid-text-secondary">
                Entre na sua conta para fazer um pedido da lanchonete deste espaço.
              </div>
            ) : (
              <form action={action} className="mt-4 space-y-3">
                <input type="hidden" name="espaco_id" value={espacoId} />
                <input type="hidden" name="produto_id" value={produto.id} />
                <input type="number" min={1} name="quantidade" defaultValue={1} className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm" />
                <textarea name="observacoes" rows={2} placeholder="Observações do pedido" className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm" />
                <button type="submit" disabled={pending} className="eid-btn-primary w-full rounded-xl px-4 py-3 text-sm font-bold">
                  {pending ? "Enviando pedido..." : "Confirmar pedido"}
                </button>
                {state?.message ? (
                  <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
                ) : null}
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

type TabId = "reservas" | "torneios" | "professores" | "sobre" | "bar-lanchonete";

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
  produtosLanchonete: ProdutoCard[];
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const TABS: Array<{ id: TabId; label: string; shortLabel: string; Icon: typeof Globe }> = [
  { id: "sobre", label: "Sobre o espaço", shortLabel: "Sobre", Icon: Globe },
  { id: "reservas", label: "Reservas", shortLabel: "Reservas", Icon: CalendarDays },
  { id: "torneios", label: "Torneios", shortLabel: "Competições", Icon: Trophy },
  { id: "professores", label: "Professores / Aulas", shortLabel: "Professores", Icon: Users },
  { id: "bar-lanchonete", label: "Bar / Lanchonete", shortLabel: "Lanchonete", Icon: ShoppingBag },
];

const TAB_PANEL_CLASS =
  "space-y-5 rounded-[28px] border border-[color:var(--eid-border-subtle)] bg-eid-card/92 p-4 shadow-[0_22px_54px_-34px_rgba(15,23,42,0.55)] eid-light:border-slate-200 eid-light:bg-white sm:p-5";

export function EspacoPublicProfileTabs({
  initialTab = "sobre",
  espacoId,
  slug,
  modoReserva,
  isMembroAtivo,
  isLogado,
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
  produtosLanchonete,
}: Props) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const [unidadeId, setUnidadeId] = useState<number | null>(unidades[0]?.id ?? null);

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
      <div className="sticky top-2 z-10 rounded-[28px] border border-[color:var(--eid-border-subtle)] bg-eid-card/92 p-2.5 shadow-[0_18px_38px_-24px_rgba(15,23,42,0.52)] backdrop-blur-sm eid-light:border-slate-200/90 eid-light:bg-white/95 eid-light:shadow-[0_18px_34px_-24px_rgba(15,23,42,0.12)] sm:p-3">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          {TABS.map((item) => {
            const count =
              item.id === "reservas"
                ? unidades.length
                : item.id === "torneios"
                  ? torneios.length
                  : item.id === "professores"
                    ? professores.length
                    : item.id === "bar-lanchonete"
                      ? produtosLanchonete.length
                      : null;
            const active = tab === item.id;
            const Icon = item.Icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "inline-flex min-h-[4.25rem] items-center gap-3 rounded-[24px] border px-3 py-3 text-left transition",
                  active
                    ? "border-eid-primary-500/45 bg-eid-primary-500/14 text-eid-fg shadow-[0_18px_32px_-26px_rgba(37,99,235,0.62)] eid-light:border-eid-primary-500/35 eid-light:bg-eid-primary-500/8"
                    : "border-[color:var(--eid-border-subtle)] bg-eid-surface/45 text-eid-text-secondary hover:border-eid-primary-500/30 hover:text-eid-fg eid-light:border-slate-200 eid-light:bg-slate-50"
                )}
              >
                <span className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
                  active
                    ? "border-eid-primary-500/35 bg-eid-primary-500/14 text-eid-primary-200"
                    : "border-[color:var(--eid-border-subtle)] bg-eid-card/60 text-eid-text-secondary"
                )}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-black uppercase tracking-[0.08em]">{item.shortLabel}</span>
                  {count != null ? (
                    <span className="mt-1 inline-flex rounded-full bg-black/15 px-2 py-0.5 text-[10px] font-black text-inherit eid-light:bg-slate-200/80">{count}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {tab === "reservas" ? (
        <div className={TAB_PANEL_CLASS}>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-eid-primary-400" aria-hidden />
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-eid-primary-300">Reservas</h2>
          </div>

          {!isMembroAtivo ? (
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
                  isMembroAtivo={isMembroAtivo}
                  regraEntrada={associacaoRegra}
                />
              </div>
            </div>
          ) : null}

          {unidadesResumo.length > 1 ? (
            <div className="space-y-2 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 p-3 eid-light:border-slate-200 eid-light:bg-slate-50/85">
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
                        "shrink-0 rounded-2xl border px-4 py-2.5 text-left text-sm font-bold transition min-w-[150px]",
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

          {isMembroAtivo ? (
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
          ) : (
            <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-4 py-10 text-center text-sm text-eid-text-secondary">
              Torne-se membro para liberar a visualização da grade e os horários disponíveis deste espaço.
            </div>
          )}
        </div>
      ) : null}

      {tab === "torneios" ? (
        <div className={TAB_PANEL_CLASS}>
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
        <div className={TAB_PANEL_CLASS}>
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

      {tab === "bar-lanchonete" ? (
        <div className={TAB_PANEL_CLASS}>
          <div className="flex items-center gap-2">
            <span className="text-lg">🍔</span>
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-eid-action-300">Bar / Lanchonete</h2>
          </div>
          {produtosLanchonete.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {produtosLanchonete.map((produto) => (
                <ProdutoPedidoCard key={produto.id} espacoId={espacoId} produto={produto} isLogado={isLogado} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-4 py-8 text-center text-sm text-eid-text-secondary">
              Nenhum item da lanchonete foi publicado ainda.
            </div>
          )}
        </div>
      ) : null}

      {tab === "sobre" ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className={SPACE_SECTION_CARD_CLASS}>
            <div className={SPACE_SECTION_HEAD_CLASS}>
              <h2 className={SPACE_SECTION_TITLE_CLASS}>Sobre o espaço</h2>
            </div>
            <div className="p-4 sm:p-5">
              <p className="mt-3 text-sm leading-relaxed text-eid-text-secondary">
                {descricao ?? "Este espaço ainda não publicou uma descrição."}
              </p>
              {unidadesResumo.length ? (
                <div className="mt-5 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Quadras e ambientes</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {unidadesResumo.map((unidade) => (
                      <button
                        key={unidade.id}
                        type="button"
                        onClick={() => {
                          setUnidadeId(unidade.id);
                          setTab("reservas");
                        }}
                        className={`${SPACE_ACTION_CARD_CLASS} overflow-hidden p-0 text-left`}
                      >
                        <div className="relative h-32 w-full overflow-hidden bg-[linear-gradient(140deg,var(--eid-brand-ink),color-mix(in_srgb,var(--eid-primary-500)_18%,var(--eid-brand-ink)),#0b0f14)] sm:h-36">
                          {unidade.imageUrl ? (
                            <Image src={unidade.imageUrl} alt="" fill unoptimized className="object-cover opacity-80" />
                          ) : null}
                          <div className="absolute inset-0 bg-gradient-to-t from-eid-brand-ink/90 via-eid-brand-ink/35 to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 p-3">
                            <p className="text-sm font-black text-white">{unidade.nome}</p>
                            {unidade.tipo ? <p className="text-[11px] text-white/70">{unidade.tipo}</p> : null}
                          </div>
                        </div>
                        <div className="space-y-3 p-4">
                          {unidade.tags.length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {unidade.tags.map((tag) => (
                                <span key={tag} className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card/70 px-2.5 py-0.5 text-[10px] font-semibold text-eid-text-secondary">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-eid-primary-300">
                            {isMembroAtivo ? "Reservar nesta quadra" : "Virar membro para liberar"}
                            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className={SPACE_SECTION_CARD_CLASS}>
            <div className={SPACE_SECTION_HEAD_CLASS}>
              <h2 className={SPACE_SECTION_TITLE_CLASS}>Contato</h2>
            </div>
            <div className="p-4 sm:p-5">
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
                <div className="mt-4 flex flex-wrap gap-2">
                  {whatsappContato ? (
                    <a
                      href={`https://wa.me/${String(whatsappContato).replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#25D366]/35 bg-[#25D366]/12 text-[#25D366] transition hover:bg-[#25D366]/18"
                      aria-label="Abrir WhatsApp"
                    >
                      <Phone className="h-4 w-4" aria-hidden />
                    </a>
                  ) : null}
                  {instagramUrl ? (
                    <a
                      href={instagramUrl.startsWith("http") ? instagramUrl : `https://instagram.com/${instagramUrl.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 text-eid-primary-300 transition hover:bg-eid-primary-500/18"
                      aria-label="Abrir Instagram"
                    >
                      <Globe className="h-4 w-4" aria-hidden />
                    </a>
                  ) : null}
                  {websiteUrl ? (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 text-eid-fg transition hover:border-eid-primary-500/35 hover:text-eid-primary-300"
                      aria-label="Abrir site oficial"
                    >
                      <MapPin className="h-4 w-4" aria-hidden />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
