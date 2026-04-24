import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import { createClient } from "@/lib/supabase/server";
import { AceitarForm } from "./aceitar-form";

function AceitarFormFallback() {
  return (
    <div
      className="eid-auth-card mx-auto flex max-h-[200px] min-h-[120px] w-full max-w-lg animate-pulse rounded-2xl p-8"
      aria-hidden
    />
  );
}

export default async function AceitarTermosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-zinc-700 dark:text-zinc-300">
          Você precisa estar logado para aceitar os termos.
        </p>
        <Link href="/" className="mt-4 inline-block text-eid-action-500 underline hover:text-eid-action-400">
          Voltar ao início
        </Link>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_LEGAL_ACCEPTANCE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (legalAcceptanceIsCurrent(profile)) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-12">
      <Suspense fallback={<AceitarFormFallback />}>
        <AceitarForm />
      </Suspense>
    </div>
  );
}
