import Link from "next/link";
import { redirect } from "next/navigation";
import { modalidadesFromUsuarioEidRow } from "@/lib/onboarding/modalidades-match";
import { CONTA_PERFIL_HREF } from "@/lib/routes/conta";
import { createClient } from "@/lib/supabase/server";
import { ContaEsportesForm } from "./conta-esportes-form";

export const metadata = {
  title: "Esportes e EID · EsporteID",
};

function precisaEsportesPratica(papeis: string[]): boolean {
  return papeis.some((p) => p === "atleta" || p === "professor");
}

export default async function ContaEsportesEidPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fconta%2Fesportes-eid");

  const { data: profile } = await supabase
    .from("profiles")
    .select("perfil_completo, termos_aceitos_em")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.termos_aceitos_em) {
    redirect(`/conta/aceitar-termos?next=${encodeURIComponent("/conta/esportes-eid")}`);
  }
  if (!profile.perfil_completo) redirect("/onboarding");

  const { data: papeisRows } = await supabase.from("usuario_papeis").select("papel").eq("usuario_id", user.id);
  const papeis = (papeisRows ?? []).map((r) => r.papel);
  const needsSport = precisaEsportesPratica(papeis);

  const { data: esportes } = await supabase
    .from("esportes")
    .select("id, nome, permite_individual, permite_dupla, permite_time")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  const { data: eidRows } = await supabase
    .from("usuario_eid")
    .select("esporte_id, interesse_match, modalidade_match, modalidades_match")
    .eq("usuario_id", user.id);

  const selectedEsportes = (eidRows ?? []).map((r) => r.esporte_id);
  const selectedEsportesInteresse = Object.fromEntries(
    (eidRows ?? []).map((r) => [
      r.esporte_id,
      r.interesse_match === "ranking"
        ? "ranking"
        : r.interesse_match === "amistoso"
          ? "amistoso"
          : "ranking_e_amistoso",
    ])
  ) as Record<number, "ranking" | "ranking_e_amistoso" | "amistoso">;
  const selectedEsportesModalidades = Object.fromEntries(
    (eidRows ?? []).map((r) => [r.esporte_id, modalidadesFromUsuarioEidRow(r)])
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-eid-fg sm:text-xl">Esportes e EID</h1>
            <p className="mt-1 text-sm text-eid-text-secondary">
              Esportes do ranking, interesse em match e modalidades (individual, dupla, time).
            </p>
          </div>
          <Link href="/dashboard" className="shrink-0 text-xs font-medium text-eid-primary-300 hover:text-eid-fg">
            Painel
          </Link>
        </div>

        {!needsSport ? (
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-5 text-sm text-eid-text-secondary">
            <p>
              Esta área é para quem atua como <strong className="text-eid-fg">atleta</strong> ou{" "}
              <strong className="text-eid-fg">professor</strong> no cadastro. Seus papéis atuais não incluem essa
              função.
            </p>
            <p className="mt-3">
              <Link href="/dashboard" className="font-semibold text-eid-primary-300 underline">
                Voltar ao painel
              </Link>
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs text-eid-text-secondary">
              Nome, foto e cidade:{" "}
              <Link href={CONTA_PERFIL_HREF} className="font-semibold text-eid-primary-300 underline">
                Editar perfil
              </Link>
            </p>
            <ContaEsportesForm
              esportes={(esportes ?? []).map((e) => ({
                id: e.id,
                nome: e.nome,
                permiteIndividual: Boolean(e.permite_individual),
                permiteDupla: Boolean(e.permite_dupla),
                permiteTime: Boolean(e.permite_time),
              }))}
              selectedEsportes={selectedEsportes}
              selectedEsportesInteresse={selectedEsportesInteresse}
              selectedEsportesModalidades={selectedEsportesModalidades}
            />
          </>
        )}
    </main>
  );
}
