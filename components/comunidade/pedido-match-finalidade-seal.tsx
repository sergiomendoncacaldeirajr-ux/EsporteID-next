/** Selo Ranking / Amistoso nos pedidos de desafio recebidos (cabeçalho do quadro ou por card). */
export function PedidoMatchFinalidadeSeal({ finalidade }: { finalidade?: "ranking" | "amistoso" }) {
  if (finalidade === "amistoso") {
    return (
      <span className="shrink-0 rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-100 eid-light:border-emerald-200 eid-light:bg-emerald-50 eid-light:text-emerald-800">
        Amistoso
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full border border-sky-400/35 bg-sky-500/12 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-sky-100 eid-light:border-sky-200 eid-light:bg-sky-50 eid-light:text-[#1d4ed8]">
      Ranking
    </span>
  );
}
