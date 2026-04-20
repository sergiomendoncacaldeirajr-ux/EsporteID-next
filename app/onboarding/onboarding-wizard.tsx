"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogoFull } from "@/components/brand/logo-full";
import {
  salvarPapeisOnboarding,
  salvarEsportesOnboarding,
  salvarExtrasOnboarding,
  salvarPerfilOnboarding,
  type OnboardingActionResult,
} from "./actions";

const ONBOARDING_DRAFT_KEY_PREFIX = "eid_onboarding_draft_v1";

const ROLES = [
  { id: "atleta", titulo: "Atleta", desc: "Joga, busca ranking, match e desafios." },
  {
    id: "professor",
    titulo: "Professor / técnico",
    desc: "Acompanha alunos e pode aparecer no ecossistema como referência.",
  },
  {
    id: "organizador",
    titulo: "Organizador de torneios",
    desc: "Cria e gerencia eventos (liberado conforme regras do app).",
  },
  {
    id: "espaco",
    titulo: "Dono de espaço / arena",
    desc: "Quadra, campo, piscina, clube — cadastra o local e esportes atendidos.",
  },
] as const;

const ESTRUTURAS = [
  { id: "quadra", label: "Quadra" },
  { id: "campo", label: "Campo" },
  { id: "piscina", label: "Piscina" },
  { id: "sala", label: "Sala / indoor" },
  { id: "estadio", label: "Estádio" },
] as const;

type Step = "papeis" | "esportes" | "extras" | "perfil";

type Props = {
  userId: string;
  primeiroNome: string;
  initialStep: Step;
  esportes: {
    id: number;
    nome: string;
    permiteIndividual: boolean;
    permiteDupla: boolean;
    permiteTime: boolean;
  }[];
  locais: { id: number; nome: string; localizacao: string; donoUsuarioId: string | null }[];
  selectedPapeis: string[];
  selectedEsportes: number[];
  selectedEsportesInteresse: Record<number, "ranking" | "ranking_e_amistoso" | "amistoso">;
  selectedEsportesModalidade: Record<number, "individual" | "dupla" | "time">;
  extrasInitial: {
    expModo: "aprox" | "exato";
    expAprox: "menos_1" | "1_3" | "mais_3";
    expMes: number | null;
    expAno: number | null;
    orgEsporteId: number | null;
    orgEsportesIds: number[];
    orgLocalModo: "existente" | "novo";
    orgLocalId: number | null;
    orgLocalMsg: string;
    espacoNome: string;
    espacoEsportes: number[];
    estruturas: string[];
    reservaModelo: "livre" | "socios" | "pago" | "misto";
    reservaNotas: string;
    espacoEndereco: string;
    espacoNumero: string;
    espacoBairro: string;
    espacoCidade: string;
    espacoEstado: string;
    espacoCep: string;
    espacoComplemento: string;
  };
  profileInitial: {
    nome: string;
    username: string;
    localizacao: string;
    alturaCm: number | null;
    pesoKg: number | null;
    lado: string | null;
    avatarUrl: string | null;
    bio: string;
    estiloJogo: string;
    disponibilidadeSemanaJson: string;
  };
};

export function OnboardingWizard({
  userId,
  primeiroNome,
  initialStep,
  esportes,
  locais,
  selectedPapeis,
  selectedEsportes,
  selectedEsportesInteresse,
  selectedEsportesModalidade,
  extrasInitial,
  profileInitial,
}: Props) {
  const draftKey = `${ONBOARDING_DRAFT_KEY_PREFIX}:${userId}`;
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialStep);
  const [message, setMessage] = useState<string | null>(null);
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [papeis, setPapeis] = useState<Set<string>>(new Set(selectedPapeis));
  const [esportesSel, setEsportesSel] = useState<Set<number>>(new Set(selectedEsportes));
  const [esportesInteresse, setEsportesInteresse] = useState<Record<number, "ranking" | "ranking_e_amistoso" | "amistoso">>(
    selectedEsportesInteresse
  );
  const [esportesModalidade, setEsportesModalidade] = useState<Record<number, "individual" | "dupla" | "time">>(
    selectedEsportesModalidade
  );
  const [expModo, setExpModo] = useState<"aprox" | "exato">(extrasInitial.expModo);
  const [expAprox, setExpAprox] = useState<"menos_1" | "1_3" | "mais_3">(extrasInitial.expAprox);
  const [expMes, setExpMes] = useState<string>(extrasInitial.expMes ? String(extrasInitial.expMes) : "");
  const [expAno, setExpAno] = useState<string>(extrasInitial.expAno ? String(extrasInitial.expAno) : "");
  const [orgEsporteId, setOrgEsporteId] = useState<string>(
    extrasInitial.orgEsporteId ? String(extrasInitial.orgEsporteId) : "0"
  );
  const [orgEsportes, setOrgEsportes] = useState<Set<number>>(new Set(extrasInitial.orgEsportesIds));
  const [orgLocalModo, setOrgLocalModo] = useState<"existente" | "novo">(extrasInitial.orgLocalModo);
  const [orgLocalId, setOrgLocalId] = useState<string>(extrasInitial.orgLocalId ? String(extrasInitial.orgLocalId) : "0");
  const [orgLocalMsg, setOrgLocalMsg] = useState<string>(extrasInitial.orgLocalMsg);
  const [orgNovoLocalNome, setOrgNovoLocalNome] = useState<string>("");
  const [orgNovoLocalEndereco, setOrgNovoLocalEndereco] = useState<string>("");
  const [orgNovoLocalCidade, setOrgNovoLocalCidade] = useState<string>("");
  const [orgNovoLocalEstado, setOrgNovoLocalEstado] = useState<string>("");
  const [orgNovoLocalCep, setOrgNovoLocalCep] = useState<string>("");
  const [orgNovoLocalLat, setOrgNovoLocalLat] = useState<string>("");
  const [orgNovoLocalLng, setOrgNovoLocalLng] = useState<string>("");
  const [espacoNome, setEspacoNome] = useState<string>(extrasInitial.espacoNome);
  const [espacoEsportes, setEspacoEsportes] = useState<Set<number>>(new Set(extrasInitial.espacoEsportes));
  const [estruturas, setEstruturas] = useState<Set<string>>(new Set(extrasInitial.estruturas));
  const [reservaModelo, setReservaModelo] = useState<"livre" | "socios" | "pago" | "misto">(
    extrasInitial.reservaModelo
  );
  const [reservaNotas, setReservaNotas] = useState<string>(extrasInitial.reservaNotas);
  const [espacoEndereco, setEspacoEndereco] = useState<string>(extrasInitial.espacoEndereco);
  const [espacoNumero, setEspacoNumero] = useState<string>(extrasInitial.espacoNumero);
  const [espacoBairro, setEspacoBairro] = useState<string>(extrasInitial.espacoBairro);
  const [espacoCidade, setEspacoCidade] = useState<string>(extrasInitial.espacoCidade);
  const [espacoEstado, setEspacoEstado] = useState<string>(extrasInitial.espacoEstado);
  const [espacoCep, setEspacoCep] = useState<string>(extrasInitial.espacoCep);
  const [espacoComplemento, setEspacoComplemento] = useState<string>(extrasInitial.espacoComplemento);
  const [nome, setNome] = useState<string>(profileInitial.nome);
  const [username, setUsername] = useState<string>(profileInitial.username);
  const [localizacao, setLocalizacao] = useState<string>(profileInitial.localizacao);
  const [alturaCm, setAlturaCm] = useState<string>(
    profileInitial.alturaCm ? String(profileInitial.alturaCm) : ""
  );
  const [pesoKg, setPesoKg] = useState<string>(
    profileInitial.pesoKg ? String(profileInitial.pesoKg) : ""
  );
  const [lado, setLado] = useState<string>(profileInitial.lado ?? "");
  const [bio, setBio] = useState<string>(profileInitial.bio);
  const [estiloJogo, setEstiloJogo] = useState<string>(profileInitial.estiloJogo);
  const [disponibilidadeSemanaJson, setDisponibilidadeSemanaJson] = useState<string>(
    profileInitial.disponibilidadeSemanaJson || "{}"
  );
  const fotoInputRef = useRef<HTMLInputElement | null>(null);
  const fotoCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fotoGaleriaInputRef = useRef<HTMLInputElement | null>(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null);
  const [fotoPosX, setFotoPosX] = useState<number>(50);
  const [fotoPosY, setFotoPosY] = useState<number>(50);
  const [fotoZoom, setFotoZoom] = useState<number>(1);
  const [fotoSelecionadaNome, setFotoSelecionadaNome] = useState<string | null>(null);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    setPapeis(new Set(selectedPapeis));
  }, [selectedPapeis]);

  useEffect(() => {
    setEsportesSel(new Set(selectedEsportes));
  }, [selectedEsportes]);

  useEffect(() => {
    setEsportesInteresse(selectedEsportesInteresse);
  }, [selectedEsportesInteresse]);

  useEffect(() => {
    setEsportesModalidade(selectedEsportesModalidade);
  }, [selectedEsportesModalidade]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<{
        step: Step;
        papeis: string[];
        esportesSel: number[];
        esportesInteresse: Record<number, "ranking" | "ranking_e_amistoso">;
        esportesModalidade: Record<number, "individual" | "dupla" | "time">;
        expModo: "aprox" | "exato";
        expAprox: "menos_1" | "1_3" | "mais_3";
        expMes: string;
        expAno: string;
        orgEsporteId: string;
        orgEsportes: number[];
        orgLocalModo: "existente" | "novo";
        orgLocalId: string;
        orgLocalMsg: string;
        orgNovoLocalNome: string;
        orgNovoLocalEndereco: string;
        orgNovoLocalCidade: string;
        orgNovoLocalEstado: string;
        orgNovoLocalCep: string;
        orgNovoLocalLat: string;
        orgNovoLocalLng: string;
        espacoNome: string;
        espacoEsportes: number[];
        estruturas: string[];
        reservaModelo: "livre" | "socios" | "pago" | "misto";
        reservaNotas: string;
        espacoEndereco: string;
        espacoNumero: string;
        espacoBairro: string;
        espacoCidade: string;
        espacoEstado: string;
        espacoCep: string;
        espacoComplemento: string;
        nome: string;
        username: string;
        localizacao: string;
        alturaCm: string;
        pesoKg: string;
        lado: string;
        bio: string;
        estiloJogo: string;
        disponibilidadeSemanaJson: string;
      }>;
      if (
        draft.step &&
        ["papeis", "esportes", "extras", "perfil"].includes(draft.step)
      ) {
        setStep(draft.step);
      }
      if (draft.papeis) setPapeis(new Set(draft.papeis));
      if (draft.esportesSel) setEsportesSel(new Set(draft.esportesSel));
      if (draft.esportesInteresse) setEsportesInteresse(draft.esportesInteresse);
      if (draft.esportesModalidade) setEsportesModalidade(draft.esportesModalidade);
      if (draft.expModo) setExpModo(draft.expModo);
      if (draft.expAprox) setExpAprox(draft.expAprox);
      if (typeof draft.expMes === "string") setExpMes(draft.expMes);
      if (typeof draft.expAno === "string") setExpAno(draft.expAno);
      if (typeof draft.orgEsporteId === "string") setOrgEsporteId(draft.orgEsporteId);
      if (draft.orgEsportes) setOrgEsportes(new Set(draft.orgEsportes));
      if (draft.orgLocalModo) setOrgLocalModo(draft.orgLocalModo);
      if (typeof draft.orgLocalId === "string") setOrgLocalId(draft.orgLocalId);
      if (typeof draft.orgLocalMsg === "string") setOrgLocalMsg(draft.orgLocalMsg);
      if (typeof draft.orgNovoLocalNome === "string") setOrgNovoLocalNome(draft.orgNovoLocalNome);
      if (typeof draft.orgNovoLocalEndereco === "string") setOrgNovoLocalEndereco(draft.orgNovoLocalEndereco);
      if (typeof draft.orgNovoLocalCidade === "string") setOrgNovoLocalCidade(draft.orgNovoLocalCidade);
      if (typeof draft.orgNovoLocalEstado === "string") setOrgNovoLocalEstado(draft.orgNovoLocalEstado);
      if (typeof draft.orgNovoLocalCep === "string") setOrgNovoLocalCep(draft.orgNovoLocalCep);
      if (typeof draft.orgNovoLocalLat === "string") setOrgNovoLocalLat(draft.orgNovoLocalLat);
      if (typeof draft.orgNovoLocalLng === "string") setOrgNovoLocalLng(draft.orgNovoLocalLng);
      if (typeof draft.espacoNome === "string") setEspacoNome(draft.espacoNome);
      if (draft.espacoEsportes) setEspacoEsportes(new Set(draft.espacoEsportes));
      if (draft.estruturas) setEstruturas(new Set(draft.estruturas));
      if (draft.reservaModelo) setReservaModelo(draft.reservaModelo);
      if (typeof draft.reservaNotas === "string") setReservaNotas(draft.reservaNotas);
      if (typeof draft.espacoEndereco === "string") setEspacoEndereco(draft.espacoEndereco);
      if (typeof draft.espacoNumero === "string") setEspacoNumero(draft.espacoNumero);
      if (typeof draft.espacoBairro === "string") setEspacoBairro(draft.espacoBairro);
      if (typeof draft.espacoCidade === "string") setEspacoCidade(draft.espacoCidade);
      if (typeof draft.espacoEstado === "string") setEspacoEstado(draft.espacoEstado);
      if (typeof draft.espacoCep === "string") setEspacoCep(draft.espacoCep);
      if (typeof draft.espacoComplemento === "string") setEspacoComplemento(draft.espacoComplemento);
      if (typeof draft.nome === "string") setNome(draft.nome);
      if (typeof draft.username === "string") setUsername(draft.username);
      if (typeof draft.localizacao === "string") setLocalizacao(draft.localizacao);
      if (typeof draft.alturaCm === "string") setAlturaCm(draft.alturaCm);
      if (typeof draft.pesoKg === "string") setPesoKg(draft.pesoKg);
      if (typeof draft.lado === "string") setLado(draft.lado);
      if (typeof draft.bio === "string") setBio(draft.bio);
      if (typeof draft.estiloJogo === "string") setEstiloJogo(draft.estiloJogo);
      if (typeof draft.disponibilidadeSemanaJson === "string") setDisponibilidadeSemanaJson(draft.disponibilidadeSemanaJson);
      setRestoredDraftAt(new Date().toLocaleTimeString("pt-BR"));
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  useEffect(() => {
    const payload = {
      step,
      papeis: [...papeis],
      esportesSel: [...esportesSel],
      esportesInteresse,
      esportesModalidade,
      expModo,
      expAprox,
      expMes,
      expAno,
      orgEsporteId,
      orgEsportes: [...orgEsportes],
      orgLocalModo,
      orgLocalId,
      orgLocalMsg,
      orgNovoLocalNome,
      orgNovoLocalEndereco,
      orgNovoLocalCidade,
      orgNovoLocalEstado,
      orgNovoLocalCep,
      orgNovoLocalLat,
      orgNovoLocalLng,
      espacoNome,
      espacoEsportes: [...espacoEsportes],
      estruturas: [...estruturas],
      reservaModelo,
      reservaNotas,
      espacoEndereco,
      espacoNumero,
      espacoBairro,
      espacoCidade,
      espacoEstado,
      espacoCep,
      espacoComplemento,
      nome,
      username,
      localizacao,
      alturaCm,
      pesoKg,
      lado,
      bio,
      estiloJogo,
      disponibilidadeSemanaJson,
    };
    window.localStorage.setItem(draftKey, JSON.stringify(payload));
  }, [
    alturaCm,
    espacoEsportes,
    espacoNome,
    esportesSel,
    esportesInteresse,
    esportesModalidade,
    estruturas,
    expAno,
    expAprox,
    expMes,
    expModo,
    lado,
    localizacao,
    nome,
    username,
    bio,
    estiloJogo,
    disponibilidadeSemanaJson,
    orgEsporteId,
    orgEsportes,
    orgLocalModo,
    orgLocalId,
    orgLocalMsg,
    orgNovoLocalNome,
    orgNovoLocalEndereco,
    orgNovoLocalCidade,
    orgNovoLocalEstado,
    orgNovoLocalCep,
    orgNovoLocalLat,
    orgNovoLocalLng,
    papeis,
    pesoKg,
    reservaModelo,
    reservaNotas,
    espacoEndereco,
    espacoNumero,
    espacoBairro,
    espacoCidade,
    espacoEstado,
    espacoCep,
    espacoComplemento,
    step,
    draftKey,
  ]);

  const hasAtletaProfessor = useMemo(
    () => [...papeis].some((p) => p === "atleta" || p === "professor"),
    [papeis]
  );
  const hasOrganizador = useMemo(() => [...papeis].includes("organizador"), [papeis]);
  const hasEspaco = useMemo(() => [...papeis].includes("espaco"), [papeis]);
  const stepOrder: Step[] = ["papeis", "esportes", "extras", "perfil"];
  const activeStepIndex = stepOrder.indexOf(step);
  const progressPct = ((activeStepIndex + 1) / stepOrder.length) * 100;
  const expMesNum = Number(expMes);
  const expAnoNum = Number(expAno);
  const perfilAlturaNum = Number(alturaCm);
  const perfilPesoNum = Number(pesoKg);
  const hasFotoSelecionada = Boolean(fotoPreviewUrl);

  useEffect(() => {
    return () => {
      if (fotoPreviewUrl) URL.revokeObjectURL(fotoPreviewUrl);
    };
  }, [fotoPreviewUrl]);

  const extrasValid = useMemo(() => {
    if (hasAtletaProfessor) {
      if (expModo === "aprox") {
        if (!["menos_1", "1_3", "mais_3"].includes(expAprox)) return false;
      } else {
        if (!Number.isInteger(expMesNum) || expMesNum < 1 || expMesNum > 12) return false;
        if (!Number.isInteger(expAnoNum) || expAnoNum < 1970 || expAnoNum > 2100) return false;
      }
    }
    if (hasEspaco && espacoNome.trim().length < 3) return false;
    if (hasOrganizador && orgEsportes.size === 0) return false;
    if (hasOrganizador && orgLocalModo === "existente" && Number(orgLocalId) <= 0) return false;
    if (hasOrganizador && orgLocalModo === "novo") {
      if (orgNovoLocalNome.trim().length < 3) return false;
      if (orgNovoLocalCidade.trim().length < 2) return false;
      if (orgNovoLocalEstado.trim().length < 2) return false;
    }
    if (hasEspaco) {
      if (espacoEndereco.trim().length < 3) return false;
      if (espacoCidade.trim().length < 2) return false;
      if (espacoEstado.trim().length < 2) return false;
    }
    return true;
  }, [
    espacoCidade,
    espacoEndereco,
    espacoEstado,
    espacoNome,
    expAnoNum,
    expAprox,
    expMesNum,
    expModo,
    hasAtletaProfessor,
    hasEspaco,
    hasOrganizador,
    orgEsportes,
    orgLocalId,
    orgLocalModo,
    orgNovoLocalCidade,
    orgNovoLocalEstado,
    orgNovoLocalNome,
  ]);

  const perfilValid = useMemo(() => {
    if (nome.trim().length < 3 || localizacao.trim().length < 3) return false;
    const uname = username.trim().toLowerCase();
    if (uname && !/^[a-z0-9_]{3,24}$/.test(uname)) return false;
    if (hasAtletaProfessor) {
      if (!Number.isInteger(perfilAlturaNum) || perfilAlturaNum < 50 || perfilAlturaNum > 260) {
        return false;
      }
      if (!Number.isInteger(perfilPesoNum) || perfilPesoNum < 20 || perfilPesoNum > 300) {
        return false;
      }
      if (!["Destro", "Canhoto", "Ambos"].includes(lado)) return false;
    }
    return true;
  }, [hasAtletaProfessor, lado, localizacao, nome, perfilAlturaNum, perfilPesoNum, username]);

  function applyResult(r: OnboardingActionResult) {
    if (!r.ok) {
      setMessage(r.message);
      return;
    }
    setMessage(null);
    router.refresh();
    if (r.nextStep === "esportes") setStep("esportes");
    else if (r.nextStep === "extras") setStep("extras");
    else if (r.nextStep === "perfil") setStep("perfil");
    else if (r.nextStep === "dashboard") {
      window.localStorage.removeItem(draftKey);
      router.push("/dashboard");
    }
  }

  function clearDraft() {
    window.localStorage.removeItem(draftKey);
    setRestoredDraftAt(null);
    setStep(initialStep);
    setPapeis(new Set(selectedPapeis));
    setEsportesSel(new Set(selectedEsportes));
    setEsportesInteresse(selectedEsportesInteresse);
    setEsportesModalidade(selectedEsportesModalidade);
    setExpModo(extrasInitial.expModo);
    setExpAprox(extrasInitial.expAprox);
    setExpMes(extrasInitial.expMes ? String(extrasInitial.expMes) : "");
    setExpAno(extrasInitial.expAno ? String(extrasInitial.expAno) : "");
    setOrgEsporteId(extrasInitial.orgEsporteId ? String(extrasInitial.orgEsporteId) : "0");
    setOrgEsportes(new Set(extrasInitial.orgEsportesIds));
    setOrgLocalModo(extrasInitial.orgLocalModo);
    setOrgLocalId(extrasInitial.orgLocalId ? String(extrasInitial.orgLocalId) : "0");
    setOrgLocalMsg(extrasInitial.orgLocalMsg);
    setOrgNovoLocalNome("");
    setOrgNovoLocalEndereco("");
    setOrgNovoLocalCidade("");
    setOrgNovoLocalEstado("");
    setOrgNovoLocalCep("");
    setOrgNovoLocalLat("");
    setOrgNovoLocalLng("");
    setEspacoNome(extrasInitial.espacoNome);
    setEspacoEsportes(new Set(extrasInitial.espacoEsportes));
    setEstruturas(new Set(extrasInitial.estruturas));
    setReservaModelo(extrasInitial.reservaModelo);
    setReservaNotas(extrasInitial.reservaNotas);
    setEspacoEndereco(extrasInitial.espacoEndereco);
    setEspacoNumero(extrasInitial.espacoNumero);
    setEspacoBairro(extrasInitial.espacoBairro);
    setEspacoCidade(extrasInitial.espacoCidade);
    setEspacoEstado(extrasInitial.espacoEstado);
    setEspacoCep(extrasInitial.espacoCep);
    setEspacoComplemento(extrasInitial.espacoComplemento);
    setNome(profileInitial.nome);
    setUsername(profileInitial.username);
    setLocalizacao(profileInitial.localizacao);
    setAlturaCm(profileInitial.alturaCm ? String(profileInitial.alturaCm) : "");
    setPesoKg(profileInitial.pesoKg ? String(profileInitial.pesoKg) : "");
    setLado(profileInitial.lado ?? "");
    setBio(profileInitial.bio ?? "");
    setEstiloJogo(profileInitial.estiloJogo ?? "");
    setDisponibilidadeSemanaJson(profileInitial.disponibilidadeSemanaJson ?? "{}");
    setMessage("Rascunho local limpo. Campos restaurados com dados atuais da conta.");
  }

  function togglePapel(id: string) {
    setPapeis((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleEsporte(id: number) {
    setEsportesSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else {
        n.add(id);
        setEsportesInteresse((old) => ({
          ...old,
          [id]: old[id] ?? "ranking_e_amistoso",
        }));
        const esp = esportes.find((e) => e.id === id);
        const defaultModalidade: "individual" | "dupla" | "time" =
          esp?.permiteIndividual ? "individual" : esp?.permiteDupla ? "dupla" : "time";
        setEsportesModalidade((old) => ({
          ...old,
          [id]: old[id] ?? defaultModalidade,
        }));
      }
      return n;
    });
  }

  function setEsporteInteresse(id: number, interesse: "ranking" | "ranking_e_amistoso" | "amistoso") {
    setEsportesInteresse((old) => ({ ...old, [id]: interesse }));
  }

  function setEsporteModalidade(id: number, modalidade: "individual" | "dupla" | "time") {
    setEsportesModalidade((old) => ({ ...old, [id]: modalidade }));
  }

  function submitPapeis(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => applyResult(await salvarPapeisOnboarding(undefined, fd)));
  }

  function submitEsportes(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => applyResult(await salvarEsportesOnboarding(undefined, fd)));
  }

  function submitExtras(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!extrasValid) {
      setMessage("Revise os campos desta etapa antes de continuar.");
      return;
    }
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => applyResult(await salvarExtrasOnboarding(undefined, fd)));
  }

  function submitPerfil(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!perfilValid) {
      setMessage("Preencha os dados obrigatórios para concluir o onboarding.");
      return;
    }
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    fd.set("foto_pos_x", String(fotoPosX));
    fd.set("foto_pos_y", String(fotoPosY));
    fd.set("foto_zoom", String(fotoZoom));
    startTransition(async () => applyResult(await salvarPerfilOnboarding(undefined, fd)));
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) {
      if (fotoPreviewUrl) URL.revokeObjectURL(fotoPreviewUrl);
      setFotoPreviewUrl(null);
      setFotoSelecionadaNome(null);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    if (fotoPreviewUrl) URL.revokeObjectURL(fotoPreviewUrl);
    setFotoPreviewUrl(nextUrl);
    setFotoSelecionadaNome(file.name);
    setFotoPosX(50);
    setFotoPosY(50);
    setFotoZoom(1);
  }

  function removeFotoSelecionada() {
    if (fotoPreviewUrl) URL.revokeObjectURL(fotoPreviewUrl);
    setFotoPreviewUrl(null);
    setFotoSelecionadaNome(null);
    setFotoPosX(50);
    setFotoPosY(50);
    setFotoZoom(1);
    if (fotoInputRef.current) {
      fotoInputRef.current.value = "";
    }
    if (fotoCameraInputRef.current) {
      fotoCameraInputRef.current.value = "";
    }
    if (fotoGaleriaInputRef.current) {
      fotoGaleriaInputRef.current.value = "";
    }
  }

  function toggleEspacoEsporte(id: number) {
    setEspacoEsportes((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleOrgEsporte(id: number) {
    setOrgEsportes((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleEstrutura(id: string) {
    setEstruturas((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function goBackStep() {
    if (step === "papeis") return;
    if (step === "esportes") {
      setStep("papeis");
      return;
    }
    if (step === "extras") {
      setStep(hasAtletaProfessor ? "esportes" : "papeis");
      return;
    }
    setStep("extras");
  }

  return (
    <main className="eid-auth-bg flex w-full flex-1 flex-col items-center overflow-x-hidden px-4 pb-28 pt-14 text-eid-fg sm:px-6 sm:pt-7">
      <div className="w-full max-w-2xl pb-6">
        <Link
          href="/"
          className="mb-3 inline-block text-[13px] text-eid-text-muted no-underline transition hover:text-eid-fg"
        >
          ← Voltar ao início
        </Link>

        <LogoFull priority className="mb-5 mt-1" />

        <div className="eid-auth-card p-6 sm:p-8">
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-eid-primary-500">
                Etapa {activeStepIndex + 1} de {stepOrder.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={clearDraft}
                  disabled={pending}
                  className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2.5 py-1 text-[11px] font-semibold text-eid-text-secondary transition hover:border-eid-primary-500/40 hover:text-eid-fg disabled:opacity-50"
                >
                  Limpar rascunho
                </button>
                {step !== "papeis" ? (
                  <button
                    type="button"
                    onClick={goBackStep}
                    disabled={pending}
                    className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2.5 py-1 text-[11px] font-semibold text-eid-fg transition hover:border-eid-primary-500/40 disabled:opacity-50"
                  >
                    Voltar etapa
                  </button>
                ) : null}
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-eid-card">
              <div
                className="h-full rounded-full bg-eid-action-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {restoredDraftAt ? (
              <p className="mt-2 text-[11px] text-eid-text-secondary">
                Rascunho local restaurado às {restoredDraftAt}.
              </p>
            ) : null}
          </div>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-eid-primary-500">
            Onboarding
          </p>
          <h1 className="mt-2 text-xl font-semibold text-eid-fg">Olá, {primeiroNome}!</h1>
          <p className="mt-2 text-sm leading-relaxed text-eid-text-secondary">
            {step === "papeis" &&
              "Marque tudo que combina com você. Você pode escolher mais de um perfil."}
            {step === "esportes" &&
              "Selecione os esportes em que você atua como atleta ou professor."}
            {step === "extras" &&
              "Só mais alguns detalhes dos papéis escolhidos para deixar seu perfil completo."}
            {step === "perfil" &&
              "Finalize com presença no app: foto, nome e dados principais."}
          </p>

          {message ? (
            <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {message}
            </p>
          ) : null}

          {step === "papeis" ? (
            <form onSubmit={submitPapeis} className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {ROLES.map((r) => (
                  <label
                    key={r.id}
                    className={`flex cursor-pointer flex-col rounded-2xl border p-4 text-left transition ${
                      papeis.has(r.id)
                        ? "border-eid-primary-500/50 bg-eid-primary-500/10"
                        : "border-[color:var(--eid-border-subtle)] bg-eid-card/60 hover:border-eid-primary-500/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="papel"
                      value={r.id}
                      checked={papeis.has(r.id)}
                      onChange={() => togglePapel(r.id)}
                      className="sr-only"
                    />
                    <span className="font-semibold text-eid-fg">{r.titulo}</span>
                    <span className="mt-1 text-xs leading-relaxed text-eid-text-secondary">{r.desc}</span>
                  </label>
                ))}
              </div>
              <button
                type="submit"
                disabled={pending || papeis.size === 0}
                className="eid-btn-primary w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50"
              >
                {pending ? "Salvando…" : "Continuar"}
              </button>
            </form>
          ) : null}

          {step === "esportes" ? (
            <form onSubmit={submitEsportes} className="mt-6 space-y-4">
              <div className="grid gap-2 sm:grid-cols-3">
                {esportes.map((e) => (
                  <div
                    key={e.id}
                    className={`rounded-xl border px-3 py-2 transition ${
                      esportesSel.has(e.id)
                        ? "border-eid-primary-500/50 bg-eid-primary-500/10"
                        : "border-[color:var(--eid-border-subtle)] bg-eid-card/60 hover:border-eid-primary-500/30"
                    }`}
                  >
                    <label className="cursor-pointer text-sm font-semibold text-eid-fg">
                      <input
                        type="checkbox"
                        className="mr-2"
                        name="esporte_id"
                        value={e.id}
                        checked={esportesSel.has(e.id)}
                        onChange={() => toggleEsporte(e.id)}
                      />
                      {e.nome}
                    </label>
                    {esportesSel.has(e.id) ? (
                      <div className="mt-2 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-bg/60 p-2">
                        <p className="text-[11px] text-eid-text-secondary">Interesse no match desse esporte:</p>
                        <label className="mt-1 block text-xs text-eid-fg">
                          <input
                            type="radio"
                            name={`esporte_interesse_${e.id}`}
                            value="ranking"
                            checked={(esportesInteresse[e.id] ?? "ranking_e_amistoso") === "ranking"}
                            onChange={() => setEsporteInteresse(e.id, "ranking")}
                            className="mr-2"
                          />
                          Só partidas valendo ranking
                        </label>
                        <label className="mt-1 block text-xs text-eid-fg">
                          <input
                            type="radio"
                            name={`esporte_interesse_${e.id}`}
                            value="ranking_e_amistoso"
                            checked={(esportesInteresse[e.id] ?? "ranking_e_amistoso") === "ranking_e_amistoso"}
                            onChange={() => setEsporteInteresse(e.id, "ranking_e_amistoso")}
                            className="mr-2"
                          />
                          Aceito ranking e amistoso
                        </label>
                        <label className="mt-1 block text-xs text-eid-fg">
                          <input
                            type="radio"
                            name={`esporte_interesse_${e.id}`}
                            value="amistoso"
                            checked={(esportesInteresse[e.id] ?? "ranking_e_amistoso") === "amistoso"}
                            onChange={() => setEsporteInteresse(e.id, "amistoso")}
                            className="mr-2"
                          />
                          Apenas amistosos
                        </label>
                        {(esportesInteresse[e.id] ?? "ranking_e_amistoso") === "amistoso" ? (
                          <p className="mt-2 rounded-lg border border-eid-action-500/30 bg-eid-action-500/10 px-2 py-1 text-[11px] text-eid-action-400">
                            Você não aparecerá nas sugestões de Matchmaking Competitivo da plataforma.
                          </p>
                        ) : null}
                        <p className="mt-2 text-[11px] text-eid-text-secondary">Como deseja jogar no match:</p>
                        {e.permiteIndividual ? (
                          <label className="mt-1 block text-xs text-eid-fg">
                            <input
                              type="radio"
                              name={`esporte_modalidade_${e.id}`}
                              value="individual"
                              checked={(esportesModalidade[e.id] ?? "individual") === "individual"}
                              onChange={() => setEsporteModalidade(e.id, "individual")}
                              className="mr-2"
                            />
                            Individual (X1)
                          </label>
                        ) : null}
                        {e.permiteDupla ? (
                          <label className="mt-1 block text-xs text-eid-fg">
                            <input
                              type="radio"
                              name={`esporte_modalidade_${e.id}`}
                              value="dupla"
                              checked={(esportesModalidade[e.id] ?? "individual") === "dupla"}
                              onChange={() => setEsporteModalidade(e.id, "dupla")}
                              className="mr-2"
                            />
                            Dupla
                          </label>
                        ) : null}
                        {e.permiteTime ? (
                          <label className="mt-1 block text-xs text-eid-fg">
                            <input
                              type="radio"
                              name={`esporte_modalidade_${e.id}`}
                              value="time"
                              checked={(esportesModalidade[e.id] ?? "individual") === "time"}
                              onChange={() => setEsporteModalidade(e.id, "time")}
                              className="mr-2"
                            />
                            Time
                          </label>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <button
                type="submit"
                disabled={pending || esportesSel.size === 0}
                className="eid-btn-primary w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50"
              >
                {pending ? "Salvando…" : "Continuar"}
              </button>
            </form>
          ) : null}

          {step === "extras" ? (
            <form onSubmit={submitExtras} className="mt-6 space-y-5">
              {hasAtletaProfessor ? (
                <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-eid-primary-500">
                    Experiência como atleta
                  </h2>
                  <div className="mt-3 flex gap-2">
                    <label className="rounded-full border border-[color:var(--eid-border-subtle)] px-3 py-1 text-xs text-eid-fg">
                      <input
                        type="radio"
                        name="exp_modo"
                        value="aprox"
                        checked={expModo === "aprox"}
                        onChange={() => setExpModo("aprox")}
                        className="mr-1"
                      />
                      Aproximado
                    </label>
                    <label className="rounded-full border border-[color:var(--eid-border-subtle)] px-3 py-1 text-xs text-eid-fg">
                      <input
                        type="radio"
                        name="exp_modo"
                        value="exato"
                        checked={expModo === "exato"}
                        onChange={() => setExpModo("exato")}
                        className="mr-1"
                      />
                      Mês e ano
                    </label>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <select
                      name="exp_aprox"
                      value={expAprox}
                      onChange={(e) => setExpAprox(e.target.value as "menos_1" | "1_3" | "mais_3")}
                      disabled={expModo !== "aprox"}
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg [&>option]:bg-[#0b1220] [&>option]:text-white"
                    >
                      <option value="menos_1">Menos de 1 ano</option>
                      <option value="1_3">Entre 1 e 3 anos</option>
                      <option value="mais_3">Mais de 3 anos</option>
                    </select>
                    <input
                      type="number"
                      name="exp_mes"
                      min={1}
                      max={12}
                      value={expMes}
                      onChange={(e) => setExpMes(e.target.value)}
                      disabled={expModo !== "exato"}
                      placeholder="Mês"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <input
                      type="number"
                      name="exp_ano"
                      min={1970}
                      max={2100}
                      value={expAno}
                      onChange={(e) => setExpAno(e.target.value)}
                      disabled={expModo !== "exato"}
                      placeholder="Ano"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                  </div>
                </section>
              ) : null}

              {hasOrganizador ? (
                <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-eid-primary-500">
                    Organização de torneios
                  </h2>
                  <label className="mt-3 block text-xs text-eid-text-secondary">
                    Esportes dos eventos (selecione um ou mais)
                  </label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {esportes.map((e) => (
                      <label key={`org-esp-${e.id}`} className="text-xs text-eid-fg">
                        <input
                          type="checkbox"
                          name="org_esporte_ids"
                          value={e.id}
                          checked={orgEsportes.has(e.id)}
                          onChange={() => toggleOrgEsporte(e.id)}
                          className="mr-2"
                        />
                        {e.nome}
                      </label>
                    ))}
                  </div>
                  <input type="hidden" name="org_esporte_id" value={orgEsporteId} />

                  <p className="mt-4 text-xs text-eid-text-secondary">Local para seus torneios</p>
                  <div className="mt-2 flex gap-2">
                    <label className="rounded-full border border-[color:var(--eid-border-subtle)] px-3 py-1 text-xs text-eid-fg">
                      <input
                        type="radio"
                        name="org_local_modo"
                        value="existente"
                        checked={orgLocalModo === "existente"}
                        onChange={() => setOrgLocalModo("existente")}
                        className="mr-1"
                      />
                      Escolher local já cadastrado
                    </label>
                    <label className="rounded-full border border-[color:var(--eid-border-subtle)] px-3 py-1 text-xs text-eid-fg">
                      <input
                        type="radio"
                        name="org_local_modo"
                        value="novo"
                        checked={orgLocalModo === "novo"}
                        onChange={() => setOrgLocalModo("novo")}
                        className="mr-1"
                      />
                      Cadastrar novo local
                    </label>
                  </div>

                  {orgLocalModo === "existente" ? (
                    <>
                      <select
                        name="org_local_id"
                        value={orgLocalId}
                        onChange={(e) => setOrgLocalId(e.target.value)}
                        className="eid-input-dark mt-3 w-full rounded-xl px-3 py-2 text-sm text-eid-fg [&>option]:bg-[#0b1220] [&>option]:text-white"
                      >
                        <option value={0}>Selecione o local...</option>
                        {locais.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.nome} {l.localizacao ? `- ${l.localizacao}` : ""}
                          </option>
                        ))}
                      </select>
                      <input
                        name="org_local_msg"
                        value={orgLocalMsg}
                        onChange={(e) => setOrgLocalMsg(e.target.value)}
                        placeholder="Mensagem opcional para o dono do local"
                        className="eid-input-dark mt-2 w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                      />
                    </>
                  ) : (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <input
                        name="org_novo_local_nome"
                        value={orgNovoLocalNome}
                        onChange={(e) => setOrgNovoLocalNome(e.target.value)}
                        placeholder="Nome do local"
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2"
                      />
                      <input
                        name="org_novo_local_endereco"
                        value={orgNovoLocalEndereco}
                        onChange={(e) => setOrgNovoLocalEndereco(e.target.value)}
                        placeholder="Endereco"
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2"
                      />
                      <div className="sm:col-span-2">
                        <p className="mb-1 text-xs text-eid-text-secondary">Logo do local (opcional)</p>
                        <input
                          type="file"
                          name="org_novo_local_logo"
                          accept="image/*"
                          className="block w-full text-xs text-eid-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-eid-action-500 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
                        />
                      </div>
                      <input
                        name="org_novo_local_cidade"
                        value={orgNovoLocalCidade}
                        onChange={(e) => setOrgNovoLocalCidade(e.target.value)}
                        placeholder="Cidade"
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                      />
                      <input
                        name="org_novo_local_estado"
                        value={orgNovoLocalEstado}
                        onChange={(e) => setOrgNovoLocalEstado(e.target.value)}
                        placeholder="UF"
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                      />
                      <input
                        name="org_novo_local_cep"
                        value={orgNovoLocalCep}
                        onChange={(e) => setOrgNovoLocalCep(e.target.value)}
                        placeholder="CEP (opcional)"
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                      />
                      <input
                        name="org_novo_local_lat"
                        value={orgNovoLocalLat}
                        onChange={(e) => setOrgNovoLocalLat(e.target.value)}
                        placeholder="Latitude (opcional)"
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                      />
                      <input
                        name="org_novo_local_lng"
                        value={orgNovoLocalLng}
                        onChange={(e) => setOrgNovoLocalLng(e.target.value)}
                        placeholder="Longitude (opcional)"
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                      />
                      <div className="sm:col-span-2">
                        <p className="mb-1 text-xs text-eid-text-secondary">
                          Se esse nome já existir sem dono, envie comprovante para solicitar a propriedade.
                        </p>
                        <input
                          type="file"
                          name="org_novo_local_documento"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="block w-full text-xs text-eid-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-eid-action-500 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
                        />
                      </div>
                    </div>
                  )}
                </section>
              ) : null}

              {hasEspaco ? (
                <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-eid-primary-500">
                    Dados completos do espaço
                  </h2>
                  <input
                    name="espaco_nome"
                    value={espacoNome}
                    onChange={(e) => setEspacoNome(e.target.value)}
                    placeholder="Nome público do local"
                    className="eid-input-dark mt-3 w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                  />
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input
                      name="espaco_endereco"
                      value={espacoEndereco}
                      onChange={(e) => setEspacoEndereco(e.target.value)}
                      placeholder="Endereco"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2"
                    />
                    <input
                      name="espaco_numero"
                      value={espacoNumero}
                      onChange={(e) => setEspacoNumero(e.target.value)}
                      placeholder="Numero"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <input
                      name="espaco_bairro"
                      value={espacoBairro}
                      onChange={(e) => setEspacoBairro(e.target.value)}
                      placeholder="Bairro"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <input
                      name="espaco_cidade"
                      value={espacoCidade}
                      onChange={(e) => setEspacoCidade(e.target.value)}
                      placeholder="Cidade"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <input
                      name="espaco_estado"
                      value={espacoEstado}
                      onChange={(e) => setEspacoEstado(e.target.value)}
                      placeholder="UF"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <input
                      name="espaco_cep"
                      value={espacoCep}
                      onChange={(e) => setEspacoCep(e.target.value)}
                      placeholder="CEP"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <input
                      name="espaco_complemento"
                      value={espacoComplemento}
                      onChange={(e) => setEspacoComplemento(e.target.value)}
                      placeholder="Complemento (opcional)"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <input
                      name="espaco_lat"
                      placeholder="Latitude (opcional)"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <input
                      name="espaco_lng"
                      placeholder="Longitude (opcional)"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                  </div>
                  <p className="mt-3 text-xs text-eid-text-secondary">Esportes atendidos no local</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {esportes.map((e) => (
                      <label key={`esp-${e.id}`} className="text-xs text-eid-fg">
                        <input
                          type="checkbox"
                          name="espaco_esportes"
                          value={e.id}
                          checked={espacoEsportes.has(e.id)}
                          onChange={() => toggleEspacoEsporte(e.id)}
                          className="mr-2"
                        />
                        {e.nome}
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-eid-text-secondary">Estruturas</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {ESTRUTURAS.map((e) => (
                      <label key={e.id} className="text-xs text-eid-fg">
                        <input
                          type="checkbox"
                          name="estrutura"
                          value={e.id}
                          checked={estruturas.has(e.id)}
                          onChange={() => toggleEstrutura(e.id)}
                          className="mr-2"
                        />
                        {e.label}
                      </label>
                    ))}
                  </div>
                  <select
                    name="reserva_modelo"
                    value={reservaModelo}
                    onChange={(e) =>
                      setReservaModelo(e.target.value as "livre" | "socios" | "pago" | "misto")
                    }
                    className="eid-input-dark mt-3 w-full rounded-xl px-3 py-2 text-sm text-eid-fg [&>option]:bg-[#0b1220] [&>option]:text-white"
                  >
                    <option value="livre">A definir depois</option>
                    <option value="socios">Prioridade / gratuito para sócios</option>
                    <option value="pago">Reserva paga (público)</option>
                    <option value="misto">Misto (sócio + visitante pago)</option>
                  </select>
                  <input
                    name="reserva_notas"
                    value={reservaNotas}
                    onChange={(e) => setReservaNotas(e.target.value)}
                    placeholder="Observações"
                    className="eid-input-dark mt-2 w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                  />
                  <p className="mt-3 text-xs text-eid-text-secondary">
                    Documento de comprovacao do local (obrigatorio para analise do admin)
                  </p>
                  <input
                    type="file"
                    name="espaco_documento"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="mt-1 block w-full text-xs text-eid-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-eid-action-500 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
                  />
                  <input
                    name="espaco_doc_msg"
                    placeholder="Observacao para aprovacao (opcional)"
                    className="eid-input-dark mt-2 w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                  />
                </section>
              ) : null}

              <button
                type="submit"
                disabled={pending || !extrasValid}
                className="eid-btn-primary w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50"
              >
                {pending ? "Salvando…" : "Continuar"}
              </button>
            </form>
          ) : null}

          {step === "perfil" ? (
            <form onSubmit={submitPerfil} className="mt-6 space-y-4">
              <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-eid-primary-500">
                  Resumo antes de concluir
                </h2>
                <ul className="mt-3 list-inside list-disc text-xs leading-relaxed text-eid-text-secondary">
                  <li>Papéis: {[...papeis].join(", ") || "não definido"}</li>
                  <li>
                    Esportes:{" "}
                    {[...esportesSel]
                      .map((id) => esportes.find((e) => e.id === id)?.nome)
                      .filter(Boolean)
                      .join(", ") || "não definido"}
                  </li>
                  {hasAtletaProfessor ? (
                    <li>
                      Experiência:{" "}
                      {expModo === "aprox"
                        ? expAprox === "menos_1"
                          ? "Menos de 1 ano"
                          : expAprox === "1_3"
                            ? "1 a 3 anos"
                            : "Mais de 3 anos"
                        : `${expMes || "--"}/${expAno || "----"}`}
                    </li>
                  ) : null}
                  {hasEspaco ? <li>Espaço: {espacoNome || "não definido"}</li> : null}
                </ul>
              </section>
              <div className="flex items-center gap-3">
                {hasFotoSelecionada ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)]">
                    <img
                      src={fotoPreviewUrl ?? ""}
                      alt="Prévia da foto"
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: `${fotoPosX}% ${fotoPosY}%`,
                        transform: `scale(${fotoZoom})`,
                      }}
                    />
                  </div>
                ) : profileInitial.avatarUrl ? (
                  <img
                    src={profileInitial.avatarUrl}
                    alt="Avatar atual"
                    className="h-16 w-16 rounded-full border border-[color:var(--eid-border-subtle)] object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-eid-primary-500/60 text-xs text-eid-primary-300">
                    Sem foto
                  </div>
                )}
                <div className="flex-1">
                  <label className="text-sm font-medium text-eid-fg">Foto de perfil</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fotoCameraInputRef.current?.click()}
                      className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs font-semibold text-eid-fg transition hover:border-eid-primary-500/40"
                    >
                      Tirar foto (câmera)
                    </button>
                    <button
                      type="button"
                      onClick={() => fotoGaleriaInputRef.current?.click()}
                      className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs font-semibold text-eid-fg transition hover:border-eid-primary-500/40"
                    >
                      Enviar da galeria
                    </button>
                  </div>
                  <input
                    ref={fotoCameraInputRef}
                    type="file"
                    name="foto_camera"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                  <input
                    ref={fotoGaleriaInputRef}
                    type="file"
                    name="foto_galeria"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                  <input ref={fotoInputRef} type="file" name="foto" accept="image/*" onChange={handleFotoChange} className="hidden" />
                  {fotoSelecionadaNome ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-[11px] text-eid-text-secondary">Arquivo: {fotoSelecionadaNome}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="text-[11px] text-eid-text-secondary">
                          Posição horizontal
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={fotoPosX}
                            onChange={(e) => setFotoPosX(Number(e.target.value))}
                            className="mt-1 w-full"
                          />
                        </label>
                        <label className="text-[11px] text-eid-text-secondary">
                          Posição vertical
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={fotoPosY}
                            onChange={(e) => setFotoPosY(Number(e.target.value))}
                            className="mt-1 w-full"
                          />
                        </label>
                        <label className="text-[11px] text-eid-text-secondary sm:col-span-2">
                          Zoom
                          <input
                            type="range"
                            min={1}
                            max={2.5}
                            step={0.05}
                            value={fotoZoom}
                            onChange={(e) => setFotoZoom(Number(e.target.value))}
                            className="mt-1 w-full"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={removeFotoSelecionada}
                        className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2.5 py-1 text-[11px] font-semibold text-eid-fg transition hover:border-eid-primary-500/40"
                      >
                        Remover foto selecionada
                      </button>
                    </div>
                  ) : null}
                  <p className="mt-1 text-[11px] text-eid-text-secondary">
                    Apenas foto (JPG/PNG/WEBP), recomendado até 5MB.
                  </p>
                </div>
              </div>

              <input
                name="nome"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
                className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
              />
              <input
                name="username"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_]/g, "")
                      .slice(0, 24)
                  )
                }
                placeholder="@usuario (opcional)"
                className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
              />
              <p className="text-[11px] text-eid-text-secondary">
                Use 3-24 caracteres: letras minúsculas, números e underline.
              </p>
              <input
                name="localizacao"
                required
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                placeholder="Cidade / Estado"
                className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
              />
              <input
                name="estilo_jogo"
                value={estiloJogo}
                onChange={(e) => setEstiloJogo(e.target.value)}
                placeholder="Estilo de jogo (opcional)"
                className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
              />
              <textarea
                name="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Bio curta (opcional)"
                rows={3}
                className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
              />
              <textarea
                name="disponibilidade_semana_json"
                value={disponibilidadeSemanaJson}
                onChange={(e) => setDisponibilidadeSemanaJson(e.target.value)}
                placeholder='Disponibilidade JSON (ex: {"seg":"noite","sab":"manhã"})'
                rows={2}
                className="eid-input-dark w-full rounded-xl px-3 py-3 text-xs text-eid-fg"
              />

              {hasAtletaProfessor ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      name="altura_cm"
                      min={50}
                      max={260}
                      required
                      value={alturaCm}
                      onChange={(e) => setAlturaCm(e.target.value)}
                      placeholder="Altura (cm)"
                      className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
                    />
                    <input
                      type="number"
                      name="peso_kg"
                      min={20}
                      max={300}
                      required
                      value={pesoKg}
                      onChange={(e) => setPesoKg(e.target.value)}
                      placeholder="Peso (kg)"
                      className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
                    />
                  </div>
                  <select
                    name="lado"
                    required
                    value={lado}
                    onChange={(e) => setLado(e.target.value)}
                    className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg [&>option]:bg-[#0b1220] [&>option]:text-white"
                  >
                    <option value="" disabled>
                      Mão dominante
                    </option>
                    <option value="Destro">Destro</option>
                    <option value="Canhoto">Canhoto</option>
                    <option value="Ambos">Ambidestro</option>
                  </select>
                </>
              ) : null}

              <button
                type="submit"
                disabled={pending || !perfilValid}
                className="eid-btn-primary w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50"
              >
                {pending ? (hasFotoSelecionada ? "Enviando foto e finalizando…" : "Finalizando…") : "Finalizar e entrar no painel"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </main>
  );
}
