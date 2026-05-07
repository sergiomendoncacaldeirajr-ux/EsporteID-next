"use client";

import { useActionState, useTransition, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, MapPin, LayoutGrid, Clock, Calendar,
  Users, CreditCard, CheckCircle2, ChevronRight,
  ChevronLeft, Plus, Trash2, AlertCircle, Loader2,
  Wifi, Sun, Lightbulb, RefreshCw, ExternalLink,
} from "lucide-react";
import {
  salvarModeloEspacoAction,
  salvarPerfilWizardAction,
  criarUnidadeWizardAction,
  removerUnidadeWizardAction,
  salvarGradeWizardAction,
  sincronizarFeriadosWizardAction,
  toggleFeriadoWizardAction,
  criarPlanoWizardAction,
  salvarAsaasWizardAction,
  concluirOnboardingAction,
} from "@/app/espaco/onboarding/actions";

// ── Tipos ──────────────────────────────────────────────────────────────────

type Space = {
  id: number;
  nome_publico: string;
  slug: string | null;
  categoria_mensalidade: string | null;
  modo_reserva: string | null;
  aceita_socios: boolean | null;
  cidade: string | null;
  uf: string | null;
  descricao_curta: string | null;
  descricao_longa: string | null;
  whatsapp_contato: string | null;
  email_contato: string | null;
  website_url: string | null;
  instagram_url: string | null;
};

type Unidade = {
  id: number; nome: string; tipo_unidade: string;
  superficie: string | null; coberta: boolean; indoor: boolean;
  iluminacao: boolean; capacidade: number; aceita_aulas: boolean; aceita_torneios: boolean;
};

type Horario = { id: number; dia_semana: number; hora_inicio: string; hora_fim: string };

type Feriado = {
  id: number; nome: string | null; data_inicio: string; data_fim: string;
  operar_no_feriado: boolean; recorrente_anual: boolean | null;
};

type Plano = { id: number; nome: string; mensalidade_centavos: number };

type Parceiro = {
  nome_razao_social: string | null; cpf_cnpj: string | null;
  email: string | null; onboarding_status: string | null;
} | null;

type WizardProps = {
  space: Space;
  esportes: Array<{ id: number; nome: string }>;
  unidades: Unidade[];
  horarios: Horario[];
  feriados: Feriado[];
  planos: Plano[];
  parceiro: Parceiro;
};

type ActionState = { ok: boolean; message: string } | undefined;

// ── Constantes ─────────────────────────────────────────────────────────────

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DIAS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const CATEGORIAS = [
  { value: "clube", label: "Clube", desc: "Clube esportivo com sócios e mensalidades" },
  { value: "quadra", label: "Quadra / Court", desc: "Espaço com quadras para reserva" },
  { value: "centro_esportivo", label: "Centro Esportivo", desc: "Academia ou centro multiesporte" },
  { value: "condominio", label: "Condomínio", desc: "Área esportiva de uso condominial" },
  { value: "outro", label: "Outro", desc: "Outro tipo de espaço esportivo" },
];

const MODOS_RESERVA = [
  { value: "gratuita", label: "Gratuita", desc: "Sócios reservam sem custo adicional", icon: "🎁" },
  { value: "paga", label: "Paga", desc: "Toda reserva tem valor cobrado", icon: "💳" },
  { value: "mista", label: "Mista", desc: "Parte gratuita para sócios, avulso pago", icon: "⚖️" },
];

const TIPOS_UNIDADE = [
  "quadra", "campo", "pista", "piscina", "sala", "ringue", "outro",
];

const SUPERFICIES = [
  "saibro", "grama_natural", "grama_sintetica", "cimento", "asfalto",
  "madeira", "borracha", "agua", "areia", "outro",
];

function superficieLabel(s: string) {
  const map: Record<string, string> = {
    saibro: "Saibro", grama_natural: "Grama natural", grama_sintetica: "Grama sintética",
    cimento: "Cimento", asfalto: "Asfalto", madeira: "Madeira", borracha: "Borracha",
    agua: "Água", areia: "Areia", outro: "Outro",
  };
  return map[s] ?? s;
}

// ── Componentes auxiliares ─────────────────────────────────────────────────

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <div
      className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
        state.ok
          ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border border-red-500/30 bg-red-500/10 text-red-300"
      }`}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {state.message}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-semibold text-eid-text-secondary">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-4 py-2.5 text-sm text-eid-fg placeholder:text-eid-text-secondary/50 focus:border-eid-primary-500/60 focus:outline-none focus:ring-1 focus:ring-eid-primary-500/40 ${props.className ?? ""}`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full resize-none rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-4 py-2.5 text-sm text-eid-fg placeholder:text-eid-text-secondary/50 focus:border-eid-primary-500/60 focus:outline-none focus:ring-1 focus:ring-eid-primary-500/40 ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-4 py-2.5 text-sm text-eid-fg focus:border-eid-primary-500/60 focus:outline-none focus:ring-1 focus:ring-eid-primary-500/40 ${props.className ?? ""}`}
    />
  );
}

function Toggle({
  label, name, defaultChecked, onChange,
}: { label: string; name: string; defaultChecked?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3.5 py-2.5">
      <span className="text-sm text-eid-fg">{label}</span>
      <input
        type="checkbox" name={name} defaultChecked={defaultChecked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-4 w-4 rounded accent-eid-primary-500"
      />
    </label>
  );
}

// ── Steps ──────────────────────────────────────────────────────────────────

const STEPS = [
  { id: "modelo", label: "Modelo", Icon: Building2 },
  { id: "perfil", label: "Perfil", Icon: MapPin },
  { id: "unidades", label: "Quadras", Icon: LayoutGrid },
  { id: "horarios", label: "Horários", Icon: Clock },
  { id: "feriados", label: "Feriados", Icon: Calendar },
  { id: "planos", label: "Planos", Icon: Users },
  { id: "pagamento", label: "Pagamento", Icon: CreditCard },
  { id: "conclusao", label: "Pronto", Icon: CheckCircle2 },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function ProgressBar({ current, completed }: { current: number; completed: Set<number> }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-0.5">
        {STEPS.map(({ Icon, label }, i) => {
          const done = completed.has(i);
          const active = i === current;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-bold transition-all ${
                  done
                    ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400"
                    : active
                    ? "border-eid-primary-500/60 bg-eid-primary-500/15 text-eid-primary-300"
                    : "border-[color:var(--eid-border-subtle)] bg-eid-surface/40 text-eid-text-secondary/50"
                }`}
              >
                {done ? "✓" : <Icon className="h-3.5 w-3.5" aria-hidden />}
              </span>
              <span
                className={`hidden text-[9.5px] font-semibold sm:block ${
                  active ? "text-eid-primary-300" : done ? "text-emerald-400" : "text-eid-text-secondary/40"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-eid-surface/60">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-eid-primary-500 transition-all duration-500"
          style={{ width: `${((current) / (STEPS.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-bold text-eid-fg sm:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">{subtitle}</p>
    </div>
  );
}

function NavButtons({
  onBack, onNext, onSkip, nextLabel = "Salvar e continuar",
  nextDisabled, pending, skipLabel,
}: {
  onBack?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  pending?: boolean;
  skipLabel?: string;
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <div>
        {onBack && (
          <button
            type="button" onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-eid-text-secondary transition hover:text-eid-fg"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Voltar
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onSkip && (
          <button
            type="button" onClick={onSkip}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-eid-text-secondary transition hover:text-eid-fg"
          >
            {skipLabel ?? "Pular"}
          </button>
        )}
        {onNext && (
          <button
            type="button" onClick={onNext} disabled={nextDisabled || pending}
            className="flex items-center gap-1.5 rounded-xl bg-eid-primary-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-eid-primary-600 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {nextLabel}
            {!pending && <ChevronRight className="h-4 w-4" aria-hidden />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step components ────────────────────────────────────────────────────────

function StepModelo({ space, onNext, onBack }: {
  space: Space; onNext: (data: { modoReserva: string; aceitaSocios: boolean }) => void; onBack?: () => void;
}) {
  const [categoria, setCategoria] = useState(space.categoria_mensalidade ?? "quadra");
  const [modoReserva, setModoReserva] = useState(space.modo_reserva ?? "mista");
  const [aceitaSocios, setAceitaSocios] = useState(space.aceita_socios ?? true);
  const [state, action, pending] = useActionState<ActionState, FormData>(salvarModeloEspacoAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) onNext({ modoReserva, aceitaSocios });
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <input type="hidden" name="espaco_id" value={space.id} />
      <input type="hidden" name="categoria_mensalidade" value={categoria} />
      <input type="hidden" name="modo_reserva" value={modoReserva} />
      <input type="hidden" name="aceita_socios" value={aceitaSocios ? "on" : "off"} />

      <StepHeader title="Como funciona seu espaço?" subtitle="Isso define as regras e funcionalidades disponíveis." />

      <div>
        <Label>Tipo de espaço</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIAS.map(({ value, label, desc }) => (
            <button
              key={value} type="button" onClick={() => setCategoria(value)}
              className={`rounded-xl border p-3 text-left transition ${
                categoria === value
                  ? "border-eid-primary-500/60 bg-eid-primary-500/12 text-eid-fg"
                  : "border-[color:var(--eid-border-subtle)] bg-eid-surface/40 text-eid-text-secondary hover:border-eid-primary-500/30"
              }`}
            >
              <p className={`text-sm font-bold ${categoria === value ? "text-eid-primary-200" : ""}`}>{label}</p>
              <p className="mt-0.5 text-[11px] leading-snug">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Modelo de reserva</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {MODOS_RESERVA.map(({ value, label, desc, icon }) => (
            <button
              key={value} type="button" onClick={() => setModoReserva(value)}
              className={`rounded-xl border p-3 text-left transition ${
                modoReserva === value
                  ? "border-eid-primary-500/60 bg-eid-primary-500/12"
                  : "border-[color:var(--eid-border-subtle)] bg-eid-surface/40 hover:border-eid-primary-500/30"
              }`}
            >
              <span className="text-xl">{icon}</span>
              <p className={`mt-1 text-sm font-bold ${modoReserva === value ? "text-eid-primary-200" : "text-eid-fg"}`}>{label}</p>
              <p className="mt-0.5 text-[11px] text-eid-text-secondary leading-snug">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAceitaSocios(!aceitaSocios)}
        className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
          aceitaSocios ? "border-eid-primary-500/50 bg-eid-primary-500/10" : "border-[color:var(--eid-border-subtle)] bg-eid-surface/40"
        }`}
      >
        <div>
          <p className={`text-sm font-bold ${aceitaSocios ? "text-eid-primary-200" : "text-eid-fg"}`}>Aceita sócios / membros</p>
          <p className="mt-0.5 text-xs text-eid-text-secondary">Habilita planos de associação, filas e benefícios</p>
        </div>
        <span className={`h-6 w-11 shrink-0 rounded-full border-2 transition-all ${aceitaSocios ? "border-eid-primary-500 bg-eid-primary-500" : "border-eid-text-secondary/30 bg-transparent"}`}>
          <span className={`block h-5 w-5 rounded-full bg-white transition-all ${aceitaSocios ? "translate-x-5" : "translate-x-0"}`} />
        </span>
      </button>

      <Feedback state={state} />
      <NavButtons onBack={onBack} onNext={() => formRef.current?.requestSubmit()} pending={pending} />
    </form>
  );
}

function StepPerfil({ space, onNext, onBack }: {
  space: Space; onNext: () => void; onBack?: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(salvarPerfilWizardAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) onNext(); }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <input type="hidden" name="espaco_id" value={space.id} />
      <StepHeader title="Perfil público do espaço" subtitle="Como os atletas vão encontrar e conhecer seu espaço." />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Nome do espaço *</Label>
          <Input name="nome_publico" defaultValue={space.nome_publico} placeholder="Ex.: Arena Tennis Club" required />
        </div>
        <div className="space-y-1.5">
          <Label>Link público (slug)</Label>
          <Input name="slug" defaultValue={space.slug ?? ""} placeholder="arena-tennis-club" />
        </div>
        <div className="space-y-1.5">
          <Label>Cidade</Label>
          <Input name="cidade" defaultValue={space.cidade ?? ""} placeholder="São Paulo" />
        </div>
        <div className="space-y-1.5">
          <Label>Estado (UF)</Label>
          <Select name="uf" defaultValue={space.uf ?? ""}>
            <option value="">Selecione</option>
            {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>WhatsApp de contato</Label>
          <Input name="whatsapp_contato" defaultValue={space.whatsapp_contato ?? ""} placeholder="+55 11 99999-9999" type="tel" />
        </div>
        <div className="space-y-1.5">
          <Label>E-mail de contato</Label>
          <Input name="email_contato" defaultValue={space.email_contato ?? ""} placeholder="contato@espaço.com" type="email" />
        </div>
        <div className="space-y-1.5">
          <Label>Site</Label>
          <Input name="website_url" defaultValue={space.website_url ?? ""} placeholder="https://meuespaco.com.br" type="url" />
        </div>
        <div className="space-y-1.5">
          <Label>Instagram</Label>
          <Input name="instagram_url" defaultValue={space.instagram_url ?? ""} placeholder="@meuespaco" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Descrição curta (máx. 160 caracteres)</Label>
          <Input name="descricao_curta" defaultValue={space.descricao_curta ?? ""} maxLength={160} placeholder="Clube com 8 quadras de tênis e beach tennis no centro da cidade." />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Sobre o espaço (texto completo)</Label>
          <Textarea name="descricao_longa" defaultValue={space.descricao_longa ?? ""} rows={4} placeholder="Descreva sua infraestrutura, diferenciais, história..." />
        </div>
      </div>

      <Feedback state={state} />
      <NavButtons onBack={onBack} onNext={() => formRef.current?.requestSubmit()} pending={pending} />
    </form>
  );
}

function StepUnidades({ space, unidades, onNext, onBack }: {
  space: Space; unidades: Unidade[]; onNext: () => void; onBack?: () => void;
}) {
  const [showForm, setShowForm] = useState(unidades.length === 0);
  const [state, action, pending] = useActionState<ActionState, FormData>(criarUnidadeWizardAction, undefined);
  const [removeState, removeAction] = useActionState<ActionState, FormData>(removerUnidadeWizardAction, undefined);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      setShowForm(false);
      if (formRef.current) formRef.current.reset();
    }
  }, [state]);
  useEffect(() => { if (removeState?.ok) router.refresh(); }, [removeState]);

  return (
    <div className="space-y-5">
      <StepHeader
        title="Quadras e instalações"
        subtitle="Adicione todas as quadras, campos, pistas ou salas disponíveis no seu espaço."
      />

      {/* Lista existente */}
      {unidades.length > 0 && (
        <div className="space-y-2">
          {unidades.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-4 py-3">
              <LayoutGrid className="h-5 w-5 shrink-0 text-eid-primary-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-eid-fg">{u.nome}</p>
                <p className="text-[11px] text-eid-text-secondary capitalize">
                  {u.tipo_unidade}{u.superficie ? ` · ${superficieLabel(u.superficie)}` : ""}
                  {u.coberta ? " · coberta" : ""}
                  {u.iluminacao ? " · iluminada" : ""}
                </p>
              </div>
              <form action={removeAction}>
                <input type="hidden" name="espaco_id" value={space.id} />
                <input type="hidden" name="unidade_id" value={u.id} />
                <button type="submit" className="rounded-lg p-1.5 text-eid-text-secondary/50 transition hover:text-red-400">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {/* Formulário nova unidade */}
      {showForm ? (
        <form ref={formRef} action={action} className="space-y-4 rounded-2xl border border-eid-primary-500/20 bg-eid-primary-500/5 p-4">
          <p className="text-sm font-bold text-eid-fg">Nova quadra / campo</p>
          <input type="hidden" name="espaco_id" value={space.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nome *</Label>
              <Input name="nome" placeholder='Ex.: Quadra 1 — Saibro' required />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select name="tipo_unidade" defaultValue="quadra">
                {TIPOS_UNIDADE.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Superfície</Label>
              <Select name="superficie" defaultValue="">
                <option value="">Não informada</option>
                {SUPERFICIES.map((s) => <option key={s} value={s}>{superficieLabel(s)}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Capacidade (jogadores)</Label>
              <Input name="capacidade" type="number" min={1} max={100} defaultValue={2} />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Toggle label="Coberta" name="coberta" />
            <Toggle label="Indoor" name="indoor" />
            <Toggle label="Iluminação" name="iluminacao" />
            <Toggle label="Aceita aulas" name="aceita_aulas" defaultChecked />
            <Toggle label="Aceita torneios" name="aceita_torneios" />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Input name="observacoes" placeholder="Informações adicionais sobre a unidade" />
          </div>
          <Feedback state={state} />
          <div className="flex gap-2">
            <button
              type="submit" disabled={pending}
              className="flex items-center gap-1.5 rounded-xl bg-eid-primary-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-eid-primary-600 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </button>
            {unidades.length > 0 && (
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-eid-text-secondary hover:text-eid-fg">
                Cancelar
              </button>
            )}
          </div>
        </form>
      ) : (
        <button
          type="button" onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-eid-primary-500/40 bg-eid-primary-500/5 py-4 text-sm font-semibold text-eid-primary-400 transition hover:bg-eid-primary-500/10"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Adicionar outra quadra / campo
        </button>
      )}

      {unidades.length === 0 && (
        <p className="text-center text-xs text-eid-text-secondary">Adicione pelo menos uma unidade antes de continuar.</p>
      )}

      <NavButtons
        onBack={onBack}
        onNext={unidades.length > 0 ? onNext : undefined}
        nextLabel="Continuar"
        nextDisabled={unidades.length === 0}
      />
    </div>
  );
}

function StepHorarios({ space, horarios, onNext, onBack }: {
  space: Space; horarios: Horario[]; onNext: () => void; onBack?: () => void;
}) {
  const existingMap = Object.fromEntries(horarios.map((h) => [h.dia_semana, h]));
  const defaultAbertos = horarios.length > 0
    ? Object.fromEntries(horarios.map((h) => [h.dia_semana, true]))
    : { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true };
  const defaultInicio = Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [i, existingMap[i]?.hora_inicio ?? "08:00"])
  );
  const defaultFim = Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [i, existingMap[i]?.hora_fim ?? "22:00"])
  );

  const [abertos, setAbertos] = useState<Record<number, boolean>>(defaultAbertos as Record<number, boolean>);
  const [inicio, setInicio] = useState<Record<number, string>>(defaultInicio);
  const [fim, setFim] = useState<Record<number, string>>(defaultFim);
  const [state, action, pending] = useActionState<ActionState, FormData>(salvarGradeWizardAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) onNext(); }, [state]);

  const copiarSegsex = () => {
    const [i, f] = [inicio[1] ?? "08:00", fim[1] ?? "22:00"];
    setInicio((p) => ({ ...p, 0: i, 6: i }));
    setFim((p) => ({ ...p, 0: f, 6: f }));
    setAbertos((p) => ({ ...p, 0: true, 6: true }));
  };

  const presetPadrao = () => {
    setAbertos({ 0: false, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true });
    setInicio(Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i, "08:00"])));
    setFim(Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i, "22:00"])));
  };

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <input type="hidden" name="espaco_id" value={space.id} />
      <StepHeader title="Horários de funcionamento" subtitle="Configure quando cada dia da semana estará disponível para reservas." />

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={presetPadrao}
          className="rounded-lg border border-eid-primary-500/30 bg-eid-primary-500/8 px-3 py-1.5 text-xs font-semibold text-eid-primary-300 transition hover:bg-eid-primary-500/15">
          Preset: seg–sáb 08:00–22:00
        </button>
        <button type="button" onClick={copiarSegsex}
          className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs font-semibold text-eid-text-secondary transition hover:text-eid-fg">
          Copiar seg–sex para sáb e dom
        </button>
      </div>

      <div className="space-y-2">
        {Array.from({ length: 7 }, (_, dia) => (
          <div key={dia} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
            abertos[dia] ? "border-eid-primary-500/25 bg-eid-surface/60" : "border-[color:var(--eid-border-subtle)] bg-eid-surface/25 opacity-60"
          }`}>
            <input type="hidden" name={`dia_${dia}_aberto`} value={abertos[dia] ? "on" : "off"} />
            <button
              type="button"
              onClick={() => setAbertos((p) => ({ ...p, [dia]: !p[dia] }))}
              className={`h-5 w-5 rounded border-2 shrink-0 transition-all ${
                abertos[dia] ? "border-eid-primary-500 bg-eid-primary-500" : "border-eid-text-secondary/30 bg-transparent"
              }`}
              aria-label={abertos[dia] ? "Fechar" : "Abrir"}
            />
            <span className={`w-20 shrink-0 text-sm font-semibold ${abertos[dia] ? "text-eid-fg" : "text-eid-text-secondary"}`}>
              {DIAS[dia]}
            </span>
            {abertos[dia] ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="time" name={`dia_${dia}_inicio`}
                  value={inicio[dia] ?? "08:00"}
                  onChange={(e) => setInicio((p) => ({ ...p, [dia]: e.target.value }))}
                  className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-1 text-sm text-eid-fg focus:outline-none focus:ring-1 focus:ring-eid-primary-500/40"
                />
                <span className="text-xs text-eid-text-secondary">até</span>
                <input
                  type="time" name={`dia_${dia}_fim`}
                  value={fim[dia] ?? "22:00"}
                  onChange={(e) => setFim((p) => ({ ...p, [dia]: e.target.value }))}
                  className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-1 text-sm text-eid-fg focus:outline-none focus:ring-1 focus:ring-eid-primary-500/40"
                />
              </div>
            ) : (
              <span className="text-xs text-eid-text-secondary">Fechado</span>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-xs text-amber-300">
        <strong>Dica:</strong> Feriados são configurados na próxima etapa. Estes horários se aplicam a dias normais.
      </div>

      <Feedback state={state} />
      <NavButtons onBack={onBack} onNext={() => formRef.current?.requestSubmit()} pending={pending} />
    </form>
  );
}

function StepFeriados({ space, feriados, onNext, onBack }: {
  space: Space; feriados: Feriado[]; onNext: () => void; onBack?: () => void;
}) {
  const [syncState, syncAction, syncPending] = useActionState<ActionState, FormData>(
    sincronizarFeriadosWizardAction, undefined
  );
  const router = useRouter();
  const [toggling, startToggle] = useTransition();
  useEffect(() => { if (syncState?.ok) router.refresh(); }, [syncState]);

  const handleToggle = (feriadoId: number, operar: boolean) => {
    startToggle(async () => {
      const fd = new FormData();
      fd.set("espaco_id", String(space.id));
      fd.set("feriado_id", String(feriadoId));
      fd.set("operar", String(operar));
      await toggleFeriadoWizardAction(fd);
      router.refresh();
    });
  };

  const formatDate = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <div className="space-y-5">
      <StepHeader
        title="Feriados e datas especiais"
        subtitle="Defina se o espaço abre ou fecha em feriados nacionais e estaduais."
      />

      {/* Sync */}
      <form action={syncAction}>
        <input type="hidden" name="espaco_id" value={space.id} />
        <div className="flex items-start gap-4 rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 p-4">
          <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-eid-primary-400" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-bold text-eid-fg">Sincronizar feriados automaticamente</p>
            <p className="mt-0.5 text-xs text-eid-text-secondary">
              Buscamos feriados nacionais e{space.uf ? ` do estado ${space.uf}` : " estaduais"} via API pública do Brasil.
            </p>
            <button
              type="submit" disabled={syncPending}
              className="mt-3 flex items-center gap-1.5 rounded-xl bg-eid-primary-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-eid-primary-600 disabled:opacity-50"
            >
              {syncPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {feriados.length > 0 ? "Sincronizar novamente" : "Sincronizar feriados"}
            </button>
            <Feedback state={syncState} />
          </div>
        </div>
      </form>

      {/* Lista de feriados */}
      {feriados.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
            {feriados.length} feriado(s) próximos — defina se vai abrir
          </p>
          {feriados.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-eid-fg">{f.nome ?? "Feriado"}</p>
                <p className="text-[11px] text-eid-text-secondary">
                  {f.data_inicio === f.data_fim
                    ? formatDate(f.data_inicio)
                    : `${formatDate(f.data_inicio)} – ${formatDate(f.data_fim)}`}
                  {f.recorrente_anual ? " · anual" : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button" disabled={toggling}
                  onClick={() => handleToggle(f.id, true)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    f.operar_no_feriado ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40" : "bg-eid-surface/60 text-eid-text-secondary hover:text-eid-fg"
                  }`}
                >Abre</button>
                <button
                  type="button" disabled={toggling}
                  onClick={() => handleToggle(f.id, false)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    !f.operar_no_feriado ? "bg-red-500/20 text-red-300 ring-1 ring-red-500/40" : "bg-eid-surface/60 text-eid-text-secondary hover:text-eid-fg"
                  }`}
                >Fecha</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] px-4 py-8 text-center text-sm text-eid-text-secondary">
          Clique em &ldquo;Sincronizar&rdquo; para carregar os feriados do seu estado.
        </div>
      )}

      <NavButtons onBack={onBack} onNext={onNext} nextLabel="Continuar" onSkip={onNext} skipLabel="Pular" />
    </div>
  );
}

function StepPlanos({ space, planos, onNext, onBack, onSkip }: {
  space: Space; planos: Plano[]; onNext: () => void; onBack?: () => void; onSkip?: () => void;
}) {
  const [showForm, setShowForm] = useState(planos.length === 0);
  const [state, action, pending] = useActionState<ActionState, FormData>(criarPlanoWizardAction, undefined);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) { router.refresh(); setShowForm(false); formRef.current?.reset(); }
  }, [state]);

  return (
    <div className="space-y-5">
      <StepHeader
        title="Planos de associação"
        subtitle="Crie os planos disponíveis para sócios. Você pode adicionar mais depois."
      />

      {planos.length > 0 && (
        <div className="space-y-2">
          {planos.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-4 py-3">
              <Users className="h-5 w-5 shrink-0 text-eid-action-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-eid-fg">{p.nome}</p>
                <p className="text-[11px] text-eid-text-secondary">
                  {p.mensalidade_centavos > 0
                    ? `R$ ${(p.mensalidade_centavos / 100).toFixed(2).replace(".", ",")}/mês`
                    : "Gratuito"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <form ref={formRef} action={action} className="space-y-4 rounded-2xl border border-eid-action-500/20 bg-eid-action-500/5 p-4">
          <input type="hidden" name="espaco_id" value={space.id} />
          <p className="text-sm font-bold text-eid-fg">Novo plano</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nome do plano *</Label>
              <Input name="nome" placeholder='Ex.: Sócio Mensal, Plano Anual' required />
            </div>
            <div className="space-y-1.5">
              <Label>Mensalidade (R$)</Label>
              <Input name="mensalidade_reais" type="number" min={0} step="0.01" placeholder="150,00" />
            </div>
            <div className="space-y-1.5">
              <Label>Reservas gratuitas / semana</Label>
              <Input name="reservas_gratis" type="number" min={0} max={30} defaultValue={3} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Descrição</Label>
              <Input name="descricao" placeholder="Benefícios, regras, acesso..." />
            </div>
          </div>
          <Feedback state={state} />
          <div className="flex gap-2">
            <button type="submit" disabled={pending}
              className="flex items-center gap-1.5 rounded-xl bg-eid-action-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-eid-action-600 disabled:opacity-50">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar plano
            </button>
            {planos.length > 0 && (
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-eid-text-secondary hover:text-eid-fg">Cancelar</button>
            )}
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-eid-action-500/40 bg-eid-action-500/5 py-4 text-sm font-semibold text-eid-action-400 transition hover:bg-eid-action-500/10">
          <Plus className="h-4 w-4" aria-hidden />
          Adicionar outro plano
        </button>
      )}

      <NavButtons onBack={onBack} onNext={planos.length > 0 ? onNext : undefined}
        nextLabel="Continuar" onSkip={onSkip} skipLabel="Pular (configurar depois)" />
    </div>
  );
}

function StepPagamento({ space, parceiro, onNext, onBack, onSkip }: {
  space: Space; parceiro: Parceiro; onNext: () => void; onBack?: () => void; onSkip?: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(salvarAsaasWizardAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) onNext(); }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <input type="hidden" name="espaco_id" value={space.id} />
      <StepHeader
        title="Conta de recebimentos (Asaas)"
        subtitle="Para cobrar reservas e mensalidades, precisamos vincular sua conta Asaas."
      />

      <div className="space-y-2 rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 p-4 text-xs text-eid-text-secondary">
        <p className="text-sm font-bold text-eid-fg">Como funciona?</p>
        <p>1. Crie sua conta gratuita no Asaas (gateway BR líder para negócios).</p>
        <p>2. Preencha os dados abaixo para vincular ao EsporteID.</p>
        <p>3. Cobranças são geradas automaticamente via PIX ou cartão.</p>
        <div className="mt-3 flex gap-2">
          <a href="https://www.asaas.com" target="_blank" rel="noreferrer"
            className="flex items-center gap-1 rounded-lg bg-eid-primary-500 px-3 py-2 text-xs font-bold text-white">
            Criar conta <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
          <a href="https://www.asaas.com/painel" target="_blank" rel="noreferrer"
            className="flex items-center gap-1 rounded-lg border border-eid-primary-500/40 bg-eid-primary-500/10 px-3 py-2 text-xs font-bold text-eid-primary-200">
            Já tenho — acessar <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Nome / Razão social *</Label>
          <Input name="nome_razao_social" defaultValue={parceiro?.nome_razao_social ?? ""} placeholder="Seu nome ou nome da empresa" required />
        </div>
        <div className="space-y-1.5">
          <Label>CPF ou CNPJ</Label>
          <Input name="cpf_cnpj" defaultValue={parceiro?.cpf_cnpj ?? ""} placeholder="000.000.000-00" />
        </div>
        <div className="space-y-1.5">
          <Label>E-mail cadastrado no Asaas</Label>
          <Input name="email" defaultValue={parceiro?.email ?? ""} placeholder="email@asaas.com" type="email" />
        </div>
      </div>

      {parceiro?.onboarding_status && (
        <p className="text-xs text-eid-text-secondary">
          Status atual: <span className="font-semibold text-eid-fg">{parceiro.onboarding_status}</span>
        </p>
      )}

      <Feedback state={state} />
      <NavButtons onBack={onBack} onNext={() => formRef.current?.requestSubmit()}
        pending={pending} onSkip={onSkip} skipLabel="Configurar depois" />
    </form>
  );
}

function StepConclusao({ space, unidades, horarios, planos, parceiro }: {
  space: Space; unidades: Unidade[]; horarios: Horario[];
  planos: Plano[]; parceiro: Parceiro;
}) {
  const [isPending, start] = useTransition();
  const itens = [
    { done: !!space.modo_reserva, label: "Modelo de operação configurado" },
    { done: !!space.cidade, label: "Perfil público preenchido" },
    { done: unidades.length > 0, label: `${unidades.length} quadra(s) / campo(s) cadastrada(s)` },
    { done: horarios.length > 0, label: "Horários de funcionamento definidos" },
    { done: !!parceiro?.nome_razao_social || space.modo_reserva === "gratuita", label: "Conta de recebimentos" },
    { done: !space.aceita_socios || planos.length > 0, label: "Plano(s) de associação" },
  ];

  return (
    <div className="space-y-6">
      <StepHeader title="Seu espaço está pronto! 🎉" subtitle="Revise o que foi configurado e publique seu espaço." />

      <div className="space-y-2">
        {itens.map((item, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-4 py-3">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              item.done ? "bg-emerald-500/20 text-emerald-400" : "bg-eid-surface/60 text-eid-text-secondary/40"
            }`}>
              {item.done ? "✓" : "—"}
            </span>
            <span className={`text-sm font-semibold ${item.done ? "text-eid-fg" : "text-eid-text-secondary/60"}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 p-4 text-sm text-eid-text-secondary">
        Você pode ajustar qualquer configuração a qualquer momento pelo painel. Após publicar, os atletas poderão encontrar e reservar seu espaço.
      </div>

      <button
        type="button" disabled={isPending}
        onClick={() => start(async () => { await concluirOnboardingAction(space.id); })}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-eid-primary-500 px-6 py-4 text-base font-bold text-white shadow-[0_8px_24px_-8px_rgba(37,99,235,0.6)] transition hover:bg-eid-primary-600 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
        Publicar meu espaço e ir ao painel
      </button>
    </div>
  );
}

// ── Wizard principal ───────────────────────────────────────────────────────

export function EspacoOnboardingWizard({
  space, esportes, unidades, horarios, feriados, planos, parceiro,
}: WizardProps) {
  const storageKey = `eid:onboarding-step-${space.id}`;
  const [step, setStep] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Math.min(Number(localStorage.getItem(storageKey) ?? "0"), STEPS.length - 1);
  });
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [modoReserva, setModoReserva] = useState(space.modo_reserva ?? "mista");
  const [aceitaSocios, setAceitaSocios] = useState(space.aceita_socios ?? true);

  const skipPlanos = !aceitaSocios;
  const skipPagamento = modoReserva === "gratuita" && !aceitaSocios;

  useEffect(() => {
    localStorage.setItem(storageKey, String(step));
  }, [step, storageKey]);

  const advance = () => {
    setCompleted((prev) => new Set([...prev, step]));
    setStep((s) => {
      let next = s + 1;
      if (next === 5 && skipPlanos) next = 6;
      if (next === 6 && skipPagamento) next = 7;
      return Math.min(next, STEPS.length - 1);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((s) => {
      let prev = s - 1;
      if (prev === 6 && skipPagamento) prev = 5;
      if (prev === 5 && skipPlanos) prev = 4;
      return Math.max(prev, 0);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-6">
        <ProgressBar current={step} completed={completed} />
        <div className="min-h-[420px]">
          {step === 0 && (
            <StepModelo
              space={{ ...space, modo_reserva: modoReserva, aceita_socios: aceitaSocios }}
              onNext={({ modoReserva: mr, aceitaSocios: as }) => {
                setModoReserva(mr);
                setAceitaSocios(as);
                advance();
              }}
            />
          )}
          {step === 1 && (
            <StepPerfil space={space} onNext={advance} onBack={goBack} />
          )}
          {step === 2 && (
            <StepUnidades space={space} unidades={unidades} onNext={advance} onBack={goBack} />
          )}
          {step === 3 && (
            <StepHorarios space={space} horarios={horarios} onNext={advance} onBack={goBack} />
          )}
          {step === 4 && (
            <StepFeriados space={space} feriados={feriados} onNext={advance} onBack={goBack} />
          )}
          {step === 5 && !skipPlanos && (
            <StepPlanos space={space} planos={planos} onNext={advance} onBack={goBack} onSkip={advance} />
          )}
          {step === 6 && !skipPagamento && (
            <StepPagamento space={space} parceiro={parceiro} onNext={advance} onBack={goBack} onSkip={advance} />
          )}
          {step === 7 && (
            <StepConclusao
              space={{ ...space, modo_reserva: modoReserva, aceita_socios: aceitaSocios }}
              unidades={unidades} horarios={horarios} planos={planos} parceiro={parceiro}
            />
          )}
        </div>
      </div>
    </div>
  );
}
