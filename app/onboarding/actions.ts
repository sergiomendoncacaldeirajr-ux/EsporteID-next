"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PAPEIS_VALIDOS = ["atleta", "professor", "organizador", "espaco"] as const;
const ESTRUTURAS_VALIDAS = ["quadra", "campo", "piscina", "sala", "estadio"] as const;
const RESERVA_MODELOS = ["livre", "socios", "pago", "misto"] as const;

type Papel = (typeof PAPEIS_VALIDOS)[number];
type Estrutura = (typeof ESTRUTURAS_VALIDAS)[number];

type NextStep = "papeis" | "esportes" | "extras" | "perfil" | "dashboard";

export type OnboardingActionResult =
  | { ok: true; nextStep?: NextStep }
  | { ok: false; message: string };

function precisaEsportesPratica(papeis: string[]): boolean {
  return papeis.some((p) => p === "atleta" || p === "professor");
}

function parseDetalhesJson(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function parseIntList(values: FormDataEntryValue[]): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const v of values) {
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0 || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

const IMG_ACCEPT = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);
const MAX_IMG_BYTES = 5 * 1024 * 1024;

async function findLocalDuplicadoByNome(
  nomePublico: string,
  ignoreId?: number | null
): Promise<{ id: number; nome_publico: string; responsavel_usuario_id: string | null; criado_por_usuario_id: string } | null> {
  const supabase = await createClient();
  const nome = nomePublico.trim();
  if (!nome) return null;

  let q = supabase
    .from("espacos_genericos")
    .select("id, nome_publico, responsavel_usuario_id, criado_por_usuario_id");
  if (ignoreId && Number.isInteger(ignoreId) && ignoreId > 0) {
    q = q.neq("id", ignoreId);
  }
  const { data, error } = await q;
  if (error) return null;

  const alvo = nome.toLocaleLowerCase("pt-BR");
  return (
    (data ?? []).find(
      (row) => String(row.nome_publico ?? "").trim().toLocaleLowerCase("pt-BR") === alvo
    ) ?? null
  );
}

async function salvarDetalhesPapel(
  userId: string,
  papel: Papel,
  patch: Record<string, unknown>
): Promise<string | null> {
  const supabase = await createClient();
  const { data: atual, error: getErr } = await supabase
    .from("usuario_papeis")
    .select("detalhes_json")
    .eq("usuario_id", userId)
    .eq("papel", papel)
    .maybeSingle();
  if (getErr) return getErr.message;

  const merged = {
    ...parseDetalhesJson(atual?.detalhes_json),
    ...patch,
  };

  const { error: upErr } = await supabase
    .from("usuario_papeis")
    .update({ detalhes_json: JSON.stringify(merged), atualizado_em: new Date().toISOString() })
    .eq("usuario_id", userId)
    .eq("papel", papel);

  return upErr?.message ?? null;
}

export async function salvarPapeisOnboarding(
  _prev: OnboardingActionResult | undefined,
  formData: FormData
): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  const papeis = formData
    .getAll("papel")
    .map((v) => String(v).toLowerCase().trim())
    .filter((p): p is Papel => (PAPEIS_VALIDOS as readonly string[]).includes(p));

  if (papeis.length === 0) return { ok: false, message: "Selecione ao menos uma opção." };

  const { error: delErr } = await supabase
    .from("usuario_papeis")
    .delete()
    .eq("usuario_id", user.id);
  if (delErr) return { ok: false, message: delErr.message };

  const { error: insErr } = await supabase.from("usuario_papeis").insert(
    papeis.map((papel) => ({ usuario_id: user.id, papel }))
  );
  if (insErr) return { ok: false, message: insErr.message };

  const needsSport = precisaEsportesPratica(papeis);
  const { error: upErr } = await supabase
    .from("profiles")
    .update({
      onboarding_etapa: needsSport ? 1 : 2,
      perfil_completo: false,
      onboarding_completo: false,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (upErr) return { ok: false, message: upErr.message };

  revalidatePath("/onboarding");
  return { ok: true, nextStep: needsSport ? "esportes" : "extras" };
}

export async function salvarEsportesOnboarding(
  _prev: OnboardingActionResult | undefined,
  formData: FormData
): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  const ids = formData
    .getAll("esporte_id")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (ids.length === 0) {
    return { ok: false, message: "Selecione ao menos um esporte." };
  }

  const { data: validos, error: qErr } = await supabase
    .from("esportes")
    .select("id")
    .in("id", ids)
    .eq("ativo", true);
  if (qErr) return { ok: false, message: qErr.message };
  const validIds = new Set((validos ?? []).map((r) => r.id));
  const finalIds = ids.filter((id) => validIds.has(id));
  if (!finalIds.length) return { ok: false, message: "Esportes inválidos." };

  const interessesMap = new Map<number, "ranking" | "ranking_e_amistoso" | "amistoso">();
  const modalidadeMap = new Map<number, "individual" | "dupla" | "time">();
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("esporte_interesse_")) continue;
    const id = Number(k.replace("esporte_interesse_", ""));
    if (!Number.isInteger(id) || id <= 0) continue;
    const raw = String(v);
    const interesse = raw === "ranking" ? "ranking" : raw === "amistoso" ? "amistoso" : "ranking_e_amistoso";
    interessesMap.set(id, interesse);
  }
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("esporte_modalidade_")) continue;
    const id = Number(k.replace("esporte_modalidade_", ""));
    if (!Number.isInteger(id) || id <= 0) continue;
    const raw = String(v);
    const modalidade = raw === "dupla" || raw === "time" ? raw : "individual";
    modalidadeMap.set(id, modalidade);
  }

  const { data: esportesMeta, error: metaErr } = await supabase
    .from("esportes")
    .select("id, permite_individual, permite_dupla, permite_time")
    .in("id", finalIds);
  if (metaErr) return { ok: false, message: metaErr.message };
  const esporteMetaMap = new Map(
    (esportesMeta ?? []).map((r) => [
      Number(r.id),
      {
        individual: Boolean(r.permite_individual),
        dupla: Boolean(r.permite_dupla),
        time: Boolean(r.permite_time),
      },
    ])
  );

  const { error: delErr } = await supabase.from("usuario_eid").delete().eq("usuario_id", user.id);
  if (delErr) return { ok: false, message: delErr.message };

  const rows = finalIds.map((esporteId) => ({
    usuario_id: user.id,
    esporte_id: esporteId,
    interesse_match: interessesMap.get(esporteId) ?? "ranking_e_amistoso",
    modalidade_match: (() => {
      const pref = modalidadeMap.get(esporteId) ?? "individual";
      const meta = esporteMetaMap.get(esporteId);
      if (!meta) return pref;
      if (pref === "time" && meta.time) return "time";
      if (pref === "dupla" && meta.dupla) return "dupla";
      if (meta.individual) return "individual";
      if (meta.dupla) return "dupla";
      if (meta.time) return "time";
      return "individual";
    })(),
  }));
  const { error: insErr } = await supabase.from("usuario_eid").insert(rows);
  if (insErr) return { ok: false, message: insErr.message };

  const { error: upErr } = await supabase
    .from("profiles")
    .update({ onboarding_etapa: 2, atualizado_em: new Date().toISOString() })
    .eq("id", user.id);
  if (upErr) return { ok: false, message: upErr.message };

  revalidatePath("/onboarding");
  return { ok: true, nextStep: "extras" };
}

export async function salvarExtrasOnboarding(
  _prev: OnboardingActionResult | undefined,
  formData: FormData
): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  const { data: papeisRows, error: papeisErr } = await supabase
    .from("usuario_papeis")
    .select("papel")
    .eq("usuario_id", user.id);
  if (papeisErr) return { ok: false, message: papeisErr.message };

  const papeis = (papeisRows ?? []).map((r) => r.papel as Papel);
  const hasAtletaProfessor = precisaEsportesPratica(papeis);
  const hasOrganizador = papeis.includes("organizador");
  const hasEspaco = papeis.includes("espaco");

  if (hasAtletaProfessor) {
    const expModo = formData.get("exp_modo") === "exato" ? "exato" : "aprox";
    const expAprox = String(formData.get("exp_aprox") ?? "").trim();
    const expMes = Number(formData.get("exp_mes") ?? 0);
    const expAno = Number(formData.get("exp_ano") ?? 0);

    if (expModo === "aprox" && !["menos_1", "1_3", "mais_3"].includes(expAprox)) {
      return { ok: false, message: "Selecione um tempo aproximado válido." };
    }
    if (
      expModo === "exato" &&
      (!Number.isInteger(expMes) || expMes < 1 || expMes > 12 || !Number.isInteger(expAno) || expAno < 1970 || expAno > 2100)
    ) {
      return { ok: false, message: "Informe mês e ano válidos para experiência." };
    }

    const detAtleta = {
      experiencia_modo: expModo,
      experiencia_aprox: expAprox,
      experiencia_mes: expModo === "exato" ? expMes : null,
      experiencia_ano: expModo === "exato" ? expAno : null,
    };

    if (papeis.includes("atleta")) {
      const e = await salvarDetalhesPapel(user.id, "atleta", detAtleta);
      if (e) return { ok: false, message: e };
    }
    if (papeis.includes("professor")) {
      const e = await salvarDetalhesPapel(user.id, "professor", detAtleta);
      if (e) return { ok: false, message: e };
    }
  }

  if (hasOrganizador) {
    const orgEsportesIds = parseIntList(formData.getAll("org_esporte_ids"));
    if (orgEsportesIds.length === 0) {
      return { ok: false, message: "Selecione ao menos um esporte para organização." };
    }

    const localModo = formData.get("org_local_modo") === "novo" ? "novo" : "existente";
    const localExistenteId = Number(formData.get("org_local_id") ?? 0);
    const orgMensagemLocal = String(formData.get("org_local_msg") ?? "").trim();

    let localPreferidoId: number | null = null;
    let solicitacaoStatus: "pendente" | "dispensada" = "dispensada";

    if (localModo === "existente") {
      if (!Number.isInteger(localExistenteId) || localExistenteId <= 0) {
        return { ok: false, message: "Selecione um local existente para organizar eventos." };
      }
      const { data: localRow, error: localErr } = await supabase
        .from("espacos_genericos")
        .select("id, nome_publico, criado_por_usuario_id, responsavel_usuario_id")
        .eq("id", localExistenteId)
        .maybeSingle();
      if (localErr) return { ok: false, message: localErr.message };
      if (!localRow) return { ok: false, message: "Local selecionado não foi encontrado." };

      localPreferidoId = localRow.id;
      const donoId = localRow.responsavel_usuario_id ?? localRow.criado_por_usuario_id;
      if (donoId && donoId !== user.id) {
        const { data: pendente } = await supabase
          .from("local_organizadores_solicitacoes")
          .select("id")
          .eq("espaco_generico_id", localRow.id)
          .eq("solicitante_id", user.id)
          .eq("status", "pendente")
          .maybeSingle();

        if (!pendente) {
          const { error: reqErr } = await supabase.from("local_organizadores_solicitacoes").insert({
            espaco_generico_id: localRow.id,
            solicitante_id: user.id,
            dono_usuario_id: donoId,
            esportes_ids_json: JSON.stringify(orgEsportesIds),
            mensagem: orgMensagemLocal || null,
            status: "pendente",
          });
          if (reqErr) return { ok: false, message: reqErr.message };
        }
        solicitacaoStatus = "pendente";
      }
    } else {
      const localNome = String(formData.get("org_novo_local_nome") ?? "").trim();
      const localEndereco = String(formData.get("org_novo_local_endereco") ?? "").trim();
      const localCidade = String(formData.get("org_novo_local_cidade") ?? "").trim();
      const localEstado = String(formData.get("org_novo_local_estado") ?? "").trim();
      const localCep = String(formData.get("org_novo_local_cep") ?? "").trim();
      const localLat = String(formData.get("org_novo_local_lat") ?? "").trim();
      const localLng = String(formData.get("org_novo_local_lng") ?? "").trim();
      const localLogo = formData.get("org_novo_local_logo");
      const localDoc = formData.get("org_novo_local_documento");
      if (localNome.length < 3 || localCidade.length < 2 || localEstado.length < 2) {
        return { ok: false, message: "Preencha os dados mínimos do novo local (nome, cidade e estado)." };
      }

      const dupNomeGlobal = await findLocalDuplicadoByNome(localNome, null);
      if (dupNomeGlobal) {
        if (dupNomeGlobal.responsavel_usuario_id == null) {
          localPreferidoId = dupNomeGlobal.id;
          const { data: pendRev } = await supabase
            .from("espaco_reivindicacoes")
            .select("id")
            .eq("espaco_generico_id", dupNomeGlobal.id)
            .eq("solicitante_id", user.id)
            .eq("status", "pendente")
            .maybeSingle();
          if (!pendRev) {
            if (!(localDoc instanceof File) || localDoc.size <= 0) {
              return {
                ok: false,
                message:
                  "Esse local já existe sem responsável. Envie o documento de comprovação para solicitar propriedade.",
              };
            }
            const extDoc = (localDoc.name.split(".").pop() || "pdf").toLowerCase();
            const docPath = `${user.id}/org_claim_${Date.now()}_${Math.random().toString(16).slice(2)}.${extDoc}`;
            const upDoc = await supabase.storage.from("espaco-documentos").upload(docPath, localDoc, {
              upsert: true,
              contentType: localDoc.type || "application/octet-stream",
            });
            if (upDoc.error) {
              return {
                ok: false,
                message:
                  "Nao foi possivel enviar o comprovante. Verifique o bucket 'espaco-documentos' e tente novamente.",
              };
            }
            const { error: revErr } = await supabase.from("espaco_reivindicacoes").insert({
              espaco_generico_id: dupNomeGlobal.id,
              solicitante_id: user.id,
              documento_arquivo: docPath,
              mensagem: orgMensagemLocal || null,
              status: "pendente",
            });
            if (revErr) return { ok: false, message: revErr.message };
          }
          solicitacaoStatus = "pendente";
        } else {
          return { ok: false, message: "Já existe um local cadastrado com esse nome. Selecione o local existente." };
        }
      }

      const localizacao = [localCidade, localEstado.toUpperCase()].filter(Boolean).join(" - ");
      if (!localPreferidoId) {
        const { data: localDuplicado, error: dupErr } = await supabase
          .from("espacos_genericos")
          .select("id")
          .eq("criado_por_usuario_id", user.id)
          .ilike("nome_publico", localNome)
          .ilike("localizacao", localizacao)
          .maybeSingle();
        if (dupErr) return { ok: false, message: dupErr.message };
        if (localDuplicado) {
          return { ok: false, message: "Esse local já foi cadastrado por você. Use o local existente." };
        }
      }

      const venueConfig = {
        endereco: localEndereco,
        cep: localCep,
        cidade: localCidade,
        estado: localEstado.toUpperCase(),
        origem: "onboarding-organizador",
      };

      let logoArquivo: string | null = null;
      if (localLogo instanceof File && localLogo.size > 0) {
        if (!IMG_ACCEPT.has(localLogo.type)) {
          return { ok: false, message: "Logo do local inválida. Use JPG, PNG ou WEBP." };
        }
        if (localLogo.size > MAX_IMG_BYTES) {
          return { ok: false, message: "A logo do local deve ter no máximo 5MB." };
        }
        const ext = (localLogo.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/org_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
        const upLogo = await supabase.storage.from("espaco-logos").upload(path, localLogo, {
          upsert: true,
          contentType: localLogo.type || "image/jpeg",
        });
        if (upLogo.error) {
          return {
            ok: false,
            message:
              "Nao foi possivel enviar a logo do local. Verifique o bucket 'espaco-logos' ou tente sem logo.",
          };
        }
        logoArquivo = path;
      }

      if (!localPreferidoId) {
        const { data: novoLocal, error: novoLocalErr } = await supabase
          .from("espacos_genericos")
          .insert({
            nome_publico: localNome,
            logo_arquivo: logoArquivo,
            localizacao,
            lat: localLat || null,
            lng: localLng || null,
            criado_por_usuario_id: user.id,
            responsavel_usuario_id: null,
            status: "publico",
            esportes_ids: JSON.stringify(orgEsportesIds),
            venue_config_json: JSON.stringify(venueConfig),
          })
          .select("id")
          .single();
        if (novoLocalErr) return { ok: false, message: novoLocalErr.message };
        localPreferidoId = novoLocal.id;
      }
    }

    const e = await salvarDetalhesPapel(user.id, "organizador", {
      esporte_torneio_ids: orgEsportesIds,
      local_modo: localModo,
      local_preferido_id: localPreferidoId,
      solicitacao_local_status: solicitacaoStatus,
      solicitacao_local_mensagem: orgMensagemLocal || null,
    });
    if (e) return { ok: false, message: e };
  }

  if (hasEspaco) {
    const espacoNome = String(formData.get("espaco_nome") ?? "").trim();
    const espacoEsportes = parseIntList(formData.getAll("espaco_esportes"));
    const estruturas = formData
      .getAll("estrutura")
      .map((v) => String(v))
      .filter((s): s is Estrutura => (ESTRUTURAS_VALIDAS as readonly string[]).includes(s));
    const reservaModeloRaw = String(formData.get("reserva_modelo") ?? "livre");
    const reservaModelo = (RESERVA_MODELOS as readonly string[]).includes(reservaModeloRaw)
      ? reservaModeloRaw
      : "livre";
    const reservaNotas = String(formData.get("reserva_notas") ?? "").trim();

    const endereco = String(formData.get("espaco_endereco") ?? "").trim();
    const numero = String(formData.get("espaco_numero") ?? "").trim();
    const bairro = String(formData.get("espaco_bairro") ?? "").trim();
    const cidade = String(formData.get("espaco_cidade") ?? "").trim();
    const estado = String(formData.get("espaco_estado") ?? "").trim().toUpperCase();
    const cep = String(formData.get("espaco_cep") ?? "").trim();
    const complemento = String(formData.get("espaco_complemento") ?? "").trim();
    const lat = String(formData.get("espaco_lat") ?? "").trim();
    const lng = String(formData.get("espaco_lng") ?? "").trim();
    const docMensagem = String(formData.get("espaco_doc_msg") ?? "").trim();
    const documento = formData.get("espaco_documento");

    if (espacoNome.length < 3) return { ok: false, message: "Informe o nome do espaço." };
    if (cidade.length < 2 || estado.length < 2 || endereco.length < 3) {
      return { ok: false, message: "Preencha endereço completo do espaço (rua, cidade e estado)." };
    }

    const localizacao = [cidade, estado].filter(Boolean).join(" - ");
    const venueConfig = {
      endereco,
      numero,
      bairro,
      cidade,
      estado,
      cep,
      complemento,
      origem: "onboarding-espaco",
    };

    const { data: existente } = await supabase
      .from("espacos_genericos")
      .select("id")
      .eq("criado_por_usuario_id", user.id)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    let espacoId = existente?.id ?? null;
    let reivindicarEspacoExistenteSemDono = false;
    const dupNomeGlobal = await findLocalDuplicadoByNome(espacoNome, espacoId);
    if (dupNomeGlobal) {
      const semDono = dupNomeGlobal.responsavel_usuario_id == null;
      if (semDono) {
        espacoId = dupNomeGlobal.id;
        reivindicarEspacoExistenteSemDono = true;
      } else {
        return { ok: false, message: "Já existe um local cadastrado com esse nome. Use outro nome." };
      }
    }

    if (espacoId && !reivindicarEspacoExistenteSemDono) {
      const { error: upLocalErr } = await supabase
        .from("espacos_genericos")
        .update({
          nome_publico: espacoNome,
          localizacao,
          lat: lat || null,
          lng: lng || null,
          esportes_ids: JSON.stringify(espacoEsportes),
          venue_config_json: JSON.stringify(venueConfig),
          status: "pendente_validacao",
        })
        .eq("id", espacoId);
      if (upLocalErr) return { ok: false, message: upLocalErr.message };
    } else if (!espacoId) {
      const { data: novoEspaco, error: insLocalErr } = await supabase
        .from("espacos_genericos")
        .insert({
          nome_publico: espacoNome,
          localizacao,
          lat: lat || null,
          lng: lng || null,
          criado_por_usuario_id: user.id,
          responsavel_usuario_id: user.id,
          status: "pendente_validacao",
          esportes_ids: JSON.stringify(espacoEsportes),
          venue_config_json: JSON.stringify(venueConfig),
        })
        .select("id")
        .single();
      if (insLocalErr) return { ok: false, message: insLocalErr.message };
      espacoId = novoEspaco.id;
    }

    let docArquivo: string | null = null;
    if (documento instanceof File && documento.size > 0) {
      const ext = (documento.name.split(".").pop() || "pdf").toLowerCase();
      const path = `${user.id}/${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
      const up = await supabase.storage.from("espaco-documentos").upload(path, documento, {
        upsert: true,
        contentType: documento.type || "application/octet-stream",
      });
      if (up.error) {
        return {
          ok: false,
          message:
            "Não foi possível enviar o comprovante. Tente novamente em instantes ou entre em contato com o suporte se persistir.",
        };
      }
      docArquivo = path;
    }

    if (espacoId) {
      const { data: pendRev } = await supabase
        .from("espaco_reivindicacoes")
        .select("id")
        .eq("espaco_generico_id", espacoId)
        .eq("solicitante_id", user.id)
        .eq("status", "pendente")
        .maybeSingle();

      if (!pendRev) {
        if (!docArquivo) {
          return {
            ok: false,
            message: "Envie o documento de comprovacao para concluir o onboarding de espaco.",
          };
        }
        const { error: revErr } = await supabase.from("espaco_reivindicacoes").insert({
          espaco_generico_id: espacoId,
          solicitante_id: user.id,
          documento_arquivo: docArquivo,
          mensagem: docMensagem || null,
          status: "pendente",
        });
        if (revErr) return { ok: false, message: revErr.message };
      }

      const e = await salvarDetalhesPapel(user.id, "espaco", {
        espaco_generico_id: espacoId,
        nome_publico: espacoNome,
        esportes_ids: espacoEsportes,
        estruturas,
        preparado_reservas: true,
        reserva_modelo: reservaModelo,
        reserva_notas: reservaNotas,
        endereco,
        numero,
        bairro,
        cidade,
        estado,
        cep,
        complemento,
        validacao_status: "em_analise",
      });
      if (e) return { ok: false, message: e };
    }
  }

  const { error: upErr } = await supabase
    .from("profiles")
    .update({ onboarding_etapa: 3, atualizado_em: new Date().toISOString() })
    .eq("id", user.id);
  if (upErr) return { ok: false, message: upErr.message };

  revalidatePath("/onboarding");
  return { ok: true, nextStep: "perfil" };
}

function tempoExperienciaResumoFromDetalhes(d: Record<string, unknown>): string | null {
  const modo = String(d.experiencia_modo ?? "");
  if (modo === "exato") {
    const mes = Number(d.experiencia_mes ?? 0);
    const ano = Number(d.experiencia_ano ?? 0);
    if (Number.isInteger(mes) && mes >= 1 && mes <= 12 && Number.isInteger(ano) && ano >= 1970) {
      return `${String(mes).padStart(2, "0")}/${ano}`;
    }
  }
  const aprox = String(d.experiencia_aprox ?? "");
  if (aprox === "menos_1") return "Menos de 1 ano";
  if (aprox === "1_3") return "1 a 3 anos";
  if (aprox === "mais_3") return "Mais de 3 anos";
  return null;
}

export async function salvarPerfilOnboarding(
  _prev: OnboardingActionResult | undefined,
  formData: FormData
): Promise<OnboardingActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  const nome = String(formData.get("nome") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "").trim().toLowerCase();
  const username = usernameRaw ? usernameRaw.replace(/[^a-z0-9_]/g, "") : null;
  const localizacao = String(formData.get("localizacao") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const estiloJogo = String(formData.get("estilo_jogo") ?? "").trim();
  const disponibilidadeRaw = String(formData.get("disponibilidade_semana_json") ?? "").trim();
  const alturaRaw = String(formData.get("altura_cm") ?? "").trim();
  const pesoRaw = String(formData.get("peso_kg") ?? "").trim();
  const lado = String(formData.get("lado") ?? "").trim();

  if (nome.length < 3) return { ok: false, message: "Informe seu nome completo." };
  if (username && !/^[a-z0-9_]{3,24}$/.test(username)) {
    return { ok: false, message: "Username inválido. Use 3-24 caracteres [a-z0-9_]." };
  }
  if (!localizacao) return { ok: false, message: "Informe cidade/estado." };
  let disponibilidadeSemana: Record<string, unknown> | null = null;
  if (disponibilidadeRaw) {
    try {
      const parsed = JSON.parse(disponibilidadeRaw);
      disponibilidadeSemana = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return { ok: false, message: "Disponibilidade inválida. Use JSON válido." };
    }
  }

  const { data: papeisRows, error: papeisErr } = await supabase
    .from("usuario_papeis")
    .select("papel, detalhes_json")
    .eq("usuario_id", user.id);
  if (papeisErr) return { ok: false, message: papeisErr.message };

  const papeis = papeisRows?.map((r) => r.papel) ?? [];
  const precisaFicha = precisaEsportesPratica(papeis);

  const altura = alturaRaw ? Number(alturaRaw) : null;
  const peso = pesoRaw ? Number(pesoRaw) : null;

  if (precisaFicha) {
    if (!altura || altura < 50 || altura > 260) {
      return { ok: false, message: "Informe uma altura válida (cm)." };
    }
    if (!peso || peso < 20 || peso > 300) {
      return { ok: false, message: "Informe um peso válido (kg)." };
    }
    if (!lado || !["Destro", "Canhoto", "Ambos"].includes(lado)) {
      return { ok: false, message: "Selecione a mão dominante." };
    }
  }

  let avatarUrl: string | null = null;
  const fotoPrincipal = formData.get("foto");
  const fotoCamera = formData.get("foto_camera");
  const fotoGaleria = formData.get("foto_galeria");
  const foto =
    (fotoPrincipal instanceof File && fotoPrincipal.size > 0 && fotoPrincipal) ||
    (fotoCamera instanceof File && fotoCamera.size > 0 && fotoCamera) ||
    (fotoGaleria instanceof File && fotoGaleria.size > 0 && fotoGaleria) ||
    null;
  if (foto instanceof File && foto.size > 0) {
    if (!IMG_ACCEPT.has(foto.type)) {
      return { ok: false, message: "Formato da foto inválido. Use JPG, PNG ou WEBP." };
    }
    if (foto.size > MAX_IMG_BYTES) {
      return { ok: false, message: "A foto de perfil deve ter no máximo 5MB." };
    }
    const ext = (foto.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from("avatars").upload(path, foto, {
      upsert: true,
      contentType: foto.type || "image/jpeg",
    });
    if (up.error) {
      const detail = up.error.message;
      return {
        ok: false,
        message: `Não foi possível enviar a foto de perfil. ${detail ? `(${detail})` : "Tente novamente em instantes."}`,
      };
    }
    avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  let tempoExperiencia: string | null = null;
  for (const r of papeisRows ?? []) {
    if (r.papel === "atleta" || r.papel === "professor") {
      tempoExperiencia = tempoExperienciaResumoFromDetalhes(parseDetalhesJson(r.detalhes_json));
      if (tempoExperiencia) break;
    }
  }

  const { error: upErr } = await supabase
    .from("profiles")
    .update({
      nome,
      username,
      localizacao,
      bio: bio || null,
      estilo_jogo: estiloJogo || null,
      disponibilidade_semana_json: disponibilidadeSemana,
      altura_cm: precisaFicha ? altura : null,
      peso_kg: precisaFicha ? peso : null,
      lado: precisaFicha ? lado : null,
      tempo_experiencia: tempoExperiencia,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      perfil_completo: true,
      onboarding_completo: true,
      onboarding_etapa: 99,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (upErr) return { ok: false, message: upErr.message };

  revalidatePath("/", "layout");
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  return { ok: true, nextStep: "dashboard" };
}
