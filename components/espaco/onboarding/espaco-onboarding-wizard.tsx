"use client";

import dynamic from "next/dynamic";
import { useActionState, useTransition, useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Country, Value } from "react-phone-number-input";
import type { LucideIcon } from "lucide-react";
import {
  Building2, MapPin, LayoutGrid, Clock, Calendar,
  Users, CreditCard, CheckCircle2, ChevronRight,
  ChevronLeft, Plus, Trash2, AlertCircle, Loader2,
  Lightbulb, RefreshCw, ExternalLink,
  AtSign, BadgeCheck, Banknote, FileText, Globe2,
  Hash, IdCard, Mail, MessageSquareText, Phone,
  Camera, ImageIcon, ShieldCheck, Sparkles, Type, Wallet,
  Crown, ArrowUpRight,
} from "lucide-react";
import { EID_PHONE_LABELS } from "@/lib/eid-phone-labels";
import { EspacoUnidadeLogoControl } from "@/components/espaco/espaco-unidade-logo-control";
import { TeamShieldControl } from "@/components/perfil/team-shield-control";
import {
  descricaoFaixaUnidadesPaaS,
  detalheValorESociosPlanoPaaS,
  inferirNivelPlanoPaaS,
  perfilComercialPlanoPaaS,
} from "@/lib/espacos/plano-mensal-catalogo";
import type { PaaSUnidadeGateInfo } from "@/lib/espacos/paas-unidades-gate";
import {
  salvarModeloEspacoAction,
  salvarPerfilWizardAction,
  criarUnidadeWizardAction,
  atualizarFotoUnidadeWizardAction,
  removerUnidadeWizardAction,
  escolherPlanoPlataformaWizardAction,
  salvarGradeWizardAction,
  sincronizarFeriadosWizardAction,
  toggleFeriadoWizardAction,
  criarPlanoWizardAction,
  salvarAsaasWizardAction,
  concluirOnboardingAction,
} from "@/app/espaco/onboarding/actions";
import "react-phone-number-input/style.css";
import "@/app/cadastro/cadastro-register.css";

const PhoneInput = dynamic(() => import("react-phone-number-input"), {
  ssr: false,
});

// ── Tipos ──────────────────────────────────────────────────────────────────

type Space = {
  id: number;
  nome_publico: string;
  slug: string | null;
  categoria_mensalidade: string | null;
  modo_reserva: string | null;
  aceita_socios: boolean | null;
  logo_arquivo: string | null;
  cover_arquivo: string | null;
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
  iluminacao: boolean; aceita_aulas: boolean; aceita_torneios: boolean;
  logo_arquivo: string | null;
};

type Horario = { id: number; dia_semana: number; hora_inicio: string; hora_fim: string };

type Feriado = {
  id: number; nome: string | null; data_inicio: string; data_fim: string;
  operar_no_feriado: boolean; recorrente_anual: boolean | null;
};

type Plano = { id: number; nome: string; mensalidade_centavos: number };

type PlanoPaaS = {
  id: number;
  nome: string;
  min_unidades: number;
  max_unidades: number | null;
  valor_mensal_centavos: number;
  socios_mensal_modo: string | null;
};

type Parceiro = {
  nome_razao_social: string | null; cpf_cnpj: string | null;
  email: string | null; onboarding_status: string | null;
} | null;

type WizardProps = {
  space: Space;
  esportes: Array<{ id: number; nome: string }>;
  unidades: Unidade[];
  unidadeGate: PaaSUnidadeGateInfo;
  planosPaaS: PlanoPaaS[];
  horarios: Horario[];
  feriados: Feriado[];
  planos: Plano[];
  parceiro: Parceiro;
};

type ActionState = { ok: boolean; message: string } | undefined;

// ── Constantes ─────────────────────────────────────────────────────────────

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const CATEGORIAS = [
  { value: "clube", label: "Clube", desc: "Clube esportivo com sócios e mensalidades", Icon: Users },
  { value: "quadra", label: "Quadra / Court", desc: "Espaço com quadras para reserva", Icon: LayoutGrid },
  { value: "centro_esportivo", label: "Centro Esportivo", desc: "Academia ou centro multiesporte", Icon: Building2 },
  { value: "condominio", label: "Condomínio", desc: "Área esportiva de uso condominial", Icon: ShieldCheck },
  { value: "outro", label: "Outro", desc: "Outro tipo de espaço esportivo", Icon: Sparkles },
];

const MODOS_RESERVA = [
  { value: "gratuita", label: "Gratuita", desc: "Sócios reservam sem custo; exige mensalidade da plataforma", Icon: BadgeCheck },
  { value: "paga", label: "Paga", desc: "Sem mensalidade da plataforma; cobra só taxas das reservas", Icon: CreditCard },
  { value: "mista", label: "Mista", desc: "Gratuita e paga; exige mensalidade da plataforma", Icon: Wallet },
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
  return (
    <label className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.13em] text-eid-fg/85">
      <span className="h-1.5 w-1.5 rounded-full bg-eid-primary-400 shadow-[0_0_0_3px_color-mix(in_srgb,var(--eid-primary-500)_12%,transparent)]" aria-hidden />
      {children}
    </label>
  );
}

function FieldChrome({
  Icon,
  children,
  multiline = false,
}: {
  Icon: LucideIcon;
  children: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <div
      className={`group flex w-full gap-2.5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-3.5 text-sm text-eid-fg transition focus-within:border-eid-primary-500/60 focus-within:ring-1 focus-within:ring-eid-primary-500/40 ${
        multiline ? "items-start py-2.5" : "items-center py-0"
      }`}
    >
      <Icon
        className={`h-[18px] w-[18px] shrink-0 text-eid-primary-400 transition group-focus-within:text-eid-primary-300 ${
          multiline ? "mt-1" : ""
        }`}
        aria-hidden
      />
      {children}
    </div>
  );
}

function IconInput({ Icon, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { Icon: LucideIcon }) {
  return (
    <FieldChrome Icon={Icon}>
      <input
        {...props}
        className={`min-h-11 w-full min-w-0 bg-transparent py-2.5 text-sm text-eid-fg placeholder:text-eid-text-secondary/50 focus:outline-none ${className ?? ""}`}
      />
    </FieldChrome>
  );
}

function IconTextarea({ Icon, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { Icon: LucideIcon }) {
  return (
    <FieldChrome Icon={Icon} multiline>
      <textarea
        {...props}
        className={`min-h-24 w-full min-w-0 resize-none bg-transparent text-sm text-eid-fg placeholder:text-eid-text-secondary/50 focus:outline-none ${className ?? ""}`}
      />
    </FieldChrome>
  );
}

function IconSelect({ Icon, className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { Icon: LucideIcon }) {
  return (
    <FieldChrome Icon={Icon}>
      <select
        {...props}
        className={`min-h-11 w-full min-w-0 bg-transparent py-2.5 text-sm text-eid-fg focus:outline-none ${className ?? ""}`}
      />
    </FieldChrome>
  );
}

function normalizeWebsiteInput(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    if (!url.hostname.startsWith("www.") && !/^(localhost|\d{1,3}(?:\.\d{1,3}){3})$/i.test(url.hostname)) {
      url.hostname = `www.${url.hostname}`;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    const withoutProtocol = withProtocol.replace(/^https?:\/\//i, "");
    return `https://${withoutProtocol.startsWith("www.") ? withoutProtocol : `www.${withoutProtocol}`}`;
  }
}

function normalizeInstagramInput(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  const withoutUrl = value
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^\/+|\/+$/g, "");
  return withoutUrl.startsWith("@") ? withoutUrl : `@${withoutUrl}`;
}

function Toggle({
  label, name, defaultChecked, onChange, Icon,
}: { label: string; name: string; defaultChecked?: boolean; onChange?: (v: boolean) => void; Icon?: LucideIcon }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3.5 py-2.5">
      <span className="flex min-w-0 items-center gap-2 text-sm text-eid-fg">
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-eid-primary-400" aria-hidden /> : null}
        {label}
      </span>
      <input
        type="checkbox" name={name} defaultChecked={defaultChecked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-4 w-4 rounded accent-eid-primary-500"
      />
    </label>
  );
}

function SectionTitle({ Icon, title, text }: { Icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5 border-b border-[color:var(--eid-border-subtle)] pb-2">
      <span className="mt-0.5 rounded-lg bg-eid-primary-500/10 p-1.5 text-eid-primary-300">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black text-eid-fg">{title}</p>
        <p className="text-xs leading-relaxed text-eid-text-secondary">{text}</p>
      </div>
    </div>
  );
}

// ── Steps ──────────────────────────────────────────────────────────────────

const STEPS = [
  { id: "modelo", label: "Modelo", Icon: Building2 },
  { id: "perfil", label: "Perfil", Icon: MapPin },
  { id: "plano_plataforma", label: "Plano", Icon: CreditCard },
  { id: "unidades", label: "Quadras", Icon: LayoutGrid },
  { id: "horarios", label: "Horários", Icon: Clock },
  { id: "feriados", label: "Feriados", Icon: Calendar },
  { id: "planos", label: "Sócios", Icon: Users },
  { id: "pagamento", label: "Receber", Icon: Wallet },
  { id: "conclusao", label: "Pronto", Icon: CheckCircle2 },
] as const;

type WizardStep = (typeof STEPS)[number];

function ProgressBar({ steps, current, completed }: { steps: WizardStep[]; current: number; completed: Set<string> }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-0.5">
        {steps.map(({ Icon, id, label }, i) => {
          const done = completed.has(id);
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
          style={{ width: `${steps.length > 1 ? (current / (steps.length - 1)) * 100 : 100}%` }}
        />
      </div>
    </div>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-eid-primary-500/25 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_14%,transparent),color-mix(in_srgb,var(--eid-card)_94%,transparent)_48%,color-mix(in_srgb,var(--eid-action-500)_7%,transparent))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] sm:px-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-eid-primary-500/25 bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,transparent)] text-eid-primary-300">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-300">
            Configuração do espaço
          </p>
          <h2 className="mt-1 text-2xl font-black leading-tight text-eid-fg sm:text-3xl">{title}</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-eid-text-secondary">{subtitle}</p>
        </div>
      </div>
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
            className="flex items-center gap-1.5 rounded-xl border border-eid-primary-500/30 bg-[color:color-mix(in_srgb,var(--eid-primary-500)_88%,transparent)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_22px_-18px_rgba(37,99,235,0.8)] transition hover:bg-eid-primary-500 disabled:opacity-50"
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
  }, [aceitaSocios, modoReserva, onNext, state]);

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
          {CATEGORIAS.map(({ value, label, desc, Icon }) => (
            <button
              key={value} type="button" onClick={() => setCategoria(value)}
              className={`rounded-xl border p-3 text-left transition ${
                categoria === value
                  ? "border-eid-primary-500/60 bg-eid-primary-500/12 text-eid-fg"
                  : "border-[color:var(--eid-border-subtle)] bg-eid-surface/40 text-eid-text-secondary hover:border-eid-primary-500/30"
              }`}
            >
              <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${
                categoria === value ? "bg-eid-primary-500/18 text-eid-primary-300" : "bg-eid-surface/70 text-eid-primary-400"
              }`}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <p className={`text-sm font-bold ${categoria === value ? "text-eid-primary-200" : ""}`}>{label}</p>
              <p className="mt-0.5 text-[11px] leading-snug">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Modelo de reserva</Label>
        <div className="mt-2 rounded-2xl border border-eid-primary-500/25 bg-eid-primary-500/8 p-3 text-xs leading-relaxed text-eid-text-secondary">
          <p>
            Regra de negócio: espaços com reservas <strong className="text-eid-fg">gratuitas</strong> ou{" "}
            <strong className="text-eid-fg">mistas</strong> pagam mensalidade da plataforma. Espaços com{" "}
            <strong className="text-eid-fg">somente reservas pagas</strong> não pagam mensalidade da plataforma; usam filas,
            mensalidades de usuários e recursos ligados às reservas pagas, pagando apenas as taxas/comissões das reservas.
          </p>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {MODOS_RESERVA.map(({ value, label, desc, Icon }) => (
            <button
              key={value} type="button" onClick={() => setModoReserva(value)}
              className={`rounded-xl border p-3 text-left transition ${
                modoReserva === value
                  ? "border-eid-primary-500/60 bg-eid-primary-500/12"
                  : "border-[color:var(--eid-border-subtle)] bg-eid-surface/40 hover:border-eid-primary-500/30"
              }`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                modoReserva === value ? "bg-eid-primary-500/18 text-eid-primary-300" : "bg-eid-surface/70 text-eid-primary-400"
              }`}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
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
          <p className={`flex items-center gap-2 text-sm font-bold ${aceitaSocios ? "text-eid-primary-200" : "text-eid-fg"}`}>
            <Users className="h-4 w-4 text-eid-primary-400" aria-hidden />
            Aceita sócios / membros
          </p>
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
  const [whatsapp, setWhatsapp] = useState<Value | undefined>((space.whatsapp_contato ?? "") as Value | undefined);
  const [phoneCountry, setPhoneCountry] = useState<Country>("BR");
  const [websiteUrl, setWebsiteUrl] = useState(space.website_url ?? "");
  const [instagramUrl, setInstagramUrl] = useState(space.instagram_url ?? "");
  useEffect(() => { if (state?.ok) onNext(); }, [onNext, state]);

  return (
    <form ref={formRef} action={action} encType="multipart/form-data" className="space-y-4">
      <input type="hidden" name="espaco_id" value={space.id} />
      <StepHeader title="Perfil público do espaço" subtitle="Como os atletas vão encontrar e conhecer seu espaço." />

      <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4">
          <SectionTitle
            Icon={BadgeCheck}
            title="Foto ou escudo"
            text="Use a imagem cadastrada no início, edite o enquadramento, remova o fundo ou troque a foto."
          />
          <div className="mt-3">
            <TeamShieldControl
              currentUrl={space.logo_arquivo ?? null}
              variant="espaco_logo"
              fileInputName="logo_file"
              removeFlagName="logo_remove"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4">
          <SectionTitle
            Icon={ImageIcon}
            title="Foto de capa"
            text="Adicione uma imagem larga para destacar o espaço na página pública."
          />
          <div className="mt-3 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-primary-500/10">
            {space.cover_arquivo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={space.cover_arquivo} alt="" className="h-28 w-full object-cover sm:h-32" />
            ) : (
              <div className="flex h-28 w-full items-center justify-center gap-2 text-xs font-bold text-eid-primary-300 sm:h-32">
                <ImageIcon className="h-5 w-5" aria-hidden />
                Sem capa
              </div>
            )}
          </div>
          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2.5 text-xs font-bold text-eid-primary-200 transition hover:bg-eid-primary-500/15">
            <Camera className="h-4 w-4" aria-hidden />
            Adicionar ou trocar capa
            <input name="cover_file" type="file" accept="image/*,.heic,.heif" className="sr-only" />
          </label>
          {space.cover_arquivo ? (
            <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-eid-text-secondary">
              <input type="checkbox" name="cover_remove" value="1" className="h-4 w-4 rounded accent-eid-primary-500" />
              Remover capa atual
            </label>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Nome do espaço *</Label>
          <IconInput Icon={Building2} name="nome_publico" defaultValue={space.nome_publico} placeholder="Ex.: Arena Tennis Club" required />
        </div>
        <div className="space-y-1.5">
          <Label>Link público (slug)</Label>
          <IconInput Icon={Hash} name="slug" defaultValue={space.slug ?? ""} placeholder="arena-tennis-club" />
        </div>
        <div className="space-y-1.5">
          <Label>Cidade</Label>
          <IconInput Icon={MapPin} name="cidade" defaultValue={space.cidade ?? ""} placeholder="São Paulo" />
        </div>
        <div className="space-y-1.5">
          <Label>Estado (UF)</Label>
          <IconSelect Icon={MapPin} name="uf" defaultValue={space.uf ?? ""}>
            <option value="">Selecione</option>
            {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </IconSelect>
        </div>
        <div className="space-y-1.5">
          <Label>WhatsApp de contato</Label>
          <input type="hidden" name="whatsapp_contato" value={typeof whatsapp === "string" ? whatsapp : ""} />
          <FieldChrome Icon={Phone}>
            <PhoneInput
              international
              defaultCountry="BR"
              value={whatsapp}
              onChange={setWhatsapp}
              onCountryChange={(c) => setPhoneCountry((c ?? "BR") as Country)}
              labels={EID_PHONE_LABELS}
              locales="pt-BR"
              className="cadastro-phone"
              numberInputProps={{
                id: "espaco-whatsapp-contato",
                autoComplete: "tel",
                inputMode: "tel",
                "aria-label": "WhatsApp de contato do espaço",
              }}
              countrySelectProps={{
                className: "cadastro-country-select",
                "aria-label": "País e código de chamada",
              }}
              style={
                {
                  "--PhoneInput-color--text": "var(--eid-fg)",
                  "--PhoneInputCountrySelect-marginRight": "0.35rem",
                } as React.CSSProperties
              }
            />
          </FieldChrome>
          <p className="text-[11px] leading-snug text-eid-text-secondary">
            País:{" "}
            <span className="font-semibold text-eid-fg">
              {(EID_PHONE_LABELS as Record<string, string | undefined>)[phoneCountry] ?? phoneCountry}
            </span>
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>E-mail de contato</Label>
          <IconInput Icon={Mail} name="email_contato" defaultValue={space.email_contato ?? ""} placeholder="contato@espaco.com" type="email" />
        </div>
        <div className="space-y-1.5">
          <Label>Site</Label>
          <IconInput
            Icon={Globe2}
            name="website_url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            onBlur={() => setWebsiteUrl((prev) => normalizeWebsiteInput(prev))}
            placeholder="https://www.meuespaco.com.br"
            type="url"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Instagram</Label>
          <IconInput
            Icon={AtSign}
            name="instagram_url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            onBlur={() => setInstagramUrl((prev) => normalizeInstagramInput(prev))}
            placeholder="@meuespaco"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Descrição curta (máx. 160 caracteres)</Label>
          <IconInput Icon={MessageSquareText} name="descricao_curta" defaultValue={space.descricao_curta ?? ""} maxLength={160} placeholder="Clube com 8 quadras de tênis e beach tennis no centro da cidade." />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Sobre o espaço (texto completo)</Label>
          <IconTextarea Icon={FileText} name="descricao_longa" defaultValue={space.descricao_longa ?? ""} rows={4} placeholder="Descreva sua infraestrutura, diferenciais, história..." />
        </div>
      </div>

      <Feedback state={state} />
      <NavButtons onBack={onBack} onNext={() => formRef.current?.requestSubmit()} pending={pending} />
    </form>
  );
}

function StepUnidades({ space, unidades, unidadeGate, onNext, onBack }: {
  space: Space; unidades: Unidade[]; unidadeGate: PaaSUnidadeGateInfo; onNext: () => void; onBack?: () => void;
}) {
  const [showForm, setShowForm] = useState(unidades.length === 0);
  const [state, action, pending] = useActionState<ActionState, FormData>(criarUnidadeWizardAction, undefined);
  const [photoState, photoAction, photoPending] = useActionState<ActionState, FormData>(atualizarFotoUnidadeWizardAction, undefined);
  const [removeState, removeAction] = useActionState<ActionState, FormData>(removerUnidadeWizardAction, undefined);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const usadas = unidadeGate.unidadesTotal || unidades.length;
  const limite = unidadeGate.maxUnidadesPlano;
  const restantes = limite == null ? null : Math.max(0, limite - usadas);
  const podeAdicionar = unidadeGate.podeCriarUnidade && (limite == null || usadas < limite);
  const percentualUso = limite == null ? 100 : Math.min(100, Math.round((usadas / Math.max(1, limite)) * 100));
  const planoLabel = unidadeGate.planoNome || (unidadeGate.modoMonetizacao === "mensalidade_plataforma" ? "Plano da plataforma" : "Plano atual");

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      queueMicrotask(() => setShowForm(false));
      if (formRef.current) formRef.current.reset();
    }
  }, [router, state]);
  useEffect(() => { if (photoState?.ok) router.refresh(); }, [photoState, router]);
  useEffect(() => { if (removeState?.ok) router.refresh(); }, [removeState, router]);

  return (
    <div className="space-y-5">
      <StepHeader
        title="Quadras e instalações"
        subtitle="Cadastre as quadras, campos, pistas ou salas que poderão receber reservas e atividades."
      />

      <div className="rounded-2xl border border-eid-primary-500/20 bg-eid-primary-500/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-eid-primary-300">Limite do plano</p>
            <p className="mt-1 text-2xl font-black text-eid-fg">
              {usadas}{limite == null ? "" : ` de ${limite}`} cadastrada{usadas === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-eid-text-secondary">
              {limite == null
                ? `${planoLabel}: sem limite de quadras definido.`
                : restantes === 0
                  ? `${planoLabel}: limite atingido.`
                  : `${planoLabel}: ainda ${restantes === 1 ? "resta 1 cadastro" : `restam ${restantes} cadastros`}.`}
            </p>
          </div>
          <div className="min-w-[150px] rounded-xl border border-white/10 bg-eid-surface/50 px-3 py-2">
            <div className="h-2 overflow-hidden rounded-full bg-eid-surface/70">
              <span className="block h-full rounded-full bg-eid-primary-500" style={{ width: `${percentualUso}%` }} />
            </div>
            <p className="mt-2 text-[11px] font-semibold text-eid-text-secondary">
              {podeAdicionar ? "Cadastro liberado" : unidadeGate.motivoBloqueio ?? "Cadastro bloqueado pelo plano atual."}
            </p>
          </div>
        </div>
      </div>

      {unidades.length > 0 && (
        <div className="space-y-2">
          {unidades.map((u) => (
            <div key={u.id} className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-primary-500/10">
                  {u.logo_arquivo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.logo_arquivo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-eid-primary-300" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-eid-fg">{u.nome}</p>
                  <p className="text-[11px] text-eid-text-secondary">
                    {u.tipo_unidade}{u.superficie ? ` · ${superficieLabel(u.superficie)}` : ""}
                    {u.coberta ? " · coberta" : ""}
                    {u.indoor ? " · indoor" : ""}
                    {u.iluminacao ? " · iluminada" : ""}
                  </p>
                </div>
                <form action={removeAction}>
                  <input type="hidden" name="espaco_id" value={space.id} />
                  <input type="hidden" name="unidade_id" value={u.id} />
                  <button type="submit" className="rounded-lg p-2 text-eid-text-secondary/50 transition hover:bg-red-500/10 hover:text-red-400" aria-label={`Remover ${u.nome}`}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </form>
              </div>
              <details className="mt-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-3 py-2">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold text-eid-primary-300">
                  <Camera className="h-4 w-4" aria-hidden />
                  Adicionar ou editar foto
                </summary>
                <form action={photoAction} encType="multipart/form-data" className="mt-3 space-y-3">
                  <input type="hidden" name="espaco_id" value={space.id} />
                  <input type="hidden" name="unidade_id" value={u.id} />
                  <EspacoUnidadeLogoControl currentUrl={u.logo_arquivo ?? null} />
                  <button
                    type="submit"
                    disabled={photoPending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-eid-primary-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-eid-primary-600 disabled:opacity-50"
                  >
                    {photoPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    Salvar foto
                  </button>
                </form>
              </details>
            </div>
          ))}
          <Feedback state={photoState} />
        </div>
      )}

      {showForm && podeAdicionar ? (
        <form ref={formRef} action={action} encType="multipart/form-data" className="space-y-5 rounded-2xl border border-eid-primary-500/20 bg-eid-primary-500/5 p-4">
          <SectionTitle Icon={LayoutGrid} title="Cadastrar nova quadra ou unidade" text="Preencha os dados que ajudam o atleta a escolher o lugar certo para reservar." />
          <input type="hidden" name="espaco_id" value={space.id} />

          <div className="space-y-3">
            <SectionTitle Icon={Type} title="Identificação" text="Use um nome curto e fácil de reconhecer na agenda." />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nome da quadra *</Label>
                <IconInput Icon={Type} name="nome" placeholder='Ex.: Quadra 1 - Saibro' required />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de espaço</Label>
                <IconSelect Icon={LayoutGrid} name="tipo_unidade" defaultValue="quadra">
                  {TIPOS_UNIDADE.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                </IconSelect>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de piso</Label>
                <IconSelect Icon={Sparkles} name="superficie" defaultValue="">
                  <option value="">Não informado</option>
                  {SUPERFICIES.map((s) => <option key={s} value={s}>{superficieLabel(s)}</option>)}
                </IconSelect>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle Icon={Camera} title="Foto da quadra" text="Adicione uma imagem para deixar a escolha mais visual no app." />
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-3">
              <EspacoUnidadeLogoControl currentUrl={null} />
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle Icon={ShieldCheck} title="Características" text="Marque somente o que descreve a estrutura física da quadra." />
            <div className="grid gap-2 sm:grid-cols-3">
              <Toggle label="Coberta" name="coberta" Icon={ShieldCheck} />
              <Toggle label="Ambiente interno" name="indoor" Icon={Building2} />
              <Toggle label="Iluminação" name="iluminacao" Icon={Lightbulb} />
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle Icon={BadgeCheck} title="Uso no aplicativo" text="Defina como essa unidade aparece nas atividades e reservas." />
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle label="Permite aulas" name="aceita_aulas" defaultChecked Icon={Users} />
              <Toggle label="Permite torneios" name="aceita_torneios" Icon={BadgeCheck} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observações internas</Label>
            <IconInput Icon={MessageSquareText} name="observacoes" placeholder="Ex.: próxima da portaria, precisa de iluminação à noite" />
          </div>
          <Feedback state={state} />
          <div className="flex gap-2">
            <button
              type="submit" disabled={pending}
              className="flex items-center gap-1.5 rounded-xl bg-eid-primary-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-eid-primary-600 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Cadastrar quadra
            </button>
            {unidades.length > 0 && (
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-eid-text-secondary hover:text-eid-fg">
                Cancelar
              </button>
            )}
          </div>
        </form>
      ) : !podeAdicionar ? (
        <div className="rounded-2xl border border-eid-action-500/20 bg-eid-action-500/10 p-4 text-sm text-eid-fg">
          <p className="font-black">Limite de cadastro atingido</p>
          <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">
            {unidadeGate.motivoBloqueio ?? "Seu plano atual não permite cadastrar outra quadra agora."}
          </p>
        </div>
      ) : (
        <button
          type="button" onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-eid-primary-500/40 bg-eid-primary-500/5 py-4 text-sm font-semibold text-eid-primary-400 transition hover:bg-eid-primary-500/10"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Cadastrar outra quadra
        </button>
      )}

      {unidades.length === 0 && (
        <p className="text-center text-xs text-eid-text-secondary">Cadastre pelo menos uma quadra ou unidade antes de continuar.</p>
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

function StepPlanoPlataforma({
  space,
  planosPaaS,
  unidadeGate,
  onNext,
  onBack,
}: {
  space: Space;
  planosPaaS: PlanoPaaS[];
  unidadeGate: PaaSUnidadeGateInfo;
  onNext: () => void;
  onBack?: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(escolherPlanoPlataformaWizardAction, undefined);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [router, state]);

  const planoSelecionado = Boolean(unidadeGate.planoMensalId || state?.ok);
  const planosOrdenados = [...planosPaaS].sort(
    (a, b) =>
      b.valor_mensal_centavos - a.valor_mensal_centavos ||
      (b.max_unidades ?? 9999) - (a.max_unidades ?? 9999) ||
      b.min_unidades - a.min_unidades
  );
  const planoMaisCompleto = planosOrdenados[0] ?? null;
  const valorPlano = (centavos: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format((Number(centavos) || 0) / 100);
  const capacidadeTexto = (plano: PlanoPaaS) =>
    plano.max_unidades == null ? `${plano.min_unidades}+` : String(plano.max_unidades);

  return (
    <div className="space-y-5">
      <StepHeader
        title="Plano da plataforma"
        subtitle="Escolha a estrutura que acompanha o crescimento do seu espaço. O plano define quantas quadras ou unidades você poderá cadastrar agora."
      />

      {planosPaaS.length === 0 ? (
        <div className="rounded-2xl border border-eid-action-500/20 bg-eid-action-500/10 p-4">
          <p className="text-sm font-black text-eid-fg">Nenhum plano disponível para esta categoria</p>
          <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">
            Fale com o suporte EsporteID para liberar um plano da plataforma antes de cadastrar quadras.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {planoMaisCompleto ? (
            <div className="overflow-hidden rounded-2xl border border-eid-action-500/35 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-action-500)_18%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-500)_12%,var(--eid-surface)))] shadow-[0_18px_42px_-28px_rgba(249,115,22,0.85)]">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-eid-action-500 text-white shadow-[0_10px_24px_-12px_rgba(249,115,22,0.9)]">
                    <Crown className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-action-400">
                      Recomendado para crescer
                    </p>
                    <h3 className="mt-1 text-lg font-black leading-tight text-eid-fg">
                      Comece com o plano mais completo
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">
                      Mais limite desde o início, menos troca de plano no meio da operação e espaço para cadastrar novas quadras sem travar o setup.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-eid-action-500/30 bg-eid-card/70 px-4 py-3 text-left sm:min-w-[9.5rem] sm:text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-text-secondary">Plano destaque</p>
                  <p className="mt-1 text-xl font-black text-eid-fg">{valorPlano(planoMaisCompleto.valor_mensal_centavos)}</p>
                  <p className="text-[11px] font-semibold text-eid-action-400">por mês</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-3">
          {planosOrdenados.map((plano) => {
            const ativo = unidadeGate.planoMensalId === plano.id;
            const faixa = descricaoFaixaUnidadesPaaS(plano.min_unidades, plano.max_unidades);
            const destaque = planoMaisCompleto?.id === plano.id;
            const perfil = perfilComercialPlanoPaaS(inferirNivelPlanoPaaS(plano, planosPaaS));
            const beneficios = [faixa, ...perfil.beneficios];
            return (
              <form
                key={plano.id}
                action={action}
                className={`relative overflow-hidden rounded-2xl border p-4 text-sm transition ${
                  ativo
                    ? "border-eid-primary-500/70 bg-eid-primary-500/12 shadow-[0_16px_34px_-22px_rgba(37,99,235,0.95)]"
                    : destaque
                      ? "border-eid-action-500/55 bg-eid-action-500/10 shadow-[0_18px_38px_-24px_rgba(249,115,22,0.9)] hover:border-eid-action-500/75"
                      : "border-[color:var(--eid-border-subtle)] bg-eid-surface/45 hover:border-eid-primary-500/35"
                }`}
              >
                {destaque ? (
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-eid-action-500" aria-hidden />
                ) : null}
                <input type="hidden" name="espaco_id" value={space.id} />
                <input type="hidden" name="plano_mensal_id" value={plano.id} />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-black text-eid-fg">{plano.nome}</p>
                      {destaque ? (
                        <span className="rounded-full bg-eid-action-500 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">
                          Melhor escolha
                        </span>
                      ) : null}
                    </div>
                    <p className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${
                      destaque
                        ? "border-eid-action-500/35 bg-eid-action-500/10 text-eid-action-400"
                        : "border-eid-primary-500/25 bg-eid-primary-500/8 text-eid-primary-300"
                    }`}>
                      {perfil.titulo}
                    </p>
                    <p className="mt-2 text-2xl font-black leading-none text-eid-fg">
                      {valorPlano(plano.valor_mensal_centavos)}
                      <span className="ml-1 text-xs font-bold text-eid-text-secondary">/mês</span>
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary">{perfil.resumo}</p>
                  </div>
                  {ativo ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-300">
                      Atual
                    </span>
                  ) : null}
                </div>
                <div className={`mt-4 rounded-2xl border p-3 ${
                  destaque
                    ? "border-eid-action-500/25 bg-eid-action-500/10"
                    : "border-[color:var(--eid-border-subtle)] bg-eid-card/45"
                }`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-text-secondary">Limite do plano</p>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <p className="text-3xl font-black leading-none text-eid-fg">{capacidadeTexto(plano)}</p>
                    <p className="pb-1 text-right text-xs font-semibold leading-tight text-eid-primary-300">quadras ou unidades</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-2">
                  {beneficios.map((beneficio) => (
                    <li key={beneficio} className="flex items-start gap-2 text-xs leading-relaxed text-eid-text-secondary">
                      <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${destaque ? "text-eid-action-400" : "text-eid-primary-300"}`} aria-hidden />
                      <span>{beneficio}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] leading-relaxed text-eid-text-secondary">
                  {detalheValorESociosPlanoPaaS(plano)}
                </p>
                <button
                  type="submit"
                  disabled={ativo || pending}
                  className={`mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    destaque
                      ? "bg-eid-action-500 hover:bg-eid-action-600"
                      : "bg-eid-primary-500 hover:bg-eid-primary-600"
                  }`}
                >
                  {pending && !ativo ? <Loader2 className="h-4 w-4 animate-spin" /> : destaque ? <ArrowUpRight className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                  {ativo ? "Plano selecionado" : destaque ? "Escolher plano completo" : perfil.cta}
                </button>
              </form>
            );
          })}
          </div>
        </div>
      )}

      <Feedback state={state} />
      {planoSelecionado ? (
        <NavButtons onBack={onBack} onNext={onNext} nextLabel="Continuar para quadras" />
      ) : (
        <NavButtons onBack={onBack} nextDisabled nextLabel="Escolha um plano para continuar" />
      )}
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
  useEffect(() => { if (state?.ok) onNext(); }, [onNext, state]);

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
          className="inline-flex items-center gap-1.5 rounded-lg border border-eid-primary-500/30 bg-eid-primary-500/8 px-3 py-1.5 text-xs font-semibold text-eid-primary-300 transition hover:bg-eid-primary-500/15">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          Preset: seg–sáb 08:00–22:00
        </button>
        <button type="button" onClick={copiarSegsex}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs font-semibold text-eid-text-secondary transition hover:text-eid-fg">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
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
                <div className="flex items-center gap-1.5 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-1 focus-within:ring-1 focus-within:ring-eid-primary-500/40">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-eid-primary-400" aria-hidden />
                  <input
                    type="time" name={`dia_${dia}_inicio`}
                    value={inicio[dia] ?? "08:00"}
                    onChange={(e) => setInicio((p) => ({ ...p, [dia]: e.target.value }))}
                    className="w-[5.8rem] bg-transparent text-sm text-eid-fg focus:outline-none"
                  />
                </div>
                <span className="text-xs text-eid-text-secondary">até</span>
                <div className="flex items-center gap-1.5 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-1 focus-within:ring-1 focus-within:ring-eid-primary-500/40">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-eid-action-400" aria-hidden />
                  <input
                    type="time" name={`dia_${dia}_fim`}
                    value={fim[dia] ?? "22:00"}
                    onChange={(e) => setFim((p) => ({ ...p, [dia]: e.target.value }))}
                    className="w-[5.8rem] bg-transparent text-sm text-eid-fg focus:outline-none"
                  />
                </div>
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
  useEffect(() => { if (syncState?.ok) router.refresh(); }, [router, syncState]);

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
    if (state?.ok) {
      router.refresh();
      queueMicrotask(() => setShowForm(false));
      formRef.current?.reset();
    }
  }, [router, state]);

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
              <IconInput Icon={Users} name="nome" placeholder='Ex.: Sócio Mensal, Plano Anual' required />
            </div>
            <div className="space-y-1.5">
              <Label>Mensalidade (R$)</Label>
              <IconInput Icon={Banknote} name="mensalidade_reais" type="number" min={0} step="0.01" placeholder="150,00" />
            </div>
            <div className="space-y-1.5">
              <Label>Reservas gratuitas / semana</Label>
              <IconInput Icon={Calendar} name="reservas_gratis" type="number" min={0} max={30} defaultValue={3} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Descrição</Label>
              <IconInput Icon={FileText} name="descricao" placeholder="Benefícios, regras, acesso..." />
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
  useEffect(() => { if (state?.ok) onNext(); }, [onNext, state]);

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
          <IconInput Icon={Wallet} name="nome_razao_social" defaultValue={parceiro?.nome_razao_social ?? ""} placeholder="Seu nome ou nome da empresa" required />
        </div>
        <div className="space-y-1.5">
          <Label>CPF ou CNPJ</Label>
          <IconInput Icon={IdCard} name="cpf_cnpj" defaultValue={parceiro?.cpf_cnpj ?? ""} placeholder="000.000.000-00" />
        </div>
        <div className="space-y-1.5">
          <Label>E-mail cadastrado no Asaas</Label>
          <IconInput Icon={Mail} name="email" defaultValue={parceiro?.email ?? ""} placeholder="email@asaas.com" type="email" />
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
  space, unidades, unidadeGate, planosPaaS, horarios, feriados, planos, parceiro,
}: WizardProps) {
  const storageKey = `eid:onboarding-step-${space.id}`;
  const [step, setStep] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Math.min(Number(localStorage.getItem(storageKey) ?? "0"), STEPS.length - 1);
  });
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [modoReserva, setModoReserva] = useState(space.modo_reserva ?? "mista");
  const [aceitaSocios, setAceitaSocios] = useState(space.aceita_socios ?? true);

  const skipPlanoPlataforma = unidadeGate.modoMonetizacao !== "mensalidade_plataforma";
  const skipPlanos = !aceitaSocios;
  const skipPagamento = modoReserva === "gratuita" && !aceitaSocios;
  const activeSteps = useMemo(
    () =>
      STEPS.filter((item) => {
        if (item.id === "plano_plataforma") return !skipPlanoPlataforma;
        if (item.id === "planos") return !skipPlanos;
        if (item.id === "pagamento") return !skipPagamento;
        return true;
      }),
    [skipPagamento, skipPlanoPlataforma, skipPlanos]
  );
  const currentStep = activeSteps[Math.min(step, activeSteps.length - 1)] ?? activeSteps[0];

  useEffect(() => {
    localStorage.setItem(storageKey, String(step));
  }, [step, storageKey]);

  useEffect(() => {
    queueMicrotask(() => {
      setStep((s) => Math.min(s, Math.max(0, activeSteps.length - 1)));
    });
  }, [activeSteps.length]);

  const advance = () => {
    if (currentStep) setCompleted((prev) => new Set([...prev, currentStep.id]));
    setStep((s) => Math.min(s + 1, activeSteps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-6">
        <ProgressBar steps={activeSteps} current={step} completed={completed} />
        <div className="min-h-[420px]">
          {currentStep?.id === "modelo" && (
            <StepModelo
              space={{ ...space, modo_reserva: modoReserva, aceita_socios: aceitaSocios }}
              onNext={({ modoReserva: mr, aceitaSocios: as }) => {
                setModoReserva(mr);
                setAceitaSocios(as);
                advance();
              }}
            />
          )}
          {currentStep?.id === "perfil" && (
            <StepPerfil space={space} onNext={advance} onBack={goBack} />
          )}
          {currentStep?.id === "plano_plataforma" && (
            <StepPlanoPlataforma
              space={space}
              planosPaaS={planosPaaS}
              unidadeGate={unidadeGate}
              onNext={advance}
              onBack={goBack}
            />
          )}
          {currentStep?.id === "unidades" && (
            <StepUnidades
              space={space}
              unidades={unidades}
              unidadeGate={unidadeGate}
              onNext={advance}
              onBack={goBack}
            />
          )}
          {currentStep?.id === "horarios" && (
            <StepHorarios space={space} horarios={horarios} onNext={advance} onBack={goBack} />
          )}
          {currentStep?.id === "feriados" && (
            <StepFeriados space={space} feriados={feriados} onNext={advance} onBack={goBack} />
          )}
          {currentStep?.id === "planos" && (
            <StepPlanos space={space} planos={planos} onNext={advance} onBack={goBack} onSkip={advance} />
          )}
          {currentStep?.id === "pagamento" && (
            <StepPagamento space={space} parceiro={parceiro} onNext={advance} onBack={goBack} onSkip={advance} />
          )}
          {currentStep?.id === "conclusao" && (
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
