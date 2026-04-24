import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getPostAuthRedirect } from "@/lib/auth/post-login-path";
import {
  legalAcceptanceIsCurrent,
  PROFILE_LEGAL_ACCEPTANCE_COLUMNS,
  type ProfileLegalAcceptance,
} from "@/lib/legal/acceptance";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar",
};

export const dynamic = "force-dynamic";

function firstQuery(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type LoginPageProps = {
  /** Next.js 15+ / 16: `searchParams` é uma Promise no servidor. */
  searchParams?: Promise<SearchParamsRecord>;
};

async function normalizeSearchParams(
  raw: LoginPageProps["searchParams"]
): Promise<SearchParamsRecord> {
  if (raw == null) return {};
  const v = await raw;
  return v && typeof v === "object" ? v : {};
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = await normalizeSearchParams(searchParams);

  let bootstrapError: string | null = null;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let user: User | null = null;

  try {
    supabase = await createClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u;
  } catch (e) {
    console.error("[login/page] sessão", e);
    bootstrapError =
      "Não foi possível carregar a sessão. Verifique as variáveis do Supabase na hospedagem e tente de novo.";
  }

  if (bootstrapError) {
    return (
      <LoginForm
        nextPath={firstQuery(sp.next) ?? "/"}
        cadastroOk={firstQuery(sp.cadastro) === "ok"}
        codigoOk={firstQuery(sp.codigo) === "ok"}
        bootstrapError={bootstrapError}
      />
    );
  }

  if (user && supabase) {
    let profile: (ProfileLegalAcceptance & { perfil_completo: boolean | null }) | null = null;
    try {
      const { data } = await supabase
        .from("profiles")
        .select(`perfil_completo, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`)
        .eq("id", user.id)
        .maybeSingle();
      profile = data;
    } catch (e) {
      console.error("[login/page] profiles", e);
      return (
        <LoginForm
          nextPath={firstQuery(sp.next) ?? "/"}
          cadastroOk={firstQuery(sp.cadastro) === "ok"}
          codigoOk={firstQuery(sp.codigo) === "ok"}
          bootstrapError="Não foi possível verificar seu perfil. Tente de novo em instantes."
        />
      );
    }

    redirect(
      getPostAuthRedirect(
        {
          termosAceitos: legalAcceptanceIsCurrent(profile),
          perfilCompleto: !!profile?.perfil_completo,
        },
        firstQuery(sp.next) ?? null
      )
    );
  }

  return (
    <LoginForm
      nextPath={firstQuery(sp.next) ?? "/"}
      cadastroOk={firstQuery(sp.cadastro) === "ok"}
      codigoOk={firstQuery(sp.codigo) === "ok"}
      bootstrapError={null}
    />
  );
}
