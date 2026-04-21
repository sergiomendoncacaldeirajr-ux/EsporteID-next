"use client";

import { useMemo, useState, useTransition } from "react";
import { solicitarAulaProfessorAction } from "@/app/professor/actions";

type SportOption = {
  id: number;
  nome: string;
};

export function ProfessorRequestLessonCard({
  professorId,
  sports,
}: {
  professorId: string;
  sports: SportOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [selectedSportId, setSelectedSportId] = useState<string>(
    sports[0]?.id ? String(sports[0].id) : ""
  );
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => Boolean(professorId && selectedSportId && sports.length > 0 && !pending),
    [pending, professorId, selectedSportId, sports.length]
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setFeedback(null);
    setError(null);

    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await solicitarAulaProfessorAction(fd);
        setFeedback("Solicitação enviada para o professor. Você será avisado na plataforma.");
        setMessage("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível enviar a solicitação.");
      }
    });
  }

  return (
    <section className="mt-6 rounded-2xl border border-eid-primary-500/20 bg-eid-primary-500/10 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-eid-primary-400">
        Solicitar aula
      </p>
      <h2 className="mt-2 text-xl font-bold text-eid-fg">
        Envie sua intenção de aula por aqui
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-eid-text-secondary">
        Escolha o esporte e envie uma mensagem inicial. O professor recebe sua solicitação no painel dele.
      </p>
      {!sports.length ? (
        <p className="mt-3 rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2 text-sm text-eid-text-secondary">
          Este professor ainda não configurou esportes disponíveis para solicitação pela plataforma.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input type="hidden" name="professor_id" value={professorId} />
        <label className="block text-sm text-eid-fg">
          Esporte
          <select
            name="esporte_id"
            value={selectedSportId}
            onChange={(e) => setSelectedSportId(e.target.value)}
            className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
          >
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-eid-fg">
          Mensagem inicial
          <textarea
            name="mensagem"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ex.: Quero começar com uma aula experimental na próxima semana."
            className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
          />
        </label>

        {feedback ? (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {feedback}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="eid-btn-primary rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50"
        >
          {pending ? "Enviando..." : "Solicitar aula"}
        </button>
      </form>
    </section>
  );
}
