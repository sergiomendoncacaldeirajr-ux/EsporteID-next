"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  CONFRONTO_AGENDAMENTO_JANELA_HORAS,
  clampDatetimeLocalBetweenMinMax,
  maxDatetimeLocalValueHorasAFrente,
  minDatetimeLocalValue,
} from "@/lib/agenda/confronto-agendamento-janela";

type Props = {
  name: string;
  defaultValue: string;
  className?: string;
  style?: CSSProperties;
};

export function RankingConfrontoDatetimeInput({ name, defaultValue, className, style }: Props) {
  const [bounds] = useState(() => ({
    min: minDatetimeLocalValue(),
    max: maxDatetimeLocalValueHorasAFrente(CONFRONTO_AGENDAMENTO_JANELA_HORAS),
  }));

  const defaultClamped = useMemo(
    () => clampDatetimeLocalBetweenMinMax(defaultValue, bounds.min, bounds.max),
    [defaultValue, bounds.min, bounds.max]
  );

  return (
    <input
      type="datetime-local"
      name={name}
      min={bounds.min}
      max={bounds.max}
      defaultValue={defaultClamped || ""}
      className={className}
      style={style}
      onChange={(e) => {
        const next = clampDatetimeLocalBetweenMinMax(e.target.value, bounds.min, bounds.max);
        if (next !== e.target.value) {
          e.target.value = next;
          e.target.setCustomValidity(
            next ? "" : `Escolha um horário entre agora e ${CONFRONTO_AGENDAMENTO_JANELA_HORAS} horas.`
          );
        } else {
          e.target.setCustomValidity("");
        }
      }}
    />
  );
}
