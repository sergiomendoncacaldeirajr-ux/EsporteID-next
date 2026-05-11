"use client";

import { type CSSProperties } from "react";
import { EidDateTimePicker } from "@/components/agenda/eid-date-time-picker";
import {
  maxDatetimeLocalValueHorasAFrente,
  minDatetimeLocalValue,
} from "@/lib/agenda/confronto-agendamento-janela";

type Props = {
  name: string;
  defaultValue: string;
  janelaHoras: number;
  /** className/style kept for API compat but ignored — EidDateTimePicker has its own styling. */
  className?: string;
  style?: CSSProperties;
};

export function RankingConfrontoDatetimeInput({ name, defaultValue, janelaHoras }: Props) {
  const min = minDatetimeLocalValue();
  const max = maxDatetimeLocalValueHorasAFrente(janelaHoras);

  // Clamp the defaultValue into the valid window
  const safeDefault = (() => {
    if (!defaultValue) return min;
    const t = new Date(defaultValue).getTime();
    if (isNaN(t)) return min;
    const tMin = new Date(min).getTime();
    const tMax = new Date(max).getTime();
    if (t < tMin) return min;
    if (t > tMax) return max;
    return defaultValue;
  })();

  // No label/optionNumber → inline mode (no header row, no redundant text)
  return (
    <EidDateTimePicker
      name={name}
      defaultValue={safeDefault}
      min={min}
      max={max}
      required
    />
  );
}
