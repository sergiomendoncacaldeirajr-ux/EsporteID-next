export type EspacoAssociacaoConfig = {
  modoEntrada: "somente_perfil" | "matricula" | "cpf";
  rotuloCampo: string;
  instrucoes: string;
};

const DEFAULT_CONFIG: EspacoAssociacaoConfig = {
  modoEntrada: "somente_perfil",
  rotuloCampo: "Código de acesso",
  instrucoes: "Use seu perfil para solicitar entrada no espaço.",
};

export function normalizeEspacoAssociacaoConfig(raw: unknown): EspacoAssociacaoConfig {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const modoRaw = String(value.modoEntrada ?? value.modo_entrada ?? DEFAULT_CONFIG.modoEntrada).trim();
  const modoEntrada =
    modoRaw === "matricula" || modoRaw === "cpf" || modoRaw === "somente_perfil"
      ? modoRaw
      : DEFAULT_CONFIG.modoEntrada;
  const rotuloCampo = String(value.rotuloCampo ?? value.rotulo_campo ?? DEFAULT_CONFIG.rotuloCampo)
    .trim()
    .slice(0, 80);
  const instrucoes = String(value.instrucoes ?? DEFAULT_CONFIG.instrucoes).trim().slice(0, 300);
  return {
    modoEntrada,
    rotuloCampo: rotuloCampo || DEFAULT_CONFIG.rotuloCampo,
    instrucoes: instrucoes || DEFAULT_CONFIG.instrucoes,
  };
}
