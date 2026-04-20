import Link from "next/link";
import { redirect } from "next/navigation";
import { CONTA_ESPORTES_EID_HREF } from "@/lib/routes/conta";
import { createClient } from "@/lib/supabase/server";
import { ContaPerfilForm } from "./conta-perfil-form";

export const metadata = {
  title: "Editar perfil · EsporteID",
};

function precisaEsportesPratica(papeis: string[]): boolean {
  return papeis.some((p) => p === "atleta" || p === "professor");
}

export default async function ContaPerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fconta%2Fperfil");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "nome, username, localizacao, avatar_url, altura_cm, peso_kg, lado, bio, estilo_jogo, disponibilidade_semana_json, perfil_completo, termos_aceitos_em"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.termos_aceitos_em) {
    redirect(`/conta/aceitar-termos?next=${encodeURIComponent("/conta/perfil")}`);
  }
  if (!profile.perfil_completo) redirect("/onboarding");

  const { data: papeisRows } = await supabase.from("usuario_papeis").select("papel").eq("usuario_id", user.id);
  const papeis = (papeisRows ?? []).map((r) => r.papel);
  const hasAtletaProfessor = precisaEsportesPratica(papeis);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-eid-fg sm:text-xl">Editar perfil</h1>
            <p className="mt-1 text-sm text-eid-text-secondary">
              Dados pessoais públicos. Alterações entram em vigor após salvar.
            </p>
          </div>
          <Link href="/dashboard" className="shrink-0 text-xs font-medium text-eid-primary-300 hover:text-eid-fg">
            Painel
          </Link>
        </div>

        {hasAtletaProfessor ? (
          <p className="mb-4 rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/10 px-3 py-2 text-xs text-eid-text-secondary">
            Para esportes do ranking, interesse no match e modalidades (individual/dupla/time), use{" "}
            <Link href={CONTA_ESPORTES_EID_HREF} className="font-semibold text-eid-primary-300 underline">
              Esportes e EID
            </Link>
            .
          </p>
        ) : null}

        <ContaPerfilForm
          userId={user.id}
          hasAtletaProfessor={hasAtletaProfessor}
          profileInitial={{
            nome: profile.nome ?? "",
            username: profile.username ?? "",
            localizacao: profile.localizacao ?? "",
            alturaCm: profile.altura_cm ?? null,
            pesoKg: profile.peso_kg ?? null,
            lado: profile.lado ?? null,
            avatarUrl: profile.avatar_url ?? null,
            bio: profile.bio ?? "",
            estiloJogo: profile.estilo_jogo ?? "",
            disponibilidadeSemanaJson: JSON.stringify(profile.disponibilidade_semana_json ?? {}),
          }}
        />
    </main>
  );
}
