import Link from "next/link";
import type { ReactNode } from "react";
import { Banknote, CalendarDays, CheckCircle2, DoorOpen, Dumbbell, ImageIcon, LayoutGrid, ListChecks, Pencil, ShieldCheck, Tag, Users } from "lucide-react";
import {
  alternarAtivoUnidadeEspacoAction,
  atualizarPlanoSocioEspacoAction,
  atualizarUnidadeEspacoAction,
  criarPlanoSocioEspacoAction,
  criarUnidadeEspacoAction,
} from "@/app/espaco/actions";
import { EspacoConfigForm } from "@/components/espaco/espaco-config-form";
import { EspacoOperadoresPermissoes } from "@/components/espaco/espaco-operadores-permissoes";
import { EspacoUnidadeLogoControl } from "@/components/espaco/espaco-unidade-logo-control";
import { getPaaSUnidadeGateInfo } from "@/lib/espacos/paas-unidades-gate";
import { getEspacoSelecionado } from "@/lib/espacos/server";

type Props = {
  searchParams?: Promise<{ espaco?: string }>;
};

function moedaCentavos(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((Number(value ?? 0) || 0) / 100);
}

const TIPO_UNIDADE_OPTIONS = [
  ["quadra", "Quadra"],
  ["campo", "Campo"],
  ["sala", "Sala"],
  ["pista", "Pista"],
  ["arena", "Arena"],
] as const;

const SUPERFICIE_OPTIONS = [
  ["", "Não informar"],
  ["areia", "Areia"],
  ["saibro", "Saibro"],
  ["sintetico", "Sintético"],
  ["cimento", "Cimento"],
  ["madeira", "Madeira"],
  ["emborrachado", "Emborrachado"],
] as const;

const STATUS_OPERACAO_OPTIONS = [
  ["ativa", "Ativa"],
  ["manutencao", "Manutenção"],
  ["reservada", "Reservada"],
] as const;

const SIM_NAO_OPTIONS = [
  ["sim", "Sim"],
  ["nao", "Não"],
] as const;

function ChoiceGroup({
  name,
  value,
  options,
  className = "",
}: {
  name: string;
  value: string;
  options: readonly (readonly [string, string])[];
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-2 gap-2 min-[420px]:flex min-[420px]:flex-wrap ${className}`}>
      {options.map(([optionValue, label]) => (
        <label key={optionValue || "empty"} className="cursor-pointer">
          <input type="radio" name={name} value={optionValue} defaultChecked={value === optionValue} className="peer sr-only" />
          <span className="inline-flex min-h-9 w-full items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2 text-xs font-semibold text-eid-text-secondary transition peer-checked:border-eid-primary-500/65 peer-checked:bg-eid-primary-500/15 peer-checked:text-eid-fg min-[420px]:w-auto">
            {label}
          </span>
        </label>
      ))}
    </div>
  );
}

function FieldChoice({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-eid-text-secondary">{label}</p>
      {children}
    </div>
  );
}

function planoHerdaRegra(plano: { beneficios_json?: unknown }, key: string) {
  const beneficios = plano.beneficios_json;
  if (!beneficios || typeof beneficios !== "object" || Array.isArray(beneficios)) return false;
  const herdar = (beneficios as Record<string, unknown>).herdar_regras_globais;
  return Boolean(
    herdar &&
      typeof herdar === "object" &&
      !Array.isArray(herdar) &&
      (herdar as Record<string, unknown>)[key] === true
  );
}

function planoBeneficiosTexto(plano: { beneficios_json?: unknown }) {
  const beneficios = plano.beneficios_json;
  if (!beneficios || typeof beneficios !== "object" || Array.isArray(beneficios)) return "";
  const record = beneficios as Record<string, unknown>;
  return typeof record.itens_beneficios === "string" ? record.itens_beneficios : "";
}

function planoUmaReservaAtiva(plano: { beneficios_json?: unknown }) {
  const beneficios = plano.beneficios_json;
  if (!beneficios || typeof beneficios !== "object" || Array.isArray(beneficios)) return false;
  return Boolean((beneficios as Record<string, unknown>).uma_reserva_ativa_por_vez);
}

function horarioCurto(value: string | null | undefined) {
  return String(value ?? "").slice(0, 5);
}

function dataBr(value: string | null | undefined) {
  if (!value) return null;
  const [ano, mes, dia] = String(value).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return String(value);
  return `${dia}/${mes}/${ano}`;
}

function SettingsSection({
  Icon,
  title,
  description,
  meta,
  children,
  defaultOpen = false,
}: {
  Icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
  meta?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-4 transition hover:bg-eid-surface/45 sm:p-5 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 gap-3">
          {Icon ? (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/10 text-eid-primary-300">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          <span className="min-w-0">
          <span className="block text-base font-black text-eid-fg">{title}</span>
          <span className="mt-1 block text-sm leading-relaxed text-eid-text-secondary">{description}</span>
          {meta ? <span className="mt-2 block text-xs font-semibold text-eid-primary-300">{meta}</span> : null}
          </span>
        </span>
        <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 text-lg font-black text-eid-fg transition group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="border-t border-[color:var(--eid-border-subtle)] p-4 sm:p-5">{children}</div>
    </details>
  );
}

export default async function EspacoConfiguracaoPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const espacoId = Number(sp.espaco ?? 0) || null;
  const { supabase, selectedSpace } = await getEspacoSelecionado({
    nextPath: "/espaco/configuracao",
    espacoId,
  });

  const [{ data: unidades }, { data: planos }, { data: horariosOperadores }, unidadeGate] = await Promise.all([
    supabase
      .from("espaco_unidades")
      .select(
        "id, nome, tipo_unidade, status_operacao, superficie, ativo, logo_arquivo, modalidade, observacoes, coberta, indoor, iluminacao, capacidade, aceita_aulas, aceita_torneios"
      )
      .eq("espaco_generico_id", selectedSpace.id)
      .order("ordem", { ascending: true }),
    supabase
      .from("espaco_planos_socio")
      .select("id, nome, descricao, mensalidade_centavos, taxa_adesao_centavos, ativo, reservas_gratuitas_semana, limite_reservas_semana, cooldown_horas, antecedencia_max_dias, percentual_desconto_avulso, beneficios_json")
      .eq("espaco_generico_id", selectedSpace.id)
      .order("ordem", { ascending: true }),
    supabase
      .from("espaco_horarios_semanais")
      .select("id, espaco_unidade_id, dia_semana, hora_inicio, hora_fim, ativo, observacoes, liberar_professor, liberar_torneio, liberar_para_usuario_id, vigencia_inicio, vigencia_fim")
      .eq("espaco_generico_id", selectedSpace.id)
      .or("liberar_professor.eq.true,liberar_torneio.eq.true,liberar_para_usuario_id.not.is.null")
      .order("dia_semana", { ascending: true })
      .order("hora_inicio", { ascending: true }),
    getPaaSUnidadeGateInfo(supabase, selectedSpace.id),
  ]);

  const operadorIds = Array.from(
    new Set((horariosOperadores ?? []).map((item) => item.liberar_para_usuario_id).filter(Boolean).map(String))
  );
  const { data: operadorProfiles } = operadorIds.length
    ? await supabase.from("profiles").select("id, nome, username").in("id", operadorIds)
    : { data: [] };
  const operadorProfileMap = new Map(
    (operadorProfiles ?? []).map((profile) => [
      String(profile.id),
      {
        nome: profile.nome?.trim() || profile.username || "Perfil",
        handle: profile.username ? `@${profile.username}` : null,
      },
    ])
  );
  const unidadeNomeMap = new Map((unidades ?? []).map((unidade) => [Number(unidade.id), unidade.nome ?? `Unidade ${unidade.id}`]));
  const permissoesOperadores = (horariosOperadores ?? [])
    .filter((item) => item.liberar_para_usuario_id)
    .map((item) => {
      const usuarioId = item.liberar_para_usuario_id ? String(item.liberar_para_usuario_id) : null;
      const perfil = usuarioId ? operadorProfileMap.get(usuarioId) : null;
      return {
        id: Number(item.id),
        tipo: item.liberar_professor ? ("professor" as const) : ("organizador" as const),
        ativo: Boolean(item.ativo),
        usuarioId,
        usuarioNome: perfil?.nome ?? "Perfil não encontrado",
        usuarioHandle: perfil?.handle ?? null,
        unidadeId: item.espaco_unidade_id ? Number(item.espaco_unidade_id) : null,
        unidadeNome: item.espaco_unidade_id ? unidadeNomeMap.get(Number(item.espaco_unidade_id)) ?? "Unidade" : "Todas as unidades",
        diaSemana: Number(item.dia_semana ?? 0),
        horaInicio: horarioCurto(item.hora_inicio),
        horaFim: horarioCurto(item.hora_fim),
        vigenciaInicioIso: item.vigencia_inicio ? String(item.vigencia_inicio).slice(0, 10) : null,
        vigenciaFimIso: item.vigencia_fim ? String(item.vigencia_fim).slice(0, 10) : null,
        vigenciaInicio: dataBr(item.vigencia_inicio),
        vigenciaFim: dataBr(item.vigencia_fim),
        observacoes: item.observacoes ?? null,
      };
    });

  const modoReserva = selectedSpace.modo_reserva ?? "mista";
  const monetPaaS = selectedSpace.modo_monetizacao === "mensalidade_plataforma";
  const limiteTxt =
    unidadeGate.maxUnidadesPlano != null
      ? `${unidadeGate.unidadesTotal} / ${unidadeGate.maxUnidadesPlano} unidades no plano`
      : `${unidadeGate.unidadesTotal} unidade(s)`;

  return (
    <div data-eid-espaco-settings className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-eid-fg">Configuração do espaço</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Abra uma categoria por vez para ajustar presença pública, regras, quadras e mensalidades.
        </p>
      </div>

      <SettingsSection
        defaultOpen
        Icon={ListChecks}
        title="Dados, regras e valores"
        description="Cards separados para perfil público, contatos, preço de reserva, regras e cancelamento."
        meta={`Modo atual: ${modoReserva}`}
      >
          <EspacoConfigForm
            modoReserva={modoReserva}
            espaco={{
              id: selectedSpace.id,
              nome_publico: selectedSpace.nome_publico,
              slug: selectedSpace.slug,
              cidade: selectedSpace.cidade ?? null,
              uf: selectedSpace.uf ?? null,
              localizacao: selectedSpace.localizacao ?? null,
              cover_arquivo: selectedSpace.cover_arquivo ?? null,
              whatsapp_contato: selectedSpace.whatsapp_contato ?? null,
              email_contato: selectedSpace.email_contato ?? null,
              website_url: selectedSpace.website_url ?? null,
              instagram_url: selectedSpace.instagram_url ?? null,
              descricao_curta: selectedSpace.descricao_curta ?? null,
              descricao_longa: selectedSpace.descricao_longa ?? null,
              aceita_socios: selectedSpace.aceita_socios ?? false,
              permite_professores_aprovados: selectedSpace.permite_professores_aprovados ?? true,
              configuracao_reservas_json: selectedSpace.configuracao_reservas_json,
              associacao_regra_json: selectedSpace.associacao_regra_json,
            }}
          />
      </SettingsSection>

      <SettingsSection
        Icon={LayoutGrid}
        title="Quadras e unidades"
        description="Cadastre quadras ou salas, edite foto, características, uso e status."
        meta={limiteTxt}
      >
        {monetPaaS ? (
          <p className="text-xs text-eid-text-secondary">
            Plano PaaS: <span className="font-semibold text-eid-fg">{unidadeGate.planoNome ?? "não selecionado"}</span> ·{" "}
            {limiteTxt}
            {unidadeGate.maxUnidadesPlano != null ? (
              <span className="block pt-1 text-[11px]">
                Limite do plano atual: até {unidadeGate.maxUnidadesPlano} quadra(s) ou unidade(s) cadastradas.
              </span>
            ) : unidadeGate.planoMensalId ? (
              <span className="block pt-1 text-[11px]">Plano sem teto fixo de unidades (faixa superior aberta).</span>
            ) : null}
          </p>
        ) : null}
        {!unidadeGate.podeCriarUnidade && unidadeGate.motivoBloqueio ? (
          <div className="mt-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            <p>{unidadeGate.motivoBloqueio}</p>
            <Link href="/espaco/financeiro" className="mt-2 inline-block text-xs font-bold text-amber-200 underline">
              Abrir financeiro e planos
            </Link>
          </div>
        ) : null}

        <div className="mt-4 space-y-6">
          {(unidades ?? []).map((u) => {
            const sim = (v: boolean) => (v ? "sim" : "nao");
            return (
              <details
                key={u.id}
                className="group overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 transition hover:bg-eid-surface/60 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                      <span className="block text-sm font-black text-eid-fg">{u.nome}</span>
                      <span className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-eid-text-secondary">
                      <span className="inline-flex items-center gap-1"><LayoutGrid className="h-3 w-3" aria-hidden />{u.tipo_unidade ?? "Unidade"}</span>
                      {u.superficie ? <span>· {u.superficie}</span> : null}
                      <span className="inline-flex items-center gap-1">· <DoorOpen className="h-3 w-3" aria-hidden />{u.status_operacao ?? "ativa"}</span>
                      <span className="inline-flex items-center gap-1">· <ImageIcon className="h-3 w-3" aria-hidden />{u.logo_arquivo ? "foto" : "sem foto"}</span>
                    </span>
                  </span>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card/70 text-base font-black text-eid-fg transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="border-t border-[color:var(--eid-border-subtle)] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <form
                    id={`unidade-form-${u.id}`}
                    action={atualizarUnidadeEspacoAction}
                    encType="multipart/form-data"
                    className="min-w-0 flex-1 space-y-4"
                  >
                    <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                    <input type="hidden" name="unidade_id" value={u.id} />
                    <input type="hidden" name="capacidade" value={u.capacidade ?? 2} />
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                      <label className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                        Nome da unidade
                        <input name="nome" defaultValue={u.nome} className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm" />
                      </label>
                      <EspacoUnidadeLogoControl currentUrl={u.logo_arquivo ?? null} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FieldChoice label="Tipo">
                        <ChoiceGroup name="tipo_unidade" value={u.tipo_unidade ?? "quadra"} options={TIPO_UNIDADE_OPTIONS} />
                      </FieldChoice>
                      <FieldChoice label="Superfície">
                        <ChoiceGroup name="superficie" value={u.superficie ?? ""} options={SUPERFICIE_OPTIONS} />
                      </FieldChoice>
                    </div>
                    <input
                      name="modalidade"
                      defaultValue={u.modalidade ?? ""}
                      placeholder="Modalidade (opcional)"
                      className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FieldChoice label="Status">
                        <ChoiceGroup name="status_operacao" value={u.status_operacao ?? "ativa"} options={STATUS_OPERACAO_OPTIONS} />
                      </FieldChoice>
                    </div>
                    <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                      <FieldChoice label="Coberta">
                        <ChoiceGroup name="coberta" value={sim(Boolean(u.coberta))} options={SIM_NAO_OPTIONS} />
                      </FieldChoice>
                      <FieldChoice label="Indoor">
                        <ChoiceGroup name="indoor" value={sim(Boolean(u.indoor))} options={SIM_NAO_OPTIONS} />
                      </FieldChoice>
                      <FieldChoice label="Iluminação">
                        <ChoiceGroup name="iluminacao" value={sim(Boolean(u.iluminacao))} options={SIM_NAO_OPTIONS} />
                      </FieldChoice>
                      <FieldChoice label="Aceita aulas">
                        <ChoiceGroup name="aceita_aulas" value={sim(Boolean(u.aceita_aulas))} options={SIM_NAO_OPTIONS} />
                      </FieldChoice>
                      <FieldChoice label="Aceita torneios">
                        <ChoiceGroup name="aceita_torneios" value={sim(Boolean(u.aceita_torneios))} options={SIM_NAO_OPTIONS} />
                      </FieldChoice>
                    </div>
                    <textarea
                      name="observacoes"
                      rows={2}
                      defaultValue={u.observacoes ?? ""}
                      placeholder="Observações internas"
                      className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
                    />
                  </form>
                  <form id={`unidade-toggle-${u.id}`} action={alternarAtivoUnidadeEspacoAction} className="hidden">
                    <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                    <input type="hidden" name="unidade_id" value={u.id} />
                  </form>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    form={`unidade-form-${u.id}`}
                    type="submit"
                    className="rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/15 px-4 py-3 text-xs font-bold text-eid-primary-200"
                  >
                    Salvar alterações
                  </button>
                  <button
                    form={`unidade-toggle-${u.id}`}
                    type="submit"
                    className="rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-3 text-xs font-bold text-eid-fg"
                  >
                    {u.ativo ? "Desativar" : "Reativar"}
                  </button>
                </div>
                </div>
              </details>
            );
          })}
        </div>

        <form
          action={criarUnidadeEspacoAction}
          encType="multipart/form-data"
          className="mt-6 grid gap-3 border-t border-[color:var(--eid-border-subtle)] pt-6"
        >
          <input type="hidden" name="espaco_id" value={selectedSpace.id} />
          <p className="text-sm font-semibold text-eid-fg">Nova unidade</p>
          {!unidadeGate.podeCriarUnidade ? (
            <p className="text-xs text-eid-text-secondary">
              Criação bloqueada pelas regras acima. Ajuste plano ou pagamento em Financeiro.
            </p>
          ) : null}
          <fieldset disabled={!unidadeGate.podeCriarUnidade} className="grid gap-3">
            <input name="nome" placeholder="Nome da unidade" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <div className="grid gap-2 sm:grid-cols-2">
              <FieldChoice label="Tipo">
                <ChoiceGroup name="tipo_unidade" value="quadra" options={TIPO_UNIDADE_OPTIONS} />
              </FieldChoice>
              <FieldChoice label="Superfície">
                <ChoiceGroup name="superficie" value="" options={SUPERFICIE_OPTIONS} />
              </FieldChoice>
            </div>
            <input name="modalidade" placeholder="Modalidade (opcional)" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <input type="hidden" name="capacidade" value={2} />
            <textarea
              name="observacoes"
              rows={2}
              placeholder="Observações"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
            />
            <EspacoUnidadeLogoControl currentUrl={null} />
            <div className="grid gap-2 sm:grid-cols-2">
              <FieldChoice label="Status">
                <ChoiceGroup name="status_operacao" value="ativa" options={STATUS_OPERACAO_OPTIONS} />
              </FieldChoice>
            </div>
            <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
              <FieldChoice label="Coberta">
                <ChoiceGroup name="coberta" value="nao" options={SIM_NAO_OPTIONS} />
              </FieldChoice>
              <FieldChoice label="Indoor">
                <ChoiceGroup name="indoor" value="nao" options={SIM_NAO_OPTIONS} />
              </FieldChoice>
              <FieldChoice label="Iluminação">
                <ChoiceGroup name="iluminacao" value="sim" options={SIM_NAO_OPTIONS} />
              </FieldChoice>
              <FieldChoice label="Aceita aulas">
                <ChoiceGroup name="aceita_aulas" value="sim" options={SIM_NAO_OPTIONS} />
              </FieldChoice>
              <FieldChoice label="Aceita torneios">
                <ChoiceGroup name="aceita_torneios" value="sim" options={SIM_NAO_OPTIONS} />
              </FieldChoice>
            </div>
            <button type="submit" className="eid-btn-primary rounded-xl px-4 py-3 text-sm font-bold">
              Criar unidade
            </button>
          </fieldset>
        </form>
      </SettingsSection>

      <SettingsSection
        Icon={ShieldCheck}
        title="Professores e organizadores"
        description="Libere perfis específicos para aulas ou torneios com quadra, dia, horário e regras próprias."
        meta={`${permissoesOperadores.filter((item) => item.ativo).length} permissão(ões) ativa(s)`}
      >
        <EspacoOperadoresPermissoes
          espacoId={selectedSpace.id}
          unidades={(unidades ?? []).map((unidade) => ({ id: Number(unidade.id), nome: unidade.nome ?? null }))}
          permissoes={permissoesOperadores}
        />
      </SettingsSection>

      <SettingsSection
        title="Planos de sócio"
        Icon={Users}
        description="Valores, benefícios e regras de mensalidade dos membros do espaço."
        meta={`${(planos ?? []).length} plano(s) cadastrado(s)`}
      >
        <p className="text-xs text-eid-text-secondary">
          Clube de assinaturas entre sócios:{" "}
          <span className="font-semibold text-eid-fg">{selectedSpace.clube_assinaturas_socios ?? "em_breve"}</span>.
          Esse módulo está em preparação e será liberado gradualmente.
        </p>
        <form action={criarPlanoSocioEspacoAction} className="mt-4 grid gap-3">
          <input type="hidden" name="espaco_id" value={selectedSpace.id} />
          <input name="nome" placeholder="Ex.: Ouro" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
          <textarea
            name="descricao"
            rows={2}
            placeholder="Resumo dos benefícios"
            className="eid-input-dark rounded-xl px-3 py-2 text-sm"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input type="number" name="mensalidade_reais" min={0} step="0.01" placeholder="Mensalidade (R$)" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            <input type="number" name="taxa_adesao_reais" min={0} step="0.01" placeholder="Taxa de adesão (R$)" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
          </div>
          <textarea
            name="itens_beneficios"
            rows={3}
            placeholder="Benefícios extras: bolinhas, rifas, descontos em aulas, brindes..."
            className="eid-input-dark rounded-xl px-3 py-2 text-sm"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="number"
              name="reservas_gratuitas_semana"
              min={0}
              max={999}
              placeholder="Reservas grátis/semana (vazio = global; 0 = livre)"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.01"
              name="percentual_desconto_avulso"
              placeholder="Desconto avulso (%)"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              type="number"
              min={0}
              name="limite_reservas_semana"
              placeholder="Marcações/semana (vazio = global; 0 = livre)"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              max={720}
              name="cooldown_horas"
              placeholder="Intervalo entre marcações (vazio = global)"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              max={365}
              name="antecedencia_max_dias"
              placeholder="Libera agenda em dias (vazio = global)"
              className="eid-input-dark rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3 text-sm text-eid-fg">
            <input type="checkbox" name="uma_reserva_ativa_por_vez" className="mt-1 h-4 w-4 accent-eid-action-500" />
            <span>
              <span className="block font-semibold">1 marcação ativa por vez</span>
              <span className="block text-xs text-eid-text-secondary">
                O sócio só consegue marcar a próxima depois de cancelar ou finalizar a atual.
              </span>
            </span>
          </label>
          <button className="rounded-xl border border-eid-action-500/35 bg-eid-action-500/10 px-4 py-3 text-sm font-bold text-eid-action-400">
            Criar plano
          </button>
        </form>
        <div className="mt-4 space-y-2">
          {(planos ?? []).map((plano) => (
            <details
              key={plano.id}
              className="group overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 transition hover:bg-eid-surface/65 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-eid-action-500/30 bg-eid-action-500/10 text-eid-action-400">
                    <Banknote className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-black text-eid-fg">
                      {plano.nome}
                      {plano.ativo ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200"><CheckCircle2 className="h-3 w-3" aria-hidden />Ativo</span> : null}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-2 text-[11px] text-eid-text-secondary">
                      <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" aria-hidden />{moedaCentavos(plano.mensalidade_centavos)}/mês</span>
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" aria-hidden />{planoHerdaRegra(plano, "reservas_gratuitas_semana") ? "grátis global" : `${Number(plano.reservas_gratuitas_semana ?? 0)} grátis/semana`}</span>
                      {planoUmaReservaAtiva(plano) ? <span className="inline-flex items-center gap-1"><Dumbbell className="h-3 w-3" aria-hidden />1 ativa por vez</span> : null}
                    </span>
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[color:var(--eid-border-subtle)] px-2 py-1 text-[11px] font-bold text-eid-primary-300">
                  <Pencil className="h-3 w-3" aria-hidden />Editar
                </span>
              </summary>
              <form action={atualizarPlanoSocioEspacoAction} className="border-t border-[color:var(--eid-border-subtle)] p-3">
                <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                <input type="hidden" name="plano_id" value={plano.id} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input name="nome" defaultValue={plano.nome} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                  <input type="number" name="mensalidade_reais" min={0} step="0.01" defaultValue={(Number(plano.mensalidade_centavos ?? 0) / 100).toFixed(2)} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                  <input type="number" name="taxa_adesao_reais" min={0} step="0.01" defaultValue={(Number(plano.taxa_adesao_centavos ?? 0) / 100).toFixed(2)} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                  <input type="number" step="0.01" name="percentual_desconto_avulso" defaultValue={Number(plano.percentual_desconto_avulso ?? 0)} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                </div>
                <textarea name="descricao" rows={2} defaultValue={plano.descricao ?? ""} className="eid-input-dark mt-2 w-full rounded-xl px-3 py-2 text-sm" placeholder="Resumo do plano" />
                <textarea name="itens_beneficios" rows={2} defaultValue={planoBeneficiosTexto(plano)} className="eid-input-dark mt-2 w-full rounded-xl px-3 py-2 text-sm" placeholder="Benefícios extras" />
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input type="number" min={0} name="reservas_gratuitas_semana" defaultValue={planoHerdaRegra(plano, "reservas_gratuitas_semana") ? "" : Number(plano.reservas_gratuitas_semana ?? 0)} placeholder="Grátis/semana" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                  <input type="number" min={0} name="limite_reservas_semana" defaultValue={planoHerdaRegra(plano, "limite_reservas_semana") ? "" : Number(plano.limite_reservas_semana ?? 0)} placeholder="Limite/semana" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                  <input type="number" min={0} name="antecedencia_max_dias" defaultValue={planoHerdaRegra(plano, "antecedencia_max_dias") ? "" : Number(plano.antecedencia_max_dias ?? 0)} placeholder="Agenda em dias" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-eid-fg"><input type="checkbox" name="uma_reserva_ativa_por_vez" defaultChecked={planoUmaReservaAtiva(plano)} />1 ativa por vez</label>
                  <label className="flex items-center gap-2 text-xs text-eid-fg"><input type="checkbox" name="ativo" defaultChecked={Boolean(plano.ativo)} />Ativo</label>
                  <button className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 py-2 text-xs font-bold text-eid-primary-300">Salvar plano</button>
                </div>
              </form>
            </details>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}
