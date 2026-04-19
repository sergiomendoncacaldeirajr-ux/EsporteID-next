import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getPostAuthRedirect } from "@/lib/auth/post-login-path";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar",
};

function LoginFormFallback() {
  return (
    <div
      className="eid-auth-bg mx-auto flex min-h-[280px] w-full max-w-[340px] animate-pulse rounded-2xl px-4 pt-6"
      aria-hidden
    />
  );
}

export default async function LoginPage() {
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
        null
      )
    );
  }

  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
