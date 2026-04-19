import Link from "next/link";

export type ConexaoPeer = { id: string; nome: string | null; avatar_url: string | null };

function primeiroNome(n: string | null) {
  if (!n?.trim()) return "Atleta";
  return n.trim().split(/\s+/)[0] ?? "Atleta";
}

export function ConexoesStrip({ peers }: { peers: ConexaoPeer[] }) {
  return (
    <section className="mt-5 md:mt-8">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-eid-text-secondary">Conexões ativas</h2>
      <p className="mt-0.5 hidden text-xs text-eid-text-secondary md:mt-1 md:block">Atletas com match aceito — atalho para o perfil.</p>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {peers.length === 0 ? (
          <div className="flex min-w-[72px] flex-col items-center opacity-40">
            <div className="h-14 w-14 rounded-full border-2 border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface" />
            <span className="mt-2 max-w-[72px] truncate text-center text-[10px] font-bold text-eid-text-secondary">Match</span>
          </div>
        ) : (
          peers.map((p) => (
            <Link
              key={p.id}
              href={`/perfil/${p.id}?from=/agenda`}
              className="group flex min-w-[76px] flex-col items-center text-center"
            >
              <div className="rounded-full bg-gradient-to-br from-eid-primary-500 to-eid-action-500 p-[3px] shadow-md shadow-eid-primary-500/20">
                <div className="overflow-hidden rounded-full border-[3px] border-eid-bg bg-eid-bg">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-14 w-14 object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center bg-eid-surface text-xs font-black text-eid-primary-300">
                      EID
                    </div>
                  )}
                </div>
              </div>
              <span className="mt-2 max-w-[80px] truncate text-[10px] font-extrabold text-eid-fg group-hover:text-eid-primary-300">
                {primeiroNome(p.nome)}
              </span>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
