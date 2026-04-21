alter table public.torneios
  add column if not exists logo_arquivo text,
  add column if not exists categorias_json text;
