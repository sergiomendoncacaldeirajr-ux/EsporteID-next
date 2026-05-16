import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Um login = um espaço gerido: apenas responsável oficial (`responsavel_usuario_id`). */
export async function usuarioJaGerenciaEspaco(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("espacos_genericos")
    .select("id")
    .eq("responsavel_usuario_id", userId)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

type ManagedSpace = {
  id: number;
  slug: string | null;
  nome_publico: string;
  /** Ex.: `publico`, `pendente_validacao`. */
  status: string | null;
  localizacao: string | null;
  cidade: string | null;
  uf: string | null;
  lat: string | number | null;
  lng: string | number | null;
  esportes_ids: unknown;
  criado_por_usuario_id: string | null;
  responsavel_usuario_id: string | null;
  logo_arquivo: string | null;
  cover_arquivo: string | null;
  whatsapp_contato: string | null;
  email_contato: string | null;
  website_url: string | null;
  instagram_url: string | null;
  descricao_curta: string | null;
  descricao_longa: string | null;
  aceita_socios: boolean | null;
  permite_professores_aprovados: boolean | null;
  ativo_listagem: boolean | null;
  operacao_status: string | null;
  venue_config_json: unknown;
  configuracao_reservas_json: unknown;
  categoria_mensalidade: string | null;
  modo_reserva: string | null;
  modo_monetizacao: string | null;
  associacao_regra_json: unknown;
  clube_assinaturas_socios: string | null;
  entrada_membro_modo: string | null;
  entrada_membro_descricao: string | null;
  formas_pagamento_aceitas: string[] | null;
};

const PUBLIC_ASSET_RE = /^(https?:|data:|blob:)/i;

export function resolveEspacoPublicAssetUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  value: string | null | undefined,
  bucket = "espaco-logos"
) {
  const asset = String(value ?? "").trim();
  if (!asset) return null;
  if (PUBLIC_ASSET_RE.test(asset)) return asset;
  return supabase.storage.from(bucket).getPublicUrl(asset.replace(/^\/+/, "")).data.publicUrl;
}

function comparableText(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

async function getLogoMaisRecenteDoStorageDeLocais(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase.storage.from("espaco-logos").list(userId, {
    limit: 50,
    sortBy: { column: "created_at", order: "desc" },
  });
  const file = (data ?? []).find((item) => {
    const name = String(item.name ?? "");
    return /^org_|^local_generico_/.test(name) && !name.endsWith("/");
  });
  return file ? resolveEspacoPublicAssetUrl(supabase, `${userId}/${file.name}`) : null;
}

export async function getLogoCadastradoNoOnboardingDeLocais({
  supabase,
  userId,
  space,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  space: Pick<ManagedSpace, "id" | "nome_publico" | "localizacao" | "cidade" | "uf">;
}) {
  const { data } = await supabase
    .from("espacos_genericos")
    .select("id, nome_publico, localizacao, cidade, uf, logo_arquivo, criado_por_usuario_id, responsavel_usuario_id")
    .or(`criado_por_usuario_id.eq.${userId},responsavel_usuario_id.eq.${userId}`)
    .not("logo_arquivo", "is", null)
    .neq("id", space.id)
    .order("id", { ascending: false })
    .limit(10);

  const candidates = (data ?? []).filter((row) => String(row.logo_arquivo ?? "").trim().length > 0);
  if (!candidates.length) return getLogoMaisRecenteDoStorageDeLocais(supabase, userId);

  const spaceName = comparableText(space.nome_publico);
  const spaceLocation = comparableText(space.localizacao);
  const spaceCity = comparableText(space.cidade);
  const spaceUf = comparableText(space.uf);

  const matched =
    candidates.find((row) => {
      const sameName = comparableText(row.nome_publico) === spaceName;
      const sameLocation = comparableText(row.localizacao) === spaceLocation;
      const sameCityUf =
        comparableText(row.cidade) === spaceCity &&
        comparableText(row.uf) === spaceUf &&
        spaceCity.length > 0 &&
        spaceUf.length > 0;
      return sameName && (sameLocation || sameCityUf);
    }) ??
    candidates.find((row) => comparableText(row.nome_publico) === spaceName) ??
    (candidates.length === 1 ? candidates[0] : null);

  return (
    resolveEspacoPublicAssetUrl(supabase, matched?.logo_arquivo ?? null) ??
    getLogoMaisRecenteDoStorageDeLocais(supabase, userId)
  );
}

export async function requireEspacoManagerUser(nextPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: managedSpaces, error } = await supabase
    .from("espacos_genericos")
    .select(
      "id, slug, nome_publico, status, localizacao, cidade, uf, lat, lng, esportes_ids, criado_por_usuario_id, responsavel_usuario_id, logo_arquivo, cover_arquivo, whatsapp_contato, email_contato, website_url, instagram_url, descricao_curta, descricao_longa, aceita_socios, permite_professores_aprovados, ativo_listagem, operacao_status, venue_config_json, configuracao_reservas_json, categoria_mensalidade, modo_reserva, modo_monetizacao, associacao_regra_json, clube_assinaturas_socios, entrada_membro_modo, entrada_membro_descricao, formas_pagamento_aceitas"
    )
    .eq("responsavel_usuario_id", user.id)
    .order("id", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);

  if (!(managedSpaces ?? []).length) {
    redirect("/locais/cadastrar?modo=espaco");
  }

  const spaces = (managedSpaces ?? []).map((space) => ({
    ...space,
    logo_arquivo: resolveEspacoPublicAssetUrl(supabase, space.logo_arquivo),
    cover_arquivo: resolveEspacoPublicAssetUrl(supabase, space.cover_arquivo),
  }));

  return {
    supabase,
    user,
    managedSpaces: spaces as ManagedSpace[],
  };
}

export async function getEspacoSelecionado({
  nextPath,
  espacoId,
}: {
  nextPath: string;
  /** Ignorado: cada conta gerencia no máximo um espaço. */
  espacoId?: number | null;
}) {
  void espacoId;
  const ctx = await requireEspacoManagerUser(nextPath);
  const selected = ctx.managedSpaces[0] ?? null;
  if (!selected) {
    redirect("/locais/cadastrar?modo=espaco");
  }
  return { ...ctx, selectedSpace: selected };
}
