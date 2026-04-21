type TimeLike = string | Date | null | undefined;

export type EspacoWeeklySlot = {
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  ativo?: boolean | null;
};

export type EspacoHoliday = {
  data: string;
  nome?: string | null;
};

export type EspacoBlock = {
  inicio: string;
  fim: string;
  titulo?: string | null;
};

export type EspacoBooking = {
  id?: number | null;
  inicio: string;
  fim: string;
  status_reserva?: string | null;
};

function toDate(value: TimeLike) {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function toIsoDate(value: TimeLike) {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

function parseTimeToMinutes(raw: string) {
  const [hour, minute] = raw.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

export function rangesOverlap(
  leftStart: TimeLike,
  leftEnd: TimeLike,
  rightStart: TimeLike,
  rightEnd: TimeLike
) {
  const a = toDate(leftStart);
  const b = toDate(leftEnd);
  const c = toDate(rightStart);
  const d = toDate(rightEnd);
  if (!a || !b || !c || !d) return false;
  return a.getTime() < d.getTime() && c.getTime() < b.getTime();
}

export function checkEspacoConflict({
  inicio,
  fim,
  reservas,
  bloqueios,
}: {
  inicio: TimeLike;
  fim: TimeLike;
  reservas: EspacoBooking[];
  bloqueios: EspacoBlock[];
}) {
  const reservaConflitante =
    reservas.find((item) =>
      item.status_reserva !== "cancelada" &&
      rangesOverlap(inicio, fim, item.inicio, item.fim)
    ) ?? null;
  if (reservaConflitante) {
    return {
      ok: false,
      motivo: "Já existe uma reserva ocupando esse horário.",
    };
  }

  const bloqueioConflitante =
    bloqueios.find((item) => rangesOverlap(inicio, fim, item.inicio, item.fim)) ??
    null;
  if (bloqueioConflitante) {
    return {
      ok: false,
      motivo:
        bloqueioConflitante.titulo?.trim() ||
        "O horário está bloqueado para manutenção ou evento interno.",
    };
  }

  return { ok: true, motivo: null };
}

export function isDentroDaGradeSemanal({
  inicio,
  fim,
  grade,
}: {
  inicio: TimeLike;
  fim: TimeLike;
  grade: EspacoWeeklySlot[];
}) {
  const start = toDate(inicio);
  const end = toDate(fim);
  if (!start || !end) return false;
  const dia = start.getDay();
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();

  return grade.some((slot) => {
    if (!slot.ativo) return false;
    if (Number(slot.dia_semana) !== dia) return false;
    const slotStart = parseTimeToMinutes(slot.hora_inicio);
    const slotEnd = parseTimeToMinutes(slot.hora_fim);
    if (slotStart == null || slotEnd == null) return false;
    return startMinutes >= slotStart && endMinutes <= slotEnd;
  });
}

export function isHolidayDate({
  inicio,
  feriadosCustom,
  feriadosAutomaticos,
}: {
  inicio: TimeLike;
  feriadosCustom: Array<{ data_inicio: string; data_fim: string }>;
  feriadosAutomaticos: EspacoHoliday[];
}) {
  const date = toDate(inicio);
  if (!date) return false;
  const iso = date.toISOString().slice(0, 10);
  const custom = feriadosCustom.some((item) => iso >= item.data_inicio && iso <= item.data_fim);
  if (custom) return true;
  return feriadosAutomaticos.some((item) => item.data === iso);
}

export async function fetchAutomaticHolidaysForYear({
  year,
  uf,
  codigoIbge,
}: {
  year: number;
  uf?: string | null;
  codigoIbge?: string | null;
}): Promise<EspacoHoliday[]> {
  const token = process.env.FERIADOS_API_TOKEN?.trim();
  if (token) {
    const query = new URLSearchParams({ ano: String(year) });
    if (codigoIbge) query.set("ibge", codigoIbge);
    else if (uf) query.set("estado", uf);
    const response = await fetch(
      `https://api.feriadosapi.com/v1/feriados?${query.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 3600 },
      }
    );
    if (response.ok) {
      const payload = (await response.json().catch(() => [])) as Array<{
        data?: string;
        nome?: string;
      }>;
      return payload
        .map((item) => ({
          data: String(item.data ?? ""),
          nome: item.nome ?? null,
        }))
        .filter((item) => item.data.length === 10);
    }
  }

  const fallback = await fetch(
    `https://brasilapi.com.br/api/feriados/v1/${year}`,
    {
      next: { revalidate: 3600 },
    }
  );
  if (!fallback.ok) return [];
  const payload = (await fallback.json().catch(() => [])) as Array<{
    date?: string;
    name?: string;
  }>;
  return payload
    .map((item) => ({
      data: String(item.date ?? ""),
      nome: item.name ?? null,
    }))
    .filter((item) => item.data.length === 10);
}

export function resumoDisponibilidadeDia({
  date,
  grade,
  reservas,
  bloqueios,
  feriadosCustom,
  feriadosAutomaticos,
}: {
  date: TimeLike;
  grade: EspacoWeeklySlot[];
  reservas: EspacoBooking[];
  bloqueios: EspacoBlock[];
  feriadosCustom: Array<{ data_inicio: string; data_fim: string }>;
  feriadosAutomaticos: EspacoHoliday[];
}) {
  const iso = toIsoDate(date);
  if (!iso) {
    return { aberto: false, motivo: "Data inválida." };
  }
  if (
    isHolidayDate({
      inicio: date,
      feriadosCustom,
      feriadosAutomaticos,
    })
  ) {
    return { aberto: false, motivo: "Feriado." };
  }

  const hasGrade = grade.some((slot) => Number(slot.dia_semana) === toDate(date)?.getDay());
  if (!hasGrade) {
    return { aberto: false, motivo: "Sem grade de funcionamento." };
  }

  const reservasDia = reservas.filter((item) => toIsoDate(item.inicio) === iso).length;
  const bloqueiosDia = bloqueios.filter((item) => toIsoDate(item.inicio) === iso).length;
  return {
    aberto: true,
    motivo:
      reservasDia || bloqueiosDia
        ? `${reservasDia} reserva(s), ${bloqueiosDia} bloqueio(s)`
        : "Disponível",
  };
}
