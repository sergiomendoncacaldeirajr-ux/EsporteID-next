"use server";

import { revalidatePath } from "next/cache";
import { modalidadesMatchFromFlags } from "@/lib/onboarding/modalidades-match";
import { createClient } from "@/lib/supabase/server";

type SaveProfileResult = { ok: true } | { ok: false; message: string };

function parseIntOrNull(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export async function saveProfileMainAction(formData: FormData): Promise<SaveProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const nome = String(formData.get("nome") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "").trim().toLowerCase();
  const username = usernameRaw ? usernameRaw.replace(/[^a-z0-9_]/g, "").slice(0, 24) : null;
  const localizacao = String(formData.get("localizacao") ?? "").trim();
  const altura = parseIntOrNull(formData.get("altura_cm"));
  const peso = parseIntOrNull(formData.get("peso_kg"));
  const ladoRaw = String(formData.get("lado") ?? "").trim();
  const lado = ladoRaw && ["Destro", "Canhoto", "Ambos"].includes(ladoRaw) ? ladoRaw : null;

  if (nome.length < 3) return { ok: false, message: "Nome inválido." };
  if (localizacao.length < 3) return { ok: false, message: "Localização inválida." };
  if (username && !/^[a-z0-9_]{3,24}$/.test(username)) {
    return { ok: false, message: "Username inválido." };
  }

  const payload = {
    nome,
    username,
    localizacao,
    altura_cm: altura,
    peso_kg: peso,
    lado,
    atualizado_em: new Date().toISOString(),
  };

  const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/perfil/${user.id}`);
  revalidatePath("/conta/perfil");
  revalidatePath("/editar/perfil");
  return { ok: true };
}

type PerformancePayloadItem = {
  esporteId: number;
  /** Legado: ignorado; modalidades vêm das flags do esporte no banco. */
  modalidades?: Array<"individual" | "dupla" | "time">;
  /** "faixa" = rótulo aproximado; "inicio" = grava MM/YYYY */
  tempoTipo?: "faixa" | "inicio";
  tempo: "Menos de 1 ano" | "1 a 3 anos" | "Mais de 3 anos";
  tempoAnos?: number;
  tempoMeses?: number;
  inicioMes?: number;
  inicioAno?: number;
};

export async function savePerformanceEidAction(formData: FormData): Promise<SaveProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const raw = String(formData.get("payload") ?? "");
  let parsed: PerformancePayloadItem[] = [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (Array.isArray(arr)) parsed = arr as PerformancePayloadItem[];
  } catch {
    return { ok: false, message: "Dados inválidos para salvar." };
  }

  if (parsed.length === 0) return { ok: false, message: "Selecione pelo menos um esporte." };

  const esporteIds = [...new Set(parsed.map((p) => p.esporteId).filter((id) => Number.isFinite(id) && id > 0))];
  const { data: espMeta, error: espErr } = await supabase
    .from("esportes")
    .select("id, permite_individual, permite_dupla, permite_time")
    .in("id", esporteIds);
  if (espErr) return { ok: false, message: espErr.message };
  const modsByEsporte = new Map<number, ("individual" | "dupla" | "time")[]>();
  for (const r of espMeta ?? []) {
    const id = Number(r.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    let mods = modalidadesMatchFromFlags({
      permiteIndividual: Boolean(r.permite_individual),
      permiteDupla: Boolean(r.permite_dupla),
      permiteTime: Boolean(r.permite_time),
    });
    if (mods.length === 0) mods = ["individual"];
    modsByEsporte.set(id, mods);
  }

  const nowIso = new Date().toISOString();
  const rows = parsed
    .filter((item) => Number.isFinite(item.esporteId) && item.esporteId > 0)
    .map((item) => {
      const modalidades =
        modsByEsporte.get(item.esporteId) ?? (["individual"] as ("individual" | "dupla" | "time")[]);
      const modalidadeMatch = modalidades[0] ?? "individual";
      const tipo = item.tempoTipo ?? "faixa";
      if (tipo === "inicio") {
        const mes = Number(item.inicioMes ?? 0);
        const ano = Number(item.inicioAno ?? 0);
        const mesOk = Number.isFinite(mes) ? Math.min(12, Math.max(1, Math.trunc(mes))) : 1;
        const anoOk = Number.isFinite(ano) ? Math.min(2100, Math.max(1970, Math.trunc(ano))) : new Date().getFullYear();
        const tempoDetalhado = `${String(mesOk).padStart(2, "0")}/${anoOk}`;
        return {
          usuario_id: user.id,
          esporte_id: item.esporteId,
          interesse_match: "ranking",
          modalidade_match: modalidadeMatch,
          modalidades_match: modalidades,
          tempo_experiencia: tempoDetalhado,
          atualizado_em: nowIso,
        };
      }
      const anos = Number(item.tempoAnos ?? 0);
      const meses = Number(item.tempoMeses ?? 0);
      const anosOk = Number.isFinite(anos) && anos > 0 ? Math.trunc(anos) : 0;
      const mesesOk = Number.isFinite(meses) && meses > 0 ? Math.min(11, Math.trunc(meses)) : 0;
      const tempoDetalhado =
        anosOk > 0 || mesesOk > 0
          ? `${anosOk > 0 ? `${anosOk} ano${anosOk === 1 ? "" : "s"}` : ""}${anosOk > 0 && mesesOk > 0 ? " e " : ""}${mesesOk > 0 ? `${mesesOk} ${mesesOk === 1 ? "mês" : "meses"}` : ""}`
          : item.tempo;
      return {
        usuario_id: user.id,
        esporte_id: item.esporteId,
        interesse_match: "ranking",
        modalidade_match: modalidadeMatch,
        modalidades_match: modalidades,
        tempo_experiencia: tempoDetalhado,
        atualizado_em: nowIso,
      };
    });

  if (rows.length === 0) return { ok: false, message: "Nenhum esporte válido informado." };

  const { error } = await supabase.from("usuario_eid").upsert(rows, {
    onConflict: "usuario_id,esporte_id",
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/perfil/${user.id}`);
  revalidatePath("/conta/esportes-eid");
  revalidatePath("/editar/performance-eid");
  return { ok: true };
}

