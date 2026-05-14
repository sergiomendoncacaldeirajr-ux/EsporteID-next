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
  Lightbulb, RefreshCw,
  AtSign, BadgeCheck, Banknote, FileText, Globe2,
  Hash, IdCard, Mail, MessageSquareText, Phone,
  Camera, ImageIcon, ShieldCheck, Sparkles, Type, Wallet,
  Crown, ArrowUpRight,
} from "lucide-react";
import { EID_PHONE_LABELS } from "@/lib/eid-phone-labels";
import { EspacoUnidadeLogoControl } from "@/components/espaco/espaco-unidade-logo-control";
import { EnderecoAssistFields } from "@/components/locais/endereco-assist-fields";
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
  salvarRegrasReservasWizardAction,
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
import { prepareCoverForUpload } from "@/lib/images/prepare-avatar-upload";
import { isNativeCameraAvailable, pickNativeImage } from "@/lib/native/camera";
import { normalizeEspacoDuplicateValue } from "@/lib/espacos/duplicate";

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
  esportes_ids: number[];
  logo_arquivo: string | null;
  cover_arquivo: string | null;
  cidade: string | null;
  uf: string | null;
  endereco: string;
  numero: string;
  bairro: string;
  cep: string;
  complemento: string;
  lat: string | null;
  lng: string | null;
  reserva_observacoes: string;
  descricao_curta: string | null;
  descricao_longa: string | null;
  whatsapp_contato: string | null;
  email_contato: string | null;
  website_url: string | null;
  instagram_url: string | null;
};

type Unidade = {
  id: number; nome: string; tipo_unidade: string;
  superficie: string | null; esporte_id: number | null; modalidade: string | null;
  coberta: boolean; indoor: boolean; iluminacao: boolean;
  aceita_aulas: boolean; aceita_torneios: boolean; observacoes: string | null;
  logo_arquivo: string | null; modo_reserva: string | null; intervalo_minutos: number | null;
  configuracao_agenda_json?: unknown;
};

type Horario = {
  id: number; espaco_unidade_id: number | null; dia_semana: number;
  hora_inicio: string; hora_fim: string; observacoes: string | null;
};

type Feriado = {
  id: number; nome: string | null; data_inicio: string; data_fim: string;
  operar_no_feriado: boolean; recorrente_anual: boolean | null;
  hora_inicio: string | null; hora_fim: string | null; sobrepor_grade: boolean | null;
};

type Plano = {
  id: number;
  nome: string;
  mensalidade_centavos: number;
  reservas_gratuitas_semana?: number | null;
  limite_reservas_semana?: number | null;
  cooldown_horas?: number | null;
  antecedencia_max_dias?: number | null;
  beneficios_json?: Record<string, unknown> | null;
};

type PlanoPaaS = {
  id: number;
  nome: string;
  min_unidades: number;
  max_unidades: number | null;
  valor_mensal_centavos: number;
  socios_mensal_modo: string | null;
};

type ReservaConfig = {
  limiteReservasDia: number;
  limiteReservasSemana: number;
  cooldownHoras: number;
  antecedenciaMinHoras: number;
  antecedenciaMaxDias: number;
  gratisLimiteReservasDiaMembro: number;
  gratisLimiteReservasSemanaMembro: number;
  gratisIntervaloHorasEntreReservasMembro: number;
  gratisAntecedenciaMaxDiasMembro: number;
  bloqueiaInadimplente: boolean;
  reservasGratisLiberadas: boolean;
  cancelamentoGratuitaPermite: boolean;
  cancelamentoGratuitaAntecedenciaHoras: number;
  cancelamentoGratuitaPermiteAposPrazo: boolean;
  cancelamentoGratuitaMultaTipo: "nenhuma" | "percentual" | "fixa";
  cancelamentoGratuitaMultaPercentual: number;
  cancelamentoGratuitaMultaCentavos: number;
  cancelamentoPagaPermite: boolean;
  cancelamentoPagaAntecedenciaHoras: number;
  cancelamentoPagaPermiteAposPrazo: boolean;
  cancelamentoPagaMultaTipo: "nenhuma" | "percentual" | "fixa";
  cancelamentoPagaMultaPercentual: number;
  cancelamentoPagaMultaCentavos: number;
  permiteTransferenciaReserva: boolean;
  transferenciaAntecedenciaHoras: number;
  politicaCancelamento: string;
  observacoesPublicas: string;
};

type Parceiro = {
  nome_razao_social: string | null; cpf_cnpj: string | null;
  email: string | null; onboarding_status: string | null; wallet_id?: string | null;
} | null;

type LocalExistente = {
  id: number;
  slug: string | null;
  nome_publico: string | null;
  localizacao: string | null;
  logo_arquivo: string | null;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  complemento: string;
  lat: string | null;
  lng: string | null;
};

type WizardProps = {
  space: Space;
  esportes: Array<{ id: number; nome: string }>;
  locaisExistentes: LocalExistente[];
  unidades: Unidade[];
  unidadeGate: PaaSUnidadeGateInfo;
  planosPaaS: PlanoPaaS[];
  horarios: Horario[];
  feriados: Feriado[];
  planos: Plano[];
  parceiro: Parceiro;
  reservaConfig: ReservaConfig;
};

type ActionState = { ok: boolean; message: string } | undefined;

// ── Constantes ─────────────────────────────────────────────────────────────

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

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

const MODOS_RESERVA_UNIDADE = [
  { value: "herdar", label: "Seguir regra do espaço", desc: "Usa o modelo definido para o espaço inteiro.", Icon: ShieldCheck },
  { value: "gratuita", label: "Só gratuitas", desc: "Apenas reservas sem cobrança para associados.", Icon: BadgeCheck },
  { value: "paga", label: "Só pagas", desc: "Disponível apenas para reservas com cobrança.", Icon: CreditCard },
  { value: "mista", label: "Mista", desc: "Aceita reservas gratuitas e pagas nessa quadra.", Icon: Wallet },
];

const INTERVALOS_RESERVA = [30, 45, 60, 90, 120];

function superficieLabel(s: string) {
  const map: Record<string, string> = {
    saibro: "Saibro", grama_natural: "Grama natural", grama_sintetica: "Grama sintética",
    cimento: "Cimento", asfalto: "Asfalto", madeira: "Madeira", borracha: "Borracha",
    agua: "Água", areia: "Areia", outro: "Outro",
  };
  return map[s] ?? s;
}

function modoReservaUnidadeLabel(value: string | null | undefined) {
  return MODOS_RESERVA_UNIDADE.find((modo) => modo.value === value)?.label ?? "Seguir regra do espaço";
}

function modoReservaEspacoLabel(value: string | null | undefined) {
  if (value === "gratuita") return "Reservas gratuitas para sócios";
  if (value === "paga") return "Reservas pagas";
  if (value === "mista") return "Reservas gratuitas e pagas";
  return "Modelo de reserva ainda não definido";
}

function modoReservaEspacoDesc(value: string | null | undefined, aceitaSocios: boolean | null | undefined) {
  if (value === "gratuita") return "O espaço opera com reservas gratuitas para associados.";
  if (value === "paga") return aceitaSocios
    ? "O espaço recebe reservas pagas e pode manter sócios, filas e benefícios ligados às reservas pagas."
    : "O espaço recebe apenas reservas pagas.";
  if (value === "mista") return "O espaço combina reservas gratuitas para sócios com reservas pagas para outros públicos.";
  return "Defina o modelo de reserva na primeira etapa para exibir essa informação no perfil.";
}

function esporteNome(esportes: Array<{ id: number; nome: string }>, esporteId: number | null) {
  return esportes.find((esporte) => esporte.id === esporteId)?.nome ?? null;
}

function horaCurta(value: string | null | undefined) {
  return (value ?? "").slice(0, 5);
}

function agendaConfig(unidade: Unidade) {
  const raw = unidade.configuracao_agenda_json;
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
}

function slugifyClient(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function timeToMinutesClient(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesToTimeClient(minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function gerarGradeTexto(inicio: string, fim: string, intervalo: number) {
  const inicioMin = timeToMinutesClient(inicio);
  const fimMin = timeToMinutesClient(fim);
  if (inicioMin == null || fimMin == null || fimMin <= inicioMin || intervalo < 5) return "";
  const linhas: string[] = [];
  for (let cursor = inicioMin; cursor + intervalo <= fimMin; cursor += intervalo) {
    linhas.push(`${minutesToTimeClient(cursor)}-${minutesToTimeClient(cursor + intervalo)}`);
  }
  return linhas.join("\n");
}

function parseSlotsClient(raw: string, opts?: { keepInvalidRange?: boolean }) {
  return raw
    .split(/[\n,;]+/)
    .map((part) => part.trim().match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({ inicio: match[1], fim: match[2] }))
    .filter((slot) => {
      const i = timeToMinutesClient(slot.inicio);
      const f = timeToMinutesClient(slot.fim);
      return i != null && f != null && (opts?.keepInvalidRange || f > i);
    });
}

function slotsToText(slots: Array<{ inicio: string; fim: string }>) {
  return slots.map((slot) => `${slot.inicio}-${slot.fim}`).join("\n");
}

function ajustarSlotsAposEdicao(
  slots: Array<{ inicio: string; fim: string }>,
  indexEditado: number,
  inicioDia: string,
  fimDia: string,
  intervaloPadrao: number
) {
  const inicioDiaMin = timeToMinutesClient(inicioDia) ?? 0;
  const fimDiaMin = timeToMinutesClient(fimDia) ?? 24 * 60;
  const normalizados = slots.slice(0, indexEditado).filter((slot) => {
    const inicioMin = timeToMinutesClient(slot.inicio);
    const fimMin = timeToMinutesClient(slot.fim);
    return inicioMin != null && fimMin != null && fimMin > inicioMin && fimMin <= fimDiaMin;
  });
  const prevFimMin = normalizados.length > 0
    ? timeToMinutesClient(normalizados.at(-1)?.fim ?? "")
    : null;
  let novoInicioMin = timeToMinutesClient(slots[indexEditado]?.inicio ?? "");
  let novoFimMin = timeToMinutesClient(slots[indexEditado]?.fim ?? "");
  if (novoInicioMin == null || novoFimMin == null) return slots;
  if (prevFimMin != null && novoInicioMin < prevFimMin) novoInicioMin = prevFimMin;
  if (novoFimMin <= novoInicioMin) novoFimMin = Math.min(fimDiaMin, novoInicioMin + intervaloPadrao);
  if (novoInicioMin >= fimDiaMin) return normalizados;
  if (novoFimMin > fimDiaMin) novoFimMin = fimDiaMin;

  const ancoraInicio = prevFimMin ?? inicioDiaMin;
  if (novoInicioMin > ancoraInicio) {
    normalizados.push({
      inicio: minutesToTimeClient(ancoraInicio),
      fim: minutesToTimeClient(novoInicioMin),
    });
  }

  normalizados.push({
    inicio: minutesToTimeClient(novoInicioMin),
    fim: minutesToTimeClient(novoFimMin),
  });

  const duracaoEditada = novoFimMin - novoInicioMin;
  let cursor = novoFimMin;
  while (cursor < fimDiaMin) {
    const nextFim = cursor + duracaoEditada;
    if (nextFim > fimDiaMin) {
      if (fimDiaMin > cursor) {
        normalizados.push({
          inicio: minutesToTimeClient(cursor),
          fim: minutesToTimeClient(fimDiaMin),
        });
      }
      break;
    }
    normalizados.push({
      inicio: minutesToTimeClient(cursor),
      fim: minutesToTimeClient(nextFim),
    });
    cursor = nextFim;
  }

  return normalizados;
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

function CoverUploadControl({ currentUrl }: { currentUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeCurrent, setRemoveCurrent] = useState(false);
  const displayUrl = previewUrl ?? (removeCurrent ? null : currentUrl);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handlePick(file: File | undefined) {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const prepared = await prepareCoverForUpload(file);
      if (!prepared.ok) {
        setError(prepared.message);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      const dt = new DataTransfer();
      dt.items.add(prepared.file);
      if (inputRef.current) inputRef.current.files = dt.files;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(prepared.file));
      setFileName(prepared.file.name);
      setRemoveCurrent(false);
    } finally {
      setProcessing(false);
    }
  }

  async function pickNativeCover(source: "camera" | "gallery") {
    if (!isNativeCameraAvailable()) {
      inputRef.current?.click();
      return;
    }
    try {
      const file = await pickNativeImage(source);
      if (file) await handlePick(file);
    } catch (err) {
      const message = String((err as { message?: string })?.message ?? "");
      if (!/cancel/i.test(message)) setError("Não foi possível abrir a câmera/galeria agora.");
    }
  }

  function clearCover() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeCover() {
    clearCover();
    setRemoveCurrent(true);
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-primary-500/10">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="h-28 w-full object-cover sm:h-32" />
        ) : (
          <div className="flex h-28 w-full items-center justify-center gap-2 text-xs font-bold text-eid-primary-300 sm:h-32">
            <ImageIcon className="h-5 w-5" aria-hidden />
            Sem capa
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void pickNativeCover("camera")}
            className="flex items-center justify-center gap-2 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2.5 text-xs font-bold text-eid-primary-200 transition hover:bg-eid-primary-500/15"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
            Câmera
          </button>
          <button
            type="button"
            onClick={() => void pickNativeCover("gallery")}
            className="flex items-center justify-center gap-2 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2.5 text-xs font-bold text-eid-primary-200 transition hover:bg-eid-primary-500/15"
          >
            <ImageIcon className="h-4 w-4" aria-hidden />
            {processing ? "Preparando..." : displayUrl ? "Trocar capa" : "Adicionar capa"}
          </button>
        </div>
        <label className="sr-only">
          <input
            ref={inputRef}
            name="cover_file"
            type="file"
            accept="image/*,.heic,.heif"
            className="sr-only"
            onChange={(e) => void handlePick(e.currentTarget.files?.[0])}
          />
        </label>

        {previewUrl ? (
          <button
            type="button"
            onClick={clearCover}
            className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-text-secondary transition hover:text-eid-fg"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Cancelar troca
          </button>
        ) : null}

        {currentUrl || previewUrl ? (
          <button
            type="button"
            onClick={removeCover}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/15"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Remover capa
          </button>
        ) : null}
      </div>

      <input type="hidden" name="cover_remove" value={removeCurrent ? "1" : "0"} />
      {fileName ? (
        <p className="rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 px-3 py-2 text-[11px] font-semibold text-eid-primary-300">
          Capa pronta para envio. Toque em “Salvar e continuar” para salvar.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-300">
          {error}
        </p>
      ) : null}
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
  { id: "regras", label: "Regras", Icon: ShieldCheck },
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

function StepPerfil({ space, esportes, locaisExistentes, onNext, onBack }: {
  space: Space; esportes: Array<{ id: number; nome: string }>; locaisExistentes: LocalExistente[]; onNext: () => void; onBack?: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(salvarPerfilWizardAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [nomePublico, setNomePublico] = useState(space.nome_publico ?? "");
  const [slug, setSlug] = useState(space.slug ?? "");
  const [claimMode, setClaimMode] = useState(false);
  const [cep, setCep] = useState(space.cep ?? "");
  const [endereco, setEndereco] = useState(space.endereco ?? "");
  const [numero, setNumero] = useState(space.numero ?? "");
  const [bairro, setBairro] = useState(space.bairro ?? "");
  const [cidade, setCidade] = useState(space.cidade ?? "");
  const [uf, setUf] = useState(space.uf ?? "");
  const [complemento, setComplemento] = useState(space.complemento ?? "");
  const [lat, setLat] = useState(space.lat ?? "");
  const [lng, setLng] = useState(space.lng ?? "");
  const [whatsapp, setWhatsapp] = useState<Value | undefined>((space.whatsapp_contato ?? "") as Value | undefined);
  const [phoneCountry, setPhoneCountry] = useState<Country>("BR");
  const [websiteUrl, setWebsiteUrl] = useState(space.website_url ?? "");
  const [instagramUrl, setInstagramUrl] = useState(space.instagram_url ?? "");
  const selectedSports = new Set(space.esportes_ids);
  const normalizedNome = useMemo(() => normalizeEspacoDuplicateValue(nomePublico), [nomePublico]);
  const exactMatch = useMemo(() => {
    if (normalizedNome.length < 2) return null;
    return locaisExistentes.find((local) => normalizeEspacoDuplicateValue(local.nome_publico ?? "") === normalizedNome) ?? null;
  }, [locaisExistentes, normalizedNome]);
  const sugestoesLocais = useMemo(() => {
    if (normalizedNome.length < 3) return [];
    return locaisExistentes
      .map((local) => ({
        ...local,
        nomeNormalizado: normalizeEspacoDuplicateValue(local.nome_publico ?? ""),
      }))
      .filter((local) => {
        if (!local.nomeNormalizado) return false;
        return (
          local.nomeNormalizado === normalizedNome ||
          local.nomeNormalizado.includes(normalizedNome) ||
          normalizedNome.includes(local.nomeNormalizado) ||
          local.nomeNormalizado.split(" ").some((token) => token.startsWith(normalizedNome))
        );
      })
      .slice(0, 5);
  }, [locaisExistentes, normalizedNome]);
  const slugNormalizado = slugifyClient(slug);
  const slugEmUso = slugNormalizado.length >= 3 && locaisExistentes.some((local) => slugifyClient(local.slug ?? "") === slugNormalizado);

  useEffect(() => { if (state?.ok) onNext(); }, [onNext, state]);

  function fillFromExistingLocal(local: LocalExistente) {
    setNomePublico(local.nome_publico ?? "");
    setEndereco(local.endereco ?? "");
    setNumero(local.numero ?? "");
    setBairro(local.bairro ?? "");
    setCidade(local.cidade ?? "");
    setUf(local.estado ?? "");
    setCep(local.cep ?? "");
    setComplemento(local.complemento ?? "");
    setLat(local.lat ?? "");
    setLng(local.lng ?? "");
    setClaimMode(true);
  }

  function handleNomePublicoChange(next: string) {
    setNomePublico(next);
    setClaimMode(false);
    const normalized = normalizeEspacoDuplicateValue(next);
    const match = normalized.length >= 2
      ? locaisExistentes.find((local) => normalizeEspacoDuplicateValue(local.nome_publico ?? "") === normalized)
      : null;
    if (match) {
      setEndereco(match.endereco ?? "");
      setNumero(match.numero ?? "");
      setBairro(match.bairro ?? "");
      setCidade(match.cidade ?? "");
      setUf(match.estado ?? "");
      setCep(match.cep ?? "");
      setComplemento(match.complemento ?? "");
      setLat(match.lat ?? "");
      setLng(match.lng ?? "");
    }
  }

  return (
    <form ref={formRef} action={action} encType="multipart/form-data" className="space-y-4">
      <input type="hidden" name="espaco_id" value={space.id} />
      {claimMode && exactMatch ? (
        <input type="hidden" name="espaco_id_reivindicado" value={exactMatch.id} />
      ) : null}
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
              currentUrl={exactMatch?.logo_arquivo ?? space.logo_arquivo ?? null}
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
          <CoverUploadControl currentUrl={space.cover_arquivo ?? null} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Nome do espaço *</Label>
          <IconInput
            Icon={Building2}
            name="nome_publico"
            value={nomePublico}
            onChange={(e) => handleNomePublicoChange(e.target.value)}
            placeholder="Ex.: Arena Tennis Club"
            required
          />
          {sugestoesLocais.length > 0 ? (
            <div className="mt-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-2.5">
              <p className="text-[11px] font-black text-amber-200">
                Encontramos locais cadastrados. Toque no local correto para puxar os dados.
              </p>
              <div className="mt-2 space-y-1.5">
                {sugestoesLocais.map((local) => (
                  <button
                    key={local.id}
                    type="button"
                    onClick={() => fillFromExistingLocal(local)}
                    className="flex w-full items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-2.5 py-2 text-left transition hover:border-eid-primary-500/45 hover:bg-eid-primary-500/8"
                  >
                    {local.logo_arquivo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={local.logo_arquivo} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-eid-primary-500/10 text-[9px] font-black text-eid-primary-300">
                        EID
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-black text-eid-fg">{local.nome_publico ?? "Local cadastrado"}</span>
                      <span className="block truncate text-[11px] text-eid-text-secondary">{local.localizacao ?? "Sem localização"}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-eid-primary-300" aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {exactMatch ? (
          <div className="sm:col-span-2 rounded-2xl border border-eid-primary-500/30 bg-eid-primary-500/10 p-3">
            <div className="flex items-center gap-3">
              {exactMatch.logo_arquivo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={exactMatch.logo_arquivo} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-[color:var(--eid-border-subtle)] object-cover" />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 text-[10px] font-black text-eid-primary-300">
                  EID
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-eid-fg">{exactMatch.nome_publico ?? "Espaço cadastrado"}</p>
                <p className="truncate text-xs text-eid-text-secondary">{exactMatch.localizacao ?? "Localização não informada"}</p>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary">
              Encontramos um espaço com esse nome. Preenchi o endereço cadastrado abaixo. Se esse local é seu, solicite a propriedade para o admin revisar.
            </p>
            <button
              type="button"
              onClick={() => setClaimMode(true)}
              className={`mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black transition ${
                claimMode
                  ? "border border-emerald-500/35 bg-emerald-500/15 text-emerald-300"
                  : "border border-eid-primary-500/35 bg-eid-primary-500/12 text-eid-primary-200 hover:bg-eid-primary-500/18"
              }`}
            >
              <BadgeCheck className="h-4 w-4" aria-hidden />
              {claimMode ? "Solicitação de propriedade marcada" : "Solicitar propriedade deste local"}
            </button>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label>Link público (slug)</Label>
          <IconInput
            Icon={Hash}
            name="slug"
            value={slug}
            onChange={(e) => setSlug(slugifyClient(e.target.value))}
            placeholder="arena-tennis-club"
          />
          {slugNormalizado.length >= 3 ? (
            <p className={`rounded-xl border px-3 py-2 text-[11px] font-semibold ${
              slugEmUso
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
            }`}>
              {slugEmUso ? "Este link público já está em uso. Escolha outro." : "Link público disponível."}
            </p>
          ) : slug.length > 0 ? (
            <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-300">
              Digite pelo menos 3 caracteres para verificar.
            </p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Endereço completo do espaço</Label>
          <EnderecoAssistFields
            endereco={endereco}
            setEndereco={setEndereco}
            numero={numero}
            setNumero={setNumero}
            bairro={bairro}
            setBairro={setBairro}
            cidade={cidade}
            setCidade={setCidade}
            estado={uf}
            setEstado={setUf}
            cep={cep}
            setCep={setCep}
            complemento={complemento}
            setComplemento={setComplemento}
            lat={lat}
            lng={lng}
            onCoords={(nextLat, nextLng) => {
              setLat(nextLat);
              setLng(nextLng);
            }}
            localLogoUrl={exactMatch?.logo_arquivo ?? space.logo_arquivo ?? null}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Esportes atendidos</Label>
          <div className="flex flex-wrap gap-2 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 p-3">
            {esportes.map((esporte) => (
              <label
                key={esporte.id}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/70 px-3 py-2 text-xs font-bold text-eid-fg transition hover:border-eid-primary-500/40"
              >
                <input
                  type="checkbox"
                  name="esportes_ids"
                  value={esporte.id}
                  defaultChecked={selectedSports.has(esporte.id)}
                  className="h-4 w-4 rounded accent-eid-primary-500"
                />
                {esporte.nome}
              </label>
            ))}
          </div>
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
          <Label>Descrição do local</Label>
          <IconTextarea
            Icon={FileText}
            name="descricao_longa"
            defaultValue={space.descricao_longa ?? space.descricao_curta ?? ""}
            rows={4}
            placeholder="Descreva a estrutura, modalidades atendidas, diferenciais e informações importantes do espaço."
          />
        </div>
        <div className="sm:col-span-2 rounded-2xl border border-eid-primary-500/25 bg-eid-primary-500/8 p-4">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-eid-primary-500/12 p-2 text-eid-primary-300">
              <Wallet className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-eid-primary-300">
                Modelo de reserva no perfil
              </p>
              <p className="mt-1 text-sm font-black text-eid-fg">{modoReservaEspacoLabel(space.modo_reserva)}</p>
              <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">
                {modoReservaEspacoDesc(space.modo_reserva, space.aceita_socios)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Feedback state={state} />
      <NavButtons onBack={onBack} onNext={() => formRef.current?.requestSubmit()} pending={pending} />
    </form>
  );
}

function StepUnidades({ space, esportes, unidades, unidadeGate, onNext, onBack }: {
  space: Space; esportes: Array<{ id: number; nome: string }>; unidades: Unidade[]; unidadeGate: PaaSUnidadeGateInfo; onNext: () => void; onBack?: () => void;
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
  const podeAdicionar = limite == null || usadas < limite;
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
        subtitle="Cadastre cada quadra com imagem, modalidade, regra de reserva e padrão inicial de agenda."
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
              {podeAdicionar ? "Cadastro liberado" : "Limite de quadras atingido para este plano."}
            </p>
          </div>
        </div>
      </div>

      {unidadeGate.motivoBloqueio ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-4 text-xs text-amber-100">
          Você pode terminar o cadastro das quadras agora. A forma de pagamento só entra no fluxo de publicação ao
          finalizar o wizard.
        </div>
      ) : null}

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
                    {esporteNome(esportes, u.esporte_id) ? ` · ${esporteNome(esportes, u.esporte_id)}` : ""}
                    {u.coberta ? " · coberta" : ""}
                    {u.indoor ? " · indoor" : ""}
                    {u.iluminacao ? " · iluminada" : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-eid-primary-500/25 bg-eid-primary-500/8 px-2 py-0.5 text-[10px] font-bold text-eid-primary-300">
                      {modoReservaUnidadeLabel(u.modo_reserva)}
                    </span>
                    <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-0.5 text-[10px] font-semibold text-eid-text-secondary">
                      Intervalo: {u.intervalo_minutos ?? 60} min
                    </span>
                    {u.modalidade ? (
                      <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-0.5 text-[10px] font-semibold text-eid-text-secondary">
                        {u.modalidade}
                      </span>
                    ) : null}
                  </div>
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
          <SectionTitle Icon={LayoutGrid} title="Cadastrar nova quadra ou unidade" text="Organize os dados para facilitar a reserva, a agenda e a aprovação do espaço." />
          <input type="hidden" name="espaco_id" value={space.id} />

          <div className="space-y-3">
            <SectionTitle Icon={Type} title="Identificação da quadra" text="Use um nome curto, claro e fácil de localizar na agenda." />
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
              <div className="space-y-1.5">
                <Label>Esporte principal</Label>
                <IconSelect Icon={BadgeCheck} name="esporte_id" defaultValue={space.esportes_ids[0] ? String(space.esportes_ids[0]) : ""}>
                  <option value="">Não informado</option>
                  {esportes.map((esporte) => (
                    <option key={esporte.id} value={esporte.id}>{esporte.nome}</option>
                  ))}
                </IconSelect>
              </div>
              <div className="space-y-1.5">
                <Label>Modalidade ou observação curta</Label>
                <IconInput Icon={MessageSquareText} name="modalidade" placeholder="Ex.: Beach tennis, society, futsal" />
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
            <SectionTitle Icon={Wallet} title="Tipo de reserva desta quadra" text="Escolha se ela segue a regra do espaço ou tem uma operação própria." />
            <div className="grid gap-2 sm:grid-cols-2">
              {MODOS_RESERVA_UNIDADE.map(({ value, label, desc, Icon }) => (
                <label key={value} className="group cursor-pointer rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-3 transition has-[:checked]:border-eid-primary-500/60 has-[:checked]:bg-eid-primary-500/12">
                  <input type="radio" name="modo_reserva_unidade" value={value} defaultChecked={value === "herdar"} className="sr-only" />
                  <span className="flex items-start gap-2.5">
                    <span className="rounded-lg bg-eid-primary-500/10 p-1.5 text-eid-primary-300">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-black text-eid-fg">{label}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-eid-text-secondary">{desc}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle Icon={Clock} title="Agenda padrão" text="Defina como os horários serão montados na próxima etapa." />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Intervalo das reservas</Label>
                <IconSelect Icon={Clock} name="intervalo_minutos" defaultValue="60">
                  {INTERVALOS_RESERVA.map((minutos) => (
                    <option key={minutos} value={minutos}>{minutos} minutos</option>
                  ))}
                </IconSelect>
              </div>
              <div className="space-y-1.5">
                <Label>Modo de configuração</Label>
                <IconSelect Icon={LayoutGrid} name="agenda_modo" defaultValue="convencional">
                  <option value="convencional">Horário convencional</option>
                  <option value="especificos">Horários específicos</option>
                </IconSelect>
              </div>
              <div className="space-y-1.5">
                <Label>Abertura padrão</Label>
                <IconInput Icon={Clock} type="time" name="horario_padrao_inicio" defaultValue="08:00" />
              </div>
              <div className="space-y-1.5">
                <Label>Fechamento padrão</Label>
                <IconInput Icon={Clock} type="time" name="horario_padrao_fim" defaultValue="22:00" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle Icon={ShieldCheck} title="Características da estrutura" text="Marque somente o que descreve a estrutura física da quadra." />
            <div className="grid gap-2 sm:grid-cols-3">
              <Toggle label="Coberta" name="coberta" Icon={ShieldCheck} />
              <Toggle label="Ambiente interno" name="indoor" Icon={Building2} />
              <Toggle label="Iluminação" name="iluminacao" Icon={Lightbulb} />
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle Icon={BadgeCheck} title="Uso no aplicativo" text="Defina se essa quadra também pode aparecer em aulas e torneios." />
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

function StepHorarios({ space, unidades, horarios, onNext, onBack }: {
  space: Space; unidades: Unidade[]; horarios: Horario[]; onNext: () => void; onBack?: () => void;
}) {
  const horariosPorUnidade = useMemo(() => {
    const map = new Map<number, Map<number, Horario[]>>();
    for (const horario of horarios) {
      if (!horario.espaco_unidade_id) continue;
      if (!map.has(horario.espaco_unidade_id)) map.set(horario.espaco_unidade_id, new Map());
      const byDia = map.get(horario.espaco_unidade_id)!;
      if (!byDia.has(horario.dia_semana)) byDia.set(horario.dia_semana, []);
      byDia.get(horario.dia_semana)!.push(horario);
    }
    return map;
  }, [horarios]);

  const defaults = useMemo(() => {
    const abertos: Record<string, boolean> = {};
    const inicio: Record<string, string> = {};
    const fim: Record<string, string> = {};
    const slots: Record<string, string> = {};
    const modos: Record<number, string> = {};
    const intervalos: Record<number, string> = {};
    const intervalosPersonalizados: Record<number, string> = {};
    for (const unidade of unidades) {
      const config = agendaConfig(unidade);
      const intervaloPadrao = unidade.intervalo_minutos ?? 60;
      modos[unidade.id] = String(config.modo ?? "convencional");
      intervalos[unidade.id] = INTERVALOS_RESERVA.includes(intervaloPadrao) ? String(intervaloPadrao) : "personalizado";
      intervalosPersonalizados[unidade.id] = String(intervaloPadrao);
      const porDia = horariosPorUnidade.get(unidade.id);
      for (let dia = 0; dia <= 6; dia++) {
        const key = `${unidade.id}_${dia}`;
        const existentes = porDia?.get(dia) ?? [];
        abertos[key] = existentes.length > 0 || (horarios.length === 0 && dia >= 1 && dia <= 6);
        const inicioPadrao = horaCurta(String(config.horarioPadraoInicio ?? "08:00"));
        const fimPadrao = horaCurta(String(config.horarioPadraoFim ?? "22:00"));
        inicio[key] = existentes[0]?.hora_inicio ? horaCurta(existentes[0].hora_inicio) : inicioPadrao;
        fim[key] = existentes.at(-1)?.hora_fim ? horaCurta(existentes.at(-1)?.hora_fim) : fimPadrao;
        slots[key] = existentes.length > 0
          ? existentes.map((h) => `${horaCurta(h.hora_inicio)}-${horaCurta(h.hora_fim)}`).join("\n")
          : gerarGradeTexto(inicioPadrao, fimPadrao, intervaloPadrao);
      }
    }
    return { abertos, inicio, fim, slots, modos, intervalos, intervalosPersonalizados };
  }, [horarios.length, horariosPorUnidade, unidades]);

  const [abertos, setAbertos] = useState<Record<string, boolean>>(defaults.abertos);
  const [inicio, setInicio] = useState<Record<string, string>>(defaults.inicio);
  const [fim, setFim] = useState<Record<string, string>>(defaults.fim);
  const [slots, setSlots] = useState<Record<string, string>>(defaults.slots);
  const [modos, setModos] = useState<Record<number, string>>(defaults.modos);
  const [intervalos, setIntervalos] = useState<Record<number, string>>(defaults.intervalos);
  const [intervalosPersonalizados, setIntervalosPersonalizados] = useState<Record<number, string>>(defaults.intervalosPersonalizados);
  const [slotsEditados, setSlotsEditados] = useState<Record<string, boolean>>({});
  const [diasExpandidos, setDiasExpandidos] = useState<Record<string, boolean>>({});
  const [slotEditando, setSlotEditando] = useState<string | null>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(salvarGradeWizardAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) onNext(); }, [onNext, state]);

  const copiarSemanaParaFimDeSemana = (unidadeId: number) => {
    const origem = `${unidadeId}_1`;
    setInicio((p) => ({ ...p, [`${unidadeId}_0`]: p[origem] ?? "08:00", [`${unidadeId}_6`]: p[origem] ?? "08:00" }));
    setFim((p) => ({ ...p, [`${unidadeId}_0`]: p[origem] ?? "22:00", [`${unidadeId}_6`]: p[origem] ?? "22:00" }));
    setAbertos((p) => ({ ...p, [`${unidadeId}_0`]: true, [`${unidadeId}_6`]: true }));
    setSlotsEditados((p) => ({ ...p, [`${unidadeId}_0`]: false, [`${unidadeId}_6`]: false }));
  };

  const presetPadrao = (unidadeId: number) => {
    setModos((p) => ({ ...p, [unidadeId]: "convencional" }));
    setAbertos((p) => ({ ...p, ...Object.fromEntries(Array.from({ length: 7 }, (_, dia) => [`${unidadeId}_${dia}`, dia >= 1 && dia <= 6])) }));
    setInicio((p) => ({ ...p, ...Object.fromEntries(Array.from({ length: 7 }, (_, dia) => [`${unidadeId}_${dia}`, "08:00"])) }));
    setFim((p) => ({ ...p, ...Object.fromEntries(Array.from({ length: 7 }, (_, dia) => [`${unidadeId}_${dia}`, "22:00"])) }));
    setSlotsEditados((p) => ({ ...p, ...Object.fromEntries(Array.from({ length: 7 }, (_, dia) => [`${unidadeId}_${dia}`, false])) }));
  };

  const intervaloAtual = (unidadeId: number) => {
    const raw = intervalos[unidadeId] === "personalizado"
      ? intervalosPersonalizados[unidadeId]
      : intervalos[unidadeId];
    return Math.max(5, Math.min(360, Number(raw) || 60));
  };

  const setSlotsDoDia = (key: string, nextSlots: Array<{ inicio: string; fim: string }>) => {
    setSlots((p) => ({ ...p, [key]: slotsToText(nextSlots) }));
    setSlotsEditados((p) => ({ ...p, [key]: true }));
  };

  const removerSlot = (key: string, index: number, currentText: string) => {
    const next = parseSlotsClient(currentText).filter((_, i) => i !== index);
    setSlotsDoDia(key, next);
  };

  const atualizarSlot = (key: string, index: number, field: "inicio" | "fim", value: string, currentText: string, unidadeId: number) => {
    const next = parseSlotsClient(currentText, { keepInvalidRange: true });
    if (!next[index]) return;
    next[index] = { ...next[index], [field]: value };
    const inicioMin = timeToMinutesClient(next[index].inicio);
    const fimMin = timeToMinutesClient(next[index].fim);
    if (inicioMin == null || fimMin == null || fimMin <= inicioMin) {
      setSlots((p) => ({ ...p, [key]: slotsToText(next) }));
      setSlotsEditados((p) => ({ ...p, [key]: true }));
      return;
    }
    setSlotsDoDia(
      key,
      ajustarSlotsAposEdicao(next, index, inicio[key] ?? "00:00", fim[key] ?? "23:59", intervaloAtual(unidadeId))
    );
  };

  const adicionarSlot = (key: string, currentText: string, unidadeId: number) => {
    const next = parseSlotsClient(currentText);
    const intervalo = intervaloAtual(unidadeId);
    const inicioDiaMin = timeToMinutesClient(inicio[key] ?? "08:00") ?? 8 * 60;
    const fimDiaMin = timeToMinutesClient(fim[key] ?? "23:59") ?? 24 * 60;
    const ordenados = [...next].sort((a, b) => {
      const ai = timeToMinutesClient(a.inicio) ?? 0;
      const bi = timeToMinutesClient(b.inicio) ?? 0;
      return ai - bi;
    });
    let cursor = inicioDiaMin;
    let novoSlot: { inicio: string; fim: string } | null = null;
    for (const slot of ordenados) {
      const slotInicio = timeToMinutesClient(slot.inicio);
      const slotFim = timeToMinutesClient(slot.fim);
      if (slotInicio == null || slotFim == null || slotFim <= slotInicio) continue;
      if (slotInicio > cursor) {
        novoSlot = {
          inicio: minutesToTimeClient(cursor),
          fim: minutesToTimeClient(Math.min(slotInicio, cursor + intervalo)),
        };
        break;
      }
      cursor = Math.max(cursor, slotFim);
    }
    if (!novoSlot && cursor < fimDiaMin) {
      novoSlot = {
        inicio: minutesToTimeClient(cursor),
        fim: minutesToTimeClient(Math.min(fimDiaMin, cursor + intervalo)),
      };
    }
    if (!novoSlot) return;
    next.push(novoSlot);
    next.sort((a, b) => {
      const ai = timeToMinutesClient(a.inicio) ?? 0;
      const bi = timeToMinutesClient(b.inicio) ?? 0;
      return ai - bi;
    });
    setSlotsDoDia(key, next);
    setDiasExpandidos((p) => ({ ...p, [key]: true }));
  };

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <input type="hidden" name="espaco_id" value={space.id} />
      <StepHeader title="Horários por quadra" subtitle="Monte a agenda semanal de cada quadra com intervalos automáticos ou horários específicos." />

      <div className="space-y-4">
        {unidades.map((unidade) => (
          <div key={unidade.id} className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 p-4">
            <input type="hidden" name="unidade_id" value={unidade.id} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-base font-black text-eid-fg">{unidade.nome}</p>
                <p className="mt-0.5 text-xs text-eid-text-secondary">
                  {modoReservaUnidadeLabel(unidade.modo_reserva)} · intervalo sugerido de {unidade.intervalo_minutos ?? 60} min
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => presetPadrao(unidade.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-eid-primary-500/30 bg-eid-primary-500/8 px-3 py-1.5 text-xs font-semibold text-eid-primary-300 transition hover:bg-eid-primary-500/15">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  Seg-sáb 08:00-22:00
                </button>
                <button type="button" onClick={() => copiarSemanaParaFimDeSemana(unidade.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs font-semibold text-eid-text-secondary transition hover:text-eid-fg">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Copiar para fim de semana
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Formato da agenda</Label>
                <IconSelect
                  Icon={LayoutGrid}
                  name={`unidade_${unidade.id}_modo`}
                  value={modos[unidade.id] ?? "convencional"}
                  onChange={(e) => setModos((p) => ({ ...p, [unidade.id]: e.target.value }))}
                >
                  <option value="convencional">Gerar por intervalo</option>
                  <option value="especificos">Informar horários específicos</option>
                </IconSelect>
              </div>
              <div className="space-y-1.5">
                <Label>Intervalo</Label>
                <IconSelect
                  Icon={Clock}
                  value={intervalos[unidade.id] ?? "60"}
                  onChange={(e) => {
                    setIntervalos((p) => ({ ...p, [unidade.id]: e.target.value }));
                    setSlotsEditados((p) => ({ ...p, ...Object.fromEntries(Array.from({ length: 7 }, (_, dia) => [`${unidade.id}_${dia}`, false])) }));
                  }}
                >
                  {INTERVALOS_RESERVA.map((minutos) => (
                    <option key={minutos} value={minutos}>{minutos} minutos</option>
                  ))}
                  <option value="personalizado">Personalizado</option>
                </IconSelect>
                <input type="hidden" name={`unidade_${unidade.id}_intervalo`} value={intervaloAtual(unidade.id)} />
                {intervalos[unidade.id] === "personalizado" ? (
                  <div className="mt-2">
                    <IconInput
                      Icon={Clock}
                      type="number"
                      min={5}
                      max={360}
                      step={5}
                      value={intervalosPersonalizados[unidade.id] ?? "75"}
                      onChange={(e) => {
                        setIntervalosPersonalizados((p) => ({ ...p, [unidade.id]: e.target.value }));
                        setSlotsEditados((p) => ({ ...p, ...Object.fromEntries(Array.from({ length: 7 }, (_, dia) => [`${unidade.id}_${dia}`, false])) }));
                      }}
                      placeholder="Ex.: 75"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {Array.from({ length: 7 }, (_, dia) => {
                const key = `${unidade.id}_${dia}`;
                const aberto = Boolean(abertos[key]);
                const especificos = modos[unidade.id] === "especificos";
                const gradeGerada = gerarGradeTexto(inicio[key] ?? "08:00", fim[key] ?? "22:00", intervaloAtual(unidade.id));
                const gradeTexto = especificos || slotsEditados[key] ? (slots[key] ?? "") : gradeGerada;
                const slotsDia = parseSlotsClient(gradeTexto, { keepInvalidRange: Boolean(slotEditando?.startsWith(`${key}_`)) });
                const totalHorarios = slotsDia.length;
                const expandido = Boolean(diasExpandidos[key]);
                const slotsVisiveis = expandido ? slotsDia : slotsDia.slice(0, 8);
                return (
                  <div key={key} className={`rounded-xl border px-3 py-3 transition ${
                    aberto ? "border-eid-primary-500/25 bg-eid-surface/60" : "border-[color:var(--eid-border-subtle)] bg-eid-surface/25 opacity-70"
                  }`}>
                    <input type="hidden" name={`unidade_${unidade.id}_dia_${dia}_aberto`} value={aberto ? "on" : "off"} />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setAbertos((p) => ({ ...p, [key]: !p[key] }))}
                        className={`h-5 w-5 shrink-0 rounded border-2 transition-all ${
                          aberto ? "border-eid-primary-500 bg-eid-primary-500" : "border-eid-text-secondary/30 bg-transparent"
                        }`}
                        aria-label={aberto ? `Fechar ${DIAS[dia]}` : `Abrir ${DIAS[dia]}`}
                      />
                      <span className={`w-20 shrink-0 text-sm font-semibold ${aberto ? "text-eid-fg" : "text-eid-text-secondary"}`}>
                        {DIAS[dia]}
                      </span>
                      {!aberto ? <span className="text-xs text-eid-text-secondary">Fechado</span> : null}
                      {aberto ? (
                        <span className="ml-auto rounded-full border border-eid-primary-500/25 bg-eid-primary-500/8 px-2 py-0.5 text-[10px] font-bold text-eid-primary-300">
                          {totalHorarios} horário{totalHorarios === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                    {aberto ? (
                      <div className="mt-3 space-y-3">
                        {!especificos ? (
                          <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-1 focus-within:ring-1 focus-within:ring-eid-primary-500/40">
                            <Clock className="h-3.5 w-3.5 shrink-0 text-eid-primary-400" aria-hidden />
                            <input
                              type="time" name={`unidade_${unidade.id}_dia_${dia}_inicio`}
                              value={inicio[key] ?? "08:00"}
                              onChange={(e) => {
                                setInicio((p) => ({ ...p, [key]: e.target.value }));
                                setSlotsEditados((p) => ({ ...p, [key]: false }));
                              }}
                              className="w-[5.8rem] bg-transparent text-sm text-eid-fg focus:outline-none"
                            />
                          </div>
                          <span className="text-xs text-eid-text-secondary">até</span>
                          <div className="flex items-center gap-1.5 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-1 focus-within:ring-1 focus-within:ring-eid-primary-500/40">
                            <Clock className="h-3.5 w-3.5 shrink-0 text-eid-action-400" aria-hidden />
                            <input
                              type="time" name={`unidade_${unidade.id}_dia_${dia}_fim`}
                              value={fim[key] ?? "22:00"}
                              onChange={(e) => {
                                setFim((p) => ({ ...p, [key]: e.target.value }));
                                setSlotsEditados((p) => ({ ...p, [key]: false }));
                              }}
                              className="w-[5.8rem] bg-transparent text-sm text-eid-fg focus:outline-none"
                            />
                          </div>
                        </div>
                        ) : null}
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-eid-text-secondary">
                              Grade que será criada
                            </p>
                            <div className="flex items-center gap-2">
                              {!especificos && slotsEditados[key] ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSlots((p) => ({ ...p, [key]: gradeGerada }));
                                    setSlotsEditados((p) => ({ ...p, [key]: false }));
                                  }}
                                  className="text-[10px] font-bold text-eid-primary-300 hover:text-eid-primary-200"
                                >
                                  Regerar
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => adicionarSlot(key, gradeTexto, unidade.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-eid-primary-500/30 bg-eid-primary-500/8 px-2 py-1 text-[10px] font-bold text-eid-primary-300"
                              >
                                <Plus className="h-3 w-3" aria-hidden />
                                Horário
                              </button>
                            </div>
                          </div>
                          <input type="hidden" name={`unidade_${unidade.id}_dia_${dia}_slots`} value={gradeTexto} />
                          {slotsDia.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {slotsVisiveis.map((slot, index) => {
                                const editKey = `${key}_${index}`;
                                const editando = slotEditando === editKey;
                                return (
                                  <div
                                    key={editKey}
                                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition ${
                                      editando
                                        ? "border-eid-primary-500/60 bg-eid-primary-500/12"
                                        : "border-[color:var(--eid-border-subtle)] bg-eid-surface/60"
                                    }`}
                                  >
                                    <Clock className="h-3.5 w-3.5 shrink-0 text-eid-primary-300" aria-hidden />
                                    {editando ? (
                                      <>
                                        <input
                                          type="time"
                                          value={slot.inicio}
                                          onChange={(e) => atualizarSlot(key, index, "inicio", e.target.value, gradeTexto, unidade.id)}
                                          className="w-[4.9rem] bg-transparent text-xs font-bold text-eid-fg focus:outline-none"
                                        />
                                        <span className="text-eid-text-secondary">-</span>
                                        <input
                                          type="time"
                                          value={slot.fim}
                                          onChange={(e) => atualizarSlot(key, index, "fim", e.target.value, gradeTexto, unidade.id)}
                                          className="w-[4.9rem] bg-transparent text-xs font-bold text-eid-fg focus:outline-none"
                                        />
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setSlotEditando(editKey)}
                                        className="font-bold text-eid-fg"
                                      >
                                        {slot.inicio}-{slot.fim}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => removerSlot(key, index, gradeTexto)}
                                      className="rounded-md p-1 text-eid-text-secondary hover:bg-red-500/10 hover:text-red-300"
                                      aria-label={`Remover horário ${slot.inicio}-${slot.fim}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                  </div>
                                );
                              })}
                              {slotsDia.length > 8 ? (
                                <button
                                  type="button"
                                  onClick={() => setDiasExpandidos((p) => ({ ...p, [key]: !p[key] }))}
                                  className="inline-flex min-h-9 items-center rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 px-3 text-xs font-bold text-eid-primary-300"
                                >
                                  {expandido ? "Mostrar menos" : `Ver mais ${slotsDia.length - 8}`}
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <p className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] px-3 py-3 text-xs text-eid-text-secondary">
                              Nenhum horário gerado. Ajuste abertura, fechamento ou intervalo.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-xs text-amber-300">
        <strong>Dica:</strong> feriados são configurados na próxima etapa. Estes horários se aplicam a dias normais de funcionamento.
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

  const handleToggle = (formData: FormData, feriadoId: number, operar: boolean) => {
    startToggle(async () => {
      const fd = new FormData();
      fd.set("espaco_id", String(space.id));
      fd.set("feriado_id", String(feriadoId));
      fd.set("operar", String(operar));
      fd.set("hora_inicio", String(formData.get("hora_inicio") ?? "08:00"));
      fd.set("hora_fim", String(formData.get("hora_fim") ?? "18:00"));
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
        subtitle="Sincronize a lista pela API e defina, em poucos cliques, se o espaço abre e em qual horário."
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
            <form
              key={f.id}
              action={(formData) => handleToggle(formData, f.id, formData.get("operar") === "true")}
              className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-4 py-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-eid-fg">{f.nome ?? "Feriado"}</p>
                  <p className="text-[11px] text-eid-text-secondary">
                    {f.data_inicio === f.data_fim
                      ? formatDate(f.data_inicio)
                      : `${formatDate(f.data_inicio)} - ${formatDate(f.data_fim)}`}
                    {f.recorrente_anual ? " · anual" : ""}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[auto_auto_auto] sm:items-center">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-1 focus-within:ring-1 focus-within:ring-eid-primary-500/40">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-eid-primary-400" aria-hidden />
                      <input
                        type="time"
                        name="hora_inicio"
                        defaultValue={horaCurta(f.hora_inicio) || "08:00"}
                        className="w-[5.8rem] bg-transparent text-sm text-eid-fg focus:outline-none"
                      />
                    </div>
                    <span className="text-xs text-eid-text-secondary">até</span>
                    <div className="flex items-center gap-1.5 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-1 focus-within:ring-1 focus-within:ring-eid-primary-500/40">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-eid-action-400" aria-hidden />
                      <input
                        type="time"
                        name="hora_fim"
                        defaultValue={horaCurta(f.hora_fim) || "18:00"}
                        className="w-[5.8rem] bg-transparent text-sm text-eid-fg focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    name="operar"
                    value="true"
                    disabled={toggling}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                      f.operar_no_feriado ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40" : "bg-eid-surface/60 text-eid-text-secondary hover:text-eid-fg"
                    }`}
                  >Abre</button>
                  <button
                    type="submit"
                    name="operar"
                    value="false"
                    disabled={toggling}
                    className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                      !f.operar_no_feriado ? "bg-red-500/20 text-red-300 ring-1 ring-red-500/40" : "bg-eid-surface/60 text-eid-text-secondary hover:text-eid-fg"
                    }`}
                  >Fecha</button>
                </div>
              </div>
            </form>
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

function StepRegrasReservas({ space, reservaConfig, onNext, onBack }: {
  space: Space; reservaConfig: ReservaConfig; onNext: () => void; onBack?: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(salvarRegrasReservasWizardAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) onNext(); }, [onNext, state]);

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <input type="hidden" name="espaco_id" value={space.id} />
      <StepHeader
        title="Regras oficiais de reserva"
        subtitle="Defina a regra padrão do espaço. Os planos de sócio vão abrir com estes valores e só precisam mudar quando forem exceção."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Marcações por dia</Label>
          <IconInput Icon={Calendar} name="limite_reservas_dia" type="number" min={0} defaultValue={reservaConfig.limiteReservasDia} />
        </div>
        <div className="space-y-1.5">
          <Label>Marcações por semana</Label>
          <IconInput Icon={Calendar} name="limite_reservas_semana" type="number" min={0} defaultValue={reservaConfig.limiteReservasSemana} />
        </div>
        <div className="space-y-1.5">
          <Label>Intervalo entre marcações (h)</Label>
          <IconInput Icon={Clock} name="cooldown_horas" type="number" min={0} max={720} defaultValue={reservaConfig.cooldownHoras} />
        </div>
        <div className="space-y-1.5">
          <Label>Antecedência mínima (h)</Label>
          <IconInput Icon={Clock} name="antecedencia_min_horas" type="number" min={0} defaultValue={reservaConfig.antecedenciaMinHoras} />
        </div>
        <div className="space-y-1.5">
          <Label>Liberar agenda até</Label>
          <IconInput Icon={Calendar} name="antecedencia_max_dias" type="number" min={0} max={365} defaultValue={reservaConfig.antecedenciaMaxDias} />
        </div>
      </div>

      <div className="rounded-2xl border border-eid-primary-500/20 bg-eid-primary-500/5 p-4">
        <p className="text-sm font-bold text-eid-fg">Reservas gratuitas de sócio</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-3 text-sm font-semibold text-eid-fg">
            <input type="checkbox" name="reservas_gratis_liberadas" defaultChecked={reservaConfig.reservasGratisLiberadas} className="h-4 w-4 accent-eid-action-500" />
            Liberar benefício gratuito
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-3 text-sm font-semibold text-eid-fg">
            <input type="checkbox" name="bloqueia_inadimplente" defaultChecked={reservaConfig.bloqueiaInadimplente} className="h-4 w-4 accent-eid-action-500" />
            Bloquear inadimplente
          </label>
          <div className="space-y-1.5">
            <Label>Grátis por dia</Label>
            <IconInput Icon={Calendar} name="gratis_limite_reservas_dia_membro" type="number" min={0} defaultValue={reservaConfig.gratisLimiteReservasDiaMembro} />
          </div>
          <div className="space-y-1.5">
            <Label>Grátis por semana</Label>
            <IconInput Icon={Calendar} name="gratis_limite_reservas_semana_membro" type="number" min={0} defaultValue={reservaConfig.gratisLimiteReservasSemanaMembro} />
          </div>
          <div className="space-y-1.5">
            <Label>Intervalo grátis (h)</Label>
            <IconInput Icon={Clock} name="gratis_intervalo_horas_entre_reservas_membro" type="number" min={0} max={720} defaultValue={reservaConfig.gratisIntervaloHorasEntreReservasMembro} />
          </div>
          <div className="space-y-1.5">
            <Label>Agenda grátis até</Label>
            <IconInput Icon={Calendar} name="gratis_antecedencia_max_dias_membro" type="number" min={0} max={365} defaultValue={reservaConfig.gratisAntecedenciaMaxDiasMembro} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-eid-action-500/20 bg-eid-action-500/5 p-4">
        <p className="text-sm font-bold text-eid-fg">Cancelamento de reservas gratuitas</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-3 text-sm font-semibold text-eid-fg">
            <input type="checkbox" name="cancelamento_gratuita_permite" defaultChecked={reservaConfig.cancelamentoGratuitaPermite} className="h-4 w-4 accent-eid-action-500" />
            Aceitar cancelamento gratuito
          </label>
          <div className="space-y-1.5">
            <Label>Pode cancelar até (h antes)</Label>
            <IconInput Icon={Clock} name="cancelamento_gratuita_antecedencia_horas" type="number" min={0} max={720} defaultValue={reservaConfig.cancelamentoGratuitaAntecedenciaHoras} />
          </div>
          <div className="space-y-1.5">
            <Label>Multa de cancelamento</Label>
            <IconSelect Icon={Wallet} name="cancelamento_gratuita_multa_tipo" defaultValue={reservaConfig.cancelamentoGratuitaMultaTipo}>
              <option value="nenhuma">Sem multa</option>
              <option value="percentual">Percentual</option>
              <option value="fixa">Valor fixo</option>
            </IconSelect>
          </div>
          <div className="space-y-1.5">
            <Label>Multa (%)</Label>
            <IconInput Icon={Wallet} name="cancelamento_gratuita_multa_percentual" type="number" min={0} max={100} step="0.01" defaultValue={reservaConfig.cancelamentoGratuitaMultaPercentual} />
          </div>
          <div className="space-y-1.5">
            <Label>Multa fixa (R$)</Label>
            <IconInput Icon={Banknote} name="cancelamento_gratuita_multa_reais" type="number" min={0} step="0.01" defaultValue={(reservaConfig.cancelamentoGratuitaMultaCentavos / 100).toFixed(2)} />
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-3 text-sm font-semibold text-eid-fg">
            <input type="checkbox" name="cancelamento_gratuita_permite_apos_prazo" defaultChecked={reservaConfig.cancelamentoGratuitaPermiteAposPrazo} className="h-4 w-4 accent-eid-action-500" />
            Permitir cancelamento fora do prazo
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-eid-action-500/20 bg-eid-action-500/5 p-4">
        <p className="text-sm font-bold text-eid-fg">Cancelamento de reservas pagas</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-3 text-sm font-semibold text-eid-fg">
            <input type="checkbox" name="cancelamento_paga_permite" defaultChecked={reservaConfig.cancelamentoPagaPermite} className="h-4 w-4 accent-eid-action-500" />
            Aceitar cancelamento pago
          </label>
          <div className="space-y-1.5">
            <Label>Pode cancelar até (h antes)</Label>
            <IconInput Icon={Clock} name="cancelamento_paga_antecedencia_horas" type="number" min={0} max={720} defaultValue={reservaConfig.cancelamentoPagaAntecedenciaHoras} />
          </div>
          <div className="space-y-1.5">
            <Label>Multa de cancelamento</Label>
            <IconSelect Icon={Wallet} name="cancelamento_paga_multa_tipo" defaultValue={reservaConfig.cancelamentoPagaMultaTipo}>
              <option value="nenhuma">Sem multa</option>
              <option value="percentual">Percentual</option>
              <option value="fixa">Valor fixo</option>
            </IconSelect>
          </div>
          <div className="space-y-1.5">
            <Label>Multa (%)</Label>
            <IconInput Icon={Wallet} name="cancelamento_paga_multa_percentual" type="number" min={0} max={100} step="0.01" defaultValue={reservaConfig.cancelamentoPagaMultaPercentual} />
          </div>
          <div className="space-y-1.5">
            <Label>Multa fixa (R$)</Label>
            <IconInput Icon={Banknote} name="cancelamento_paga_multa_reais" type="number" min={0} step="0.01" defaultValue={(reservaConfig.cancelamentoPagaMultaCentavos / 100).toFixed(2)} />
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-3 text-sm font-semibold text-eid-fg">
            <input type="checkbox" name="cancelamento_paga_permite_apos_prazo" defaultChecked={reservaConfig.cancelamentoPagaPermiteAposPrazo} className="h-4 w-4 accent-eid-action-500" />
            Permitir cancelamento fora do prazo
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-eid-primary-500/20 bg-eid-primary-500/5 p-4">
        <p className="text-sm font-bold text-eid-fg">Transferência e fila</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-3 text-sm font-semibold text-eid-fg">
            <input type="checkbox" name="permite_transferencia_reserva" defaultChecked={reservaConfig.permiteTransferenciaReserva} className="h-4 w-4 accent-eid-action-500" />
            Membro pode transferir reserva
          </label>
          <div className="space-y-1.5">
            <Label>Transferir até (h antes)</Label>
            <IconInput Icon={Clock} name="transferencia_antecedencia_horas" type="number" min={0} max={720} defaultValue={reservaConfig.transferenciaAntecedenciaHoras} />
          </div>
          <div className="space-y-1.5">
            <Label>Observação da regra</Label>
            <IconInput Icon={FileText} name="politica_cancelamento" defaultValue={reservaConfig.politicaCancelamento} placeholder="Ex.: estorno em até 2 dias úteis" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Observações públicas</Label>
          <IconTextarea Icon={MessageSquareText} name="observacoes_publicas" rows={3} defaultValue={reservaConfig.observacoesPublicas} />
        </div>
      </div>

      <Feedback state={state} />
      <NavButtons onBack={onBack} onNext={() => formRef.current?.requestSubmit()} pending={pending} />
    </form>
  );
}

function planoHerdaRegraWizard(plano: Plano, key: string) {
  const herdar = plano.beneficios_json?.herdar_regras_globais;
  return Boolean(
    herdar &&
      typeof herdar === "object" &&
      !Array.isArray(herdar) &&
      (herdar as Record<string, unknown>)[key] === true
  );
}

function StepPlanos({ space, planos, reservaConfig, onNext, onBack, onSkip }: {
  space: Space; planos: Plano[]; reservaConfig: ReservaConfig; onNext: () => void; onBack?: () => void; onSkip?: () => void;
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
                  {" · "}
                  {planoHerdaRegraWizard(p, "reservas_gratuitas_semana")
                    ? "segue grátis global"
                    : Number(p.reservas_gratuitas_semana ?? 0) === 0
                    ? "grátis ilimitadas"
                    : `${Number(p.reservas_gratuitas_semana ?? 0)} grátis/semana`}
                  {" · "}
                  {planoHerdaRegraWizard(p, "limite_reservas_semana")
                    ? "segue limite global"
                    : Number(p.limite_reservas_semana ?? 0) > 0
                    ? `${Number(p.limite_reservas_semana)} marcações/semana`
                    : "sem limite semanal"}
                  {" · "}
                  {planoHerdaRegraWizard(p, "antecedencia_max_dias")
                    ? "segue agenda global"
                    : Number(p.antecedencia_max_dias ?? 0) === 0
                    ? "agenda sem limite"
                    : `agenda ${Number(p.antecedencia_max_dias)} dia(s)`}
                  {p.beneficios_json?.uma_reserva_ativa_por_vez ? " · 1 ativa por vez" : ""}
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
              <IconInput Icon={Calendar} name="reservas_gratis" type="number" min={0} max={999} defaultValue={reservaConfig.gratisLimiteReservasSemanaMembro} />
              <label className="flex items-center gap-2 text-xs font-semibold text-eid-text-secondary">
                <input type="checkbox" name="herdar_reservas_gratuitas_semana" defaultChecked className="h-4 w-4 accent-eid-action-500" />
                Seguir regra global
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>Marcações totais / semana</Label>
              <IconInput Icon={Calendar} name="limite_reservas_semana" type="number" min={0} max={60} defaultValue={reservaConfig.limiteReservasSemana} />
              <label className="flex items-center gap-2 text-xs font-semibold text-eid-text-secondary">
                <input type="checkbox" name="herdar_limite_reservas_semana" defaultChecked className="h-4 w-4 accent-eid-action-500" />
                Seguir regra global
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>Intervalo entre marcações (h)</Label>
              <IconInput Icon={Clock} name="cooldown_horas" type="number" min={0} max={720} defaultValue={reservaConfig.cooldownHoras} />
              <label className="flex items-center gap-2 text-xs font-semibold text-eid-text-secondary">
                <input type="checkbox" name="herdar_cooldown_horas" defaultChecked className="h-4 w-4 accent-eid-action-500" />
                Seguir regra global
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>Liberação da agenda (dias)</Label>
              <input type="hidden" name="antecedencia_max_dias_preset" value="custom" />
              <IconInput Icon={Calendar} name="antecedencia_max_dias_custom" type="number" min={0} max={365} defaultValue={reservaConfig.antecedenciaMaxDias} />
              <label className="flex items-center gap-2 text-xs font-semibold text-eid-text-secondary">
                <input type="checkbox" name="herdar_antecedencia_max_dias" defaultChecked className="h-4 w-4 accent-eid-action-500" />
                Seguir regra global
              </label>
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3 text-sm text-eid-fg sm:col-span-2">
              <input type="checkbox" name="uma_reserva_ativa_por_vez" className="mt-1 h-4 w-4 accent-eid-action-500" />
              <span>
                <span className="block font-bold">1 marcação ativa por vez</span>
                <span className="block text-xs text-eid-text-secondary">
                  O sócio só consegue reservar de novo depois de cancelar ou finalizar a reserva atual.
                </span>
              </span>
            </label>
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
  const [modoIntegracao, setModoIntegracao] = useState(
    parceiro?.onboarding_status === "aguardando_conexao_asaas" ? "conta_existente" : "criar_nova"
  );
  useEffect(() => { if (state?.ok) onNext(); }, [onNext, state]);

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <input type="hidden" name="espaco_id" value={space.id} />
      <input type="hidden" name="modo_integracao" value={modoIntegracao} />
      <StepHeader
        title="Conta de recebimentos"
        subtitle="Informe uma conta Asaas existente ou crie uma nova conta de recebimentos pelo EsporteID."
      />

      <div className="grid gap-3 md:grid-cols-2">
        {[
          {
            id: "criar_nova",
            Icon: Sparkles,
            title: "Cadastrar no Asaas",
            text: "Crie uma nova conta de recebimentos com os dados exigidos pelo Asaas.",
          },
          {
            id: "conta_existente",
            Icon: BadgeCheck,
            title: "Informar conta Asaas",
            text: "Use o e-mail e CPF/CNPJ da conta Asaas que o espaço já possui.",
          },
        ].map((option) => {
          const selected = modoIntegracao === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setModoIntegracao(option.id)}
              className={`flex min-h-28 items-start gap-3 rounded-xl border p-4 text-left transition ${
                selected
                  ? "border-eid-action-500/70 bg-eid-action-500/12 shadow-[0_10px_30px_-18px_rgba(249,115,22,0.85)]"
                  : "border-[color:var(--eid-border-subtle)] bg-eid-surface/45 hover:border-eid-primary-500/45"
              }`}
              aria-pressed={selected}
            >
              <span className={`rounded-lg p-2 ${selected ? "bg-eid-action-500/18 text-eid-action-300" : "bg-eid-primary-500/10 text-eid-primary-300"}`}>
                <option.Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 space-y-1">
                <span className="block text-sm font-black text-eid-fg">{option.title}</span>
                <span className="block text-xs leading-relaxed text-eid-text-secondary">{option.text}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2 rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 p-4 text-xs text-eid-text-secondary">
        <p className="text-sm font-bold text-eid-fg">
          {modoIntegracao === "criar_nova" ? "Cadastro Asaas" : "Conta Asaas existente"}
        </p>
        {modoIntegracao === "criar_nova" ? (
          <>
            <p>Preencha os dados da conta. O EsporteID usa essas informações para criar a subconta Asaas de recebimentos.</p>
            <p>Selfie, documentos e prova de vida continuam no link seguro do Asaas quando forem exigidos.</p>
          </>
        ) : (
          <>
            <p>Informe os dados cadastrais e o Wallet ID da conta Asaas existente para direcionar os recebimentos.</p>
            <p>O EsporteID não pede nem salva a senha da conta Asaas; sem Wallet ID não há como saber para qual carteira enviar o dinheiro.</p>
          </>
        )}
      </div>

      {modoIntegracao === "conta_existente" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>E-mail da conta Asaas *</Label>
            <IconInput Icon={Mail} name="email" defaultValue={parceiro?.email ?? ""} placeholder="financeiro@seuespaco.com" type="email" required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>CPF ou CNPJ da conta Asaas *</Label>
            <IconInput Icon={IdCard} name="cpf_cnpj" defaultValue={parceiro?.cpf_cnpj ?? ""} placeholder="000.000.000-00" required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Wallet ID da conta Asaas *</Label>
            <IconInput Icon={Wallet} name="wallet_id" defaultValue={parceiro?.wallet_id ?? ""} placeholder="ID da carteira Asaas" required />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nome / Razão social *</Label>
            <IconInput Icon={Wallet} name="nome_razao_social" defaultValue={parceiro?.nome_razao_social ?? ""} placeholder="Seu nome ou nome da empresa" required />
          </div>
          <div className="space-y-1.5">
            <Label>CPF ou CNPJ *</Label>
            <IconInput Icon={IdCard} name="cpf_cnpj" defaultValue={parceiro?.cpf_cnpj ?? ""} placeholder="000.000.000-00" required />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail da nova conta *</Label>
            <IconInput Icon={Mail} name="email" defaultValue={parceiro?.email ?? ""} placeholder="financeiro@seuespaco.com" type="email" required />
          </div>
          <div className="space-y-1.5">
            <Label>Data de nascimento *</Label>
            <IconInput Icon={Calendar} name="asaas_birth_date" type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de empresa *</Label>
            <IconSelect Icon={Building2} name="asaas_company_type" defaultValue="MEI" required>
              <option value="MEI">MEI</option>
              <option value="LIMITED">LTDA</option>
              <option value="INDIVIDUAL">Individual</option>
              <option value="ASSOCIATION">Associação</option>
            </IconSelect>
          </div>
          <div className="space-y-1.5">
            <Label>Telefone fixo</Label>
            <IconInput Icon={Phone} name="asaas_phone" placeholder="11 3230-0606" />
          </div>
          <div className="space-y-1.5">
            <Label>Celular *</Label>
            <IconInput Icon={Phone} name="asaas_mobile_phone" placeholder="11 99336-7861" required />
          </div>
          <div className="space-y-1.5">
            <Label>CEP *</Label>
            <IconInput Icon={MapPin} name="asaas_postal_code" defaultValue={space.cep ?? ""} placeholder="00000-000" required />
          </div>
          <div className="space-y-1.5">
            <Label>Bairro *</Label>
            <IconInput Icon={MapPin} name="asaas_province" defaultValue={space.bairro ?? ""} placeholder="Bairro" required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Endereço *</Label>
            <IconInput Icon={MapPin} name="asaas_address" defaultValue={space.endereco ?? ""} placeholder="Rua, avenida ou estrada" required />
          </div>
          <div className="space-y-1.5">
            <Label>Número *</Label>
            <IconInput Icon={Hash} name="asaas_address_number" defaultValue={space.numero ?? ""} placeholder="277" required />
          </div>
          <div className="space-y-1.5">
            <Label>Complemento</Label>
            <IconInput Icon={MapPin} name="asaas_complement" defaultValue={space.complemento ?? ""} placeholder="Sala, bloco, quadra..." />
          </div>
        </div>
      )}

      {parceiro?.onboarding_status && (
        <p className="text-xs text-eid-text-secondary">
          Status atual: <span className="font-semibold text-eid-fg">{parceiro.onboarding_status}</span>
        </p>
      )}

      <Feedback state={state} />
      <NavButtons onBack={onBack} onNext={() => formRef.current?.requestSubmit()}
        pending={pending} nextLabel={modoIntegracao === "criar_nova" ? "Cadastrar no Asaas" : "Entrar no Asaas"} onSkip={onSkip} skipLabel="Configurar depois" />
    </form>
  );
}

function StepConclusao({ space, unidades, horarios, planos, parceiro }: {
  space: Space; unidades: Unidade[]; horarios: Horario[];
  planos: Plano[]; parceiro: Parceiro;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(concluirOnboardingAction, undefined);
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
      <StepHeader title="Cadastro pronto para análise" subtitle="Revise o que foi configurado e envie para aprovação do admin." />

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
        Você pode ajustar qualquer configuração pelo painel. O espaço só aparece para atletas depois da forma de
        pagamento exigida estar configurada e o admin aprovar a publicação.
      </div>

      <form action={action} className="space-y-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 p-4">
        <input type="hidden" name="espaco_id" value={space.id} />
        <SectionTitle
          Icon={FileText}
          title="Documento de comprovação"
          text="Envie contrato social, comprovante do local, autorização ou outro documento que comprove vínculo com o espaço."
        />
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-eid-primary-500/40 bg-eid-primary-500/8 px-4 py-4 text-sm font-bold text-eid-primary-200 transition hover:bg-eid-primary-500/12">
          <FileText className="h-4 w-4" aria-hidden />
          Anexar documento
          <input name="documento_validacao" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="sr-only" />
        </label>
        <IconTextarea
          Icon={MessageSquareText}
          name="mensagem_validacao"
          rows={3}
          placeholder="Observação para o admin (opcional)"
        />
        <Feedback state={state} />
        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-eid-primary-500 px-6 py-4 text-base font-bold text-white shadow-[0_8px_24px_-8px_rgba(37,99,235,0.6)] transition hover:bg-eid-primary-600 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
          Enviar cadastro para análise
        </button>
      </form>
    </div>
  );
}

// ── Wizard principal ───────────────────────────────────────────────────────

export function EspacoOnboardingWizard({
  space, esportes, locaisExistentes, unidades, unidadeGate, planosPaaS, horarios, feriados, planos, parceiro, reservaConfig,
}: WizardProps) {
  const storageKey = `eid:onboarding-step-${space.id}`;
  const [step, setStep] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Math.min(Number(localStorage.getItem(storageKey) ?? "0"), STEPS.length - 1);
  });
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [modoReserva, setModoReserva] = useState(space.modo_reserva ?? "mista");
  const [aceitaSocios, setAceitaSocios] = useState(space.aceita_socios ?? true);

  const exigePlanoPlataforma = modoReserva === "gratuita" || modoReserva === "mista";
  const skipPlanoPlataforma = !exigePlanoPlataforma;
  const skipPlanos = modoReserva === "gratuita" ? false : !aceitaSocios;
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
            <StepPerfil space={space} esportes={esportes} locaisExistentes={locaisExistentes} onNext={advance} onBack={goBack} />
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
              esportes={esportes}
              unidades={unidades}
              unidadeGate={unidadeGate}
              onNext={advance}
              onBack={goBack}
            />
          )}
          {currentStep?.id === "horarios" && (
            <StepHorarios space={space} unidades={unidades} horarios={horarios} onNext={advance} onBack={goBack} />
          )}
          {currentStep?.id === "feriados" && (
            <StepFeriados space={space} feriados={feriados} onNext={advance} onBack={goBack} />
          )}
          {currentStep?.id === "regras" && (
            <StepRegrasReservas space={space} reservaConfig={reservaConfig} onNext={advance} onBack={goBack} />
          )}
          {currentStep?.id === "planos" && (
            <StepPlanos space={space} planos={planos} reservaConfig={reservaConfig} onNext={advance} onBack={goBack} onSkip={advance} />
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
