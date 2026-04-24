import { redirect } from "next/navigation";
import { getPostAuthRedirect } from "@/lib/auth/post-login-path";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar",
};

function firstQuery(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = (await searchParams) ?? {};
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
