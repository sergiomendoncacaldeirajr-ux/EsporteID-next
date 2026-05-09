"use client";

import { useState, useId } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   EidDateTimePicker
   Replaces a single <input type="datetime-local"> with two separate inputs
   (type="date" + type="time") so the browser never has to manage multiple
   focus segments simultaneously — fixing the "hour-selection loop" bug that
   happens with controlled datetime-local inputs in React.

   The form still receives a single "YYYY-MM-DDTHH:MM" value via a hidden field.
──────────────────────────────────────────────────────────────────────────── */

type OptionStyle = 1 | 2 | 3;

const OPTION_STYLES: Record<
  OptionStyle,
  { badge: string; ring: string; label: string }
> = {
  1: {
    badge: "border-sky-500/50 bg-sky-500/15 text-sky-300",
    ring: "border-sky-500/25 bg-[color:color-mix(in_srgb,var(--eid-surface)_96%,rgb(14_165_233)_4%)]",
    label: "Opção 1",
  },
  2: {
    badge: "border-violet-500/50 bg-violet-500/15 text-violet-300",
    ring: "border-violet-500/25 bg-[color:color-mix(in_srgb,var(--eid-surface)_96%,rgb(139_92_246)_4%)]",
    label: "Opção 2",
  },
  3: {
    badge: "border-emerald-500/50 bg-emerald-500/15 text-emerald-300",
    ring: "border-emerald-500/25 bg-[color:color-mix(in_srgb,var(--eid-surface)_96%,rgb(16_185_129)_4%)]",
    label: "Opção 3",
  },
};

const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function splitDatetime(val: string): { date: string; time: string } {
  if (!val) return { date: "", time: "" };
  const sep = val.indexOf("T");
  if (sep < 0) return { date: val, time: "" };
  return { date: val.slice(0, sep), time: val.slice(sep + 1, sep + 6) };
}

function buildDatetimeLocal(date: string, time: string): string {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

function prettyDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`); // noon avoids DST edge cases
  if (isNaN(d.getTime())) return null;
  return `${DIAS_PT[d.getDay()]}, ${d.getDate()} de ${MESES_PT[d.getMonth()]}`;
}

type Props = {
  /** Name submitted to the form — receives "YYYY-MM-DDTHH:MM". */
  name: string;
  defaultValue?: string;
  min: string; // "YYYY-MM-DDTHH:MM"
  max: string; // "YYYY-MM-DDTHH:MM"
  required?: boolean;
  /** Visual style (1 = blue, 2 = violet, 3 = emerald). Omit for plain style. */
  optionNumber?: OptionStyle;
  /** Displayed in the header; falls back to "Data e horário". */
  label?: string;
};

export function EidDateTimePicker({
  name,
  defaultValue = "",
  min,
  max,
  required,
  optionNumber,
  label,
}: Props) {
  const uid = useId();

  const minParts = splitDatetime(min);
  const maxParts = splitDatetime(max);
  const defaultParts = splitDatetime(defaultValue || min);

  const [date, setDate] = useState(defaultParts.date);
  const [time, setTime] = useState(defaultParts.time || "08:00");

  // Dynamic min/max time based on which date is selected
  const minTime = date && date === minParts.date ? minParts.time : "00:00";
  const maxTime = date && date === maxParts.date ? maxParts.time : "23:59";

  const combined = buildDatetimeLocal(date, time);
  const pretty = prettyDate(date);

  const style = optionNumber ? OPTION_STYLES[optionNumber] : null;

  function handleDateChange(next: string) {
    setDate(next);
    // If selected date is min-date and current time is too early, clamp forward
    if (next === minParts.date && time < minParts.time) {
      setTime(minParts.time);
    }
    // If selected date is max-date and current time is too late, clamp back
    if (next === maxParts.date && time > maxParts.time) {
      setTime(maxParts.time);
    }
  }

  function handleTimeChange(next: string) {
    let clamped = next;
    if (date === minParts.date && next < minParts.time) clamped = minParts.time;
    if (date === maxParts.date && next > maxParts.time) clamped = maxParts.time;
    setTime(clamped);
  }

  return (
    <div
      className={`rounded-xl border p-2.5 ${style ? style.ring : "border-[color:var(--eid-border-subtle)] bg-eid-surface/40"}`}
    >
      {/* Header row */}
      <div className="mb-2 flex items-center gap-2">
        {style ? (
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.07em] ${style.badge}`}
          >
            {label ?? style.label}
          </span>
        ) : (
          <span className="text-[9px] font-bold uppercase tracking-[0.07em] text-eid-text-secondary">
            {label ?? "Data e horário"}
          </span>
        )}
        {pretty && (
          <span className="ml-auto text-[9px] font-semibold text-eid-text-secondary">
            {pretty}
          </span>
        )}
      </div>

      {/* Hidden field — the actual form value */}
      <input type="hidden" name={name} value={combined} />

      {/* Date + Time side by side */}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        {/* Date */}
        <div className="grid gap-1">
          <label
            htmlFor={`${uid}-date`}
            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-text-secondary"
          >
            {/* Calendar icon */}
            <svg className="h-3 w-3 shrink-0 opacity-60" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M4.5 1a.5.5 0 0 1 .5.5V2h6v-.5a.5.5 0 0 1 1 0V2h.5A1.5 1.5 0 0 1 14 3.5v9A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H4v-.5a.5.5 0 0 1 .5-.5ZM3 5.5v7a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-7H3Zm1-2.5H3.5a.5.5 0 0 0-.5.5V4.5h10V3.5a.5.5 0 0 0-.5-.5H12v.5a.5.5 0 0 1-1 0V3H5v.5a.5.5 0 0 1-1 0V3Z" />
            </svg>
            Data
          </label>
          <input
            id={`${uid}-date`}
            type="date"
            required={required}
            min={minParts.date}
            max={maxParts.date}
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="eid-input-dark h-10 w-full rounded-xl px-3 text-sm text-eid-fg"
          />
        </div>

        {/* Time */}
        <div className="grid gap-1">
          <label
            htmlFor={`${uid}-time`}
            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-text-secondary"
          >
            {/* Clock icon */}
            <svg className="h-3 w-3 shrink-0 opacity-60" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Z" />
              <path d="M8 3.5a.5.5 0 0 1 .5.5v4.25l2.5 1.44a.5.5 0 0 1-.5.866L7.75 9.07A.5.5 0 0 1 7.5 8.63V4a.5.5 0 0 1 .5-.5Z" />
            </svg>
            Hora
          </label>
          <input
            id={`${uid}-time`}
            type="time"
            required={required}
            min={minTime}
            max={maxTime}
            value={time}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="eid-input-dark h-10 w-[5.5rem] rounded-xl px-2 text-sm text-eid-fg"
          />
        </div>
      </div>
    </div>
  );
}
