alter table public.match_sugestoes
  add column if not exists oculto_sugeridor boolean not null default false;

create index if not exists idx_match_sugestoes_sugeridor_visivel
  on public.match_sugestoes (sugeridor_id, criado_em desc)
  where oculto_sugeridor = false;
