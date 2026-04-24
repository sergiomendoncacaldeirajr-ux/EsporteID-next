import { redirect } from "next/navigation";
import { getPostAuthRedirect } from "@/lib/auth/post-login-path";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar",
};

/** Sempre dinâmico: sessão + query string; evita payload RSC “preso” em cache. */
export const dynamic = "force-dynamic";

function firstQuery(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

type SearchParamsRecord = Record<string, string | string[] | undefined>;

type LoginPageProps = {
  /** Next pode entregar objeto síncrono ou `Promise` — evita `await` preso em versões híbridas. */
  searchParams?: SearchParamsRecord | Promise<SearchParamsRecord>;
};

async function resolveSearchParams(
  raw: LoginPageProps["searchParams"]
): Promise<SearchParamsRecord> {
  if (raw == null) return {};
  if (typeof (raw as Promise<SearchParamsRecord>).then === "function") {
    return (await raw) ?? {};
  }
  return raw as SearchParamsRecord;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = await resolveSearchParams(searchParams);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("termos_aceitos_em, perfil_completo")
      .eq("id", user.id)
      .maybeSingle();

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
    />
  );
}
