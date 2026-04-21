export const TORNEIO_CATEGORIAS_PUBLICO = [
  { id: "masculino", label: "Masculino" },
  { id: "feminino", label: "Feminino" },
  { id: "misto", label: "Misto" },
  { id: "infantil", label: "Infantil" },
] as const;

export type TorneioCategoriaPublico = (typeof TORNEIO_CATEGORIAS_PUBLICO)[number]["id"];

export function isTorneioCategoriaPublico(value: string): value is TorneioCategoriaPublico {
  return TORNEIO_CATEGORIAS_PUBLICO.some((item) => item.id === value);
}

export function parseTorneioCategorias(raw: unknown): TorneioCategoriaPublico[] {
  const input =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            return [];
          }
        })()
      : raw;

  if (!Array.isArray(input)) return [];
  const seen = new Set<TorneioCategoriaPublico>();
  for (const item of input) {
    const value = String(item ?? "").trim().toLowerCase();
    if (isTorneioCategoriaPublico(value)) seen.add(value);
  }
  return [...seen];
}

export function collectTorneioCategorias(values: FormDataEntryValue[]): TorneioCategoriaPublico[] {
  const seen = new Set<TorneioCategoriaPublico>();
  for (const value of values) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (isTorneioCategoriaPublico(normalized)) seen.add(normalized);
  }
  return [...seen];
}

export function formatTorneioCategorias(categorias: readonly TorneioCategoriaPublico[]): string {
  return categorias
    .map((categoria) => TORNEIO_CATEGORIAS_PUBLICO.find((item) => item.id === categoria)?.label ?? categoria)
    .join(", ");
}
