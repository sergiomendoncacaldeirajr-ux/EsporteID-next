import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getPostAuthRedirect } from "@/lib/auth/post-login-path";
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
  searchParams?: SearchParamsRecord | Promise<SearchParamsRecord>;
};

async function normalizeSearchParams(
  raw: LoginPageProps["searchParams"]
): Promise<SearchParamsRecord> {
  if (raw == null) return {};
  if (typeof raw !== "object") return {};
  if ("then" in raw && typeof (raw as Promise<SearchParamsRecord>).then === "function") {
    const v = await (raw as Promise<SearchParamsRecord>);
    return v && typeof v === "object" ? v : {};
  }
  return raw as SearchParamsRecord;
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
    let profile: {
      termos_aceitos_em: string | null;
      perfil_completo: boolean | null;
    } | null = null;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("termos_aceitos_em, perfil_completo")
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
          termosAceitos: !!profile?.termos_aceitos_em,
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
