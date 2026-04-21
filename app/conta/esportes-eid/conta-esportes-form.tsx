"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarEsportesOnboarding, type OnboardingActionResult } from "@/app/onboarding/actions";
import {
  esporteModoTemAtleta,
  esporteModoTemProfessor,
  type ProfessorModoEsportivo,
  type ProfessorObjetivoPlataforma,
  type ProfessorTipoAtuacao,
} from "@/lib/professor/constants";
import type { MatchModality } from "@/lib/onboarding/modalidades-match";
import { sortModalidadesMatch } from "@/lib/onboarding/modalidades-match";
import { CONTA_PERFIL_HREF } from "@/lib/routes/conta";

type EsporteOpt = {
  id: number;
  nome: string;
  permiteIndividual: boolean;
  permiteDupla: boolean;
  permiteTime: boolean;
};

type Props = {
  esportes: EsporteOpt[];
  selectedEsportes: number[];
  selectedEsportesInteresse: Record<number, "ranking" | "ranking_e_amistoso" | "amistoso">;
  selectedEsportesModalidades: Record<number, MatchModality[]>;
  selectedSportModes: Record<number, ProfessorModoEsportivo>;
  selectedProfessorObjetivos: Record<number, ProfessorObjetivoPlataforma>;
  selectedProfessorTipos: Record<number, ProfessorTipoAtuacao[]>;
  selectedExperiencias: Record<number, "menos_1" | "1_3" | "mais_3">;
  hasProfessor: boolean;
  hasAtleta: boolean;
};

export function ContaEsportesForm({
  esportes,
  selectedEsportes,
  selectedEsportesInteresse,
  selectedEsportesModalidades,
  selectedSportModes,
  selectedProfessorObjetivos,
  selectedProfessorTipos,
  selectedExperiencias,
  hasProfessor,
  hasAtleta,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [esportesSel, setEsportesSel] = useState<Set<number>>(() => new Set(selectedEsportes));
  const [esportesInteresse, setEsportesInteresse] =
    useState<Record<number, "ranking" | "ranking_e_amistoso" | "amistoso">>(selectedEsportesInteresse);
  const [esportesModalidades, setEsportesModalidades] =
    useState<Record<number, MatchModality[]>>(selectedEsportesModalidades);
  const [sportModes, setSportModes] = useState<Record<number, ProfessorModoEsportivo>>(selectedSportModes);
  const [professorObjetivos, setProfessorObjetivos] =
    useState<Record<number, ProfessorObjetivoPlataforma>>(selectedProfessorObjetivos);
  const [professorTipos, setProfessorTipos] =
    useState<Record<number, ProfessorTipoAtuacao[]>>(selectedProfessorTipos);
  const [experiencias, setExperiencias] =
    useState<Record<number, "menos_1" | "1_3" | "mais_3">>(selectedExperiencias);

  function toggleEsporte(id: number) {
    setEsportesSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
        setSportModes((old) => {
          const next = { ...old };
          delete next[id];
          return next;
        });
        setProfessorObjetivos((old) => {
          const next = { ...old };
          delete next[id];
          return next;
        });
        setProfessorTipos((old) => {
          const next = { ...old };
          delete next[id];
          return next;
        });
        setExperiencias((old) => {
          const next = { ...old };
          delete next[id];
          return next;
        });
        setEsportesModalidades((om) => {
          const next = { ...om };
          delete next[id];
          return next;
        });
      } else {
        n.add(id);
        setSportModes((old) => ({
          ...old,
          [id]: old[id] ?? (hasProfessor ? (hasAtleta ? "ambos" : "professor") : "atleta"),
        }));
        setProfessorObjetivos((old) => ({
          ...old,
          [id]: old[id] ?? "somente_exposicao",
        }));
        setProfessorTipos((old) => ({
          ...old,
          [id]: old[id]?.length ? old[id]! : ["aulas"],
        }));
        setExperiencias((old) => ({
          ...old,
          [id]: old[id] ?? "menos_1",
        }));
        setEsportesInteresse((old) => ({
          ...old,
          [id]: old[id] ?? "ranking_e_amistoso",
        }));
        const esp = esportes.find((e) => e.id === id);
        const defaultModalidade: MatchModality = esp?.permiteIndividual
          ? "individual"
          : esp?.permiteDupla
            ? "dupla"
            : "time";
        setEsportesModalidades((old) => ({
          ...old,
          [id]: old[id]?.length ? old[id]! : [defaultModalidade],
        }));
      }
      return n;
    });
  }

  function setSportMode(id: number, mode: ProfessorModoEsportivo) {
    setSportModes((old) => ({ ...old, [id]: mode }));
  }

  function setEsporteInteresse(id: number, interesse: "ranking" | "ranking_e_amistoso" | "amistoso") {
    setEsportesInteresse((old) => ({ ...old, [id]: interesse }));
  }

  function setProfessorObjetivo(id: number, objetivo: ProfessorObjetivoPlataforma) {
    setProfessorObjetivos((old) => ({ ...old, [id]: objetivo }));
  }

  function toggleProfessorTipo(id: number, tipo: ProfessorTipoAtuacao, checked: boolean) {
    setProfessorTipos((old) => {
      const set = new Set(old[id] ?? ["aulas"]);
      if (checked) set.add(tipo);
      else if (set.size > 1) set.delete(tipo);
      return { ...old, [id]: [...set] as ProfessorTipoAtuacao[] };
    });
  }

  function toggleEsporteModality(id: number, modalidade: MatchModality, checked: boolean) {
    setEsportesModalidades((old) => {
      const cur = old[id] ?? ["individual"];
      const s = new Set(sortModalidadesMatch(cur));
      if (checked) {
        s.add(modalidade);
      } else {
        if (s.size <= 1) return old;
        s.delete(modalidade);
      }
      return { ...old, [id]: sortModalidadesMatch([...s]) };
    });
  }

  function applyResult(r: OnboardingActionResult) {
    if (!r.ok) {
      setMessage(r.message);
      return;
    }
    setMessage("Esportes e preferências de match salvos.");
    router.refresh();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => applyResult(await salvarEsportesOnboarding(undefined, fd)));
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4 shadow-sm sm:p-6"
    >
      {message ? (
        <p
          className={`mb-4 rounded-xl px-3 py-2 text-sm ${
            message.startsWith("Esportes")
              ? "border border-eid-primary-500/35 bg-eid-primary-500/10 text-eid-primary-200"
              : "border border-red-400/30 bg-red-500/10 text-red-200"
          }`}
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                {hasProfessor && hasAtleta ? (
                  <div className="mb-2">
                    <p className="text-[11px] text-eid-text-secondary">Atuação neste esporte</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {([
                        { value: "atleta", label: "Atleta" },
                        { value: "professor", label: "Professor" },
                        { value: "ambos", label: "Ambos" },
                      ] as const).map((opt) => (
                        <label key={opt.value} className="inline-flex items-center gap-1 text-xs text-eid-fg">
                          <input
                            type="radio"
                            name={`esporte_modo_${e.id}`}
                            value={opt.value}
                            checked={(sportModes[e.id] ?? "ambos") === opt.value}
                            onChange={() => setSportMode(e.id, opt.value)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
                {esporteModoTemProfessor(sportModes[e.id] ?? (hasProfessor ? (hasAtleta ? "ambos" : "professor") : "atleta")) ? (
                  <>
                    <p className="text-[11px] text-eid-text-secondary">Objetivo como professor</p>
                    {([
                      { value: "somente_exposicao", label: "Somente exposição" },
                      { value: "gerir_alunos", label: "Gerir alunos" },
                      { value: "ambos", label: "Exposição + gestão" },
                    ] as const).map((opt) => (
                      <label key={opt.value} className="mt-1 block text-xs text-eid-fg">
                        <input
                          type="radio"
                          name={`esporte_professor_objetivo_${e.id}`}
                          value={opt.value}
                          checked={(professorObjetivos[e.id] ?? "somente_exposicao") === opt.value}
                          onChange={() => setProfessorObjetivo(e.id, opt.value)}
                          className="mr-2"
                        />
                        {opt.label}
                      </label>
                    ))}
                    <p className="mt-2 text-[11px] text-eid-text-secondary">Tipo de atuação</p>
                    {([
                      { value: "aulas", label: "Aulas" },
                      { value: "treinamento", label: "Treinamento" },
                      { value: "consultoria", label: "Consultoria" },
                    ] as const).map((opt) => (
                      <label key={opt.value} className="mt-1 block text-xs text-eid-fg">
                        <input
                          type="checkbox"
                          name={`esporte_professor_tipo_${e.id}`}
                          value={opt.value}
                          checked={(professorTipos[e.id] ?? ["aulas"]).includes(opt.value)}
                          onChange={(ev) => toggleProfessorTipo(e.id, opt.value, ev.target.checked)}
                          className="mr-2"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </>
                ) : null}
                {esporteModoTemAtleta(sportModes[e.id] ?? (hasProfessor ? (hasAtleta ? "ambos" : "professor") : "atleta")) ? (
                  <>
                    <p className="mt-2 text-[11px] text-eid-text-secondary">Interesse no match neste esporte</p>
                    <label className="mt-1 block text-xs text-eid-fg">
                      <input
                        type="radio"
                        name={`esporte_interesse_${e.id}`}
                        value="ranking"
                        checked={(esportesInteresse[e.id] ?? "ranking_e_amistoso") === "ranking"}
                        onChange={() => setEsporteInteresse(e.id, "ranking")}
                        className="mr-2"
                      />
                      Só ranking
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
                      Ranking e amistoso
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
                        Você não aparece no matchmaking competitivo do radar.
                      </p>
                    ) : null}
                    <p className="mt-2 text-[11px] text-eid-text-secondary">Modalidades no match (marque as que quiser):</p>
                    {e.permiteIndividual ? (
                      <label className="mt-1 block text-xs text-eid-fg">
                        <input
                          type="checkbox"
                          name={`esporte_modalidade_${e.id}`}
                          value="individual"
                          checked={(esportesModalidades[e.id] ?? ["individual"]).includes("individual")}
                          onChange={(ev) => toggleEsporteModality(e.id, "individual", ev.target.checked)}
                          className="mr-2"
                        />
                        Individual
                      </label>
                    ) : null}
                    {e.permiteDupla ? (
                      <label className="mt-1 block text-xs text-eid-fg">
                        <input
                          type="checkbox"
                          name={`esporte_modalidade_${e.id}`}
                          value="dupla"
                          checked={(esportesModalidades[e.id] ?? ["individual"]).includes("dupla")}
                          onChange={(ev) => toggleEsporteModality(e.id, "dupla", ev.target.checked)}
                          className="mr-2"
                        />
                        Dupla
                      </label>
                    ) : null}
                    {e.permiteTime ? (
                      <label className="mt-1 block text-xs text-eid-fg">
                        <input
                          type="checkbox"
                          name={`esporte_modalidade_${e.id}`}
                          value="time"
                          checked={(esportesModalidades[e.id] ?? ["individual"]).includes("time")}
                          onChange={(ev) => toggleEsporteModality(e.id, "time", ev.target.checked)}
                          className="mr-2"
                        />
                        Time
                      </label>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-2 rounded-lg border border-eid-action-500/30 bg-eid-action-500/10 px-2 py-1 text-[11px] text-eid-action-400">
                    Este esporte ficará apenas no fluxo de professor.
                  </p>
                )}
                <p className="mt-2 text-[11px] text-eid-text-secondary">Experiência neste esporte</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {([
                    { value: "menos_1", label: "< 1 ano" },
                    { value: "1_3", label: "1-3 anos" },
                    { value: "mais_3", label: "+ 3 anos" },
                  ] as const).map((opt) => (
                    <label key={opt.value} className="inline-flex items-center gap-1 text-xs text-eid-fg">
                      <input
                        type="radio"
                        name={`exp_esporte_${e.id}`}
                        value={opt.value}
                        checked={(experiencias[e.id] ?? "menos_1") === opt.value}
                        onChange={() => setExperiencias((old) => ({ ...old, [e.id]: opt.value }))}
                        className="mr-1"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href={CONTA_PERFIL_HREF} className="text-sm font-medium text-eid-primary-300 hover:text-eid-fg">
          ← Dados pessoais do perfil
        </Link>
        <button
          type="submit"
          disabled={pending || esportesSel.size === 0}
          className="eid-btn-primary rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar esportes e EID"}
        </button>
      </div>
    </form>
  );
}
