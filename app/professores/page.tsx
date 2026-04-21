import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Professores · EsporteID",
};

export default async function ProfessoresPage() {
  const supabase = await createClient();

  const { data: perfis } = await supabase
    .from("professor_perfil")
    .select("usuario_id, headline, aceita_novos_alunos, profiles!inner(nome, avatar_url, localizacao)")
    .eq("perfil_publicado", true)
    .order("atualizado_em", { ascending: false })
    .limit(30);

  const professorIds = (perfis ?? []).map((item) => item.usuario_id);
  type ProfessorEsporteRow = {
    professor_id: string;
    valor_base_centavos: number | null;
    esportes: { nome?: string | null } | { nome?: string | null }[] | null;
  };

  const { data: esportesRows } = professorIds.length
    ? await supabase
        .from("professor_esportes")
        .select("professor_id, valor_base_centavos, esportes(nome)")
        .in("professor_id", professorIds)
        .eq("ativo", true)
    : { data: [] as ProfessorEsporteRow[] };

  const esportesByProfessor = new Map<string, ProfessorEsporteRow[]>();
  for (const row of esportesRows ?? []) {
    const current = esportesByProfessor.get(row.professor_id) ?? [];
    current.push(row);
    esportesByProfessor.set(row.professor_id, current);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-eid-action-400">
          Descoberta
        </p>
        <h1 className="mt-2 text-3xl font-bold text-eid-fg">Professores e técnicos</h1>
        <p className="mt-2 text-sm text-eid-text-secondary">
          Perfis publicados para aulas, treinamento profissional e exposição de trabalho esportivo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(perfis ?? []).length ? (
          (perfis ?? []).map((professor, idx) => {
            const profile = Array.isArray(professor.profiles) ? professor.profiles[0] : professor.profiles;
            const esportes = esportesByProfessor.get(professor.usuario_id) ?? [];
            return (
              <Link
                key={`${professor.usuario_id}-${idx}`}
                href={`/professor/${professor.usuario_id}`}
                className="rounded-3xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5 transition hover:border-eid-action-500/45"
              >
                <div className="flex items-start gap-3">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-eid-surface text-sm font-bold text-eid-primary-300">
                      EID
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-eid-fg">{profile?.nome ?? "Professor"}</h2>
                    {professor.headline ? (
                      <p className="mt-1 line-clamp-2 text-sm text-eid-text-secondary">{professor.headline}</p>
                    ) : null}
                    {profile?.localizacao ? (
                      <p className="mt-2 text-xs text-eid-text-secondary">{profile.localizacao}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {esportes.slice(0, 3).map((item, itemIdx) => {
                    const esporte = Array.isArray(item.esportes) ? item.esportes[0] : item.esportes;
                    return (
                      <span key={`${esporte?.nome ?? "esporte"}-${itemIdx}`} className="rounded-full border border-[color:var(--eid-border-subtle)] px-3 py-1 text-xs text-eid-fg">
                        {esporte?.nome ?? "Esporte"}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs font-semibold text-eid-action-400">
                  {professor.aceita_novos_alunos ? "Aceitando novos alunos" : "Captação sob consulta"}
                </p>
              </Link>
            );
          })
        ) : (
          <p className="text-sm text-eid-text-secondary">Nenhum professor publicado ainda.</p>
        )}
      </div>
    </main>
  );
}
