/** Parse de `usuario_eid.tempo_experiencia` para telas de edição (anos/meses + faixa). */

export type TempoExperienciaEditor = {
  tempo: "Menos de 1 ano" | "1 a 3 anos" | "Mais de 3 anos";
  anos: number;
  meses: number;
};

export function totalMesesDesdeMesAno(year: number, month1to12: number, ref: Date = new Date()): number {
  const start = new Date(year, month1to12 - 1, 1);
  const diff = (ref.getFullYear() - start.getFullYear()) * 12 + (ref.getMonth() - start.getMonth());
  return Math.max(0, diff);
}

function tempoFaixaFromAnosCheios(anosCheios: number): TempoExperienciaEditor["tempo"] {
  if (anosCheios >= 4) return "Mais de 3 anos";
  if (anosCheios >= 1) return "1 a 3 anos";
  return "Menos de 1 ano";
}

function quebrarTotalMeses(total: number): Pick<TempoExperienciaEditor, "anos" | "meses"> {
  const t = Math.max(0, total);
  return { anos: Math.floor(t / 12), meses: t % 12 };
}

/**
 * Valores possíveis no banco: rótulos PT, MM/YYYY ou M/YYYY, "X ano(s) e Y mes(es)", chaves menos_1 / 1_3 / mais_3.
 */
export function parseTempoExperienciaParaEditor(raw: string | null | undefined): TempoExperienciaEditor {
  const original = String(raw ?? "").trim();
  const txt = original.toLowerCase();

  if (txt.includes("menos de 1 ano")) return { tempo: "Menos de 1 ano", anos: 0, meses: 0 };
  if (txt.includes("mais de 3 anos")) return { tempo: "Mais de 3 anos", anos: 0, meses: 0 };
  if (txt.includes("1 a 3 anos")) return { tempo: "1 a 3 anos", anos: 0, meses: 0 };

  if (txt === "menos_1") return { tempo: "Menos de 1 ano", anos: 0, meses: 0 };
  if (txt === "1_3") return { tempo: "1 a 3 anos", anos: 0, meses: 0 };
  if (txt === "mais_3") return { tempo: "Mais de 3 anos", anos: 0, meses: 0 };

  const my = original.match(/^(\d{1,2})\/(\d{4})$/);
  if (my) {
    const month = Number(my[1]);
    const year = Number(my[2]);
    if (Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(year) && year >= 1970 && year <= 2100) {
      const total = totalMesesDesdeMesAno(year, month);
      const { anos, meses } = quebrarTotalMeses(total);
      const anosCheios = Math.floor(total / 12);
      return { tempo: tempoFaixaFromAnosCheios(anosCheios), anos, meses };
    }
  }

  const anosMatch = txt.match(/(\d+)\s*ano/);
  const mesesMatch = txt.match(/(\d+)\s*m[eê]s/);
  const anos = anosMatch ? Number(anosMatch[1]) : 0;
  const meses = mesesMatch ? Number(mesesMatch[1]) : 0;
  const totalInformado = Math.max(0, anos * 12 + meses);
  const anosCheios = Math.floor(totalInformado / 12);
  return {
    tempo: tempoFaixaFromAnosCheios(anosCheios),
    anos: Math.floor(totalInformado / 12),
    meses: totalInformado % 12,
  };
}

/** Retorna mês (1–12) e ano se o valor gravado for exatamente MM/YYYY. */
export function extrairMesAnoInicio(raw: string | null | undefined): { mes: number; ano: number } | null {
  const original = String(raw ?? "").trim();
  const my = original.match(/^(\d{1,2})\/(\d{4})$/);
  if (!my) return null;
  const month = Number(my[1]);
  const year = Number(my[2]);
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(year) || year < 1970 || year > 2100) return null;
  return { mes: month, ano: year };
}

export function parseTempoExperienciaParaChaveAprox(raw: string | null | undefined): "menos_1" | "1_3" | "mais_3" {
  const { tempo } = parseTempoExperienciaParaEditor(raw);
  if (tempo === "Menos de 1 ano") return "menos_1";
  if (tempo === "1 a 3 anos") return "1_3";
  return "mais_3";
}
