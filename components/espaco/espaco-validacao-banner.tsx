type Props = {
  nomePublico: string;
};

/** Exibido quando o cadastro do espaço ainda está em validação (não publicado como verificado). */
export function EspacoValidacaoBanner({ nomePublico }: Props) {
  return (
    <div
      className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 shadow-[0_12px_32px_-20px_rgba(245,158,11,0.45)]"
      role="status"
    >
      <p className="font-semibold text-amber-50">Cadastro em análise</p>
      <p className="mt-1 leading-relaxed text-amber-100/90">
        O espaço <span className="font-medium text-amber-50">{nomePublico}</span> e a documentação enviada estão sendo
        analisados pela equipe. Você já pode usar o painel; a publicação plena e algumas funções podem ficar limitadas
        até a aprovação.
      </p>
    </div>
  );
}
