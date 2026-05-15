import type { ReactNode } from "react";
import { headers } from "next/headers";
import { EspacoMensalidadeGate } from "@/components/espaco/espaco-mensalidade-gate";
import { EspacoPainelChrome } from "@/components/espaco/espaco-painel-chrome";
import { getMensalidadePainelState } from "@/lib/espacos/mensalidade-acesso";
import { resolveEspacoPublicAssetUrl } from "@/lib/espacos/server";
import { contaSomenteDonoEspaco, listarPapeis } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

const ESPACO_SELECT =
  "id, slug, nome_publico, status, localizacao, cidade, uf, esportes_ids, criado_por_usuario_id, responsavel_usuario_id, logo_arquivo, cover_arquivo, whatsapp_contato, email_contato, website_url, instagram_url, descricao_curta, descricao_longa, aceita_socios, permite_professores_aprovados, ativo_listagem, operacao_status, venue_config_json, configuracao_reservas_json, categoria_mensalidade, modo_reserva, modo_monetizacao, associacao_regra_json, clube_assinaturas_socios";

const ROTAS_PAINEL_ESPACO = new Set([
  "",
  "agenda",
  "configuracao",
  "financeiro",
  "integracao-asaas",
  "notas-fiscais",
  "onboarding",
  "socios",
  "taxas",
]);

async function getRequestPathname() {
  const headersList = await headers();
  const raw =
    headersList.get("x-next-url") ??
    headersList.get("next-url") ??
    headersList.get("x-invoke-path") ??
    headersList.get("x-matched-path") ??
    headersList.get("x-pathname") ??
    "";

  if (!raw) return "";

  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return new URL(raw).pathname;
    }
  } catch {
    return "";
  }

  return raw.split("?")[0] ?? "";
}

function isRotaPainelEspaco(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "");
  if (!normalized || normalized === "/espaco") return true;
  if (!normalized.startsWith("/espaco/")) return false;
  const [, , segment] = normalized.split("/");
  return ROTAS_PAINEL_ESPACO.has(segment ?? "");
}

export default async function EspacoLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = await getRequestPathname();
  if (pathname && !isRotaPainelEspaco(pathname)) {
    return children;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return children;
  }

  const { data: managedSpaces, error } = await supabase
    .from("espacos_genericos")
    .select(ESPACO_SELECT)
    .eq("responsavel_usuario_id", user.id)
    .order("id", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const spaceRow = managedSpaces?.[0] ?? null;
  if (!spaceRow) {
    return children;
  }

  const space = {
    ...spaceRow,
    logo_arquivo: resolveEspacoPublicAssetUrl(supabase, spaceRow.logo_arquivo),
    cover_arquivo: resolveEspacoPublicAssetUrl(supabase, spaceRow.cover_arquivo),
  };
  const categoria = space?.categoria_mensalidade ?? "outro";
  const mensalidadeState = space
    ? await getMensalidadePainelState(supabase, space.id, categoria)
    : null;

  const { data: papeisRows } = await supabase
    .from("usuario_papeis")
    .select("papel")
    .eq("usuario_id", user.id);
  const { data: parceiroAsaas } = space
    ? await supabase
        .from("parceiro_conta_asaas")
        .select("onboarding_status, asaas_account_id")
        .eq("usuario_id", user.id)
        .maybeSingle()
    : { data: null };
  const papeis = listarPapeis(papeisRows);
  const oferecerCtaPerfilAtleta = contaSomenteDonoEspaco(papeis);

  const chromeSpace = space
    ? {
        id: space.id,
        nome_publico: space.nome_publico,
        slug: space.slug,
        asaasStatus: parceiroAsaas?.onboarding_status ?? null,
        asaasAccountId: parceiroAsaas?.asaas_account_id ?? null,
        oferecerCtaPerfilAtleta,
      }
    : { id: 0, nome_publico: "Espaço", slug: null as string | null, asaasStatus: null, asaasAccountId: null, oferecerCtaPerfilAtleta };

  return (
    <main
      data-eid-touch-ui
      data-eid-espaco-panel
      data-eid-no-route-enter
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-4 sm:px-6"
    >
      <EspacoPainelChrome space={chromeSpace} />
      <div className="mt-5 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        {mensalidadeState ? (
          <EspacoMensalidadeGate state={mensalidadeState}>{children}</EspacoMensalidadeGate>
        ) : (
          children
        )}
      </div>
    </main>
  );
}
