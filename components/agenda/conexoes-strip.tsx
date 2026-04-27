import Link from "next/link";
import { computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";

export type ConexaoPeer = {
  id: string;
  nome: string | null;
  avatar_url: string | null;
  disponivel_amistoso?: boolean | null;
  disponivel_amistoso_ate?: string | null;
};

function primeiroNome(n: string | null) {
  if (!n?.trim()) return "Atleta";
  return n.trim().split(/\s+/)[0] ?? "Atleta";
}

export function ConexoesStrip({ peers }: { peers: ConexaoPeer[] }) {
  return (
    <section className="mt-4 md:mt-8">
      <div className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55">
        <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-1.5 md:py-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-eid-text-secondary">Conexões ativas</h2>
          <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
            Atalhos
          </span>
        </div>
        <p className="px-3 pt-1.5 text-[10px] text-eid-text-secondary md:pt-2 md:text-xs">
          Atletas com desafio aceito — atalho para o perfil.
        </p>
        <div className="mt-2 flex gap-3 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none] md:mt-3 md:gap-4 md:pb-3 [&::-webkit-scrollbar]:hidden">
        {peers.length === 0 ? (
          <div className="flex min-w-[64px] flex-col items-center opacity-40 md:min-w-[72px]">
            <div className="h-12 w-12 rounded-full border-2 border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface md:h-14 md:w-14" />
            <span className="mt-1.5 max-w-[72px] truncate text-center text-[9px] font-bold text-eid-text-secondary md:mt-2 md:text-[10px]">
              Desafio
            </span>
          </div>
        ) : (
          peers.map((p) => {
            const amistosoOn = computeDisponivelAmistosoEffective(p.disponivel_amistoso, p.disponivel_amistoso_ate);
            return (
            <Link
              key={p.id}
              href={`/perfil/${p.id}?from=/agenda`}
              className="group flex min-w-[68px] flex-col items-center text-center md:min-w-[76px]"
            >
              <div
                className={`rounded-full p-[2px] md:p-[3px] ${
                  amistosoOn
                    ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-500/25"
                    : "bg-gradient-to-br from-red-500 to-rose-700 shadow-md shadow-red-500/25"
                }`}
              >
                <div className="overflow-hidden rounded-full border-[2px] border-eid-bg bg-eid-bg md:border-[3px]">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-12 w-12 object-cover md:h-14 md:w-14" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center bg-eid-surface text-[10px] font-black text-eid-primary-300 md:h-14 md:w-14 md:text-xs">
                      EID
                    </div>
                  )}
                </div>
              </div>
              <span className="mt-1.5 max-w-[76px] truncate text-[9px] font-extrabold text-eid-fg group-hover:text-eid-primary-300 md:mt-2 md:max-w-[80px] md:text-[10px]">
                {primeiroNome(p.nome)}
              </span>
            </Link>
            );
          })
        )}
        </div>
      </div>
    </section>
  );
}
